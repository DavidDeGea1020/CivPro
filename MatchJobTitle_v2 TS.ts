/**
 * MatchJobTitle v2 — fuzzy job title matching for the JD Expert agent (Search Job Titles flow).
 *
 * Inputs (from Power Automate "Run script"):
 *   userInput  – what the user typed (title, partial title, typo, abbreviation)
 *   itemsJson  – JSON array of jobs. Accepts Select keys (ID, Title, JobCode) or raw SharePoint
 *                Get items output (ID, Title, Job_x0020_Code). An object with a "value" array also works.
 *
 * Output: JSON string array of up to 5 matches, best first:
 *   [{ "id": 42, "jobTitle": "Payroll Specialist II", "jobCode": "HR1042", "score": 92 }]
 *   score is 0–100. 100 = exact match after normalization. Non-exact matches cap at 99.
 *
 * The workbook parameter is required by Run script but is not used.
 */

interface RawItem {
  [key: string]: string | number | boolean | null | undefined;
}

interface Job {
  id: number | string;
  jobTitle: string;
  jobCode: string;
  tokens: string[];
  canonical: string;
  sortedKey: string;
}

interface Match {
  id: number | string;
  jobTitle: string;
  jobCode: string;
  score: number;
}

// ---------- Settings you can tune ----------

const MAX_RESULTS = 5;
const MIN_SCORE = 40; // matches below this are dropped
const RELATIVE_WINDOW = 35; // also drop matches more than this many points below the top match

// Property names the script looks for on each item (first non-empty one wins)
const ID_KEYS: string[] = ["ID", "Id", "id"];
const TITLE_KEYS: string[] = ["Title", "title", "JobTitle", "jobTitle", "Job_x0020_Title"];
const CODE_KEYS: string[] = ["JobCode", "jobCode", "Job_x0020_Code", "Code", "code"];

// Abbreviations expanded on BOTH the user input and the job titles, so either form matches.
// Add City National-specific abbreviations here.
const ALIASES: { [abbr: string]: string } = {
  sr: "senior",
  snr: "senior",
  jr: "junior",
  mgr: "manager",
  mngr: "manager",
  mgmt: "management",
  spec: "specialist",
  spclst: "specialist",
  asst: "assistant",
  assoc: "associate",
  coord: "coordinator",
  rep: "representative",
  dir: "director",
  supv: "supervisor",
  supvr: "supervisor",
  vp: "vice president",
  avp: "assistant vice president",
  svp: "senior vice president",
  evp: "executive vice president",
  fvp: "first vice president",
  eng: "engineer",
  engr: "engineer",
  dev: "developer",
  ops: "operations",
  hr: "human resources",
  hrbp: "human resources business partner",
  it: "information technology",
  acct: "account",
  acctg: "accounting",
  cust: "customer",
  svc: "service",
  svcs: "services",
  csr: "customer service representative",
  rm: "relationship manager",
  rel: "relationship",
  mktg: "marketing",
  sw: "software",
  qa: "quality assurance",
  mlo: "mortgage loan officer",
  ofcr: "officer",
  intl: "international",
  natl: "national",
  prin: "principal",
  dept: "department",
  proj: "project",
  prog: "program"
};

// Level canonicalization (roman numerals only converted when not the first word)
const ROMAN: { [r: string]: string } = { i: "1", ii: "2", iii: "3", iv: "4", v: "5", vi: "6" };
const ORDINALS: { [o: string]: string } = { "1st": "1", "2nd": "2", "3rd": "3", "4th": "4", "5th": "5" };

// Ignored in both input and titles
const STOPWORDS: string[] = ["the", "a", "an", "of", "and", "for", "to", "in", "on", "at", "with"];

// Ignored in user input only (filler people type around a title)
const QUERY_FILLER: string[] = [
  "jd", "jds", "job", "jobs", "description", "descriptions", "position", "role", "title",
  "please", "update", "view", "show", "me", "my", "see", "find", "lookup"
];

// ---------- Main ----------

function main(workbook: ExcelScript.Workbook, userInput: string, itemsJson: string): string {
  if (!userInput || userInput.trim() === "" || !itemsJson) {
    return "[]";
  }

  const items = parseItems(itemsJson);
  const queryTokens = canonicalTokens(userInput, true);
  if (queryTokens.length === 0 || items.length === 0) {
    return "[]";
  }

  const queryCanonical = queryTokens.join(" ");
  const querySorted = [...queryTokens].sort().join(" ");

  // Prepare jobs once, skipping rows with no title (this is what caused the old null error)
  const jobs: Job[] = [];
  for (const item of items) {
    const title = readField(item, TITLE_KEYS);
    if (title === "") continue;
    const code = readField(item, CODE_KEYS);
    const idText = readField(item, ID_KEYS);
    const tokens = canonicalTokens(title, false);
    if (tokens.length === 0) continue;
    jobs.push({
      id: idText !== "" && !isNaN(Number(idText)) ? Number(idText) : (idText !== "" ? idText : code),
      jobTitle: title,
      jobCode: code,
      tokens: tokens,
      canonical: tokens.join(" "),
      sortedKey: [...tokens].sort().join(" ")
    });
  }

  const matches: Match[] = [];
  for (const job of jobs) {
    const score = scoreJob(queryTokens, queryCanonical, querySorted, job);
    if (score >= MIN_SCORE) {
      matches.push({ id: job.id, jobTitle: job.jobTitle, jobCode: job.jobCode, score: score });
    }
  }

  matches.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.jobTitle.length !== b.jobTitle.length) return a.jobTitle.length - b.jobTitle.length;
    return a.jobTitle.localeCompare(b.jobTitle);
  });

  const topScore = matches.length > 0 ? matches[0].score : 0;
  const results = matches.filter((m) => m.score >= topScore - RELATIVE_WINDOW).slice(0, MAX_RESULTS);

  return JSON.stringify(results);
}

// ---------- Scoring ----------

function scoreJob(queryTokens: string[], queryCanonical: string, querySorted: string, job: Job): number {
  // Exact match after normalization, abbreviation expansion, and level canonicalization
  if (queryCanonical === job.canonical) return 100;

  // Same words, different order ("Director Operations" vs "Operations Director")
  if (querySorted === job.sortedKey) return 98;

  // How well the user's words are found in the title, and how much of the title is covered
  const queryCoverage = coverage(queryTokens, job.tokens);
  const titleCoverage = coverage(job.tokens, queryTokens);
  const tokenScore = 0.6 * queryCoverage + 0.4 * titleCoverage;

  // Whole-string similarity catches run-together words and small overall typos
  const fullSim = similarity(queryCanonical.substring(0, 100), job.canonical.substring(0, 100));

  let raw = 0.3 * fullSim + 0.7 * tokenScore;

  // Partial title: user typed a phrase contained in the title ("payroll specialist")
  if (queryCanonical.length >= 4 && (" " + job.canonical + " ").indexOf(" " + queryCanonical + " ") >= 0) {
    raw = Math.max(raw, 0.8);
  }

  return Math.min(99, Math.round(raw * 100));
}

function coverage(from: string[], to: string[]): number {
  if (from.length === 0) return 0;
  let total = 0;
  for (const f of from) {
    let best = 0;
    for (const t of to) {
      const s = tokenSimilarity(f, t);
      if (s > best) best = s;
      if (best === 1) break;
    }
    total += best;
  }
  return total / from.length;
}

function tokenSimilarity(a: string, b: string): number {
  if (a === b) return 1;

  // Level numbers must match exactly
  const aIsNumber = /^\d+$/.test(a);
  const bIsNumber = /^\d+$/.test(b);
  if (aIsNumber || bIsNumber) return 0;

  // Unlisted abbreviations: "admin" -> "administrator", "tech" -> "technician"
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  if (shorter.length >= 3 && longer.indexOf(shorter) === 0) return 0.9;

  return similarity(a, b);
}

function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - editDistance(a, b) / maxLen;
}

// Levenshtein distance that also counts swapped adjacent letters as one edit ("sepcialist")
function editDistance(a: string, b: string): number {
  const n = a.length;
  const m = b.length;
  if (n === 0) return m;
  if (m === 0) return n;

  const d: number[][] = [];
  for (let i = 0; i <= n; i++) {
    d.push(new Array<number>(m + 1).fill(0));
    d[i][0] = i;
  }
  for (let j = 0; j <= m; j++) d[0][j] = j;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
      let value = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a.charAt(i - 1) === b.charAt(j - 2) && a.charAt(i - 2) === b.charAt(j - 1)) {
        value = Math.min(value, d[i - 2][j - 2] + 1);
      }
      d[i][j] = value;
    }
  }
  return d[n][m];
}

// ---------- Text preparation ----------

function canonicalTokens(text: string, isQuery: boolean): string[] {
  const normalized = (text || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[\/\-_,.():;|]+/g, " ")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (normalized === "") return [];

  const raw = normalized.split(" ");
  const out: string[] = [];

  for (let i = 0; i < raw.length; i++) {
    let t = raw[i];
    if (t === "") continue;
    if (isQuery && QUERY_FILLER.indexOf(t) >= 0) continue;
    if (t === "level" || t === "lvl") continue;

    if (ORDINALS[t]) {
      t = ORDINALS[t];
    } else if (ROMAN[t] && out.length > 0) {
      t = ROMAN[t];
    } else if (/^l\d+$/.test(t)) {
      t = t.substring(1); // "l2" -> "2"
    }

    const expanded = ALIASES[t];
    const parts = expanded ? expanded.split(" ") : [t];
    for (const p of parts) {
      if (STOPWORDS.indexOf(p) < 0) out.push(p);
    }
  }
  return out;
}

function parseItems(itemsJson: string): RawItem[] {
  try {
    const parsed = JSON.parse(itemsJson) as RawItem[] | { value?: RawItem[] };
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.value)) return parsed.value;
    return [];
  } catch (e) {
    return [];
  }
}

function readField(item: RawItem, keys: string[]): string {
  if (!item) return "";
  for (const k of keys) {
    const v = item[k];
    if (v !== null && v !== undefined) {
      const s = String(v).trim();
      if (s !== "") return s;
    }
  }
  return "";
}
