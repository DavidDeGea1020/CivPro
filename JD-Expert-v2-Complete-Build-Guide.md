# JD Expert v2: Conversational Update — Complete Build Guide

**Builds on:** everything you've built so far (see *JD-Expert-Component-Inventory.md*): Fuzzy match + MatchJobTitle, Get JD Details, Related Levels, Save JD Update Request and its child flows (Build Redline Rows, Split Req Pref, Send HR Review Email), the Word templates, the HR email template, the SharePoint lists and libraries.
**Goal:** managers describe what's changing in plain words. The agent drafts every affected section in house style, judges scope, level and overtime-classification risk, revises on request, and captures a business justification. It then submits through your existing redline documents and HR email. Anyone can also search and browse job descriptions ("show me all the lead roles").
**Build in:** DEV.
**Standalone:** this guide is complete on its own. It combines the v2 design with fixes for the bugs we hit in v1.

> **Markers used in this guide**
> - `[[CHECK: …]]`: something to look up in your own tenant (a column's internal name, a flow's output name). Part 1 has you collect them all up front.
> - `[[FIRM: …]]`: firm knowledge only you have (criteria, level profiles, standard wording). Appendix A lists every one and where it probably lives.
> - `{InputName}` inside prompt text: delete that text, type `/`, and pick the input with that name.

---

## Contents

- [Part 0 — How it works](#part-0--how-it-works)
- [Part 1 — Prep and lookups](#part-1--prep-and-lookups)
- [Part 2 — Clean the source data (daily CSV flow)](#part-2--clean-the-source-data-daily-csv-flow)
- [Part 3 — Find Jobs flow](#part-3--find-jobs-flow)
- [Part 4 — Get Job flow + Fuzzy match check](#part-4--get-job-flow--fuzzy-match-check)
- [Part 5 — Get JD Reference flow, Related Levels, Save flow input](#part-5--get-jd-reference-flow-related-levels-save-flow-input)
- [Part 6 — JD Drafter prompt](#part-6--jd-drafter-prompt)
- [Part 7 — JD Final Check prompt](#part-7--jd-final-check-prompt)
- [Part 8 — Rename the v1 topics, create the globals (Reset JD Update)](#part-8--rename-the-v1-topics-create-the-globals-reset-jd-update)
- [Part 9 — Start JD Update topic](#part-9--start-jd-update-topic)
- [Part 10 — Draft JD Update topic](#part-10--draft-jd-update-topic)
- [Part 11 — Discard JD Update topic](#part-11--discard-jd-update-topic)
- [Part 12 — Submit JD Update topic](#part-12--submit-jd-update-topic)
- [Part 13 — Instructions, descriptions, greeting (prepare)](#part-13--instructions-descriptions-greeting-prepare)
- [Part 14 — Switch over](#part-14--switch-over)
- [Part 15 — Tests and tuning](#part-15--tests-and-tuning)
- [Part 16 — Clean up after UAT](#part-16--clean-up-after-uat)
- [Appendix A — Firm information to fill in](#appendix-a--firm-information-to-fill-in)
- [Appendix B — Name reference](#appendix-b--name-reference)
- [Appendix C — Troubleshooting](#appendix-c--troubleshooting)
- [Appendix D — Keeping Job Codes out of the orchestrator entirely](#appendix-d--keeping-job-codes-out-of-the-orchestrator-entirely)
- [Appendix E — Later](#appendix-e--later)

---

## Part 0 — How it works

### 0.1 What the manager experiences

> **Manager:** Can I see all the lead roles?
> **Agent:** I found 23 job titles with "Lead" in them: Operations Lead, Deposit Services Lead, … Want me to narrow it down by area, or open one?
>
> **Manager:** Our Universal Banker Is are going to start opening small business accounts.
> **Agent:** Got it. For Universal Banker I, opening small business accounts adds a new task and new product knowledge:
>
> **Principal Duties**: Adds opening small business deposit accounts.
> - Add: Opens small business deposit accounts, gathering required business documentation and completing account-opening procedures.
>
> **KSAs**: Adds small business product knowledge.
> - Add: Knowledge of small business deposit products and documentation requirements.
>
> No change needed: Purpose, Education, Work Experience, Certifications/Licenses
>
> - Opening business accounts can affect how a role is classified for sales. I'll confirm that with you before it goes to HR.
>
> What's driving the change? HR will want the business reason.
>
> **Manager:** We're rolling out small business banking in all branches. Also make it clear they refer complex business needs to the business banking team.
> **Agent:** *(revises only that duty and shows it)*
>
> **Manager:** What does a Universal Banker II do differently?
> **Agent:** *(opens UB II and compares; the UB I draft is untouched)*
>
> **Manager:** Looks good, send it.
> **Agent:** Before I send this to HR, one quick question: Will this role have sales or referral goals for business accounts?
> **Manager:** No, just referrals when needed.
> **Agent:** *(summary)* Ready to send it to HR? → **Submit to HR** → a link to the redlined copy; HR gets the email.

There are no cards and no section-by-section walk. The manager can talk in any order: search, ask side questions, revise, undo.

### 0.2 The pieces

```
MANAGER ──► ORCHESTRATOR (agent instructions)
               │
 READ (any time)            UPDATE (thin topics)                        COMMIT
 Fuzzy match  (existing)    Start JD Update ─► Get JD Details (existing)  Submit JD Update
 Find Jobs    (new flow)                    ├► Related Levels (existing)    ├► JD Final Check (new prompt)
 Get Job      (new flow)                    └► Get JD Reference (new flow)  └► Save JD Update Request (existing)
 Knowledge                  Draft JD Update ─► JD Drafter (new prompt)            └► redlines + HR email (existing)
                            Discard JD Update
                            Reset JD Update (internal helper)
```

**Job Code is the key between tools,** as in v1. Fuzzy match and Find Jobs return it; Get Job, Start JD Update, Get JD Details, Related Levels and the Save flow take it. The instructions keep it out of chat. If HR says managers must never see Job Codes, Appendix D has a variant that swaps in an opaque key.

### 0.3 Design rules

1. **Thin topics.** A topic calls a tool, stores the result and shows it. The orchestrator runs the conversation.
2. **The drafter speaks for the draft.** JD Drafter writes the changes and the message. Draft JD Update shows them as written and has **no outputs**, so the orchestrator never restates them.
3. **The AI proposes, code applies.** For each changed section, the drafter returns a *line plan*: "keep original line 3", "new line: …". Power Fx builds the proposed text and **checks the plan first**. Untouched lines are copied byte for byte, so the redlines stay clean.
4. **Restricted fields never reach the orchestrator or the drafter.** Get JD Details (all fields) becomes topics-only. The orchestrator views jobs through Get Job (safe fields). Grade and Salary Type go into a hidden global that only JD Final Check sees, for HR-only output.
5. **What's submitted is what was shown.** The draft lives in globals. The Save flow gets its values from globals, never from text the orchestrator retyped.

### 0.4 What happens to everything you've built

**Topics**

| Your topic | In v2 |
|---|---|
| Find/confirm job topic | **Retired.** The orchestrator calls Fuzzy match, Find Jobs and Get Job directly |
| Start JD Update | **Retired, replaced** by a new Start JD Update (no cards). Its acknowledgment message and reasons-check nodes go with it |
| Show JD Section | **Retired.** Get Job shows any job or section |
| Preview Section Change | **Retired.** Draft JD Update shows Add/Remove lines for every section |
| Save Section Change | **Retired, replaced** by Draft JD Update |
| Log Hard Stop | **Retired.** Draft JD Update logs hard stops (keeping both would log them twice) |
| Request Title Review | **Retired.** The drafter records title requests |
| Review and Submit JD Update | **Retired, replaced** by Submit JD Update. **Stop work on the readiness follow-ups** |
| Cancel or Switch JD Update | **Retired, replaced** by Discard JD Update. Switching jobs moves into Start JD Update |

Retired = renamed `zOLD - …` and switched off at switch-over (Part 14), then deleted after UAT (Part 16). **v1 keeps working until Part 14.** That's why the new topics are built alongside the old ones, not in place.

**Prompts:** JD Section Reviewer → replaced by **JD Drafter**. JD Final Review → replaced by **JD Final Check** (same output keys, so the HR email keeps working). JD Review Router → retired. The v1 prompts stay untouched for rollback until Part 16.

**Flows**

| Your flow | In v2 |
|---|---|
| Fuzzy match + MatchJobTitle | **Reused** (one job by name). New description; check its outputs |
| Get JD Details | **Reused** inside Start JD Update; set to **topics-only** at switch-over |
| Related Levels | **Reused**; restricted fields stripped from its output; topics-only |
| Save JD Update Request | **Reused** + one optional input (BusinessJustification) |
| Build Redline Rows (incl. the Paragraph-mode Purpose slots) · Split Req Pref · Send HR Review Email | **Unchanged** |
| Daily CSV ingestion | **Reused** + cleanup steps (Part 2, now a prerequisite) |
| *(new)* Find Jobs · Get Job · Get JD Reference | **Created** |

**Other assets**

| Asset | In v2 |
|---|---|
| Word templates, all 30 Populate mappings, HR email template, libraries, `JD HR Review Mailbox` | **Unchanged.** Don't re-select the Word template |
| JD Update Requests list | **Reused** + `BusinessJustification` column |
| `JD Expert Reference.txt` | **Created** in JD Templates |
| v1 globals (UpdateInProgress, OriginalJD, Changes, PendingChecks, ManagerNotes, FollowupsDone…) | **Unused.** v2 globals all start with `JD`. Delete the v1 ones in Part 16 |
| Agent instructions (7.6k version) | **Replaced** (backed up first) |
| JD knowledge + job families files | **Kept.** The SharePoint JD list is **removed** as a knowledge source |

**Work in progress and designed-only items**

| Item | In v2 |
|---|---|
| Purpose inline slots (🔧) | **Keep going**, independently. The proposed Purpose still arrives as one full paragraph |
| HR readiness follow-ups (🔧) | **Stop.** They live in the retired Review and Submit |
| Start acknowledgment, reasons check, role-fit check (📋) | **Not needed.** No cards; reasons are inferred; the drafter's SCOPE tests cover role fit |
| Removed Req/Pref ending fix, requirement-level flag, Edu/Exp paragraph slots, HR email phase 2, word-level bullet redlines (📋) | **Unaffected**, still on your list |

### 0.5 Where the expertise lives

| Knowledge | Lives in |
|---|---|
| Scope tests, section routing, writing standards, overtime-classification signals, indirect-field criteria, hard stops, titles, severity, calibration examples | **JD Drafter** prompt (Part 6) |
| Level profiles, approved phrases, job family notes | **JD Expert Reference.txt** (Part 1.5). Edit the file; no republish needed |
| The real neighboring levels | **Related Levels** output |
| Level similarity, HR-only classification note, HR summary | **JD Final Check** prompt (Part 7) |
| How to behave in conversation | **Agent instructions** (Part 13) |
| General questions ("what's a Lead?") | **Knowledge** files |
| Restricted fields, formats, what gets saved | **Code** (flows, Power Fx) |

### 0.6 Rules: carried over and changed

**Carried over from v1:**
- **Editable sections:** Purpose, Principal Duties, Education, Work Experience, Certifications/Licenses, KSAs.
- **Indirect fields** (People Management, Sales/Non-Sales, Relationship Manager, NMLS Required) are never edited, only confirmed at submit.
- **Restricted fields** (Grade, Job Code, Salary Type, Status) are never shown and never changed.
- **Hard stop:** any Salary Type change, plus `[[FIRM: additional hard stop rules]]`. Hard stops are logged for HR.
- **Titles:** the user proposes them, the agent never suggests one, and supporting section changes are required.
- **Sessions:** one job per update, one session, no saved drafts. Switching jobs discards the update after a confirmation.
- **Display:** never show the full updated JD.
- **Storage:** Duties stored as `• Text` lines separated by `<br>`. Education and Work Experience keep their Required/Preferred endings.

**Changed in v2. Confirm you agree before building:**
- **Business justification required** on every update.
- **Title review** is requested in conversation, not on a card. This reverses the October 12 cards-only rule; the safeguards are unchanged.
- **Level drift** is flagged during drafting as an advisory note. The formal recommendation still comes at submit.
- **Reasons for update** are inferred into your fixed list of categories, not picked on a card.
- **Readiness follow-ups** are replaced by the drafter's `needs_info` questions plus one question message at submit.

### 0.7 Build sequence

| Parts | What | v1 during this |
|---|---|---|
| 1–2 | Prep, lookups, data cleanup | Working |
| 3–5 | New flows, flow checks | Working, plus search and safe viewing (the new tools are live for the orchestrator) |
| 6–7 | Prompts, tested in the prompt editor | Working |
| 8–13 | New topics, built **switched off** | Working |
| 14 | **Switch over:** v1 topics off, v2 on, new instructions | **v2 live in DEV** |
| 15 | Tests | v2 |
| 16 | Clean up after UAT | v2 |

**Rollback:** until Part 16, turn the zOLD topics back on, the new ones off, and paste the backed-up instructions back in.

### 0.8 Time estimate

| Parts | Estimate |
|---|---|
| 1–2 | 1.5–2.5 h |
| 3–5 | 2.5–3.5 h |
| 6–7 | 2 h (setup; tuning comes later) |
| 8–12 | 5–7 h |
| 13–14 | 1 h |
| 15 | 4–6 h |
| Appendix A (your firm's knowledge) | 3–6 h |
| **Total** | **about 19–28 hours** |

The biggest quality lever is Appendix A, not the plumbing.

---

## Part 1 — Prep and lookups

### 1.1 Back up the solution
1. Go to **make.powerapps.com** → top right, pick **DEV**.
2. **Solutions** → open your JD solution.
3. **Export solution** → **Next** → **Unmanaged** → **Export**.
4. When the banner says it's ready → **Download**. Keep the .zip.

### 1.2 Back up the agent instructions
1. **copilotstudio.microsoft.com** → DEV → **JD Expert** → **Overview** → **Instructions**.
2. Select all → copy → paste into Notepad → save as `JD-Agent-Instructions-v1-backup.txt`.

### 1.3 Record the JD list column internal names
1. Open the **JD list** in SharePoint → **⚙ Settings** → **List settings**.
2. Under **Columns**, click each column. The browser URL ends with `&Field=<InternalName>`. Copy that value.
3. Fill in this table and keep it open for Parts 2–5:

| Display name | Internal name | Type (Text / Choice / Yes/No / Number) |
|---|---|---|
| Job Title | `[[CHECK: often Title]]` | |
| Job Code | `[[CHECK]]` | **Text or Number?** |
| Purpose | `[[CHECK]]` | |
| Principal Duties and Responsibilities | `[[CHECK]]` | |
| Education Requirements | `[[CHECK]]` | |
| Work Experience Requirements | `[[CHECK]]` | |
| Certifications/Licenses | `[[CHECK]]` | |
| Knowledge Skills Abilities | `[[CHECK]]` | |
| People Management | `[[CHECK]]` | |
| Sales/Non-Sales | `[[CHECK]]` | |
| Relationship Manager | `[[CHECK]]` | |
| NMLS Required | `[[CHECK]]` | |
| Grade | `[[CHECK]]` | |
| Salary/Hourly | `[[CHECK]]` | |
| Status | `[[CHECK]]` | |

> **Choice columns:** in flow expressions, write `item()?['Name']?['Value']` instead of `item()?['Name']`. This guide writes the plain form; add `?['Value']` for anything you marked Choice.

You likely already have these from the change document guide (Part 2.5) and the email flow's Classification Compose.

### 1.4 Other lookups (about 10 minutes each)

| # | Find | Where | Write it down |
|---|---|---|---|
| L1 | The **Status** value that means active | JD list or the daily CSV | `[[CHECK]]` |
| L2 | **Separators:** open one JD in the list. Are Principal Duties, KSAs and Certifications lines separated by `<br>`? Are KSAs and Certifications bulleted with `•`? | JD list item | `[[CHECK]]` |
| L3 | **Get JD Details outputs:** open the v1 **Start JD Update** topic → its **Get JD Details** node → note the output variable for each field in 1.3. Also note whether section outputs are **raw** (with `• ` and `<br>`) | v1 Start JD Update | table in 9.6 |
| L4 | **Related Levels:** its input (Job Code or title?) and output name; whether it returns Grade, Salary/Hourly or Status | The Related Levels flow | Part 5.2 |
| L5 | **RequestedBy:** the value v1 maps into Save JD Update Request (`System.User.Email` or `System.User.DisplayName`) | v1 Review and Submit → Submit to HR → flow node | Part 12.13 |
| L6 | **Submitted message:** copy v1's "Submitted!" message text | Same branch | Part 12.13 |
| L7 | **Prompt output text property:** how v1 reads prompt JSON, e.g. `ParseJSON(Topic.Final.text)` (`.text` or another property) | v1 Review and Submit → the node after JD Final Review | Parts 10, 12 |
| L8 | **Fuzzy match outputs:** what it returns (titles, codes, scores?) and whether it returns any other restricted field | The Fuzzy match flow | Part 4.8 |

### 1.5 Create the JD Expert Reference file
1. Open **Notepad** → paste the template below → **File** → **Save As** → name it `JD Expert Reference.txt` → **Encoding: UTF-8** (not "UTF-8 with BOM").
2. Fill in the `[[FIRM]]` parts now or later (Appendix A). Keep it under about 10,000 characters: it's sent with every draft, so smaller means faster. **Never put Grade, Job Code, salary, exempt/non-exempt or status information in it.**
3. SharePoint → **JD Templates** library (where `HR Review Email.html` lives) → **Upload** → **Files** → pick the file.
4. Upload it again in each environment when you deploy.

```text
JD EXPERT REFERENCE
Owner: HR. The agent reads this file whenever a job is loaded for an update.
No Grade, Job Code, salary, exempt/non-exempt, or status information in this file.

=== LEVEL DIMENSIONS ===
How we tell levels apart:
[[FIRM: e.g. scope of impact; how much supervision the person receives; complexity of
problems; decision authority; people responsibility; client/portfolio ownership]]

=== LEVEL PROFILES ===
For each level: what defines it, typical verbs, verbs that signal a different level,
and core duties every role at this level should have (adapted to the function).

-- Level I --
Defines it: [[FIRM: e.g. performs defined tasks under direct supervision; follows
established procedures; refers exceptions]]
Typical verbs: [[FIRM: e.g. processes, prepares, responds, maintains, assists]]
Signals a higher level: [[FIRM: e.g. approves, oversees, independently resolves complex]]
Core duties: [[FIRM]]

-- Level II --
[[FIRM]]

-- Level III --
[[FIRM]]

-- Senior --
[[FIRM]]

-- Lead --
Defines it: [[FIRM: e.g. coordinates daily work of a team, trains and guides others,
serves as escalation point; no formal authority to hire, fire, or conduct
performance reviews unless the job is a People Management role]]
Typical verbs: [[FIRM: e.g. coordinates, trains, guides, monitors, serves as point of escalation]]
Signals a different level: [[FIRM: e.g. "manages staff", "conducts performance reviews"
signal Supervisor/Manager; "assists team members" alone undersells a Lead]]
Core duties: [[FIRM]]

-- Supervisor --
[[FIRM]]

-- Manager --
[[FIRM]]

[[FIRM: any other levels or title patterns you use]]

=== APPROVED PHRASES ===
Standard wording for duties that appear in many JDs. Adapt to the job; don't force.
- Compliance: [[FIRM]]
- Training others: [[FIRM]]
- Escalation / referrals: [[FIRM]]
- Client service: [[FIRM]]
- Risk / controls: [[FIRM]]
- Closing duty: [[FIRM: e.g. "Performs other duties as assigned."]]

=== JOB FAMILY NOTES ===
Per family: what the family does, its usual ladder, anything unusual.
[[FIRM: condensed from your job families file]]
```

### 1.6 Add the BusinessJustification column
1. SharePoint → **JD Update Requests** list → **+ Add column** → **Multiple lines of text** → **Next**.
2. **Name:** `BusinessJustification`. Expand **More options** → **Use enhanced rich text** **off** → **Save**.
3. Add it in UAT and QA when you deploy.

✅ **Part 1 done when:** you have the backup .zip and instructions backup, the 1.3 table and L1–L8 are filled in, the reference file is uploaded (placeholders can stay for now), and the new column exists.

---

## Part 2 — Clean the source data (daily CSV flow)

**Why this comes first:** v2 numbers each section's lines by splitting on `<br>`, and the drafter refers to them by number. Messy source text (stray spaces after `•`, `<br />` variants, blank lines, tabs) means unstable numbering and duties displayed as code blocks. This cleanup gives every bulleted section one format: `• Text<br>• Text`.

Do this for each **bulleted** column: Principal Duties, plus KSAs and Certifications/Licenses if L2 showed they're bulleted.

### 2.1 Open the flow
1. **make.powerautomate.com** → **Solutions** (or **My flows**) → open your **daily CSV ingestion** flow → **Edit**.
2. Find the loop that processes each row (**Apply to each**) and the **Create item** / **Update item** inside it.

### 2.2 Add four actions per bulleted column
Inside the loop, **above** Create/Update item. For Principal Duties use the prefix `Duties`; repeat with `KSA` and `Certs` as needed.

**1. Compose `Duties Norm`** → **Expression:**
```
replace(replace(replace(replace(replace(replace(coalesce(DUTIES_VALUE, ''), '<br />', '<br>'), '<br/>', '<br>'), decodeUriComponent('%0D%0A'), '<br>'), decodeUriComponent('%0A'), '<br>'), decodeUriComponent('%09'), ' '), decodeUriComponent('%C2%A0'), ' ')
```
For `DUTIES_VALUE`, click where it sits in the expression → **Dynamic content** → pick the row's Principal Duties value (whatever Create/Update item uses today).

**2. Filter array `Duties Lines`**
- **From:** `split(outputs('Duties_Norm'), '<br>')`
- **Edit in advanced mode:**
  ```
  @not(empty(trim(replace(replace(replace(replace(item(), '•', ''), '·', ''), '*', ''), '-', ''))))
  ```

**3. Select `Duties Clean`**
- **From:** `body('Duties_Lines')`
- **Map** → **T** (text mode) → **Expression:**
  ```
  concat('• ', replace(replace(replace(trim(if(or(startsWith(trim(item()), '•'), startsWith(trim(item()), '-'), startsWith(trim(item()), '*'), startsWith(trim(item()), '·')), substring(trim(item()), 1, sub(length(trim(item())), 1)), trim(item()))), '    ', ' '), '  ', ' '), '  ', ' '))
  ```

**4. Compose `Duties Final`** → **Expression:**
```
join(body('Duties_Clean'), '<br>')
```

### 2.3 Paragraph columns (Purpose, Education, Work Experience)
One Compose each, e.g. `Purpose Final`:
```
trim(replace(replace(replace(replace(coalesce(PURPOSE_VALUE, ''), decodeUriComponent('%09'), ' '), decodeUriComponent('%C2%A0'), ' '), '  ', ' '), '  ', ' '))
```
Keep any `<br>` in Education and Work Experience as is. Only trim.

### 2.4 Use the cleaned values
In **Create item** / **Update item**, set each cleaned column to its `… Final` output: **Expression** → `outputs('Duties_Final')` and so on. **Save.**

### 2.5 Clean every existing job
If the flow updates every job daily, the next run cleans them all. If it only creates new items, run it once against a full CSV.

✅ **Part 2 done when:** a JD with messy duties shows `• Text<br>• Text` with exactly one space after each bullet, no blank lines, and no tabs.

---

## Part 3 — Find Jobs flow

**What it does:** searches the JD list by title words and/or content words and returns a count plus one line per job: title (job code). It answers "all the lead roles" and "which jobs mention lending". For one named job, the orchestrator still uses Fuzzy match.

### 3.1 Create the flow
1. Copilot Studio → JD Expert → **Tools** → **+ Add a tool** → **+ New tool** → **Agent flow**.
2. The designer opens with **When an agent calls the flow** and **Respond to the agent**.
3. Top left, rename the flow `Find Jobs`. **Express mode:** off.

### 3.2 Trigger inputs (add them in this order)
Select **When an agent calls the flow** → **+ Add an input**:

| Order | Type | Name | Description | Optional |
|---|---|---|---|---|
| 1 | Text | `TitleQuery` | Word or phrase that must appear in the job title | Yes |
| 2 | Text | `ContentQuery` | Word or phrase to find anywhere in the JD text | Yes |
| 3 | Number | `MaxResults` | How many results to return (default 25, max 50) | Yes |

Make each one optional: **…** next to the input → **Make the field optional**.

> These expressions assume the input keys `text`, `text_1` and `number`. Check with the trigger's **…** → **Peek code**. If they differ, use yours.

### 3.3 Compose `TitleQ`
**+** → **Compose** → rename `TitleQ` → **Inputs** → **fx**:
```
toLower(trim(coalesce(triggerBody()?['text'], '')))
```

### 3.4 Compose `ContentQ`
```
toLower(trim(coalesce(triggerBody()?['text_1'], '')))
```

### 3.5 Compose `MaxN`
```
if(less(coalesce(triggerBody()?['number'], 0), 1), 25, min(triggerBody()?['number'], 50))
```

### 3.6 Get items `Get JDs`
1. **+** → **SharePoint – Get items** → rename `Get JDs`.
2. **Site Address:** your JD site. **List Name:** the JD list.
3. **Advanced parameters** → **Show all**:
   - **Filter Query:** `[[CHECK: Status internal name]] eq '[[CHECK: L1 active value]]'` (leave blank if every row is active)
   - **Order By:** `[[CHECK: Job Title internal name]] asc`
   - **Top Count:** `5000`
4. **…** → **Settings** → **Pagination:** On → **Threshold:** `5000` → **Done**.

### 3.7 Filter array `Matches`
1. **+** → **Data Operation – Filter array** → rename `Matches`.
2. **From:** Dynamic content → **Get JDs** → **value**.
3. Click **Edit in advanced mode** and paste, replacing each `[[CHECK]]` with an internal name from 1.3:
```
@and(or(equals(outputs('TitleQ'), ''), contains(toLower(coalesce(item()?['[[CHECK: Job Title]]'], '')), outputs('TitleQ'))), or(equals(outputs('ContentQ'), ''), contains(toLower(concat(coalesce(item()?['[[CHECK: Purpose]]'], ''), ' ', coalesce(item()?['[[CHECK: Principal Duties]]'], ''), ' ', coalesce(item()?['[[CHECK: KSAs]]'], ''), ' ', coalesce(item()?['[[CHECK: Education]]'], ''), ' ', coalesce(item()?['[[CHECK: Work Experience]]'], ''), ' ', coalesce(item()?['[[CHECK: Certifications]]'], ''))), outputs('ContentQ'))))
```
In plain words: keep a row if (no title search, or the title contains it) AND (no content search, or any section contains it).

### 3.8 Compose `Top`
```
take(body('Matches'), outputs('MaxN'))
```

### 3.9 Select `Lines`
1. **+** → **Data Operation – Select** → rename `Lines`.
2. **From:** **fx** → `outputs('Top')`
3. **Map** → **T** (text mode) → **fx**:
```
concat(item()?['[[CHECK: Job Title]]'], ' (code ', item()?['[[CHECK: Job Code]]'], ')')
```
If Job Code is a **Number** column, use `string(item()?['…'])` for it.

**Optional** (lets the agent answer "which lead roles have people management?"):
```
concat(item()?['[[CHECK: Job Title]]'], ' (code ', item()?['[[CHECK: Job Code]]'], ') | People Management: ', coalesce(item()?['[[CHECK: People Management]]'], ''), ' | Sales/Non-Sales: ', coalesce(item()?['[[CHECK: Sales/Non-Sales]]'], ''))
```

### 3.10 Compose `ResultsText`
```
join(body('Lines'), decodeUriComponent('%0A'))
```

### 3.11 Respond to the agent
Select **Respond to the agent** (it must be last) → **+ Add an output**:

| Type | Name | Value (fx) | Description |
|---|---|---|---|
| Number | `Total` | `length(body('Matches'))` | Total number of matching jobs |
| Number | `Shown` | `length(outputs('Top'))` | How many are listed in Results |
| Text | `Results` | `outputs('ResultsText')` | One job per line: title (job code) |

### 3.12 Save, test, publish
1. **Save**.
2. **Test** → **Manually** → TitleQuery `lead` → **Run flow**. Check that Total is above 0 and Results lists titles.
3. Test again with ContentQuery `lending` and TitleQuery blank.
4. **Publish**.

### 3.13 Configure it as a tool
1. Copilot Studio → **Tools** → **Find Jobs** (if it's not listed: **+ Add a tool** → **Flow** → pick it → **Add and configure**).
2. **Description**, and each input's description: from Part 13.2.
3. Each input → **How will the agent fill this input?** → **Dynamically fill with best option**.
4. **Additional details** → **When will this be used?** → **Agent may use this tool at any time**.
5. **Save**.
6. Make sure it's in your solution: **make.powerapps.com** → **Solutions** → your solution → **Add existing** → **Automation** → **Cloud flow** (or **Agent flow**) → **Find Jobs**.

✅ **Part 3 done when:** the flow test returns lead roles and lending matches.

---

## Part 4 — Get Job flow + Fuzzy match check

**Why a new flow:** Get JD Details returns every field, including Grade, Salary/Hourly and Status. In v2, the orchestrator looks jobs up itself, and whatever a tool returns lands in its context. Get Job returns only safe fields, already cleaned for display.

### 4.1 Create the flow
1. **Tools** → **+ Add a tool** → **+ New tool** → **Agent flow**. Rename it `Get Job`. Express mode off.
2. Trigger → **+ Add an input** → **Text** → `JobCode` → description: `The job code from Fuzzy match or Find Jobs`.

### 4.2 Get items `Get job`
1. **+** → **SharePoint – Get items** → rename `Get job`. Same site and list as Find Jobs.
2. **Advanced parameters:**
   - **Filter Query:** type `[[CHECK: Job Code internal name]] eq '` → insert Dynamic content **JobCode** → type `'`. If Job Code is a **Number** column, leave out both quote marks.
   - **Top Count:** `1`

### 4.3 Compose `Job`
```
first(body('Get_job')?['value'])
```

### 4.4 Six cleanup Composes
For each row: **+** → **Compose** → rename it → **fx** → paste the template with `COL` replaced:
```
replace(replace(replace(replace(replace(replace(replace(coalesce(outputs('Job')?['COL'], ''), '<br>', decodeUriComponent('%0A')), decodeUriComponent('%C2%A0'), ' '), decodeUriComponent('%09'), ' '), '•', '- '), '    ', ' '), '  ', ' '), '  ', ' ')
```

| Compose | COL |
|---|---|
| `CleanPurpose` | `[[CHECK: Purpose]]` |
| `CleanDuties` | `[[CHECK: Principal Duties]]` |
| `CleanEducation` | `[[CHECK: Education]]` |
| `CleanExperience` | `[[CHECK: Work Experience]]` |
| `CleanCerts` | `[[CHECK: Certifications]]` |
| `CleanKSAs` | `[[CHECK: KSAs]]` |

### 4.5 Compose `Overview`
**+** → **Compose** → rename `Overview`. Type the text below into **Inputs**:
- Replace each `{CleanPurpose}` etc. with that Compose's **Outputs** from Dynamic content.
- For `{PM}`, `{Sales}`, `{RM}` and `{NMLS}`, use **fx** → `outputs('Job')?['<internal name>']` (add `?['Value']` for Choice columns).

```
**Purpose**
{CleanPurpose}

**Principal Duties**
{CleanDuties}

**Education**
{CleanEducation}

**Work Experience**
{CleanExperience}

**Certifications/Licenses**
{CleanCerts}

**Knowledge, Skills and Abilities**
{CleanKSAs}

**Other details:** People Management: {PM} · Sales/Non-Sales: {Sales} · Relationship Manager: {RM} · NMLS Required: {NMLS}
```

### 4.6 Respond to the agent

| Type | Name | Value | Description |
|---|---|---|---|
| Text | `JobTitle` | **fx** `coalesce(outputs('Job')?['[[CHECK: Job Title]]'], '')` | The job's title |
| Text | `Found` | **fx** `if(empty(outputs('Job')), 'no', 'yes')` | "no" if no job has this code |
| Text | `Overview` | Dynamic: **Overview** → **Outputs** | The current job description, formatted for display |

**Save** → **Test** with a known job code → check that the bullets look clean and there's no Grade, Salary or Status → **Publish**.

### 4.7 Configure as a tool
The same as 3.13. Description and input description come from 13.2. **Agent may use this tool at any time.**

### 4.8 Fuzzy match check
1. **Tools** → **Fuzzy match** → **Description:** paste from 13.2 (it now names Find Jobs as the tool for lists). **Save.**
2. From L8: Fuzzy match should return titles, job codes and scores only. If it returns Grade, Salary/Hourly or Status, open the flow and remove those outputs from its **Respond to the agent** step.

✅ **Part 4 done when:** Get Job returns a clean overview for a known code, and Fuzzy match returns no restricted fields other than Job Code.

---

## Part 5 — Get JD Reference flow, Related Levels, Save flow input

### 5.1 Create Get JD Reference
1. **Tools** → **+ Add a tool** → **+ New tool** → **Agent flow** → rename it `Get JD Reference`. Express mode off.
2. No inputs. (If the designer insists on one, add an optional Text input named `Unused`.)
3. **+** → **SharePoint – Get file content using path** → rename `Get reference`.
   - **Site Address:** the site with **JD Templates**.
   - **File Path:** the folder icon → **JD Templates** → **JD Expert Reference.txt**.
4. **Respond to the agent** → **+ Add an output** → **Text** → `Reference` → **fx**:
```
if(contains(string(body('Get_reference')), '"$content"'), base64ToString(body('Get_reference')?['$content']), string(body('Get_reference')))
```
   This handles SharePoint returning the file either as plain text or as base64 `$content`.
5. **Save** → **Test**. Reference should show readable text, not a long string of letters and `=` signs. Then **Publish**.
6. Copilot Studio → **Tools** → **Get JD Reference**:
   - **Description:** `Internal. Reads the JD Expert reference file. Used only by Start JD Update.`
   - **When will this be used?** → **Only when referenced by topics or agents** → **Save**
   - Add it to the solution if it's missing (3.13 step 6).

### 5.2 Related Levels: strip restricted fields
From L4: if Related Levels returns **Grade, Salary/Hourly or Status** for the other levels, remove them at the source. The drafter writes to the manager, so it must never receive them.
1. Open the **Related Levels** flow → **Edit**.
2. Above its **Respond** step: **+** → **Data Operation – Select** → rename `Safe Levels`.
   - **From:** the array the flow currently returns.
   - **Map** (key/value): keep only the title and the section fields (Purpose, Principal Duties, Education, Work Experience, KSAs, Certifications). Leave out Grade, Salary/Hourly, Status and Job Code.
3. In **Respond**, change the output's value to `string(body('Safe_Levels'))` (or `body('Safe_Levels')` if the output is an array type).
4. **Save** → **Test** → **Publish**.

> v1's JD Final Review and Router were told to hide restricted data from RelatedLevels. Stripping it at the source is safe for v1 too.

### 5.3 Save JD Update Request: add BusinessJustification
1. Open **Save JD Update Request** → **Edit**.
2. Trigger **When an agent calls the flow** → **+ Add an input** → **Text** → `BusinessJustification` → **…** → **Make the field optional**.
3. **Create item** (JD Update Requests) → **BusinessJustification** → Dynamic content → trigger **BusinessJustification**.
4. **Save** → **Publish**.

It's optional, so v1's Review and Submit keeps working unchanged.

✅ **Part 5 done when:** Get JD Reference returns your file text, Related Levels returns no restricted fields, and the Save flow has the new optional input.

---

## Part 6 — JD Drafter prompt

**What it does:** the agent's expertise. It understands the request, tests scope and level, routes the change to sections, drafts in house style, flags concerns at the right severity, tracks indirect fields, title and justification, and writes the message the manager reads.

### 6.1 Create the prompt
1. **Tools** → **+ Add a tool** → **+ New tool** → **Prompt** → rename it `JD Drafter`.
2. **Model / Settings** (⚙ in the prompt editor):
   - **Model:** the most capable model your tenant offers for prompts. If replies take more than about 20 seconds in testing, try the next one down.
   - **Temperature:** `0.2`–`0.3`, if available.

### 6.2 Add the six inputs
**+ Add content** → **Text** for each, with a sample value for testing:

| Input | Sample value |
|---|---|
| `JobContext` | After Part 9 is built, copy a real `Global.JDContext`. For now, type a short numbered job by hand (see the example below) |
| `AdjacentLevels` | `(none)` |
| `Reference` | Your reference file text |
| `CurrentDraft` | `(none yet)` |
| `RequestHistory` | `- They will start opening small business accounts.` |
| `LatestRequest` | `They will start opening small business accounts.` |

Hand-typed JobContext sample:
```
JOB TITLE: Universal Banker I
CURRENT INDIRECT FIELDS: People Management: No; Sales/Non-Sales: Non-Sales; Relationship Manager: No; NMLS Required: No

SECTION: Purpose
1. Provides exceptional service to consumer clients by processing transactions and opening accounts.

SECTION: Principal Duties
1. • Processes deposits, withdrawals and other transactions accurately.
2. • Opens consumer deposit accounts and explains product features.
3. • Refers clients to specialists when appropriate.

SECTION: Education
1. High school diploma or equivalent Required Or

SECTION: Work Experience
1. 1-2 years of customer service experience. Preferred.

SECTION: Certifications/Licenses
1.

SECTION: KSAs
1. • Knowledge of consumer deposit products.
2. • Strong customer service skills.
```

### 6.3 Paste the instructions
Paste the text below. Replace each `{InputName}` with the real input (delete the text, type `/`, pick it). Fill in the `[[FIRM]]` parts now, or later (Appendix A).

> If the editor rejects the length, move the **CALIBRATION EXAMPLES** block into the reference file under `=== CALIBRATION EXAMPLES ===` and replace it here with `See CALIBRATION EXAMPLES in REFERENCE.`

```text
You are the job description expert for [[FIRM: company name]] HR. A manager is updating an existing job description (JD) through a chat. Your job is to understand what is really changing about the job, decide which sections that affects, draft the changes in our house style, and judge whether they fit this job and its level.

Be helpful first. Your default is to find the in-scope, well-written version of what the manager wants and draft it. Block only what THE RULES THAT NEVER BEND say to block. Everything else is a draft plus, at most, a short note.

=== INPUTS ===
THE JOB (current official JD; lines are numbered within each section):
{JobContext}

NEIGHBORING LEVELS (the same job one level up and down, if any):
{AdjacentLevels}

REFERENCE (our level profiles, approved phrases, and job family notes):
{Reference}

CURRENT DRAFT (JSON of the changes so far in this conversation, or "(none yet)"):
{CurrentDraft}

WHAT THE MANAGER HAS ASKED FOR IN THIS UPDATE, IN ORDER (most recent last):
{RequestHistory}

LATEST REQUEST:
{LatestRequest}

=== HOW TO WORK, IN THIS ORDER ===
1. Identify the job. In one sentence: its function, level, who it serves, and how much independence it has. Use THE JOB, NEIGHBORING LEVELS and REFERENCE. Everything you draft must fit this identity unless the manager is deliberately changing it.
2. Understand the request. What actually changes about the work? Separate the real change from wording preferences. If the LATEST REQUEST revises the CURRENT DRAFT ("shorter", "drop that", "also mention X", "undo"), start from the CURRENT DRAFT, change only what was asked, and copy everything else exactly.
3. Test scope (SCOPE).
4. Route the change to sections (SECTION ROUTING). Check all six sections, not only the one the manager named.
5. Draft (WRITING STANDARDS).
6. Check your draft against OVERTIME-CLASSIFICATION SIGNALS, INDIRECT FIELDS, the hard stops and TITLES.
7. Choose the status and write the message (STATUS, MESSAGE).

=== THE RULES THAT NEVER BEND ===
- Editable sections, with these exact names: Purpose, Principal Duties, Education, Work Experience, Certifications/Licenses, KSAs.
- Indirect fields (People Management, Sales/Non-Sales, Relationship Manager, NMLS Required) are never edited. When a change suggests one might change, add it to "indirect" (see INDIRECT FIELDS).
- Restricted fields (Grade, Job Code, Salary Type including exempt/non-exempt and salaried/hourly, and Status): you do not have them. Never mention, guess, or discuss them. If asked, say HR manages those and they can't be changed here.
- Hard stops: any request to change Salary Type, exempt/non-exempt status, overtime eligibility, or salaried/hourly status. [[FIRM: additional hard stop rules]]. A hard stop blocks only that part of the request; keep helping with the rest.
- Titles: only the manager proposes a title. Never suggest, improve, or hint at one.
- Never write out the complete updated JD in your message.
- Never invent facts about the job (systems, products, dollar amounts, licenses, team names) that the manager didn't give and the JD doesn't contain. If a good draft needs one, ask.
- JDs describe the role, not a person. Requests about one employee's performance, pay, schedule or qualities are not JD changes.

=== SCOPE ===
Ask: would someone in this job, at this level, plausibly do this?
- In scope: draft it.
- Level drift: the change makes the job read like the level above or below (compare with NEIGHBORING LEVELS and the level profiles in REFERENCE). Draft it if it's a reasonable stretch, and add an "advise" finding naming the level it resembles and why. HR makes the final call; you only flag.
- Role drift: the change pulls in the core work of a different function or job family (for example a custodian opening business accounts). Ask how it applies before drafting (status "needs_info"), or draft it with an "advise" finding if the manager has already explained.
- Scope creep: authority clearly beyond this level (approving, setting policy, final decisions, hiring) for a role that doesn't have it. Offer the in-scope version (for example "reviews and recommends" instead of "approves") and explain in one sentence.
- Not job content: requests about a person, or things a JD doesn't cover. Status "not_feasible".
Level framework: [[FIRM: your level definitions and dimensions, or "see REFERENCE" once the reference file is complete]]

=== SECTION ROUTING ===
- A new, changed or removed task → Principal Duties.
- A change to why the job exists, who it serves, or its main focus → Purpose. A single new task usually doesn't change the Purpose; a new client segment, product line or core responsibility often does.
- New knowledge, skill, or system the work needs → KSAs.
- A new credential or license the work needs → Certifications/Licenses. Mortgage loan origination also signals NMLS Required.
- Entry requirements → Education / Work Experience. Change these only when the manager asks, or when the new work clearly needs a different background. Keep them consistent with NEIGHBORING LEVELS (a higher level shouldn't require less).
- Keep the JD consistent: the Purpose shouldn't promise work the Duties don't show; KSAs should support the Duties; no duplicate or overlapping duties.
[[FIRM: additional routing rules]]

=== WRITING STANDARDS (reasons in parentheses) ===
- Each duty starts with a present-tense action verb, with no subject: "Opens…", "Coordinates…" (a JD describes what the role does, not what a person did).
- One task per bullet, one or two lines (bundled tasks can't be evaluated or redlined cleanly).
- Say what is done, for whom or what, and to what standard when it matters. Cut filler such as "various", "assists with", "responsible for", "as needed" (weak verbs undersell the level; filler hides it).
- Use verbs that match the level (see REFERENCE level profiles). Don't upgrade or downgrade a duty's verb unless the work itself changes.
- Don't name individual people, temporary projects, or team names that change often (JDs outlive org charts).
- Prefer the approved phrases in REFERENCE when they fit, adapted to this job.
- Match the existing JD's terms and tone (if it says "clients", don't write "customers"). Write new lines without a bullet character; the system adds it.
- Education lines must keep the existing ending exactly: the last two words are "Required Or" or "Preferred Or". Work Experience must keep its final separate sentence, "Required." or "Preferred." [[FIRM: confirm with a real example of each]]
[[FIRM: your other style rules]]

=== OVERTIME-CLASSIFICATION SIGNALS ===
You don't know this job's overtime status and you never discuss it. But some wording can change how a job is classified, and managers sometimes reword a JD in ways that imply a change. Watch for wording that signals:
- authority or independent judgment on significant matters ("final authority", "independently determines", "sets policy");
- directing the work of others or making people decisions ("manages staff", "hires", "conducts performance reviews");
- specialized professional expertise as the primary duty;
- or the opposite: routine, closely supervised, procedure-following work added to a role that has had independent judgment.
When the manager's change uses such wording, draft neutral wording that still describes the real task accurately, and add a "confirm" finding with the phrase, a one-sentence reason in plain language (no legal terms), and your suggested wording.
Our specific criteria: [[FIRM: paste from your qualification criteria document]]
Explicit requests about overtime, hours worked, salaried/hourly, or exempt/non-exempt are hard stops.

=== INDIRECT FIELDS ===
Add a field to "indirect" only when there is a real signal in what the manager said. Include its current value from THE JOB, the evidence, and one plain yes/no question for the manager.
[[FIRM: your criteria for each field, from your qualification criteria document. Replace or extend the starters below.]]
- People Management. Signals: direct reports, hiring, firing, performance reviews, approving time off or pay. Not signals: training, coaching, guiding, coordinating schedules, leading huddles, being an escalation point (typical of Leads).
- Sales/Non-Sales. Signals: sales goals, quotas, product targets, incentive-based selling. Not signals: answering product questions, opening accounts at the client's request, referrals without goals.
- Relationship Manager. Signals: owning and growing a defined portfolio or book of client relationships. Not signals: serving clients who come in.
- NMLS Required. Signals: taking mortgage loan applications, or offering or negotiating residential mortgage terms. Not signals: referring clients to mortgage staff.
If a change would give a non-manager job direct reports and the JD doesn't read like a manager role, add an "advise" finding and offer to help update the other sections.

=== TITLES ===
If the manager asks to change the title: set title.requested to true, put their proposed title in title.proposed exactly as they wrote it (blank if they haven't given one), and their reason in title.reason. If they haven't proposed a title, ask for it. Explain once that a title review needs supporting changes in the sections, and help them make those. Never suggest a title.

=== BUSINESS JUSTIFICATION ===
HR needs the business reason for every update: for example a product rollout, reorganization, regulatory change, or a role that has grown. If the manager has given it anywhere in the conversation, put it in "justification" in their words, lightly cleaned. Carry it forward from the CURRENT DRAFT. If it's still missing once you've produced a draft, make it your "ask", once, in a light way ("What's driving this change? HR will want the business reason."). Never ask for it as your first message, and never twice in a row.

=== HOW TO TALK ABOUT CONCERNS (severity) ===
- block: hard stops only. Leave that part out, say why in one sentence, and keep going with the rest.
- confirm: indirect fields and overtime-classification signals. Mention once, briefly. The confirming question is asked when the manager submits, so don't ask it now.
- advise: level drift, role drift, scope creep, consistency gaps. One sentence with a suggestion. The manager can proceed.
- fix silently: style, format and verb choice. Just write it well; don't comment.
Don't repeat a concern you already raised (it's in the CURRENT DRAFT findings) unless something new made it worse. Never lecture.

=== STATUS ===
- "ready": you produced a draft (new or revised). Return the complete draft.
- "needs_info": you can't draft responsibly without an answer. Ask at most two questions. Return the CURRENT DRAFT's changes unchanged.
- "no_change": the message doesn't change the draft (a question, a thank-you, something already covered). Answer it in the message. Return the CURRENT DRAFT's changes unchanged.
- "not_feasible": not something a JD update can do (about a person, a restricted field, belongs to a different job). Explain briefly and offer the closest thing you can do.
- "hard_stop": the whole request is a hard stop.

=== MESSAGE (the manager reads this; the changes themselves are displayed separately) ===
- intro: one natural sentence showing you understood (mention the job title on the first draft). No "Great question!", no filler.
- notes: zero to three short items, only for block, confirm and advise concerns, each with its suggestion. No notes about style.
- ask: one question or next step. Usually "Want to adjust anything, or is it ready for HR?", or the justification question, or your needs_info question(s).
Don't list or repeat the changes in the message. Warm, plain, expert, brief.

=== CALIBRATION EXAMPLES ===
[[FIRM: replace these with 10–15 real requests. At least half should be "this is fine, here's the draft."]]
1. Universal Banker I: "will start opening small business accounts" → in scope. Principal Duties + KSAs; Purpose only if small business becomes a main focus. Confirm Sales/Non-Sales only if our criteria treat this as sales.
2. Teller: "will approve overdrafts" → scope creep. Draft "Reviews overdraft requests and refers them for approval according to established limits," plus one sentence of explanation.
3. Operations Lead: "will do performance reviews for the team" → People Management confirm. Offer "Provides input on team members' performance to the manager" if the role won't have direct reports.
4. Any role: "make this role salaried" → hard stop for that part.
5. Universal Banker I: "rewrite duty 3 so it sounds more senior" with no change in the work → advise on level drift; ask what has changed in the actual work.
6. Any role: "add that Maria is great with clients" → not_feasible; JDs describe the role.
7. Teller: "they train new tellers now" → in scope, Principal Duties. Not a People Management signal.

=== OUTPUT ===
Return only JSON with every key present (use "" or [] when empty):
- role_identity: your one-sentence job identity.
- understood: one sentence describing what's changing.
- scope_verdict: in_scope | level_drift | role_drift | scope_creep | not_job_content.
- scope_note: one sentence, or "".
- status: ready | needs_info | no_change | not_feasible | hard_stop.
- touched: section names you changed in THIS turn (all changed sections on a first draft).
- changes: every section that differs from THE JOB, as the complete current set (not only this turn's changes). For each:
  - section: an exact section name.
  - summary: one short line describing what changed.
  - lines: the complete new section, in order. Each item is {"keep": n, "new": ""}, which copies original line n exactly, or {"keep": 0, "new": "text"} for new or reworded text. Leaving out an original line number removes that line. Use each original line number at most once, and only numbers that exist in THE JOB for that section. Purpose is usually a single {"keep": 0, "new": "..."}.
- unchanged: on a first draft or a broadened request, the sections you checked and left alone, each with a short reason. Otherwise [].
- indirect: accumulated. Carry forward items from the CURRENT DRAFT that still apply and add new ones. Each item has field, current, evidence, question.
- findings: this turn's concerns. Each has severity (block | confirm | advise), about, note, suggestion.
- hard_stops: only those in the LATEST REQUEST. Each has field and request.
- title: requested (true/false), proposed, reason.
- justification: the business reason, if given anywhere, in the manager's words; otherwise "".
- message: intro, notes (an array of strings), ask.
```

### 6.4 Set the output to JSON
1. **Output** → **Text** → **JSON**.
2. **Edit format** → replace the example with this → **Apply**. Every array has one complete item so all fields are kept:

```json
{
  "role_identity": "Entry-level retail banker who opens consumer accounts and serves walk-in clients under branch leadership.",
  "understood": "The role will now open small business deposit accounts.",
  "scope_verdict": "in_scope",
  "scope_note": "",
  "status": "ready",
  "touched": ["Principal Duties"],
  "changes": [
    {
      "section": "Principal Duties",
      "summary": "Adds opening small business deposit accounts.",
      "lines": [
        { "keep": 1, "new": "" },
        { "keep": 0, "new": "Opens small business deposit accounts, gathering required business documentation." }
      ]
    }
  ],
  "unchanged": [ { "section": "Education", "why": "No new entry requirement." } ],
  "indirect": [ { "field": "Sales/Non-Sales", "current": "Non-Sales", "evidence": "Business account opening may carry goals.", "question": "Will this role have sales or referral goals for business accounts?" } ],
  "findings": [ { "severity": "advise", "about": "Level", "note": "A similar duty appears in Universal Banker II.", "suggestion": "Keep it limited to account opening." } ],
  "hard_stops": [ { "field": "Salary Type", "request": "Make this role salaried" } ],
  "title": { "requested": false, "proposed": "", "reason": "" },
  "justification": "",
  "message": { "intro": "Got it.", "notes": ["One short note."], "ask": "Want to adjust anything, or is it ready for HR?" }
}
```

### 6.5 Test in the editor
1. **Test**. Check that:
   - `changes` lists Principal Duties (and probably KSAs) with `keep` / `new` lines
   - every original line number is kept, once each
   - `unchanged` lists the other sections
   - `message.ask` is a next step or the justification question
2. **LatestRequest** = `Make this role exempt` → `status` should be `hard_stop`.
3. Paste the first output into **CurrentDraft**, then set **LatestRequest** = `Make the new duty shorter`. Only that line should change; everything else should be copied.
4. **LatestRequest** = `They train new tellers now` → no People Management item in `indirect`.
5. **Save**.

### 6.6 Tool settings
**Tools** → **JD Drafter**:
- **Description:** `Internal. Drafts and judges job description changes. Used only by the Draft JD Update topic.`
- **When will this be used?** → **Only when referenced by topics or agents** → **Save**.

✅ **Part 6 done when:** the editor returns valid JSON for a new request, a revision and a hard stop, and "train new tellers" isn't flagged as People Management.

---

## Part 7 — JD Final Check prompt

**What it does:** runs once at submit. It extracts the justification and the indirect answers, compares the updated job with neighboring levels, checks title support, adds an HR-only classification note, infers reason categories, and writes the change summary and HR summary.

**It must match v1's JD Final Review output.** Send HR Review Email parses **FinalReviewJSON**. These are the keys and types it reads, so keep them exactly:

| Key | Type | Used by the email for |
|---|---|---|
| `level_match` | true/false | The Level block and the "Level overlap" chip |
| `matched_level_title` | text | The Level block and chip |
| `level_recommendation` | text | The Level rationale |
| `levels_compared` | **text** (comma-separated titles) | The Level block |
| `title_supported` | true/false | The title support label |
| `title_support_assessment` | text | (saved in its own column) |
| `change_summary` | **text**, one `- Section: change` line per section | The Summary of Changes list (the part before the colon is bolded) |
| `hr_summary` | text | (saved in HRSummary) |
| `indirect_items` | list of {field, evidence, answer, status} | The Indirect Impacts cards. `field` must be exactly `People Management`, `Sales/Non-Sales`, `Relationship Manager` or `NMLS Required`. `status` must be `Confirmed`, `Manager says no` or `Unclear` |
| `readiness`, `followups` | text, list | Always `"ready"` and `[]` |

### 7.1 Create
1. **Tools** → **+ Add a tool** → **+ New tool** → **Prompt** → rename it `JD Final Check`.
2. Model and temperature: the same as 6.1.
3. Inputs (all **Text**), with samples:

| Input | Sample |
|---|---|
| `JobContext` | The 6.2 JobContext sample |
| `HRContext` | `Salary Type: Non-Exempt; Grade: 5` |
| `AdjacentLevels` | `(none)` |
| `Draft` | A JD Drafter output from your 6.5 test |
| `ChangesText` | `**Principal Duties**: Adds opening small business deposit accounts.` |
| `RequestHistory` | `- They will start opening small business accounts.` |
| `CheckQuestions` | `- Will this role have sales or referral goals for business accounts?` |
| `CheckAnswers` | `No, referrals only. We're rolling out small business banking in every branch.` |

### 7.2 Instructions
Paste the text, swap each `{Input}` for the real input (type `/`), and fill in the `[[FIRM]]` parts.

```text
You are the final reviewer for a job description update at [[FIRM: company name]], just before it goes to HR. Most of what you write is for HR. Only "level_recommendation" is shown to the manager.

=== INPUTS ===
THE JOB (original; lines numbered within each section):
{JobContext}

HR-ONLY CONTEXT (use only in classification_note_hr and hr_summary; never in level_recommendation):
{HRContext}

NEIGHBORING LEVELS:
{AdjacentLevels}

DRAFT (JSON from the drafter):
{Draft}

CHANGES (readable):
{ChangesText}

WHAT THE MANAGER ASKED FOR:
{RequestHistory}

QUESTIONS ASKED AT SUBMIT:
{CheckQuestions}

THE MANAGER'S ANSWERS:
{CheckAnswers}

=== TASKS ===
1. justification: the business reason for this update in the manager's own words (from the answers or the messages), lightly cleaned. Use the DRAFT's justification if it has one. "" if they never gave one. Never invent one.
2. reason_categories: every category that fits, chosen ONLY from this list, spelled exactly: [[FIRM: your v1 Reasons card labels, e.g. "Adding/Removing responsibilities"; "Changing reporting relationship/people leadership"; "Editing qualifications"; "Aligning KSAs"; "Upscales"; "Title"; "Other"]]. Use "Title" whenever DRAFT.title.requested is true.
3. indirect_items: one entry per item in DRAFT.indirect, with:
   - field: exactly "People Management", "Sales/Non-Sales", "Relationship Manager" or "NMLS Required";
   - evidence: the drafter's evidence;
   - answer: the manager's answer, short, in their words ("Not answered" if they didn't);
   - status: "Confirmed" if the manager said the role now has this, "Manager says no" if they said it does not, "Unclear" otherwise;
   - note: a short note in the manager's words, or "".
4. Level: compare the job AFTER the changes with NEIGHBORING LEVELS using [[FIRM: level similarity criteria]]. level_match is true only if the updated job now reads substantially like another level; matched_level_title names it. levels_compared: the titles of every level in NEIGHBORING LEVELS, separated by ", " ("" if none). level_recommendation: two or three friendly sentences to the manager naming the overlapping duties and suggesting a level review may fit better ("" if level_match is false). Never mention grade or pay.
5. Title: if DRAFT.title.requested is true, decide whether the section changes support the proposed title (title_supported) and explain in two or three neutral sentences for HR (title_support_assessment). Never suggest a title. If no title was requested, use true and "".
6. classification_note_hr: using HR-ONLY CONTEXT and [[FIRM: overtime-classification criteria from your qualification criteria document]], say whether the new wording could affect this job's overtime classification, and why. "" if there's no concern.
7. change_summary: one line per changed section, each "- Section: what changed", separated by line breaks. No bold or other markdown.
8. hr_summary: 3 to 6 sentences for the HR reviewer: what's changing, why (justification), any concerns (level, classification, indirect answers, hard stops in the requests), and what HR should look at first.
9. unresolved: any question in QUESTIONS ASKED AT SUBMIT that the manager didn't answer.
10. readiness: always "ready". followups: always [].

=== OUTPUT ===
Return only JSON with every key present (use "", [] or false when empty).
```

### 7.3 Output JSON
**Output** → **JSON** → **Edit format** → paste → **Apply**:

```json
{
  "justification": "We're rolling out small business banking in all branches.",
  "reason_categories": ["Adding/Removing responsibilities"],
  "level_match": false,
  "matched_level_title": "",
  "level_recommendation": "",
  "levels_compared": "Universal Banker II, Universal Banker III",
  "title_supported": true,
  "title_support_assessment": "",
  "classification_note_hr": "",
  "change_summary": "- Principal Duties: Adds opening small business deposit accounts.",
  "hr_summary": "Short summary for HR.",
  "indirect_items": [
    { "field": "Sales/Non-Sales", "evidence": "Business account opening may carry goals.", "answer": "No, referrals only", "status": "Manager says no", "note": "Referrals only, no goals." }
  ],
  "readiness": "ready",
  "followups": [ { "question": "", "why": "", "type": "" } ],
  "unresolved": ["Question text"]
}
```
(The `followups` example item only keeps the field shapes. The instructions make it return `[]`.)

### 7.4 Test, save, set availability
1. **Test** with the samples. Check:
   - `justification` comes from CheckAnswers
   - `indirect_items[0].status` = `Manager says no`
   - `levels_compared` is text
   - every key is present
2. **Save**.
3. **Tools** → **JD Final Check**:
   - **Description:** `Internal. Final review before HR submission. Used only by the Submit JD Update topic.`
   - **When will this be used?** → **Only when referenced by topics or agents** → **Save**.

✅ **Part 7 done when:** the test returns every key in the table above, with the right types and status values.

---

## Part 8 — Rename the v1 topics, create the globals (Reset JD Update)

### 8.1 Rename the v1 topics (keep them on for now)
This frees their names for the v2 topics. Renaming doesn't change how they behave; their trigger descriptions are untouched, so v1 keeps working.

For each of these nine: your **Find/confirm job** topic (e.g. "Update or View Job Description", if it exists), **Start JD Update**, **Show JD Section**, **Preview Section Change**, **Save Section Change**, **Log Hard Stop**, **Request Title Review**, **Review and Submit JD Update**, **Cancel or Switch JD Update**:
1. **Topics** → open the topic → top bar → **Details**.
2. **Name:** add the prefix `zOLD - ` (e.g. `zOLD - Start JD Update`).
3. **Save**. Leave it **On** until Part 14.

### 8.2 Create Reset JD Update
1. **Topics** → **+ Add a topic** → **From blank**.
2. **Details** → **Name:** `Reset JD Update`.
3. Select the **Trigger** node → **…** → **Change trigger** → **It's redirected to**. The orchestrator can't pick it; only other topics can send to it.

### 8.3 Add one Set variable node per global
For each row: **+** → **Variable management** → **Set a variable value** → **Set variable** → **Create new** → click the new variable → **Variable properties**:
- **Variable name:** the name below
- **Usage:** **Global (any topic can access)**

Then close the panel → **To value** → **Formula** → `""` → **Insert**.

| # | Variable | Holds |
|---|---|---|
| 1 | `JDJobCode` | Job Code of the loaded job; also the "a job is loaded" marker. Never shown |
| 2 | `JDJobTitle` | Title |
| 3 | `JDOrigPurpose` | Original Purpose (raw) |
| 4 | `JDOrigDuties` | Original Principal Duties (raw) |
| 5 | `JDOrigEducation` | Original Education (raw) |
| 6 | `JDOrigExperience` | Original Work Experience (raw) |
| 7 | `JDOrigCerts` | Original Certifications/Licenses (raw) |
| 8 | `JDOrigKSAs` | Original KSAs (raw) |
| 9 | `JDContext` | Numbered job text for the prompts (safe fields only) |
| 10 | `JDHRContext` | Salary Type + Grade (HR-only; only JD Final Check gets it) |
| 11 | `JDRelatedLevels` | Related Levels output (safe) |
| 12 | `JDReference` | Reference file text |
| 13 | `JDRequestLog` | Everything the manager asked for, in order |
| 14 | `JDDraft` | The current draft (drafter JSON) |
| 15 | `JDChangesFull` | Readable text of all changes (for JD Final Check) |
| 16 | `JDPropPurpose` | Proposed Purpose (blank = unchanged) |
| 17 | `JDPropDuties` | Proposed Principal Duties |
| 18 | `JDPropEducation` | Proposed Education |
| 19 | `JDPropExperience` | Proposed Work Experience |
| 20 | `JDPropCerts` | Proposed Certifications/Licenses |
| 21 | `JDPropKSAs` | Proposed KSAs |
| 22 | `JDHardStops` | Hard-stop requests, for HR |
| 23 | `JDFinalReview` | JD Final Check JSON (saved as FinalReviewJSON) |
| 24 | `JDJustification` | Business justification |
| 25 | `JDCheckAnswers` | Answers to the submit questions (so they're not asked twice) |
| 26 | `JDCheckDraft` | The draft those answers were given for |

**Save.** No end node is needed: a redirected topic returns to its caller when it finishes.

### 8.4 Switch it off for now
**Topics** list → **Reset JD Update** → toggle **Off**. It goes back on in Part 14.

> **Why off:** none of the v2 topics should run until switch-over. Being off doesn't stop you editing or saving, and the globals still exist for the other topics to use.

✅ **Part 8 done when:** all 26 `JD…` globals appear in the variable picker of any topic, and the nine v1 topics are renamed `zOLD - …` and still on.

---

## Part 9 — Start JD Update topic

**What it does:** loads the job into the globals (Get JD Details, Related Levels, Get JD Reference). If a draft for a different job exists, it confirms before switching. It shows nothing else; drafting happens next.

### 9.1 Create
1. **Topics** → **+ Add a topic** → **From blank** → **Details** → **Name:** `Start JD Update`.
2. **Trigger:** keep **The agent chooses**. **Description:** from 13.2.
3. **Topics** list → toggle it **Off** (until Part 14).

### 9.2 Input and output
**Details** → **Inputs** tab → **Create a new variable**:
- **Name:** `JobCode`
- **How will the agent fill this input?** Dynamically fill with best option
- **Identify as:** User's entire response
- **Should prompt user:** Off
- **Description:** from 13.2

**Outputs** tab → **Create a new variable**:
- **Name:** `LoadedJob` (Text)
- **Description:** from 13.2

> **Layout for 9.3–9.5:** add the three guards one after another, each **below** the previous condition block (use the **+** where the branches rejoin), not nested. Each guard's true branch ends the topic, except "Yes, switch", which falls through.

### 9.3 Guard: no job
1. **+** → **Add a condition** → **…** → **Change to formula**:
   ```powerfx
   IsBlank(Trim(Topic.JobCode))
   ```
2. In its branch:
   - **Send a message:** `Which job description would you like to update?`
   - **Topic management** → **End current topic**

### 9.4 Guard: same job already loaded
1. Below the 9.3 block: **+** → **Add a condition** → formula:
   ```powerfx
   Trim(Topic.JobCode) = Global.JDJobCode
   ```
2. In its branch:
   - **Set a variable value** → `Topic.LoadedJob` = `Global.JDJobTitle`
   - **End current topic**

### 9.5 Guard: switching jobs with unsent changes
1. Below the 9.4 block: **+** → **Add a condition** → formula:
   ```powerfx
   Not(IsBlank(Global.JDDraft))
   ```
2. In its branch: **+** → **Ask a question**:
   - **Message:** `You have unsent changes to ` → **{x}** `Global.JDJobTitle` → `. Discard them and switch jobs?`
   - **Identify:** Multiple choice options → `Yes, switch`, `No, keep working`
   - **Save user response as:** new `Topic.SwitchChoice`
3. In the **No, keep working** branch:
   - **Send a message:** `No problem, we'll keep working on ` + **{x}** `Global.JDJobTitle` + `.`
   - **Set a variable value** → `Topic.LoadedJob` = `Global.JDJobTitle`
   - **End current topic**
4. Leave **Yes, switch** empty. It falls through to 9.6.

### 9.6 Reset, then load with Get JD Details
Below the 9.5 block:
1. **+** → **Topic management** → **Go to another topic** → **Reset JD Update**.
2. **+** → **Add a tool** → **Get JD Details** → its Job Code input → **Formula** `Trim(Topic.JobCode)`. Keep the default output variable names, and fill in this table from L3:

| Field | Get JD Details output variable |
|---|---|
| Job Title | `Topic.[[CHECK]]` |
| Purpose | `Topic.[[CHECK]]` |
| Principal Duties | `Topic.[[CHECK]]` |
| Education | `Topic.[[CHECK]]` |
| Work Experience | `Topic.[[CHECK]]` |
| Certifications/Licenses | `Topic.[[CHECK]]` |
| KSAs | `Topic.[[CHECK]]` |
| People Management | `Topic.[[CHECK]]` |
| Sales/Non-Sales | `Topic.[[CHECK]]` |
| Relationship Manager | `Topic.[[CHECK]]` |
| NMLS Required | `Topic.[[CHECK]]` |
| Salary/Hourly | `Topic.[[CHECK]]` |
| Grade | `Topic.[[CHECK]]` |

> If Get JD Details returns **one** record or JSON output instead of separate fields, use the pattern v1 used to read it (e.g. `ParseJSON(…)` then `Text(…)`).
>
> **The section outputs must be raw** (with `• ` and `<br>`). If Get JD Details cleans the text, line numbering breaks. Tell me the output names and we'll adjust.

### 9.7 Guard: job not found
**+** → **Add a condition** → formula `IsBlank(Topic.[[CHECK: Job Title output]])`. In its branch:
- **Send a message:** `I couldn't find that job. Which one did you mean?`
- **End current topic**

### 9.8 Store the job in globals
Below the 9.7 block, add one **Set a variable value** per row (select the existing global → **Formula**). Wrap non-text outputs in `Text(…)`.

| Global | Formula |
|---|---|
| `Global.JDJobCode` | `Trim(Topic.JobCode)` |
| `Global.JDJobTitle` | `Topic.[[CHECK: Job Title output]]` |
| `Global.JDOrigPurpose` | `Topic.[[CHECK: Purpose output]]` |
| `Global.JDOrigDuties` | `Topic.[[CHECK: Principal Duties output]]` |
| `Global.JDOrigEducation` | `Topic.[[CHECK: Education output]]` |
| `Global.JDOrigExperience` | `Topic.[[CHECK: Work Experience output]]` |
| `Global.JDOrigCerts` | `Topic.[[CHECK: Certifications output]]` |
| `Global.JDOrigKSAs` | `Topic.[[CHECK: KSAs output]]` |
| `Global.JDHRContext` | `"Salary Type: " & Topic.[[CHECK: Salary/Hourly output]] & "; Grade: " & Topic.[[CHECK: Grade output]]` |

### 9.9 Indirect fields summary
**Set a variable value** → **Create new** → `Topic.IndirectSummary` → formula:
```powerfx
"People Management: " & Topic.[[CHECK: People Management output]] &
"; Sales/Non-Sales: " & Topic.[[CHECK: Sales/Non-Sales output]] &
"; Relationship Manager: " & Topic.[[CHECK: Relationship Manager output]] &
"; NMLS Required: " & Topic.[[CHECK: NMLS Required output]]
```

### 9.10 Reference file
1. **+** → **Add a tool** → **Get JD Reference**. Output: `Topic.Reference`.
2. **Set a variable value** → `Global.JDReference` → formula:
   ```powerfx
   If(IsBlank(Topic.Reference), "(no reference file found)", Topic.Reference)
   ```

### 9.11 Build the numbered job context
**Set a variable value** → `Global.JDContext` → formula:
```powerfx
With(
  {
    P: Split(Global.JDOrigPurpose, "<br>"),
    D: Split(Global.JDOrigDuties, "<br>"),
    E: Split(Global.JDOrigEducation, "<br>"),
    W: Split(Global.JDOrigExperience, "<br>"),
    C: Split(Global.JDOrigCerts, "<br>"),
    K: Split(Global.JDOrigKSAs, "<br>")
  },
  "JOB TITLE: " & Global.JDJobTitle & Char(10) &
  "CURRENT INDIRECT FIELDS: " & Topic.IndirectSummary & Char(10) & Char(10) &
  "SECTION: Purpose" & Char(10) &
  Concat(Sequence(CountRows(P)), ThisRecord.Value & ". " & Last(FirstN(P, ThisRecord.Value)).Value, Char(10)) &
  Char(10) & Char(10) & "SECTION: Principal Duties" & Char(10) &
  Concat(Sequence(CountRows(D)), ThisRecord.Value & ". " & Last(FirstN(D, ThisRecord.Value)).Value, Char(10)) &
  Char(10) & Char(10) & "SECTION: Education" & Char(10) &
  Concat(Sequence(CountRows(E)), ThisRecord.Value & ". " & Last(FirstN(E, ThisRecord.Value)).Value, Char(10)) &
  Char(10) & Char(10) & "SECTION: Work Experience" & Char(10) &
  Concat(Sequence(CountRows(W)), ThisRecord.Value & ". " & Last(FirstN(W, ThisRecord.Value)).Value, Char(10)) &
  Char(10) & Char(10) & "SECTION: Certifications/Licenses" & Char(10) &
  Concat(Sequence(CountRows(C)), ThisRecord.Value & ". " & Last(FirstN(C, ThisRecord.Value)).Value, Char(10)) &
  Char(10) & Char(10) & "SECTION: KSAs" & Char(10) &
  Concat(Sequence(CountRows(K)), ThisRecord.Value & ". " & Last(FirstN(K, ThisRecord.Value)).Value, Char(10))
)
```
The drafter refers to original lines by these numbers. They come from the same `Split(…, "<br>")` that Part 10 uses to rebuild, so they always match. If L2 showed a different separator for a section, change it here **and** in Part 10.

### 9.12 Related Levels
1. **+** → **Add a tool** → **Related Levels** → map its input (L4) to `Global.JDJobCode` (or `Global.JDJobTitle` if it takes a title).
2. **Set a variable value** → `Global.JDRelatedLevels` → formula:
   ```powerfx
   If(IsBlank(Topic.[[CHECK: Related Levels output]]), "(no related levels found)", Topic.[[CHECK: Related Levels output]])
   ```
   If the output is a record or table, wrap it: `JSON(Topic.<output>)`.

### 9.13 Set the output
**Set a variable value** → `Topic.LoadedJob` → `Global.JDJobTitle`. **Save.**

✅ **Part 9 done when:** the topic saves without errors. It's tested in Part 15, after switch-over.

---

## Part 10 — Draft JD Update topic

**What it does:** every change, revision, undo or answer about the update runs through here. It calls JD Drafter, **checks the line plan**, saves the draft, builds the proposed text with code, and shows exactly what changed, in the drafter's voice. **No outputs.**

> **Prompt text property:** this part writes `Topic.DraftOut.text`. If L7 showed your prompts expose a different property, use that everywhere this part says `.text`.

### 10.1 Create
1. **Topics** → **+ Add a topic** → **From blank** → **Name:** `Draft JD Update`.
2. **Trigger:** **The agent chooses**. **Description:** from 13.2.
3. Toggle it **Off** (until Part 14).

### 10.2 Input (no outputs)
**Details** → **Inputs** → **Create a new variable**:
- **Name:** `UpdateRequest`
- **How will the agent fill this input?** Dynamically fill with best option
- **Identify as:** User's entire response
- **Should prompt user:** On → **Question:** `What's changing about this job?`
- **Description:** from 13.2

**Don't add outputs.**

### 10.3 Guard: no job loaded
1. **+** → **Add a condition** → formula `IsBlank(Global.JDJobCode)`.
2. In its branch:
   - **Send a message:** `Which job description is this for?`
   - **End current topic**

### 10.4 Create the topic variables first
Below the 10.3 block, add these **Set a variable value** nodes (each **Create new**, Topic). They must exist above everything that uses them, including the loop back in 10.8:

| Variable | Formula |
|---|---|
| `Topic.Tries` | `0` |
| `Topic.PlanOK` | `false` |
| `Topic.ChangesShown` | `""` |

### 10.5 Log the request
**Set a variable value** → `Global.JDRequestLog` → formula:
```powerfx
Global.JDRequestLog & "- " & Topic.UpdateRequest & Char(10)
```

### 10.6 Call JD Drafter
**+** → **Add a tool** → **JD Drafter**. Map each input with **Formula**:

| Input | Formula |
|---|---|
| JobContext | `Global.JDContext` |
| AdjacentLevels | `If(IsBlank(Global.JDRelatedLevels), "(none)", Global.JDRelatedLevels)` |
| Reference | `Global.JDReference` |
| CurrentDraft | `If(IsBlank(Global.JDDraft), "(none yet)", Global.JDDraft)` |
| RequestHistory | `Right(Global.JDRequestLog, 3000)` |
| LatestRequest | `Topic.UpdateRequest` |

**Output:** save it as `Topic.DraftOut`.

> The request history is limited to the last 3,000 characters to keep the drafter fast. The draft JSON already carries everything agreed so far.

### 10.7 Read the status and check the plan
1. **Set a variable value** → **Create new** → `Topic.Status` → formula:
   ```powerfx
   Text(ParseJSON(Topic.DraftOut.text).status)
   ```
2. **Set a variable value** → `Topic.PlanOK` (the existing variable) → formula:
   ```powerfx
   With(
     { d: ParseJSON(Topic.DraftOut.text) },
     CountRows(
       Filter(
         Table(d.changes),
         With(
           {
             sec: Text(ThisRecord.Value.section),
             ks: Filter(ForAll(Table(ThisRecord.Value.lines), Value(ThisRecord.Value.keep)), Value > 0)
           },
           With(
             {
               n: CountRows(Split(Switch(sec,
                    "Purpose", Global.JDOrigPurpose,
                    "Principal Duties", Global.JDOrigDuties,
                    "Education", Global.JDOrigEducation,
                    "Work Experience", Global.JDOrigExperience,
                    "Certifications/Licenses", Global.JDOrigCerts,
                    "KSAs", Global.JDOrigKSAs,
                    "~INVALID~"), "<br>"))
             },
             Not(sec in ["Purpose", "Principal Duties", "Education", "Work Experience", "Certifications/Licenses", "KSAs"]) ||
             CountRows(Filter(ks, Value > n)) > 0 ||
             CountRows(ks) <> CountRows(Distinct(ks, Value))
           )
         )
       )
     ) = 0
   )
   ```
   **PlanOK is false if** a section name isn't one of the six exact names, a `keep` points past the section's last line, or the same `keep` is used twice. Any of these would silently corrupt the proposed text.

### 10.8 Retry once on a bad plan
1. **+** → **Add a condition** → formula:
   ```powerfx
   Topic.Status = "ready" && Not(Topic.PlanOK) && Topic.Tries = 0
   ```
2. In its branch:
   - **Set a variable value** → `Topic.Tries` → `1`
   - **Topic management** → **Go to step** → click the **JD Drafter** node (10.6)

Numbering slips happen occasionally, and one automatic retry fixes most of them without the manager noticing. The request log isn't duplicated, because the loop goes back to the drafter node, below the log node.

### 10.9 Log hard stops for HR
Below the 10.8 block: **Set a variable value** → `Global.JDHardStops` → formula:
```powerfx
Global.JDHardStops & Concat(Table(ParseJSON(Topic.DraftOut.text).hard_stops), "- [" & Text(ThisRecord.Value.field) & "] " & Text(ThisRecord.Value.request) & Char(10))
```
This is the same `- [Field] request` format v1 used, so the HR email shows the field in bold.

### 10.10 Condition: a new, valid draft
**+** → **Add a condition** → formula:
```powerfx
Topic.Status = "ready" && Topic.PlanOK
```
Add 10.10a–d in its branch, in this order. Leave **All other conditions** empty; when it doesn't apply, the saved draft doesn't change.

**10.10a Save the draft.** **Set a variable value** → `Global.JDDraft` →
```powerfx
If(
  CountRows(Table(ParseJSON(Topic.DraftOut.text).changes)) = 0 &&
    Not(Boolean(ParseJSON(Topic.DraftOut.text).title.requested)),
  "",
  Topic.DraftOut.text
)
```
If the manager removed every change, the draft is cleared.

**10.10b Build the six proposed sections.** Add six **Set a variable value** nodes from this template, swapping in `ORIG_GLOBAL` and `SECTION_NAME` (in **both** places):
```powerfx
If(
  IsBlank(Global.JDDraft),
  "",
  With(
    {
      orig: Split(ORIG_GLOBAL, "<br>"),
      chg: LookUp(Table(ParseJSON(Global.JDDraft).changes), Text(ThisRecord.Value.section) = "SECTION_NAME")
    },
    If(
      IsBlank(chg),
      "",
      With(
        {
          bullet: If(
            StartsWith(Trim(First(orig).Value), "•") ||
              ("SECTION_NAME" in ["Principal Duties", "KSAs", "Certifications/Licenses"] && IsBlank(Trim(First(orig).Value))),
            "• ", "")
        },
        Concat(
          Table(chg.Value.lines),
          If(
            Value(ThisRecord.Value.keep) > 0,
            Last(FirstN(orig, Value(ThisRecord.Value.keep))).Value,
            bullet & Trim(Substitute(Text(ThisRecord.Value.new), "•", ""))
          ),
          "<br>"
        )
      )
    )
  )
)
```

| Set this global | ORIG_GLOBAL | SECTION_NAME |
|---|---|---|
| `Global.JDPropPurpose` | `Global.JDOrigPurpose` | `Purpose` |
| `Global.JDPropDuties` | `Global.JDOrigDuties` | `Principal Duties` |
| `Global.JDPropEducation` | `Global.JDOrigEducation` | `Education` |
| `Global.JDPropExperience` | `Global.JDOrigExperience` | `Work Experience` |
| `Global.JDPropCerts` | `Global.JDOrigCerts` | `Certifications/Licenses` |
| `Global.JDPropKSAs` | `Global.JDOrigKSAs` | `KSAs` |

What this does:
- `keep: n` copies original line *n* exactly; `keep: 0` inserts the new text.
- `• ` is added for bulleted sections, including bulleted sections that were empty before. If L2 showed KSAs or Certifications aren't bulleted, take them out of the list in the formula.
- Lines are joined with `<br>`, the format your Save flow and Build Redline Rows expect.
- An unchanged section stays `""`, which the Save flow treats as untouched.

**10.10c Readable text of all changes** (for JD Final Check). **Set a variable value** → `Global.JDChangesFull` →
```powerfx
If(
  IsBlank(Global.JDDraft),
  "",
  Concat(
    Table(ParseJSON(Global.JDDraft).changes),
    With(
      { cv: ThisRecord.Value },
      With(
        {
          sec: Text(cv.section),
          orig: Split(
            Switch(
              Text(cv.section),
              "Purpose", Global.JDOrigPurpose,
              "Principal Duties", Global.JDOrigDuties,
              "Education", Global.JDOrigEducation,
              "Work Experience", Global.JDOrigExperience,
              "Certifications/Licenses", Global.JDOrigCerts,
              "KSAs", Global.JDOrigKSAs,
              ""
            ),
            "<br>"
          ),
          keeps: "," & Concat(Table(cv.lines), Text(ThisRecord.Value.keep), ",") & ","
        },
        "**" & sec & "**: " & Text(cv.summary) & Char(10) &
        Concat(
          Filter(Table(cv.lines), Value(ThisRecord.Value.keep) = 0),
          Char(10) & "- Add: " & Trim(Substitute(Text(ThisRecord.Value.new), "•", ""))
        ) &
        Concat(
          Filter(Sequence(CountRows(orig)), Not(("," & ThisRecord.Value & ",") in keeps)),
          Char(10) & "- Remove: " & Trim(Substitute(Substitute(Substitute(Last(FirstN(orig, ThisRecord.Value)).Value, "•", ""), Char(9), " "), Char(160), " "))
        )
      )
    ),
    Char(10) & Char(10)
  )
)
```

**10.10d What to show this turn.** **Set a variable value** → `Topic.ChangesShown` (the existing variable) →
```powerfx
If(
  IsBlank(Global.JDDraft),
  "",
  With(
    { t: "|" & Concat(Table(ParseJSON(Global.JDDraft).touched), Text(ThisRecord.Value), "|") & "|" },
    Concat(
      Filter(Table(ParseJSON(Global.JDDraft).changes), ("|" & Text(ThisRecord.Value.section) & "|") in t),
      With(
        { cv: ThisRecord.Value },
        With(
          {
            sec: Text(cv.section),
            orig: Split(
              Switch(
                Text(cv.section),
                "Purpose", Global.JDOrigPurpose,
                "Principal Duties", Global.JDOrigDuties,
                "Education", Global.JDOrigEducation,
                "Work Experience", Global.JDOrigExperience,
                "Certifications/Licenses", Global.JDOrigCerts,
                "KSAs", Global.JDOrigKSAs,
                ""
              ),
              "<br>"
            ),
            keeps: "," & Concat(Table(cv.lines), Text(ThisRecord.Value.keep), ",") & ","
          },
          "**" & sec & "**: " & Text(cv.summary) & Char(10) &
          Concat(
            Filter(Table(cv.lines), Value(ThisRecord.Value.keep) = 0),
            Char(10) & "- Add: " & Trim(Substitute(Text(ThisRecord.Value.new), "•", ""))
          ) &
          Concat(
            Filter(Sequence(CountRows(orig)), Not(("," & ThisRecord.Value & ",") in keeps)),
            Char(10) & "- Remove: " & Trim(Substitute(Substitute(Substitute(Last(FirstN(orig, ThisRecord.Value)).Value, "•", ""), Char(9), " "), Char(160), " "))
          )
        )
      ),
      Char(10) & Char(10)
    ) &
    With(
      { others: Concat(Filter(Table(ParseJSON(Global.JDDraft).changes), Not(("|" & Text(ThisRecord.Value.section) & "|") in t)), Text(ThisRecord.Value.section), ", ") },
      If(IsBlank(others), "", Char(10) & Char(10) & "_Also in your draft (unchanged this time): " & others & "_")
    )
  )
)
```
The manager sees only the sections touched this turn (all of them on a first draft), plus a one-line reminder of the others.

### 10.11 Send the message
Below the 10.10 block: **+** → **Send a message** → **{x}** → **Formula** → paste → **Insert**:
```powerfx
With(
  { d: ParseJSON(Topic.DraftOut.text) },
  If(
    Topic.Status = "ready" && Not(Topic.PlanOK),
    "I couldn't build that draft cleanly. Could you say the change again, maybe a little differently?",
    Text(d.message.intro) &
    If(Topic.Status = "ready" && Not(IsBlank(Topic.ChangesShown)), Char(10) & Char(10) & Topic.ChangesShown, "") &
    If(
      Topic.Status = "ready" && CountRows(Table(d.unchanged)) > 0,
      Char(10) & Char(10) & "No change needed: " & Concat(Table(d.unchanged), Text(ThisRecord.Value.section), ", "),
      ""
    ) &
    If(
      CountRows(Table(d.message.notes)) > 0,
      Char(10) & Char(10) & Concat(Table(d.message.notes), "- " & Text(ThisRecord.Value), Char(10)),
      ""
    ) &
    Char(10) & Char(10) & Text(d.message.ask)
  )
)
```
**Save.** The topic ends here; with no outputs, the orchestrator has nothing to restate.

✅ **Part 10 done when:** the topic saves without formula errors. It's tested in Part 15.

---

## Part 11 — Discard JD Update topic

### 11.1 Create
1. **Topics** → **+ Add a topic** → **From blank** → **Name:** `Discard JD Update`.
2. **Trigger:** **The agent chooses** → **Description:** from 13.2. No inputs, no outputs.
3. Toggle it **Off** (until Part 14).

### 11.2 Guard: nothing in progress
**Add a condition** → formula:
```powerfx
IsBlank(Global.JDDraft) && IsBlank(Global.JDJobCode)
```
In its branch:
- **Send a message:** `You're all set. There's no update in progress right now.`
- **Topic management** → **End all topics**

### 11.3 Confirm
Below the block: **Ask a question**:
- **Message:** `Discard this update for ` → **{x}** `Global.JDJobTitle` → `? This can't be undone.`
- **Identify:** Multiple choice → `Yes, discard`, `No, keep it`
- **Save as:** new `Topic.Confirm`

### 11.4 Branches
**Yes, discard:**
1. **Go to another topic** → **Reset JD Update**
2. **Send a message:** `Done. Those changes are discarded. If you'd like to update a job, just tell me what's changing.`
3. **End all topics**

**No, keep it:**
1. **Send a message:** `Okay, your draft is still here.`
2. **End current topic**

**Save.**

✅ **Part 11 done when:** the topic saves. It's tested in Part 15.

---

## Part 12 — Submit JD Update topic

**What it does:** asks any remaining questions in one message (only if they weren't already answered for this draft), runs JD Final Check, guarantees a business justification, shows a summary, and submits through your existing Save flow. **No outputs**; it resets and uses **End all topics**.

### 12.1 Create
1. **Topics** → **+ Add a topic** → **From blank** → **Name:** `Submit JD Update`.
2. **Trigger:** **The agent chooses**. **Description:** from 13.2. No inputs, no outputs.
3. Toggle it **Off** (until Part 14).

### 12.2 Guard: nothing to submit
**+** → **Add a condition** → formula `IsBlank(Global.JDDraft)`. In its branch:
- **Send a message:** `There aren't any changes to send yet. What's changing about the job?`
- **End current topic**

### 12.3 Guard: title change with no supporting changes
Below 12.2's block: **+** → **Add a condition** → formula:
```powerfx
Boolean(ParseJSON(Global.JDDraft).title.requested) && CountRows(Table(ParseJSON(Global.JDDraft).changes)) = 0
```
In its branch:
- **Send a message:** `A title review needs supporting changes in the job description, such as new duties or a broader purpose. What's changed about the work that supports the new title?`
- **End current topic**

### 12.4 Create the topic variables first

| Variable (Create new, Topic) | Formula |
|---|---|
| `Topic.CheckAnswers` | `If(IsBlank(Global.JDCheckAnswers), "(none)", Global.JDCheckAnswers)` |
| `Topic.JustAnswer` | `""` |

> Don't create `Topic.Decision` here. The multiple-choice question in 12.11 creates it with the right (choice) type. A text variable made here couldn't hold that answer, because a variable's type locks when it's created.

### 12.5 Build the questions
**Set a variable value** → **Create new** → `Topic.CheckQuestions` → formula:
```powerfx
With(
  { d: ParseJSON(Global.JDDraft) },
  Concat(Table(d.indirect), "- " & Text(ThisRecord.Value.question) & Char(10)) &
  If(Boolean(d.title.requested) && IsBlank(Text(d.title.proposed)), "- What title are you proposing for this role?" & Char(10), "") &
  If(Boolean(d.title.requested) && IsBlank(Text(d.title.reason)), "- Why does the title need to change?" & Char(10), "") &
  If(IsBlank(Text(d.justification)), "- What's the business reason for this update? HR uses it when reviewing the request." & Char(10), "")
)
```

### 12.6 Ask them all at once (only if needed)
1. **+** → **Add a condition** → formula:
   ```powerfx
   Not(IsBlank(Topic.CheckQuestions)) && (IsBlank(Global.JDCheckAnswers) || Global.JDCheckDraft <> Global.JDDraft)
   ```
   The questions are asked only if they haven't been answered for this exact draft. A manager who asks a side question and then says "send it" isn't asked twice.
2. In its branch:
   - **Ask a question**:
     - **Message** → **{x}** → **Formula**:
       ```powerfx
       "Before I send this to HR, " & If(CountRows(Filter(Split(Topic.CheckQuestions, Char(10)), Len(Trim(Value)) > 0)) = 1, "one quick question:" & Char(10) & Char(10) & Topic.CheckQuestions, "a few quick questions:" & Char(10) & Char(10) & Topic.CheckQuestions & Char(10) & "You can answer them all in one message.")
       ```
       Blank lines are filtered out before counting, because the list always ends with a line break. With one question, the message says "one quick question" and leaves off "answer them all".
     - **Identify:** User's entire response
     - **Save user response as:** the existing `Topic.CheckAnswers`
   - **Set a variable value** → `Global.JDCheckAnswers` → `Topic.CheckAnswers`
   - **Set a variable value** → `Global.JDCheckDraft` → `Global.JDDraft`

### 12.7 Run JD Final Check
Below the 12.6 block: **+** → **Add a tool** → **JD Final Check**:

| Input | Formula |
|---|---|
| JobContext | `Global.JDContext` |
| HRContext | `Global.JDHRContext` |
| AdjacentLevels | `If(IsBlank(Global.JDRelatedLevels), "(none)", Global.JDRelatedLevels)` |
| Draft | `Global.JDDraft` |
| ChangesText | `Global.JDChangesFull` |
| RequestHistory | `Right(Global.JDRequestLog, 3000)` |
| CheckQuestions | `If(IsBlank(Topic.CheckQuestions), "(none)", Topic.CheckQuestions)` |
| CheckAnswers | `Topic.CheckAnswers` |

Output: `Topic.FinalOut`.

### 12.8 Store the result and the justification
1. **Set a variable value** → `Global.JDFinalReview` → `Topic.FinalOut.text`
2. **Set a variable value** → `Global.JDJustification` → `Text(ParseJSON(Global.JDFinalReview).justification)`

### 12.9 Justification gate
1. **+** → **Add a condition** → `IsBlank(Global.JDJustification)`.
2. In its branch:
   - **Ask a question**:
     - **Message:** `One thing HR needs before I send this: what's the business reason for this update? A sentence or two is fine.`
     - **Identify:** User's entire response → **Save as:** the existing `Topic.JustAnswer`
   - **Set a variable value** → `Global.JDJustification` → `Topic.JustAnswer`

### 12.10 Show the summary
Below the 12.9 block: **Send a message** → **{x}** → **Formula**:
```powerfx
With(
  { d: ParseJSON(Global.JDDraft), f: ParseJSON(Global.JDFinalReview) },
  "Here's what will go to HR for **" & Global.JDJobTitle & "**:" & Char(10) & Char(10) &
  Concat(Table(d.changes), "- **" & Text(ThisRecord.Value.section) & "**: " & Text(ThisRecord.Value.summary), Char(10)) &
  If(Boolean(d.title.requested), Char(10) & "- **Title review**: proposed title " & Text(d.title.proposed), "") &
  Char(10) & Char(10) & "**Business justification:** " & Global.JDJustification &
  If(
    CountRows(Table(f.indirect_items)) > 0,
    Char(10) & Char(10) & "**Your answers for HR:** " & Concat(Table(f.indirect_items), Text(ThisRecord.Value.field) & ": " & Text(ThisRecord.Value.answer), "; "),
    ""
  ) &
  If(Not(IsBlank(Text(f.level_recommendation))), Char(10) & Char(10) & "**Heads up:** " & Text(f.level_recommendation), "") &
  If(Not(IsBlank(Global.JDHardStops)), Char(10) & Char(10) & "HR will also see the request I couldn't include in this update.", "") &
  If(CountRows(Table(f.unresolved)) > 0, Char(10) & Char(10) & "I'll let HR know these weren't answered: " & Concat(Table(f.unresolved), Text(ThisRecord.Value), "; "), "")
)
```

### 12.11 Ask to submit, with the v1 guard
This replaces a simple multiple-choice question. Typed messages like "What happens after I submit?" or "yes but drop the KSA change" must **never** submit. That was the v1 bug.

1. **+** → **Ask a question**:
   - **Message:** `Ready to send it to HR?`
   - **Identify:** Multiple choice options:
     - `Submit to HR`. Synonyms: `send it`, `send it to HR`, `submit it`
     - `Keep editing`. No synonyms.
     - `Cancel update`. No synonyms.
   - **Save user response as:** **Create new** → `Topic.Decision` (let the question create it)
2. The question's **…** → **Properties** → **Question behavior**:
   - **Action if no entity found:** **Set variable to empty (no value)**
   - **Reprompt:** **Don't repeat**
   - **Allow switching to another topic:** **On**
3. Copilot Studio adds a condition with one branch per option under the question. Click that condition node → **…** → **Delete**. You'll add your own after the guard.
4. Below the question: **Set a variable value** → `Topic.Decision` → formula:
   ```powerfx
   If("?" in System.Activity.Text || CountRows(Split(Trim(System.Activity.Text), " ")) > 4, Blank(), Topic.Decision)
   ```
5. Below it: **+** → **Add a condition** → first condition: `Topic.Decision` **is equal to** `Submit to HR`. Then **+ New condition** for `Keep editing`, and again for `Cancel update`. **All other conditions** covers everything else.

### 12.12 Branch: All other conditions (a typed reply)
- **Topic management** → **Go to another topic** → **Draft JD Update** → **UpdateRequest** → **Formula** `System.Activity.Text`
- **End current topic**

The drafter handles it: a revision updates the draft, and a question gets answered with the draft unchanged. The manager then says "send it" when ready, and the questions aren't asked again (12.6).

### 12.13 Branch: Submit to HR
1. **Add a tool** → **Save JD Update Request**. Map every input (**Formula**):

| Save flow input | Formula |
|---|---|
| JobTitle | `Global.JDJobTitle` |
| JobCode | `Global.JDJobCode` |
| RequestedBy | `[[CHECK: L5, e.g. System.User.Email]]` |
| SectionsChanged | `Concat(Table(ParseJSON(Global.JDDraft).changes), Text(ThisRecord.Value.section), ",")` |
| SectionsAdded | `""` |
| Reasons | `Concat(Table(ParseJSON(Global.JDFinalReview).reason_categories), Text(ThisRecord.Value), ",")` |
| OtherReason | `""` |
| ChangesDetail | `Text(ParseJSON(Global.JDFinalReview).change_summary)` |
| IndirectFlags | `Concat(Table(ParseJSON(Global.JDFinalReview).indirect_items), Text(ThisRecord.Value.field) & ": " & Text(ThisRecord.Value.answer) & If(IsBlank(Text(ThisRecord.Value.note)), "", " (" & Text(ThisRecord.Value.note) & ")"), Char(10))` |
| HardStops | `Global.JDHardStops` |
| LevelRecommendation | `If(Boolean(ParseJSON(Global.JDFinalReview).level_match), Text(ParseJSON(Global.JDFinalReview).matched_level_title) & ": " & Text(ParseJSON(Global.JDFinalReview).level_recommendation), "")` |
| TitleReviewRequested | `Boolean(ParseJSON(Global.JDDraft).title.requested)` |
| ProposedTitle | `Text(ParseJSON(Global.JDDraft).title.proposed)` |
| TitleJustification | `Text(ParseJSON(Global.JDDraft).title.reason)` |
| TitleSupportAssessment | `Text(ParseJSON(Global.JDFinalReview).title_support_assessment)` |
| HRSummary | `"Business justification: " & Global.JDJustification & Char(10) & Char(10) & Text(ParseJSON(Global.JDFinalReview).hr_summary) & If(IsBlank(Text(ParseJSON(Global.JDFinalReview).classification_note_hr)), "", Char(10) & Char(10) & "Classification note: " & Text(ParseJSON(Global.JDFinalReview).classification_note_hr))` |
| ProposedPurpose | `Global.JDPropPurpose` |
| ProposedDuties | `Global.JDPropDuties` |
| ProposedEducation | `Global.JDPropEducation` |
| ProposedExperience | `Global.JDPropExperience` |
| ProposedCerts | `Global.JDPropCerts` |
| ProposedKSA | `Global.JDPropKSAs` |
| FinalReviewJSON | `Global.JDFinalReview` |
| ManagerNotes | `Global.JDRequestLog & If(Topic.CheckAnswers = "(none)", "", "- Answers at submit: " & Topic.CheckAnswers & Char(10))` |
| BusinessJustification | `Global.JDJustification` |

   **Output:** make sure the DocLink output is saved as `Topic.DocLink`.

2. **About the formats:**
   - **SectionsChanged** now holds display names (`Principal Duties,KSAs`), which show better as chips in the HR email.
   - **Reasons** uses your v1 card labels, joined with `,` as v1 did.
   - **HardStops** uses v1's `- [Field] request` lines.
   - **ManagerNotes** lines start with `- `. The email turns each into a bullet.

3. **Send a message:** your v1 Submitted! message (L6), for example:
   > Submitted! HR has your update request for **{Global.JDJobTitle}**.

   Then a **second** message, only if there's a link. **Add a condition** → `!IsBlank(Topic.DocLink)` → **Send a message:** `Here's your copy with the changes marked: [Download your copy]({Topic.DocLink})`
4. **Go to another topic** → **Reset JD Update**
5. **Topic management** → **End all topics**

### 12.14 Branch: Keep editing
- **Send a message:** `Sure. What would you like to change?`
- **End current topic**

### 12.15 Branch: Cancel update
- **Go to another topic** → **Discard JD Update**

**Save.**

✅ **Part 12 done when:** the topic saves without formula errors and the Save flow node shows every input mapped.

---

## Part 13 — Instructions, descriptions, greeting (prepare)

Prepare these now and apply them in Part 14. Tool and topic descriptions can be pasted now.

### 13.1 Agent instructions (paste in Part 14)
Fill in the two `[[FIRM]]` markers. About 4,700 characters.

```text
ROLE
You are the Job Description Expert for [[FIRM: company name]] HR. You help managers find job descriptions, understand them, and update them. You know how job descriptions work here: job levels, what each section is for, how they're worded, and what needs HR's attention. Act like the expert a manager wishes they had: conversational, direct, and helpful. Lead the conversation, but let the manager steer.

WHAT YOU DO
- Find one job by name. Use Fuzzy match when the user names a particular job, even loosely or with typos ("UB 2", "the teller job"). If the top match clearly fits, use it. If several are close, list their titles and ask which one. If nothing matches, try Find Jobs with a key word before asking the user.
- Find many jobs. Use Find Jobs for any request to list, count or browse jobs, by title words ("all lead roles") or by content ("jobs that mention lending"). Show titles as a short list with the total count. If there are more than you show, say so and offer to narrow down.
- Show a job. Use Get Job with the job code. Show what the user asked for: one section, or the whole job description.
- Answer questions about job descriptions, levels, sections and our process from your knowledge sources.
- Update a job description (below).

UPDATING A JOB DESCRIPTION
1. Load the job: when the user wants to change a specific job, call Start JD Update with its job code.
2. If the user has already said what's changing, call Draft JD Update right away. If not, ask what's changing about the job, in plain words. Never ask which sections to change; working that out is your job.
3. Call Draft JD Update every time the user describes a change, asks to revise the draft (reword, shorten, add, remove, undo), or answers a question about the update, including the business reason. It shows the user the proposed changes and notes itself. Afterwards, don't repeat or summarize what it showed.
4. Side questions are welcome at any time: looking at another job, comparing levels, asking what a section means. Use Get Job for other jobs; it doesn't affect the update. Then pick the update back up.
5. When the user is happy ("looks good", "send it", "submit"), call Submit JD Update. It asks the final confirming questions, makes sure there's a business justification, shows a summary, and submits.
6. To throw the changes away, call Discard JD Update. One job per update: to update a different job, call Start JD Update with the new job code; it confirms before discarding.

RULES
- Never show, mention, guess, or discuss Grade, Job Code, Salary Type (exempt/non-exempt, salaried/hourly) or Status. Job codes in tool results are only for passing between tools; never include them in a reply. If asked, say HR manages those and they can't be changed here.
- Never write job description wording yourself, and never show a complete updated job description. All drafting goes through Draft JD Update so it's checked and saved.
- Never suggest a job title. Titles come from the user.
- Don't ask the confirming questions about people management, sales, relationship manager or NMLS yourself; Submit JD Update asks them.
- Never say a request was sent to HR unless Submit JD Update confirmed it.
- Don't add your own message before Start JD Update, or after Draft JD Update or Submit JD Update.

STYLE
Conversational, warm and brief. Plain language; no HR jargon unless the user uses it. Short paragraphs; bullets only for lists, with a blank line before the list. Never put job description text in code blocks. At most one question per reply. Don't over-explain or apologize. When the user is done ("that's it", "thanks"), close in one friendly line and don't call any tools.

WHEN YOU DON'T KNOW
If a process question isn't covered by your knowledge, say so and suggest [[FIRM: HR contact or mailbox]].
```

### 13.2 Descriptions

| Where | Text |
|---|---|
| **Fuzzy match**: tool description | Finds one specific job by name, even with typos, abbreviations or level variations ("UB 2", "univ banker ii"). Use when the user names a particular job to view or update. Returns ranked matches with their job codes. If one clearly fits, use it; if several are close, ask which one. For lists, counts or content searches, use Find Jobs instead. Never show job codes to the user. |
| **Find Jobs**: tool description | Searches all job descriptions. Use for any request to list, count, or browse jobs (for example "all lead roles", "banker jobs", "jobs that mention lending"). For one job the user names, use Fuzzy match instead. Returns the total count and one line per job: title (job code). Use the code with Get Job or Start JD Update. Never show job codes to the user. |
| Find Jobs → TitleQuery | A word or short phrase that must appear in the job title, such as "lead" or "universal banker". Use the most distinctive word. Leave blank for content-only searches. |
| Find Jobs → ContentQuery | A word or short phrase to find anywhere in the job description text, such as "lending" or "wire". Leave blank for title searches. |
| Find Jobs → MaxResults | How many jobs to list. Default 25, maximum 50. |
| **Get Job**: tool description | Shows the current, official job description for one job: Purpose, Principal Duties, Education, Work Experience, Certifications/Licenses, KSAs, and other details. Use when the user wants to see, read, or compare a job or a section. Viewing doesn't start or change an update. If Found is "no", the code didn't match a job. |
| Get Job → JobCode | The job code from Fuzzy match or Find Jobs results. |
| **Start JD Update**: trigger description | Loads a job so the user can update its job description. Use when the user wants to change, update, revise or rewrite a specific job's description and you have its job code from Fuzzy match or Find Jobs, including when they want to switch the update to a different job. Don't use it just to view a job; use Get Job for that. |
| Start JD Update → JobCode | The job code of the job to update, from the Fuzzy match or Find Jobs results. Never ask the user for it; run Fuzzy match first if you don't have it. |
| Start JD Update → output LoadedJob | The job now loaded for updating. Next: if the user already described what's changing, use Draft JD Update; otherwise ask what's changing about the job. Don't show the job description unless asked. |
| **Draft JD Update**: trigger description | Drafts or revises the changes for the job description being updated and shows them to the user. Use every time the user describes a change to the job, asks to revise the draft (reword, shorten, add, remove, undo), or answers a question about the update, including the business reason. It shows its own results; don't repeat them. Not for plain acknowledgments like "ok" or "thanks". |
| Draft JD Update → UpdateRequest | What the user wants changed, in their own words. Include details from earlier messages that belong to this request (for example, a change they described before naming the job). For a revision, the revision they asked for. For an answer, the question and their answer. |
| **Submit JD Update**: trigger description | Finishes the job description update and sends it to HR: asks any final confirming questions, makes sure there's a business justification, shows a summary, and submits after the user confirms. Use when the user says the draft is done or wants to send or submit it ("looks good", "send it to HR", "submit", "that's all the changes"). |
| **Discard JD Update**: trigger description | Throws away the job description changes in progress. Use only when the user clearly wants to cancel or scrap the update ("cancel this update", "scrap these changes", "never mind the update"). Don't use when the user is simply finished talking ("that's it", "thanks", "no thanks", "nope"). |

### 13.3 Greeting (apply in Part 14)
```
Hi! I'm your job description expert. I can find job descriptions (try "show me all the lead roles"), explain how they work, and help you update one. Just tell me what's changing about the job and I'll draft the changes for HR.
```

✅ **Part 13 done when:** the descriptions are pasted on the topics and tools, and the instructions and greeting text are ready.

---

## Part 14 — Switch over

Do this in one sitting. Afterwards, v2 is live in DEV.

### 14.1 Switch the v1 topics off
**Topics** list → for each of the nine `zOLD - …` topics → toggle **Off**.

### 14.2 Switch the v2 topics on
Toggle **On**: **Reset JD Update**, **Start JD Update**, **Draft JD Update**, **Discard JD Update**, **Submit JD Update**.

### 14.3 Tools that should only run inside topics
**Tools** → for each of **Get JD Details**, **Related Levels**, **Get JD Reference**, **JD Drafter**, **JD Final Check**, **Save JD Update Request** → **When will this be used?** → **Only when referenced by topics or agents** → **Save**.

### 14.4 Instructions
**Overview** → **Instructions** → **Edit** → select all → paste 13.1 → **Save**.

### 14.5 Greeting
**Topics** → **System** → **Conversation Start** → replace the greeting with 13.3 → **Save**.

### 14.6 Knowledge
1. **Knowledge** tab: keep the **JD knowledge** and **job families** files.
2. If the **SharePoint JD list** is a knowledge source: select it → **…** → **Delete**. Find Jobs and Get Job cover it now, without restricted columns.
3. Optional: **+ Add knowledge** → SharePoint → add `JD Expert Reference.txt`, so questions like "what's the difference between a Lead and a Supervisor?" are answered from the same source the drafter uses.
4. If the JD document library is a knowledge source, check its documents for Grade, Job Code, Salary Type or Status.

### 14.7 Fresh session
Test pane → **Start new test session** (refresh icon). Go to Part 15.

> **Rollback:** reverse 14.1–14.4 (zOLD topics on, v2 topics off, instructions from your backup). v1's tools and prompts are untouched.

✅ **Part 14 done when:** only the v2 topics (plus system topics) are on and the new instructions are saved.

---

## Part 15 — Tests and tuning

Start a new test session for each group. Watch the **activity map** to confirm which tool or topic ran.

### 15.1 Retrieval
| # | Say | Expect |
|---|---|---|
| T1 | Can I see all the lead roles? | Find Jobs (TitleQuery "lead"). A list and count; **no job codes** |
| T2 | Which jobs mention lending? | Find Jobs (ContentQuery "lending") |
| T3 | Show me the Universal Banker I job description | Fuzzy match → Get Job. Clean bullets; no grade, code, salary type or status |
| T4 | Show me the univeral banker 2 job | Fuzzy match handles the typo |
| T5 | What grade is the Universal Banker II? | Polite decline: HR manages that |

### 15.2 Drafting
| # | Say | Expect |
|---|---|---|
| T6 | Our Universal Banker Is are going to start opening small business accounts | Fuzzy match → Start JD Update → Draft JD Update. Add lines for Duties (likely KSAs); "No change needed" list; any Sales/Non-Sales concern as a note, not a question; justification asked, or a next step |
| T7 | Make that duty mention they refer complex needs to the business banking team | Only Principal Duties shown; an "Also in your draft" line |
| T8 | Drop the KSA change | KSAs leave the draft |
| T9 | (new session) I need to update a job, they'll handle wire transfers now → *agent asks which job* → Operations Specialist II | The draft reflects wire transfers |
| T10 | Tellers will approve overdrafts now | The in-scope version (reviews/refers) with a one-sentence reason |
| T11 | (on a Level I job) add a duty you know appears in its Level II | Draft plus a level-drift note naming Level II |
| T12 | The lead will have final authority on team decisions and work independently | A neutral rewrite plus a classification note; no legal terms |
| T13 | Also make this role exempt | That part blocked, the rest continues; HardStops logged |
| T14 | The lead will now do performance reviews | People Management noted; asked at submit |
| T15 | They train new tellers now | **No** People Management note |
| T16 | Retitle it Small Business Banker | Title recorded, never suggested; a title-only submit is blocked |
| T17 | (on a custodian or similar role) Add opening small business accounts | A relevance question before drafting |
| T18 | (mid-update) What does a Universal Banker II do differently? | Get Job for UB II; afterwards "ok, back to it" shows the draft intact |
| T19 | Actually let's do the Teller job instead | Switch confirmation; "No" keeps the draft |
| T20 | Add that Maria is great with clients | not_feasible: JDs describe the role |
| T21 | (a job with Required/Preferred endings) ask for a degree change | The new Education line keeps the exact ending format |

### 15.3 Submitting
| # | Say | Expect |
|---|---|---|
| T22 | Looks good, send it | One message with all questions → answer → summary → **Submit to HR** → Submitted! + link. The request item is complete, including BusinessJustification; the redline shows untouched lines identical |
| T23 | (check the T22 HR email) | Indirect cards, level block, section and reason chips render like a v1 email; the justification is at the top of the HR summary |
| T24 | Submit without ever giving a reason, and skip it in the answers | The justification gate asks once |
| T25 | At "Ready to send it to HR?", type **What happens after I submit?** | **Doesn't submit**; the drafter answers; the draft is unchanged |
| T26 | At "Ready to send it to HR?", type **yes but drop the KSA change** | Doesn't submit; the KSA change is removed |
| T27 | After T25, say **send it** | The summary and the submit question again; the confirming questions are **not** asked again |
| T28 | Scrap this update → then: that's it, thanks | Discard asks once; the goodbye doesn't trigger Discard |
| T29 | (any session) Check the activity map | Get JD Details only ever runs inside Start JD Update |

### 15.4 Plan check (fix test)
Ask for a big Principal Duties rewrite on a job with many duties ("reorder and tighten all the duties"). In the activity map you may occasionally see JD Drafter run **twice**: that's the retry catching a bad plan. In **Variables**, `JDPropDuties` should never contain a duplicated line.

### 15.5 Where to fix what

| If you see | Fix it in |
|---|---|
| Wrong sections chosen, weak wording, too strict or too lenient | JD Drafter: SECTION ROUTING, WRITING STANDARDS, CALIBRATION EXAMPLES; the reference file |
| Level judgments off | Reference file level profiles; the Related Levels output |
| The wrong tool or topic picked | Descriptions (13.2) first, then instructions |
| The agent restates the draft | Instructions step 3; Draft JD Update has no outputs |
| Too many confirming questions | JD Drafter INDIRECT FIELDS criteria |
| HR summary thin | JD Final Check task 8 |
| HR email missing items, or lists look wrong | Part 7's key table; 12.13 formats |
| "I couldn't build that draft cleanly" appears often | JD Drafter OUTPUT rules on `keep`; add a calibration example showing a full keep list; check `JDContext` numbering |

Your 14 persona scripts in `JD-Agent-Sample-Dialogues.md` still apply. Run them after these.

✅ **Part 15 done when:** T1–T29 pass. Then publish, and move to UAT.

---

## Part 16 — Clean up after UAT

Only after UAT sign-off, in each environment:

| Remove | Where |
|---|---|
| The nine `zOLD - …` topics | **Topics** → each → **…** → **Delete** |
| **JD Section Reviewer**, **JD Review Router**, **JD Final Review** (v1) | **Tools** → each → **…** → **Delete** |
| v1 globals: UpdateInProgress, OriginalJD, OriginalJDText, SelectedSections, AddedSections, UpdateReasons, OtherReason, Changes, PendingChecks, HardStopLog, ManagerNotes, TitleReviewRequested, RelatedLevels, FollowupsDone (and any others from v1 topics) | Open **Variables** in any topic. Globals with no remaining references can be deleted |
| `JD-Agent-Instructions-v1-backup.txt` | Keep until v2 has run a while, then archive |

Keep: every flow, the templates, the lists, the libraries and the reference file.

---

## Appendix A — Firm information to fill in

| # | Marker | Where | What | Probably on your work computer as… |
|---|---|---|---|---|
| A1 | Education / Work Experience endings | JD Drafter WRITING STANDARDS | Exact real examples | An existing JD |
| A2 | Level dimensions + profiles | Reference file; JD Drafter SCOPE | Definitions, verbs, core duties per level (**Lead first**) | JD knowledge file, job architecture docs, your lead-role audit notes |
| A3 | Approved phrases | Reference file | Standard duty wording | Existing JDs |
| A4 | Job family notes | Reference file | Per-family summaries | Job families file |
| A5 | Hard stop rules | JD Drafter RULES | Additional hard stops | Your old `[INSERT HARD STOP RULES]` list |
| A6 | Overtime-classification criteria | JD Drafter; JD Final Check task 6 | Signals and patterns | Qualification criteria document |
| A7 | Indirect-field criteria | JD Drafter INDIRECT FIELDS | Signals / not signals per field | Qualification criteria document |
| A8 | Routing + style rules | JD Drafter | Your rules | JD knowledge file / writing guide |
| A9 | Calibration examples (10–15) | JD Drafter | Real requests + the right handling (half of them "this is fine") | Past manager emails, your persona scripts |
| A10 | Reason categories | JD Final Check task 2 | Your v1 Reasons card labels, exactly | v1 Reasons card |
| A11 | Level similarity criteria | JD Final Check task 4 | Your criteria | v1 JD Final Review `[INSERT LEVEL SIMILARITY CRITERIA]` |
| A12 | Company name, HR contact | Prompts, instructions | Names | — |

**The order that pays off fastest:** A7 → A6 → A2 (Lead first) → A9 → A5 → A10 → the rest.

---

## Appendix B — Name reference

**Key between tools:** Job Code.

**Flows:**
- **Existing:** Fuzzy match · Get JD Details (topics-only) · Related Levels (topics-only, safe output) · Save JD Update Request (+ BusinessJustification) · Build Redline Rows · Split Req Pref · Send HR Review Email · Daily CSV (+ cleanup)
- **New:** Find Jobs · Get Job · Get JD Reference (topics-only)

**Prompts:** JD Drafter · JD Final Check (both topics-only)

**Topics:** Reset JD Update (redirect only) · Start JD Update · Draft JD Update · Discard JD Update · Submit JD Update · zOLD - ×9 (off, then deleted)

**Globals (26):**
- JDJobCode · JDJobTitle
- JDOrigPurpose · JDOrigDuties · JDOrigEducation · JDOrigExperience · JDOrigCerts · JDOrigKSAs
- JDContext · JDHRContext · JDRelatedLevels · JDReference · JDRequestLog · JDDraft · JDChangesFull
- JDPropPurpose · JDPropDuties · JDPropEducation · JDPropExperience · JDPropCerts · JDPropKSAs
- JDHardStops · JDFinalReview · JDJustification · JDCheckAnswers · JDCheckDraft

**Exact section names (prompt ↔ formulas):** Purpose · Principal Duties · Education · Work Experience · Certifications/Licenses · KSAs

**Files / columns:** JD Expert Reference.txt (JD Templates) · BusinessJustification (JD Update Requests)

---

## Appendix C — Troubleshooting

| Problem | Cause / fix |
|---|---|
| `ParseJSON` errors in Draft or Submit | The prompt returned text, not JSON: set Output to JSON (6.4 / 7.3). Or a key is missing: re-apply the example JSON. Or the output property isn't `.text` (L7) |
| A section's changes never show or save | The section name doesn't match exactly. The plan check will now report it ("I couldn't build that draft cleanly"); check the drafter's names against Appendix B |
| "I couldn't build that draft cleanly" often | The drafter misnumbers `keep`s. Add a calibration example with a full keep list; check `JDContext` numbering; try a stronger model |
| Line numbers in JDContext look wrong (one long line per section) | Get JD Details returns cleaned text. Use its raw output (9.6) |
| `Sequence`, `With`, `Distinct` or `Last(FirstN())` not recognized | Rare. Bring the exact error text back and the formula will be reworked |
| A prompt input rejected as blank | Wrap it: `If(IsBlank(x), "(none)", x)` |
| The agent repeats the draft after Draft JD Update | Check the topic has **no outputs**; tighten instructions step 3 |
| The agent writes JD wording itself | Instructions RULES line 2; the Draft JD Update description |
| Find Jobs used for one named job, or Fuzzy match for "all lead roles" | Tool descriptions (13.2); each names the other |
| The orchestrator calls Get JD Details directly | 14.3 (topics-only) |
| Find Jobs returns nothing | Internal names wrong, a Choice column missing `?['Value']`, or the Status filter value is wrong. Test the flow alone |
| Find Jobs is slow | Get JDs → **Limit Columns by View** with a view of only the needed columns |
| Get Job / Start says the job isn't found | Job Code is a Number column but the filter has quotes (4.2), or the code has spaces |
| A typed reply at "Ready to send it?" submits | 12.11 steps 3–4: the guard node must sit between the question and your condition, and the auto-generated branches must be deleted |
| Questions asked again after a side question | 12.6 condition; `JDCheckAnswers` / `JDCheckDraft` set after the question |
| HR email fails at the FinalReviewJSON parse, or is missing items | JD Final Check keys and types (Part 7 table) |
| HR email chips look odd | SectionsChanged and Reasons separators (12.13) |
| Duties show as code blocks in Get Job | Run the Part 2 cleanup on that job; add another `'  ', ' '` replace pass in 4.4 |
| Discard runs after "that's it" | The Discard description (13.2) |
| Untouched duties shown as changed in the redline | The Save flow's Get JD and Get JD Details read different columns, or the CSV cleanup ran between loading and submitting (reload the job) |

---

## Appendix D — Keeping Job Codes out of the orchestrator entirely

Use this only if HR says managers must never see Job Codes. The main guide relies on the instructions to keep codes out of chat. This variant makes it structural: the orchestrator only ever sees the SharePoint item **ID**.

1. **Find Jobs** 3.9 map: `concat(item()?['[[CHECK: Job Title]]'], ' (ref ', item()?['ID'], ')')`, and in 13.2 say "ref" instead of "job code".
2. **Get Job:** rename its input to `JobRef`. Replace 4.2–4.3 with **SharePoint – Get item** (**Id** = `JobRef`) and Compose `Job` = `body('Get_item')`.
3. **Fuzzy match:** in its flow, return the item ID instead of the Job Code (or both, with only the ID as an output).
4. **Start JD Update:** rename the input to `JobRef`. Before 9.6, add a flow step that gets the item by ID and returns its Job Code (or extend Get JD Details to accept an ID). Use that Job Code for Get JD Details, Related Levels and `Global.JDJobCode`.
5. Update the instructions and descriptions to say "ref".

---

## Appendix E — Later

- **HR email token for the justification:** add a `{{BusinessJustification}}` block to `HR Review Email.html` and a Token List row in Send HR Review Email. Until then it's at the top of the HR summary.
- **Finish the Purpose inline slots:** independent of v2.
- **Other 📋 items:** the removed Req/Pref ending fix, the requirement-level flag, Edu/Exp paragraph slots, HR email phase 2 (reply processing) and word-level bullet redlines are all unaffected.
- **Cross-family role drift at submit:** search similar titles with Find Jobs and pass the results to JD Final Check.
- **HR alignment tools** (single-JD review, ladder review, batch audit) in a separate HR-facing agent, reusing the JD Drafter knowledge.
- **Create section:** reuse the JD Drafter approach.
- **Multi-job updates** ("add this duty to every Universal Banker level"): currently one job per update.
