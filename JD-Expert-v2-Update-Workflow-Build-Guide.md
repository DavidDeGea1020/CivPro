# JD Expert v2: Conversational Update Workflow — Build Guide

**Builds on:** your current JD Expert build (see *JD-Expert-Component-Inventory.md*). That means your job lookup (Fuzzy match + MatchJobTitle, Get JD Details), Related Levels, Save JD Update Request with its child flows (Build Redline Rows, Split Req Pref, Send HR Review Email), the Word templates, the HR email template, and the SharePoint lists and libraries.

**Goal:** a manager describes what's changing in plain words. The agent then:
- drafts every affected section in house style;
- judges scope, level and overtime-classification risk;
- revises the draft on request;
- captures a business justification;
- submits through your existing redline documents and HR email.

**Scope:** only the **update workflow**. These stay exactly as they are:
- **Your job lookup.** You find and confirm a job the way you do today.
- **The JD list data.** Nothing in the source data changes.

**Build in:** DEV.

> **Markers used in this guide**
> - `[[L1: …]]` … `[[L9: …]]`: a value you look up in Part 1 (a variable name, a label).
> - `[[FIRM: …]]`: firm knowledge only you have (criteria, level profiles, standard wording). Appendix A lists every one.
> - `{InputName}` inside prompt text: delete that text, type `/`, and pick the input with that name.

---

## Contents

- [Part 0 — How it works](#part-0--how-it-works)
- [Part 1 — Prep and lookups](#part-1--prep-and-lookups)
- [Part 2 — Flow changes](#part-2--flow-changes)
- [Part 3 — JD Drafter prompt](#part-3--jd-drafter-prompt)
- [Part 4 — JD Final Check prompt](#part-4--jd-final-check-prompt)
- [Part 5 — Reset JD Update topic (creates the globals)](#part-5--reset-jd-update-topic-creates-the-globals)
- [Part 6 — Draft JD Update topic](#part-6--draft-jd-update-topic)
- [Part 7 — Submit JD Update topic](#part-7--submit-jd-update-topic)
- [Part 8 — Instructions and descriptions (prepare)](#part-8--instructions-and-descriptions-prepare)
- [Part 9 — Switch over begins](#part-9--switch-over-begins)
- [Part 10 — Edit Start JD Update](#part-10--edit-start-jd-update)
- [Part 11 — Edit Show JD Section](#part-11--edit-show-jd-section)
- [Part 12 — Edit Cancel or Switch → Discard JD Update](#part-12--edit-cancel-or-switch--discard-jd-update)
- [Part 13 — Finish the switch over](#part-13--finish-the-switch-over)
- [Part 14 — Tests and tuning](#part-14--tests-and-tuning)
- [Part 15 — Clean up after UAT](#part-15--clean-up-after-uat)
- [Appendix A — Firm information to fill in](#appendix-a--firm-information-to-fill-in)
- [Appendix B — Name reference](#appendix-b--name-reference)
- [Appendix C — Troubleshooting](#appendix-c--troubleshooting)
- [Appendix D — Later](#appendix-d--later)

---

## Part 0 — How it works

### 0.1 What the manager experiences

> **Manager:** Our Universal Banker Is are going to start opening small business accounts.
> **Agent:** *(finds and confirms Universal Banker I, as today)*
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
> **Manager:** Show me the current duties.
> **Agent:** *(shows the current Principal Duties, with a note that the draft changes this section)*
>
> **Manager:** Looks good, send it.
> **Agent:** Before I send this to HR, one quick question:
> - Will this role have sales or referral goals for business accounts?
>
> **Manager:** No, just referrals when needed.
> **Agent:** *(summary)* Ready to send it to HR? → **Submit to HR** → a link to the redlined copy; HR gets the email.

There are no cards and no section-by-section walk. The manager talks in any order: they can revise, undo, look at a section, ask a side question, or switch jobs.

### 0.2 The pieces

```
MANAGER ──► ORCHESTRATOR (agent instructions)
               │
 FIND / VIEW       UPDATE                                            COMMIT
 (unchanged)       Start JD Update (edited) ─► Get JD Details          Submit JD Update (new)
 your lookup:          ├► Related Levels                                  ├► JD Final Check (new prompt)
 Fuzzy match,          └► Get JD Reference (new flow)                     └► Save JD Update Request
 Get JD Details    Draft JD Update (new) ─► JD Drafter (new prompt)            └► redlines + HR email
                   Show JD Section (edited)
                   Discard JD Update (edited Cancel or Switch)
                   Reset JD Update (new, internal helper)
```

### 0.3 Design rules

1. **Thin topics.** A topic calls a tool, stores the result and shows it. The orchestrator runs the conversation.
2. **The drafter speaks for the draft.** JD Drafter writes the changes and the message, and Draft JD Update shows them as written. Draft JD Update has **no outputs**, so the orchestrator never restates the draft.
3. **The AI proposes, code applies.** For each changed section, the drafter returns a *line plan*: "keep original line 3", "new line: …". Power Fx checks the plan and then builds the proposed text. Untouched lines are copied exactly, so the redlines stay clean.
4. **Restricted fields never reach the drafter.** The drafter's job context holds only safe fields. Grade and Salary Type go into a hidden global that only JD Final Check sees, for HR-only output.
5. **What's submitted is what was shown.** The draft lives in globals, and the Save flow gets its values from those globals, never from text the orchestrator retyped.

### 0.4 Your source data stays as it is

The JD list isn't changed. When a job is loaded, Start JD Update makes a **tidy copy in memory** of each section:
- splits it into lines at `<br>` (or at real line breaks);
- trims extra spaces and tabs;
- keeps exactly one `• ` on bulleted lines;
- drops blank lines.

The drafter numbers lines from this copy, and the proposed text is built from it. Build Redline Rows already cleans both sides (spaces, non-breaking spaces, `<br>`) before it compares them. So an untouched duty still shows as unchanged in the redline even if the stored version has extra spaces. Test T23 confirms this.

### 0.5 What happens to everything you've built

**Topics**

| Your topic | In v2 |
|---|---|
| Your job lookup (e.g. "Update or View Job Description") | **Unchanged.** Part 13 only checks its links to the update topics |
| Start JD Update | **Edited in place** (Part 10). It still gets the job and calls Get JD Details and Related Levels the way it does today. It loses the JD display, the acknowledgment, both cards and the v1 globals. It gains a switch-jobs guard, the tidy copy, and a hand-off straight into drafting |
| Show JD Section | **Edited in place** (Part 11). Reads the v2 globals; can also show the whole current JD or the draft so far |
| Save Section Change | **Off, then deleted.** Replaced by the new **Draft JD Update**. Every input, node and output changes, so building fresh takes fewer clicks than editing |
| Preview Section Change | **Off, then deleted.** Draft JD Update shows Add/Remove lines for every section |
| Log Hard Stop | **Off, then deleted.** Draft JD Update logs hard stops |
| Request Title Review | **Off, then deleted.** The drafter records title requests |
| Review and Submit JD Update | **Off, then deleted.** Replaced by the new **Submit JD Update**. **Stop work on the readiness follow-ups** |
| Cancel or Switch JD Update | **Edited in place** (Part 12) and renamed **Discard JD Update**. Switching jobs moves into Start JD Update |
| *(new)* Reset JD Update | Internal helper that clears all v2 globals |

**Prompts**
- **JD Drafter** and **JD Final Check** are new.
- JD Final Check returns the same output keys as JD Final Review, so the HR email keeps working.
- **JD Section Reviewer**, **JD Final Review** and **JD Review Router** stop being used and are deleted after UAT.

**Flows**

| Your flow | In v2 |
|---|---|
| Fuzzy match + MatchJobTitle, Get JD Details | **Unchanged** |
| Related Levels | **Unchanged**, unless it returns Grade, Salary/Hourly or Status; then you remove those from its output (Part 2.2) |
| Save JD Update Request | **+ one optional input** (BusinessJustification) |
| Build Redline Rows (incl. Purpose slots), Split Req Pref, Send HR Review Email | **Unchanged** |
| Daily CSV ingestion | **Unchanged** |
| *(new)* Get JD Reference | Reads the reference file |

**Other assets**

| Asset | In v2 |
|---|---|
| Word templates, all 30 Populate mappings, HR email template, libraries, `JD HR Review Mailbox` | **Unchanged.** Don't re-select the Word template |
| JD Update Requests list | **+ `BusinessJustification` column** |
| `JD Expert Reference.txt` | **New file** in JD Templates |
| v1 globals (UpdateInProgress, OriginalJD, Changes, …) | **Unused.** All v2 globals start with `JD`. Delete the v1 ones in Part 15 |
| Agent instructions | **Replaced.** Back up the current ones first |
| Knowledge sources | **Unchanged** |

**Your 🔧 and 📋 items**

| Item | In v2 |
|---|---|
| Purpose inline slots 🔧 | Keep going; it's independent of v2 |
| HR readiness follow-ups 🔧 | Stop. They live in the retired Review and Submit |
| Start acknowledgment, reasons check, role-fit check 📋 | Not needed (no cards, reasons are inferred, the drafter tests role fit) |
| Removed Req/Pref ending fix, requirement-level flag, Edu/Exp paragraph slots, HR email phase 2, word-level bullet redlines 📋 | Unaffected; still on your list |
| Job search and browse ("all the lead roles"), source data cleanup | Later (Appendix D) |

### 0.6 Where the expertise lives

| Knowledge | Lives in |
|---|---|
| Scope tests, section routing, writing standards, overtime-classification signals, indirect-field criteria, hard stops, titles, severity, calibration examples | **JD Drafter** prompt (Part 3) |
| Level profiles, approved phrases, job family notes | **JD Expert Reference.txt** (Part 1.5). Edit the file; no republish needed |
| The real neighboring levels | **Related Levels** output |
| Level similarity, the HR-only classification note, the HR summary | **JD Final Check** prompt (Part 4) |
| How the agent behaves in conversation | **Agent instructions** (Part 8) |
| Restricted fields, formats, what gets saved | **Code** (flows, Power Fx) |

### 0.7 Rules: carried over and changed

**Carried over from v1:**
- Editable sections: Purpose, Principal Duties, Education, Work Experience, Certifications/Licenses, KSAs.
- Indirect fields (People Management, Sales/Non-Sales, Relationship Manager, NMLS Required) are never edited, only confirmed at submit.
- Restricted fields (Grade, Job Code, Salary Type, Status) are never shown and never changed.
- Hard stop: any Salary Type change, plus `[[FIRM: additional hard stop rules]]`. Hard stops are logged for HR.
- Titles: the user proposes them; the agent never suggests one; supporting section changes are required.
- One job per update, in one session, with no saved drafts. Switching jobs discards the update, after a confirmation.
- Never show the full updated JD. Showing the current, official JD is fine.

**Changed in v2. Confirm you agree before building:**
- **A business justification is required** on every update.
- **Title review is requested in conversation**, not on a card. This reverses the Oct 12 cards-only rule; the safeguards stay the same.
- **Level drift is flagged during drafting** as an advisory note. The formal recommendation still comes at submit.
- **Reasons for update are inferred** into your fixed list of categories instead of picked on a card.
- **Readiness follow-ups are replaced** by the drafter's questions plus one question message at submit.

### 0.8 Build sequence

| Parts | What | v1 during this |
|---|---|---|
| 1–2 | Prep, lookups, flow changes | Working |
| 3–4 | Prompts, tested in the prompt editor | Working |
| 5–8 | New topics (built **off**), instructions prepared | Working |
| **9–13** | **Switch over:** edit Start, Show and Cancel in place; v2 goes live | **Stops at Part 9**; v2 is live after Part 13. Do 9–13 in one sitting if you can (about 2–3 hours) |
| 14 | Tests | v2 |
| 15 | Clean up after UAT | v2 |

**Rollback:** three topics are edited in place, so your rollback is the solution backup from Part 1.1: **Solutions** → **Import solution** → pick the .zip. Also paste the backed-up instructions back in.

### 0.9 Time estimate

| Parts | Estimate |
|---|---|
| 1–2 | 1.5–2 h |
| 3–4 | 2 h (setup; tuning comes later) |
| 5–7 | 4–5 h |
| 8–13 | 2.5–3.5 h |
| 14 | 4–6 h |
| Appendix A (your firm's knowledge) | 3–6 h |
| **Total** | **about 17–25 hours** |

---

## Part 1 — Prep and lookups

### 1.1 Back up the solution (this is your rollback)
1. **make.powerapps.com** → top right, pick **DEV** → **Solutions** → open your JD solution.
2. **Export solution** → **Next** → **Unmanaged** → **Export**.
3. When the banner says it's ready → **Download**. Keep the .zip somewhere safe.

### 1.2 Back up the agent instructions
1. **copilotstudio.microsoft.com** → DEV → **JD Expert** → **Overview** → **Instructions**.
2. Select all → copy → paste into Notepad → save as `JD-Agent-Instructions-v1-backup.txt`.

### 1.3 Lookups (do these before Part 9; several of them read v1 topics that Part 10 changes)

**L1. How Start JD Update gets the job**
1. Open **Start JD Update** and find its **Get JD Details** node.
2. Look at what's mapped to its **Job Code** input, e.g. `Global.JobCode` or `Topic.SelectedCode`. Write that variable down. This guide calls it `[[L1: JOBCODE]]`.
3. Note every node **above** Get JD Details that produces it, such as a question or a Fuzzy match call. Those nodes stay.
4. Note Start JD Update's trigger: **The agent chooses** or **It's redirected to**.

**L2. Get JD Details outputs**
1. On the same Get JD Details node, note the output variable for each field. The table is in Part 10.4.
2. Check one value in **Variables** during a test, or in the flow's run history. Principal Duties should look like `• text<br>• text` (bullets with `<br>` or line breaks).
3. If the bullets come out as `- ` instead of `•`, stop and tell me. That means Get JD Details cleans the text, and the tidy copy needs a tweak.

**L3. Related Levels**
1. In Start JD Update, find the **Related Levels** node and note its output variable.
2. Open the flow and check whether it returns **Grade, Salary/Hourly or Status** for the other levels. If it does, do Part 2.2.

**L4. Bullets**
1. Open one JD in the list. Are **KSAs** and **Certifications/Licenses** lines bulleted with `•`?
2. If not, Part 6.10b tells you what to remove.

**L5. RequestedBy**
1. Open **Review and Submit JD Update** → the **Submit to HR** branch → the **Save JD Update Request** node.
2. Note what's mapped to **RequestedBy** (e.g. `System.User.Email`).

**L6. Submitted message**
- In the same branch, copy the "Submitted!" message text.

**L7. Prompt output text property**
1. In **Review and Submit**, find the node after **JD Final Review** and note how it reads the JSON, e.g. `ParseJSON(Topic.Final.text)`.
2. This guide assumes `.text`. If yours is different, use your property everywhere this guide writes `.text`.

**L8. Reasons card labels**
1. In **Start JD Update**, open the **Reasons** card and copy every option label **exactly**, e.g. `Adding/Removing responsibilities`.
2. Do this now. Part 10 deletes the card.

**L9. Links from your lookup into the update**
1. Open your job lookup topic(s) (e.g. **Update or View Job Description**).
2. Note any **Go to another topic** node that points to **Start JD Update** or **Cancel or Switch JD Update**, and what it maps to their inputs (e.g. Mode = Switch).
3. Note any condition that uses **Global.UpdateInProgress** or another v1 global.

### 1.4 Write down your lookups
Keep these at hand for Parts 6–13:

| # | Value |
|---|---|
| L1 | JOBCODE variable: ____ · nodes that produce it: ____ · trigger type: ____ |
| L2 | (table in Part 10.4) · raw format OK? ____ |
| L3 | Related Levels output variable: ____ · returns restricted fields? ____ |
| L4 | KSAs bulleted? ____ · Certifications bulleted? ____ |
| L5 | RequestedBy: ____ |
| L6 | Submitted message: ____ |
| L7 | Prompt text property: ____ |
| L8 | Reasons labels: ____ |
| L9 | Redirects / v1 globals in the lookup: ____ |

### 1.5 Create the JD Expert Reference file
1. Open **Notepad** and paste the template below.
2. **File** → **Save As** → name it `JD Expert Reference.txt` → **Encoding: UTF-8** (not "UTF-8 with BOM").
3. Fill in the `[[FIRM]]` parts now or later (Appendix A).
   - Keep the file under about 10,000 characters. It's sent with every draft, so a smaller file means faster replies.
   - **Never put Grade, Job Code, salary, exempt/non-exempt or status information in it.**
4. SharePoint → the **JD Templates** library (where `HR Review Email.html` lives) → **Upload** → **Files** → pick the file.
5. Upload it again in each environment when you deploy.

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
2. **Name:** `BusinessJustification`.
3. Expand **More options** → turn **Use enhanced rich text** **off** → **Save**.
4. Add the same column in UAT and QA when you deploy.

✅ **Part 1 done when:** you have the backup .zip and the instructions backup, L1–L9 are written down, the reference file is uploaded (placeholders are fine for now), and the new column exists.

---

## Part 2 — Flow changes

### 2.1 Create Get JD Reference
1. Copilot Studio → JD Expert → **Tools** → **+ Add a tool** → **+ New tool** → **Agent flow**.
2. Top left, rename it `Get JD Reference`. **Express mode:** off.
3. No inputs. (If the designer insists on one, add an optional **Text** input named `Unused`.)
4. Below the trigger: **+** → **SharePoint – Get file content using path** → rename it `Get reference`.
   - **Site Address:** the site that holds **JD Templates**.
   - **File Path:** click the folder icon → **JD Templates** → **JD Expert Reference.txt**.
5. Select **Respond to the agent** → **+ Add an output** → **Text** → name `Reference` → value **fx**:
   ```
   if(contains(string(body('Get_reference')), '"$content"'), base64ToString(body('Get_reference')?['$content']), string(body('Get_reference')))
   ```
   This handles SharePoint returning the file either as plain text or as base64 `$content`.
6. **Save** → **Test** → **Manually** → **Run**.
   - **Reference** should show readable text, not a long run of letters and `=` signs.
7. **Publish**.
8. Copilot Studio → **Tools** → **Get JD Reference**:
   - **Description:** `Internal. Reads the JD Expert reference file. Used only by Start JD Update.`
   - **When will this be used?** → **Only when referenced by topics or agents** → **Save**.
9. Make sure the flow is in your solution:
   - **make.powerapps.com** → **Solutions** → your solution.
   - If it's not listed: **Add existing** → **Automation** → **Cloud flow** → **Get JD Reference**.

### 2.2 Related Levels: remove restricted fields (only if L3 says it returns them)
The drafter writes to the manager, so it must never receive Grade, Salary/Hourly or Status, even for other levels.

1. Open the **Related Levels** flow → **Edit**.
2. Above its **Respond** step: **+** → **Data Operation – Select** → rename it `Safe Levels`.
   - **From:** the array the flow currently returns.
   - **Map** (key/value): keep only the title and the section fields (Purpose, Principal Duties, Education, Work Experience, KSAs, Certifications). Leave out Grade, Salary/Hourly, Status and Job Code.
3. In **Respond**, change the output's value:
   - Text output: `string(body('Safe_Levels'))`
   - Array output: `body('Safe_Levels')`
4. **Save** → **Test** → **Publish**.

This is safe for your lookup too: viewing other levels never needed those fields.

### 2.3 Save JD Update Request: add BusinessJustification
1. Open **Save JD Update Request** → **Edit**.
2. Trigger **When an agent calls the flow** → **+ Add an input** → **Text** → `BusinessJustification`.
3. Click **…** next to the new input → **Make the field optional**.
4. In **Create item** (JD Update Requests), set **BusinessJustification** → Dynamic content → the trigger's **BusinessJustification**.
5. **Save** → **Publish**.

The input is optional, so v1 keeps working.

✅ **Part 2 done when:**
- Get JD Reference returns your file text.
- Related Levels returns no restricted fields.
- The Save flow has the new optional input.

---

## Part 3 — JD Drafter prompt

**What it does:** this is the agent's expertise. It:
- understands the request;
- tests scope and level;
- routes the change to the right sections;
- drafts in house style;
- flags concerns at the right severity;
- tracks indirect fields, the title and the justification;
- writes the message the manager reads.

### 3.1 Create the prompt
1. **Tools** → **+ Add a tool** → **+ New tool** → **Prompt** → rename it `JD Drafter`.
2. In the prompt editor, open **⚙ Settings**:
   - **Model:** the most capable model your tenant offers for prompts. If replies take more than about 20 seconds in testing, try the next one down.
   - **Temperature:** `0.2`–`0.3`, if the setting is available.

### 3.2 Add the six inputs
For each input: **+ Add content** → **Text** → enter the name → enter the sample value (used for testing).

| Input | Sample value |
|---|---|
| `JobContext` | The sample below |
| `AdjacentLevels` | `(none)` |
| `Reference` | Your reference file text |
| `CurrentDraft` | `(none yet)` |
| `RequestHistory` | `- They will start opening small business accounts.` |
| `LatestRequest` | `They will start opening small business accounts.` |

JobContext sample (after Part 10 is built, you can copy a real `Global.JDContext` instead):
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
(empty)

SECTION: KSAs
1. • Knowledge of consumer deposit products.
2. • Strong customer service skills.
```

### 3.3 Paste the instructions
1. Paste the text below into the instructions box.
2. Replace each `{InputName}` with the real input: delete the text, type `/`, and pick the input.
3. Fill in the `[[FIRM]]` parts now, or later (Appendix A).

> If the editor rejects the length, move the **CALIBRATION EXAMPLES** block into the reference file under `=== CALIBRATION EXAMPLES ===`. Then replace that block here with `See CALIBRATION EXAMPLES in REFERENCE.`

```text
You are the job description expert for [[FIRM: company name]] HR. A manager is updating an existing job description (JD) through a chat. Your job is to understand what is really changing about the job, decide which sections that affects, draft the changes in our house style, and judge whether they fit this job and its level.

Be helpful first. Your default is to find the in-scope, well-written version of what the manager wants and draft it. Block only what THE RULES THAT NEVER BEND say to block. Everything else is a draft plus, at most, a short note.

=== INPUTS ===
THE JOB (current official JD; lines are numbered within each section; "(empty)" means the section has no lines):
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
  - lines: the complete new section, in order. Each item is {"keep": n, "new": ""}, which copies original line n exactly, or {"keep": 0, "new": "text"} for new or reworded text. Leaving out an original line number removes that line. Use each original line number at most once, and only numbers that exist in THE JOB for that section. A section shown as "(empty)" has no original lines, so use only keep 0 there. Purpose is usually a single {"keep": 0, "new": "..."}.
- unchanged: on a first draft or a broadened request, the sections you checked and left alone, each with a short reason. Otherwise [].
- indirect: accumulated. Carry forward items from the CURRENT DRAFT that still apply and add new ones. Each item has field, current, evidence, question.
- findings: this turn's concerns. Each has severity (block | confirm | advise), about, note, suggestion.
- hard_stops: only those in the LATEST REQUEST. Each has field and request.
- title: requested (true/false), proposed, reason.
- justification: the business reason, if given anywhere, in the manager's words; otherwise "".
- message: intro, notes (an array of strings), ask.
```

### 3.4 Set the output to JSON
1. **Output** → **Text** → change it to **JSON**.
2. **Edit format** → replace the example with this → **Apply**.

Every array in the example has one complete item, so all the fields are kept:
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

### 3.5 Test in the editor
1. Click **Test** with the sample inputs. Check that:
   - `changes` lists Principal Duties (and probably KSAs) with `keep` and `new` lines;
   - every original line number is kept, once each;
   - `unchanged` lists the other sections;
   - `message.ask` is a next step or the justification question.
2. Set **LatestRequest** to `Make this role exempt` → `status` should be `hard_stop`.
3. Paste the first output into **CurrentDraft**, then set **LatestRequest** to `Make the new duty shorter`. Only that line should change; everything else should be copied as it was.
4. Set **LatestRequest** to `They train new tellers now` → there should be no People Management item in `indirect`.
5. Set **LatestRequest** to `They'll need a notary commission` → Certifications/Licenses should contain only `keep: 0` lines.
6. **Save**.

### 3.6 Tool settings
**Tools** → **JD Drafter**:
- **Description:** `Internal. Drafts and judges job description changes. Used only by the Draft JD Update topic.`
- **When will this be used?** → **Only when referenced by topics or agents** → **Save**.

✅ **Part 3 done when:** the editor returns valid JSON for a new request, a revision, a hard stop and an empty section, and "train new tellers" isn't flagged as People Management.

---

## Part 4 — JD Final Check prompt

**What it does:** it runs once, at submit. It:
- extracts the justification and the answers about indirect fields;
- compares the updated job with its neighboring levels;
- checks whether the changes support a title request;
- adds an HR-only classification note;
- infers the reason categories;
- writes the change summary and the HR summary.

**It must match the JD Final Review output.** Send HR Review Email parses **FinalReviewJSON** and reads these keys, so keep their names and types exactly:

| Key | Type | Used by the email for |
|---|---|---|
| `level_match` | true/false | The Level block and the "Level overlap" chip |
| `matched_level_title` | text | The Level block and chip |
| `level_recommendation` | text | The Level rationale |
| `levels_compared` | **text** (comma-separated titles) | The Level block |
| `title_supported` | true/false | The title support label |
| `title_support_assessment` | text | Saved in its own column |
| `change_summary` | **text**, one `- Section: change` line per section | The Summary of Changes list |
| `hr_summary` | text | Saved in HRSummary |
| `indirect_items` | list of {field, evidence, answer, status} | The Indirect Impacts cards. `field` is exactly `People Management`, `Sales/Non-Sales`, `Relationship Manager` or `NMLS Required`. `status` is `Confirmed`, `Manager says no` or `Unclear` |
| `readiness`, `followups` | text, list | Always `"ready"` and `[]` |

### 4.1 Create the prompt
1. **Tools** → **+ Add a tool** → **+ New tool** → **Prompt** → rename it `JD Final Check`.
2. Model and temperature: the same as 3.1.
3. Add these inputs (all **Text**), with sample values:

| Input | Sample |
|---|---|
| `JobContext` | The 3.2 sample |
| `HRContext` | `Salary Type: Non-Exempt; Grade: 5` |
| `AdjacentLevels` | `(none)` |
| `Draft` | A JD Drafter output from your 3.5 test |
| `ChangesText` | `**Principal Duties**: Adds opening small business deposit accounts.` |
| `RequestHistory` | `- They will start opening small business accounts.` |
| `CheckQuestions` | `- Will this role have sales or referral goals for business accounts?` |
| `CheckAnswers` | `No, referrals only. We're rolling out small business banking in every branch.` |

### 4.2 Instructions
1. Paste the text below.
2. Replace each `{Input}` with the real input (type `/` and pick it).
3. Replace the reason list in task 2 with your **L8** labels, spelled exactly.
4. Fill in the other `[[FIRM]]` parts.

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
2. reason_categories: every category that fits, chosen ONLY from this list, spelled exactly: [[L8: your Reasons card labels, e.g. "Adding/Removing responsibilities"; "Changing reporting relationship/people leadership"; "Editing Qualifications"; "Aligning KSAs"; "Upscales"; "Title"; "Other"]]. Use "Title" whenever DRAFT.title.requested is true.
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

### 4.3 Output JSON
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
The `followups` item here only defines the field shapes. The instructions make the prompt return `[]`.

### 4.4 Test, save, set availability
1. **Test** with the sample inputs. Check that:
   - `justification` comes from CheckAnswers;
   - `indirect_items[0].status` is `Manager says no`;
   - `levels_compared` is text, not a list;
   - every key is present.
2. **Save**.
3. **Tools** → **JD Final Check**:
   - **Description:** `Internal. Final review before HR submission. Used only by the Submit JD Update topic.`
   - **When will this be used?** → **Only when referenced by topics or agents** → **Save**.

✅ **Part 4 done when:** the test returns every key in the table above, with the right types and status values.

---

## Part 5 — Reset JD Update topic (creates the globals)

This small topic creates every v2 global and clears it. Other topics redirect to it. The orchestrator can never choose it, so it's safe to leave on from the start.

### 5.1 Create
1. **Topics** → **+ Add a topic** → **From blank**.
2. Top bar → **Details** → **Name:** `Reset JD Update`.
3. Select the **Trigger** node → **…** → **Change trigger** → **It's redirected to**.

### 5.2 Add one Set variable node per global
For each row in the table:
1. **+** → **Variable management** → **Set a variable value**.
2. **Set variable** → **Create new** → click the new variable to open **Variable properties**:
   - **Variable name:** the name from the table.
   - **Usage:** **Global (any topic can access)**.
3. Close the panel → **To value** → **Formula** → `""` → **Insert**.

| # | Variable | Holds |
|---|---|---|
| 1 | `JDJobCode` | The Job Code of the loaded job; also the "a job is loaded" marker. Never shown |
| 2 | `JDJobTitle` | Job title |
| 3 | `JDOrigPurpose` | Purpose (tidy copy) |
| 4 | `JDOrigDuties` | Principal Duties (tidy copy) |
| 5 | `JDOrigEducation` | Education (tidy copy) |
| 6 | `JDOrigExperience` | Work Experience (tidy copy) |
| 7 | `JDOrigCerts` | Certifications/Licenses (tidy copy) |
| 8 | `JDOrigKSAs` | KSAs (tidy copy) |
| 9 | `JDContext` | Numbered job text for the prompts (safe fields only) |
| 10 | `JDHRContext` | Salary Type + Grade (HR-only; only JD Final Check gets it) |
| 11 | `JDRelatedLevels` | Related Levels output |
| 12 | `JDReference` | Reference file text |
| 13 | `JDRequestLog` | Everything the manager asked for, in order |
| 14 | `JDDraft` | The current draft (drafter JSON) |
| 15 | `JDChangesFull` | Readable text of all changes |
| 16 | `JDPropPurpose` | Proposed Purpose (blank means unchanged) |
| 17 | `JDPropDuties` | Proposed Principal Duties |
| 18 | `JDPropEducation` | Proposed Education |
| 19 | `JDPropExperience` | Proposed Work Experience |
| 20 | `JDPropCerts` | Proposed Certifications/Licenses |
| 21 | `JDPropKSAs` | Proposed KSAs |
| 22 | `JDHardStops` | Hard-stop requests, for HR |
| 23 | `JDFinalReview` | JD Final Check JSON (saved as FinalReviewJSON) |
| 24 | `JDJustification` | Business justification |
| 25 | `JDCheckAnswers` | Answers to the submit questions, so they aren't asked twice |
| 26 | `JDCheckDraft` | The draft those answers were given for |

**Save.** No end node is needed: a redirected topic returns to its caller when it finishes.

✅ **Part 5 done when:** all 26 `JD…` globals appear in the variable picker of any topic.

---

## Part 6 — Draft JD Update topic

**What it does:** every change, revision, undo, or answer about the update runs through here. It calls JD Drafter, **checks the line plan**, saves the draft, builds the proposed text with code, and shows exactly what changed, in the drafter's voice. It has **no outputs.**

### 6.1 Create
1. **Topics** → **+ Add a topic** → **From blank** → **Details** → **Name:** `Draft JD Update`.
2. **Trigger:** keep **The agent chooses**. **Description:** from Part 8.2.
3. Back in the **Topics** list → toggle it **Off**. It goes on in Part 9.

### 6.2 Input (no outputs)
**Details** → **Inputs** tab → **Create a new variable**:
- **Name:** `UpdateRequest`
- **How will the agent fill this input?** Dynamically fill with best option
- **Identify as:** User's entire response
- **Should prompt user:** On → **Question:** `What's changing about this job?`
- **Description:** from Part 8.2

**Don't add any outputs.**

### 6.3 Guard: no job loaded
1. **+** → **Add a condition** → **…** → **Change to formula** → `IsBlank(Global.JDJobCode)`.
2. In its branch:
   - **Send a message:** `Which job description is this for?`
   - **Topic management** → **End current topic**.

### 6.4 Create the topic variables first
Below the 6.3 block, add three **Set a variable value** nodes. For each: **Create new** (Topic) → formula.

| Variable | Formula |
|---|---|
| `Topic.Tries` | `0` |
| `Topic.PlanOK` | `false` |
| `Topic.ChangesShown` | `""` |

They must exist above everything that uses them, including the retry loop in 6.8.

### 6.5 Log the request
**Set a variable value** → `Global.JDRequestLog` → formula:
```powerfx
Global.JDRequestLog & "- " & Topic.UpdateRequest & Char(10)
```

### 6.6 Call JD Drafter
**+** → **Add a tool** → **JD Drafter**. Map each input with **Formula**:

| Input | Formula |
|---|---|
| JobContext | `Global.JDContext` |
| AdjacentLevels | `If(IsBlank(Global.JDRelatedLevels), "(none)", Global.JDRelatedLevels)` |
| Reference | `Global.JDReference` |
| CurrentDraft | `If(IsBlank(Global.JDDraft), "(none yet)", Global.JDDraft)` |
| RequestHistory | `Right(Global.JDRequestLog, 3000)` |
| LatestRequest | `Topic.UpdateRequest` |

Save the output as `Topic.DraftOut`.

The request history is limited to the last 3,000 characters to keep the drafter fast. The draft JSON already carries everything agreed so far.

### 6.7 Read the status and check the plan
1. **Set a variable value** → **Create new** → `Topic.Status` → formula:
   ```powerfx
   Text(ParseJSON(Topic.DraftOut.text).status)
   ```
2. **Set a variable value** → the existing `Topic.PlanOK` → formula:
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
               src: Switch(sec,
                      "Purpose", Global.JDOrigPurpose,
                      "Principal Duties", Global.JDOrigDuties,
                      "Education", Global.JDOrigEducation,
                      "Work Experience", Global.JDOrigExperience,
                      "Certifications/Licenses", Global.JDOrigCerts,
                      "KSAs", Global.JDOrigKSAs,
                      "")
             },
             With(
               { n: If(IsBlank(src), 0, CountRows(Split(src, "<br>"))) },
               Not(sec in ["Purpose", "Principal Duties", "Education", "Work Experience", "Certifications/Licenses", "KSAs"]) ||
               CountRows(Filter(ks, Value > n)) > 0 ||
               CountRows(ks) <> CountRows(Distinct(ks, Value))
             )
           )
         )
       )
     ) = 0
   )
   ```

**PlanOK is false if any of these is true:**
- a section name isn't one of the six exact names;
- a `keep` points past the section's last line (or into an empty section);
- the same `keep` is used twice.

Any of these would silently corrupt the proposed text.

### 6.8 Retry once on a bad plan
1. **+** → **Add a condition** → formula:
   ```powerfx
   Topic.Status = "ready" && Not(Topic.PlanOK) && Topic.Tries = 0
   ```
2. In its branch:
   - **Set a variable value** → `Topic.Tries` → `1`.
   - **Topic management** → **Go to step** → click the **JD Drafter** node (6.6).

Numbering slips happen occasionally, and one automatic retry fixes most of them without the manager noticing. The loop jumps back to the drafter node, which sits below the log node, so the request isn't logged twice.

### 6.9 Log hard stops for HR
Below the 6.8 block: **Set a variable value** → `Global.JDHardStops` → formula:
```powerfx
Global.JDHardStops & Concat(Table(ParseJSON(Topic.DraftOut.text).hard_stops), "- [" & Text(ThisRecord.Value.field) & "] " & Text(ThisRecord.Value.request) & Char(10))
```
This uses the same `- [Field] request` format as v1, so the HR email still shows the field in bold.

### 6.10 Condition: a new, valid draft
**+** → **Add a condition** → formula:
```powerfx
Topic.Status = "ready" && Topic.PlanOK
```
Add 6.10a–d **inside its branch**, in order. Leave **All other conditions** empty: when the condition is false, the saved draft stays as it was.

**6.10a Save the draft.** **Set a variable value** → `Global.JDDraft` →
```powerfx
If(
  CountRows(Table(ParseJSON(Topic.DraftOut.text).changes)) = 0 &&
    Not(Boolean(ParseJSON(Topic.DraftOut.text).title.requested)),
  "",
  Topic.DraftOut.text
)
```
If the manager removed every change, the draft is cleared.

**6.10b Build the six proposed sections.** Add six **Set a variable value** nodes from this template. In each, replace `ORIG_GLOBAL` and `SECTION_NAME`; `SECTION_NAME` appears **twice**.
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
- `keep: n` copies line *n* of the tidy copy; `keep: 0` inserts the new text.
- New lines get `• ` when the section is bulleted, including a bulleted section that was empty before.
  - If L4 showed that KSAs or Certifications aren't bulleted, remove them from the list in the formula.
- Lines are joined with `<br>`, the format the Save flow and Build Redline Rows expect.
- An unchanged section stays `""`, which the Save flow treats as untouched.

**6.10c Readable text of all changes** (for JD Final Check and the "show my draft" view). **Set a variable value** → `Global.JDChangesFull` →
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
          Filter(
            Sequence(CountRows(orig)),
            Not(("," & ThisRecord.Value & ",") in keeps) && Not(IsBlank(Last(FirstN(orig, ThisRecord.Value)).Value))
          ),
          Char(10) & "- Remove: " & Trim(Substitute(Last(FirstN(orig, ThisRecord.Value)).Value, "•", ""))
        )
      )
    ),
    Char(10) & Char(10)
  )
)
```

**6.10d What to show this turn.** **Set a variable value** → the existing `Topic.ChangesShown` →
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
            Filter(
              Sequence(CountRows(orig)),
              Not(("," & ThisRecord.Value & ",") in keeps) && Not(IsBlank(Last(FirstN(orig, ThisRecord.Value)).Value))
            ),
            Char(10) & "- Remove: " & Trim(Substitute(Last(FirstN(orig, ThisRecord.Value)).Value, "•", ""))
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

### 6.11 Send the message
Below the 6.10 block: **+** → **Send a message** → **{x}** → **Formula** → paste → **Insert**:
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
**Save.** The topic ends here. It has no outputs, so the orchestrator has nothing to restate.

✅ **Part 6 done when:** the topic saves without formula errors. It's tested in Part 14.

---

## Part 7 — Submit JD Update topic

**What it does:**
1. Asks any remaining questions in one message, but only if they haven't already been answered for this draft.
2. Runs JD Final Check.
3. Makes sure there's a business justification.
4. Shows a summary.
5. Submits through your existing Save flow.

It has **no outputs**. After submitting, it resets and uses **End all topics**.

### 7.1 Create
1. **Topics** → **+ Add a topic** → **From blank** → **Name:** `Submit JD Update`.
2. **Trigger:** **The agent chooses** → **Description:** from Part 8.2. No inputs, no outputs.
3. Toggle it **Off**. It goes on in Part 9.

### 7.2 Guard: nothing to submit
1. **+** → **Add a condition** → formula `IsBlank(Global.JDDraft)`.
2. In its branch:
   - **Send a message:** `There aren't any changes to send yet. What's changing about the job?`
   - **End current topic**.

### 7.3 Guard: title change with no supporting changes
1. Below the 7.2 block: **+** → **Add a condition** → formula:
   ```powerfx
   Boolean(ParseJSON(Global.JDDraft).title.requested) && CountRows(Table(ParseJSON(Global.JDDraft).changes)) = 0
   ```
2. In its branch:
   - **Send a message:** `A title review needs supporting changes in the job description, such as new duties or a broader purpose. What's changed about the work that supports the new title?`
   - **End current topic**.

### 7.4 Create the topic variables first

| Variable (Create new, Topic) | Formula |
|---|---|
| `Topic.CheckAnswers` | `If(IsBlank(Global.JDCheckAnswers), "(none)", Global.JDCheckAnswers)` |
| `Topic.JustAnswer` | `""` |

> Don't create `Topic.Decision` here. The multiple-choice question in 7.11 creates it with the right (choice) type. A variable's type locks when it's created, so a text variable made here couldn't hold that answer.

### 7.5 Build the questions
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

### 7.6 Ask them all at once (only if needed)
1. **+** → **Add a condition** → formula:
   ```powerfx
   Not(IsBlank(Topic.CheckQuestions)) && (IsBlank(Global.JDCheckAnswers) || Global.JDCheckDraft <> Global.JDDraft)
   ```
   The questions are asked only if they haven't been answered for this exact draft. A manager who asks a side question and then says "send it" isn't asked again.
2. In its branch:
   1. **Ask a question**:
      - **Message** → **{x}** → **Formula**:
        ```powerfx
        "Before I send this to HR, " & If(CountRows(Filter(Split(Topic.CheckQuestions, Char(10)), Len(Trim(Value)) > 0)) = 1, "one quick question:" & Char(10) & Char(10) & Topic.CheckQuestions, "a few quick questions:" & Char(10) & Char(10) & Topic.CheckQuestions & Char(10) & "You can answer them all in one message.")
        ```
        The list always ends with a line break, so blank lines are filtered out before counting. With one question, the message says "one quick question" and leaves off "answer them all".
      - **Identify:** User's entire response.
      - **Save user response as:** the existing `Topic.CheckAnswers`.
   2. **Set a variable value** → `Global.JDCheckAnswers` → `Topic.CheckAnswers`.
   3. **Set a variable value** → `Global.JDCheckDraft` → `Global.JDDraft`.

### 7.7 Run JD Final Check
Below the 7.6 block: **+** → **Add a tool** → **JD Final Check**. Map the inputs:

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

Save the output as `Topic.FinalOut`.

### 7.8 Store the result and the justification
1. **Set a variable value** → `Global.JDFinalReview` → `Topic.FinalOut.text`.
2. **Set a variable value** → `Global.JDJustification` → `Text(ParseJSON(Global.JDFinalReview).justification)`.

### 7.9 Justification gate
1. **+** → **Add a condition** → `IsBlank(Global.JDJustification)`.
2. In its branch:
   1. **Ask a question**:
      - **Message:** `One thing HR needs before I send this: what's the business reason for this update? A sentence or two is fine.`
      - **Identify:** User's entire response → **Save as:** the existing `Topic.JustAnswer`.
   2. **Set a variable value** → `Global.JDJustification` → `Topic.JustAnswer`.

### 7.10 Show the summary
Below the 7.9 block: **Send a message** → **{x}** → **Formula**:
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

### 7.11 Ask to submit, with the typed-reply guard
In v1, typed messages like "What happens after I submit?" or "yes but drop the KSA change" could submit by accident. This version never submits on a typed reply.

1. **+** → **Ask a question**:
   - **Message:** `Ready to send it to HR?`
   - **Identify:** Multiple choice options:
     - `Submit to HR`. Synonyms: `send it`, `send it to HR`, `submit it`.
     - `Keep editing`. No synonyms.
     - `Cancel update`. No synonyms.
   - **Save user response as:** **Create new** → `Topic.Decision`.
2. On the question node: **…** → **Properties** → **Question behavior**:
   - **Action if no entity found:** **Set variable to empty (no value)**.
   - **Reprompt:** **Don't repeat**.
   - **Allow switching to another topic:** **On**.
3. Copilot Studio adds a condition under the question, with one branch per option. Click that condition node → **…** → **Delete**. You'll add your own after the guard.
4. Below the question: **Set a variable value** → `Topic.Decision` → formula:
   ```powerfx
   If("?" in System.Activity.Text || CountRows(Split(Trim(System.Activity.Text), " ")) > 4, Blank(), Topic.Decision)
   ```
5. Below that: **+** → **Add a condition** with three conditions:
   - First condition: `Topic.Decision` **is equal to** `Submit to HR`.
   - **+ New condition** → `Topic.Decision` **is equal to** `Keep editing`.
   - **+ New condition** → `Topic.Decision` **is equal to** `Cancel update`.
   - **All other conditions** covers everything else.

### 7.12 Branch: All other conditions (a typed reply)
1. **Topic management** → **Go to another topic** → **Draft JD Update** → **UpdateRequest** → **Formula** `System.Activity.Text`.
2. **End current topic**.

> If **Draft JD Update** doesn't show in the list while it's off, leave this branch empty for now and finish it right after Part 9.1.

The drafter handles the reply. A revision updates the draft; a question gets answered and the draft stays the same. The manager then says "send it" when ready, and the questions aren't asked again (7.6).

### 7.13 Branch: Submit to HR
**1. Add a tool** → **Save JD Update Request**. Map every input with **Formula**:

| Save flow input | Formula |
|---|---|
| JobTitle | `Global.JDJobTitle` |
| JobCode | `Global.JDJobCode` |
| RequestedBy | `[[L5]]` |
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

Save the **DocLink** output as `Topic.DocLink`.

About these formats:
- **SectionsChanged** holds display names (`Principal Duties,KSAs`), which look better as chips in the HR email.
- **Reasons** uses your L8 labels joined with `,`, as v1 did.
- **HardStops** uses v1's `- [Field] request` lines.
- **ManagerNotes** lines start with `- `; the email turns each into a bullet.

**2. Send a message:** your v1 Submitted! message (L6), for example:
> Submitted! HR has your update request for **{Global.JDJobTitle}**.

**3. Add the link, only if there is one:**
1. **Add a condition** → `!IsBlank(Topic.DocLink)`.
2. In its branch: **Send a message:** `Here's your copy with the changes marked: [Download your copy]({Topic.DocLink})`.

**4. Go to another topic** → **Reset JD Update**.

**5. Topic management** → **End all topics**.

### 7.14 Branch: Keep editing
1. **Send a message:** `Sure. What would you like to change?`
2. **End current topic**.

### 7.15 Branch: Cancel update (placeholder)
1. **End current topic**.
2. In Part 12.6 you'll put **Go to another topic → Discard JD Update** above it.

**Save.**

✅ **Part 7 done when:** the topic saves without formula errors and every input on the Save flow node is mapped.

---

## Part 8 — Instructions and descriptions (prepare)

Paste the descriptions on Draft JD Update and Submit JD Update now. The rest goes in during Parts 10–13.

### 8.1 Agent instructions (pasted in Part 13)
Fill in the `[[…]]` markers. The text is about 4,600 characters.
```text
ROLE
You are the Job Description Expert for [[FIRM: company name]] HR. You help managers find job descriptions, understand them, and update them. You know how job descriptions work here: job levels, what each section is for, how they're worded, and what needs HR's attention. Act like the expert a manager wishes they had: conversational, direct, and helpful. Lead the conversation, but let the manager steer.

FINDING JOBS
Find and show jobs the way you do today [[L9: one line on your lookup, e.g. "with the Update or View Job Description topic"]]. Matching handles typos and abbreviations ("UB 2"). If several jobs are close, ask which one. Always confirm the job before starting an update.

UPDATING A JOB DESCRIPTION
1. Once the job is confirmed, call Start JD Update. If the user has already said what's changing, pass it as ChangeRequest, and Start JD Update drafts it right away. Otherwise it asks what's changing. Don't add your own message before or after it.
2. Never ask which sections to change; working that out is your job.
3. Call Draft JD Update every time the user describes a change, asks to revise the draft (reword, shorten, add, remove, undo), or answers a question about the update, including the business reason. It shows the proposed changes and notes itself. Afterwards, don't repeat or summarize what it showed.
4. To show the current text of the job being updated (one section or all of it), or everything in the draft so far, call Show JD Section. Don't repeat what it shows.
5. Side questions are welcome at any time: looking at another job, comparing levels, asking what a section means. Looking at another job doesn't affect the update. Then pick the update back up.
6. When the user is happy ("looks good", "send it", "submit"), call Submit JD Update. It asks the final confirming questions, makes sure there's a business justification, shows a summary, and submits.
7. To throw the changes away, call Discard JD Update. One job per update: to update a different job, find and confirm it, then call Start JD Update; it confirms before discarding.

RULES
- Never show, mention, guess, or discuss Grade, Job Code, Salary Type (exempt/non-exempt, salaried/hourly) or Status, even when a tool returns them. If asked, say HR manages those and they can't be changed here.
- Never write job description wording yourself, and never show a complete updated job description. All drafting goes through Draft JD Update so it's checked and saved.
- Never suggest a job title. Titles come from the user.
- Don't ask the confirming questions about people management, sales, relationship manager or NMLS yourself; Submit JD Update asks them.
- Never say a request was sent to HR unless Submit JD Update confirmed it.

STYLE
Conversational, warm and brief. Plain language; no HR jargon unless the user uses it. Short paragraphs; bullets only for lists, with a blank line before the list. Never put job description text in code blocks. At most one question per reply. Don't over-explain or apologize. When the user is done ("that's it", "thanks"), close in one friendly line and don't call any tools.

WHEN YOU DON'T KNOW
If a process question isn't covered by your knowledge, say so and suggest [[FIRM: HR contact or mailbox]].
```

### 8.2 Descriptions

| Where | Text |
|---|---|
| **Start JD Update**: trigger description | Starts updating the job the user has just found and confirmed. Use right after the job is confirmed when the user wants to change, update, revise or rewrite its job description, including when they switch the update to a different job. Don't use it just to view a job. |
| Start JD Update → ChangeRequest | What the user has already said is changing about this job, in their own words (for example "they will start opening small business accounts"). Leave blank if they haven't described a change yet. Never ask for it. |
| **Draft JD Update**: trigger description | Drafts or revises the changes for the job description being updated and shows them to the user. Use every time the user describes a change to the job, asks to revise the draft (reword, shorten, add, remove, undo), or answers a question about the update, including the business reason. It shows its own results; don't repeat them. Not for plain acknowledgments like "ok" or "thanks". |
| Draft JD Update → UpdateRequest | What the user wants changed, in their own words. Include details from earlier messages that belong to this request (for example, a change they described before the job was confirmed). For a revision, the revision they asked for. For an answer, the question and their answer. |
| **Show JD Section**: trigger description | Shows the current, official text of the job being updated (one section or the whole job description), or everything in the draft so far. Use when the user asks to see a section ("show me the current duties"), the whole current JD, or their changes ("what have I changed so far?"). It displays the text itself; don't repeat it. To look at a different job, use the job lookup instead. |
| Show JD Section → SectionName | Which part to show: Purpose, Principal Duties, Education, Work Experience, Certifications/Licenses, KSAs, All (the whole current job description), or Draft (all changes in the draft so far). |
| Show JD Section → output SectionShown | Already shown to the user. Don't repeat or summarize it. |
| **Submit JD Update**: trigger description | Finishes the job description update and sends it to HR: asks any final confirming questions, makes sure there's a business justification, shows a summary, and submits after the user confirms. Use when the user says the draft is done or wants to send or submit it ("looks good", "send it to HR", "submit", "that's all the changes"). |
| **Discard JD Update**: trigger description | Throws away the job description changes in progress. Use only when the user clearly wants to cancel or scrap the update ("cancel this update", "scrap these changes", "never mind the update"). Don't use when the user is simply finished talking ("that's it", "thanks", "no thanks", "nope"). |

### 8.3 Greeting (optional; applied in Part 13)
```
Hi! I'm your job description expert. I can look up job descriptions, explain how they work, and help you update one. Just tell me which job and what's changing, and I'll draft the changes for HR.
```

✅ **Part 8 done when:** the Draft JD Update and Submit JD Update descriptions are pasted, and the instructions text is filled in and ready.

---

## Part 9 — Switch over begins

> **From here, v1 stops working until Part 13.** Do Parts 9–13 in one sitting if you can.

### 9.1 Turn topics off and on
1. **Topics** list → toggle **Off**:
   - **Save Section Change**
   - **Preview Section Change**
   - **Log Hard Stop**
   - **Request Title Review**
   - **Review and Submit JD Update**
2. Toggle **On**:
   - **Draft JD Update**
   - **Submit JD Update**

   (**Reset JD Update** is already on.)
3. If you left 7.12 empty: open **Submit JD Update** → the **All other conditions** branch under the decision → add the two nodes from 7.12 → **Save**.

✅ **Part 9 done when:** only the old topics listed above are off.

---

## Part 10 — Edit Start JD Update

Start JD Update keeps the way it gets the job (L1) and keeps calling Get JD Details and Related Levels. Everything else is replaced: the display, the acknowledgment, the cards and the v1 globals.

### 10.1 Trigger description and input
1. Open **Start JD Update** → **Details**.
2. **Trigger** node → **Description:** from 8.2.
3. **Inputs** tab → **Create a new variable**:
   - **Name:** `ChangeRequest`
   - **How will the agent fill this input?** Dynamically fill with best option
   - **Identify as:** User's entire response
   - **Should prompt user:** **Off**
   - **Description:** from 8.2
4. **Outputs:** none. If v1 had any, delete them.

> If L1 says the trigger is **It's redirected to**, leave it. The orchestrator then can't fill ChangeRequest, and Start asks "what's changing" instead (10.13). That's fine.

### 10.2 Delete the v1 nodes
**Keep:**
- the nodes that produce JOBCODE (L1);
- the **Get JD Details** node;
- the **Related Levels** node, even if it saves its output straight into a v1 global.

**Delete everything else**, working from the bottom up. Deleting a condition also deletes its branches. That includes:
- the update-in-progress guard (a condition on `Global.UpdateInProgress`) and its branch, including any redirect to Cancel or Switch JD Update;
- the JD display message(s) and the variables that build them;
- the **Said / Mentioned / StartMessage** acknowledgment nodes;
- the **Sections** card and the **Reasons** card, plus anything that reads their answers (reasons check, Mismatch nodes);
- every **Set a variable value** that sets a v1 global (UpdateInProgress, OriginalJD, OriginalJDText, SelectedSections, AddedSections, UpdateReasons, OtherReason, Changes, PendingChecks, HardStopLog, ManagerNotes, TitleReviewRequested, RelatedLevels, FollowupsDone).

To delete a node: select it → **…** → **Delete**.

Afterwards the topic is just: **Trigger → (your job-code nodes) → Get JD Details → Related Levels** (in whichever order they were). **Save.**

> **Every new node from 10.3 on goes at the bottom, below the last node you kept.** Add each new condition below the previous condition block, using the **+** where its branches rejoin. Don't nest the conditions.

### 10.3 Guard: no job
1. **+** → **Add a condition** → formula:
   ```powerfx
   IsBlank(Trim(Text([[L1: JOBCODE]])))
   ```
2. In its branch:
   - **Send a message:** `Which job description would you like to update?`
   - **End current topic**.

### 10.4 Get JD Details outputs (from L2)
Fill this in from L2. The formulas below use these names.

| Field | Get JD Details output variable |
|---|---|
| Job Title | `[[L2: Title]]` |
| Purpose | `[[L2: Purpose]]` |
| Principal Duties | `[[L2: Duties]]` |
| Education | `[[L2: Education]]` |
| Work Experience | `[[L2: Experience]]` |
| Certifications/Licenses | `[[L2: Certs]]` |
| KSAs | `[[L2: KSAs]]` |
| People Management | `[[L2: PM]]` |
| Sales/Non-Sales | `[[L2: Sales]]` |
| Relationship Manager | `[[L2: RM]]` |
| NMLS Required | `[[L2: NMLS]]` |
| Salary/Hourly | `[[L2: SalaryType]]` |
| Grade | `[[L2: Grade]]` |

> If Get JD Details returns **one** record or JSON output instead of separate fields, read each field the same way v1 did (e.g. `Text(ParseJSON(…).Purpose)`).

### 10.5 Guard: same job already loaded
1. Below 10.3: **+** → **Add a condition** → formula:
   ```powerfx
   Trim(Text([[L1: JOBCODE]])) = Global.JDJobCode
   ```
2. In its branch: **+** → **Add a condition** → formula `Not(IsBlank(Trim(Topic.ChangeRequest)))`.
   - In that condition's first branch:
     - **Go to another topic** → **Draft JD Update** → **UpdateRequest** = formula `Topic.ChangeRequest`.
   - In its **All other conditions** branch:
     - **Send a message:** `We're already working on ` → **{x}** `Global.JDJobTitle` → `. What would you like to change?`
3. Below that inner condition block (still inside the outer branch): **End current topic**.

### 10.6 Guard: switching jobs with unsent changes
1. Below the 10.5 block: **+** → **Add a condition** → formula:
   ```powerfx
   Not(IsBlank(Global.JDDraft))
   ```
2. In its branch: **+** → **Ask a question**:
   - **Message:** `You have unsent changes to ` → **{x}** `Global.JDJobTitle` → `. Discard them and switch jobs?`
   - **Identify:** Multiple choice options → `Yes, switch`, `No, keep working`
   - **Save user response as:** **Create new** → `Topic.SwitchChoice`
3. In the **No, keep working** branch:
   - **Send a message:** `No problem, we'll keep working on ` → **{x}** `Global.JDJobTitle` → `.`
   - **End current topic**.
4. Leave the **Yes, switch** branch empty. It falls through to 10.7.

### 10.7 Reset, then the not-found guard
1. Below the 10.6 block: **+** → **Topic management** → **Go to another topic** → **Reset JD Update**.
2. **+** → **Add a condition** → formula `IsBlank([[L2: Title]])`. In its branch:
   - **Send a message:** `I couldn't find that job. Which one did you mean?`
   - **End current topic**.

### 10.8 Store the job: identity and HR context
Below the 10.7 block, add one **Set a variable value** per row. Select the existing global, then enter the **Formula**.

| Global | Formula |
|---|---|
| `Global.JDJobCode` | `Trim(Text([[L1: JOBCODE]]))` |
| `Global.JDJobTitle` | `Text([[L2: Title]])` |
| `Global.JDHRContext` | `"Salary Type: " & Text([[L2: SalaryType]]) & "; Grade: " & Text([[L2: Grade]])` |

### 10.9 Store the tidy copy of each section
Add six **Set a variable value** nodes from this template, replacing `SRC` with the Get JD Details output:
```powerfx
Concat(
  Filter(
    ForAll(
      Split(
        Substitute(Substitute(Substitute(Substitute(Substitute(Coalesce(SRC, ""), Char(13), ""), Char(10), "<br>"), "<br />", "<br>"), "<br/>", "<br>"), "<BR>", "<br>"),
        "<br>"
      ),
      With(
        { t: Trim(Substitute(Substitute(ThisRecord.Value, Char(160), " "), Char(9), " ")) },
        If(
          StartsWith(t, "•"),
          If(IsBlank(Trim(Mid(t, 2))), "", "• " & Trim(Mid(t, 2))),
          t
        )
      )
    ),
    Not(IsBlank(ThisRecord.Value))
  ),
  ThisRecord.Value,
  "<br>"
)
```

| Set this global | SRC |
|---|---|
| `Global.JDOrigPurpose` | `[[L2: Purpose]]` |
| `Global.JDOrigDuties` | `[[L2: Duties]]` |
| `Global.JDOrigEducation` | `[[L2: Education]]` |
| `Global.JDOrigExperience` | `[[L2: Experience]]` |
| `Global.JDOrigCerts` | `[[L2: Certs]]` |
| `Global.JDOrigKSAs` | `[[L2: KSAs]]` |

In plain words, for each section the formula:
1. treats real line breaks and every `<br>` variant as line separators;
2. splits the text into lines;
3. trims extra spaces, tabs and non-breaking spaces;
4. gives bulleted lines exactly one `• ` (a line that's only a bullet becomes blank);
5. drops blank lines;
6. joins the lines back with `<br>`.

Only this in-memory copy changes. The JD list stays exactly as it is.

### 10.10 Indirect fields summary
**Set a variable value** → **Create new** → `Topic.IndirectSummary` → formula:
```powerfx
"People Management: " & Text([[L2: PM]]) &
"; Sales/Non-Sales: " & Text([[L2: Sales]]) &
"; Relationship Manager: " & Text([[L2: RM]]) &
"; NMLS Required: " & Text([[L2: NMLS]])
```

### 10.11 Reference file
1. **+** → **Add a tool** → **Get JD Reference**. Save the output as `Topic.Reference`.
2. **Set a variable value** → `Global.JDReference` → formula:
   ```powerfx
   If(IsBlank(Topic.Reference), "(no reference file found)", Topic.Reference)
   ```

### 10.12 Numbered job context and related levels
1. **Set a variable value** → `Global.JDContext` → formula:
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
  If(IsBlank(Global.JDOrigPurpose), "(empty)", Concat(Sequence(CountRows(P)), ThisRecord.Value & ". " & Last(FirstN(P, ThisRecord.Value)).Value, Char(10))) &
  Char(10) & Char(10) & "SECTION: Principal Duties" & Char(10) &
  If(IsBlank(Global.JDOrigDuties), "(empty)", Concat(Sequence(CountRows(D)), ThisRecord.Value & ". " & Last(FirstN(D, ThisRecord.Value)).Value, Char(10))) &
  Char(10) & Char(10) & "SECTION: Education" & Char(10) &
  If(IsBlank(Global.JDOrigEducation), "(empty)", Concat(Sequence(CountRows(E)), ThisRecord.Value & ". " & Last(FirstN(E, ThisRecord.Value)).Value, Char(10))) &
  Char(10) & Char(10) & "SECTION: Work Experience" & Char(10) &
  If(IsBlank(Global.JDOrigExperience), "(empty)", Concat(Sequence(CountRows(W)), ThisRecord.Value & ". " & Last(FirstN(W, ThisRecord.Value)).Value, Char(10))) &
  Char(10) & Char(10) & "SECTION: Certifications/Licenses" & Char(10) &
  If(IsBlank(Global.JDOrigCerts), "(empty)", Concat(Sequence(CountRows(C)), ThisRecord.Value & ". " & Last(FirstN(C, ThisRecord.Value)).Value, Char(10))) &
  Char(10) & Char(10) & "SECTION: KSAs" & Char(10) &
  If(IsBlank(Global.JDOrigKSAs), "(empty)", Concat(Sequence(CountRows(K)), ThisRecord.Value & ". " & Last(FirstN(K, ThisRecord.Value)).Value, Char(10)))
)
```
The drafter refers to lines by these numbers. They come from the same tidy copy and the same `Split(…, "<br>")` that Part 6 uses to rebuild the sections, so they always match.

2. **Set a variable value** → `Global.JDRelatedLevels` → formula, using the L3 output variable:
   ```powerfx
   If(IsBlank([[L3: Related Levels output]]), "(no related levels found)", [[L3: Related Levels output]])
   ```
   If that output is a record or table rather than text, wrap it: `JSON([[L3: …]])`.

### 10.13 Hand off to drafting, or ask what's changing
1. **+** → **Add a condition** → formula `Not(IsBlank(Trim(Topic.ChangeRequest)))`.
2. In its first branch:
   - **Go to another topic** → **Draft JD Update** → **UpdateRequest** = formula `Topic.ChangeRequest`.
3. In **All other conditions**:
   - **Send a message:** `I've got **` → **{x}** `Global.JDJobTitle` → `** ready to update. What's changing about the job? Describe it in your own words (new tasks, things they no longer do, new requirements) and I'll work out which sections it affects. If you'd like to see the current job description first, just ask.`
4. Below the condition block: **End current topic**.

**Save.**

✅ **Part 10 done when:** the topic saves without errors and none of its nodes mention a v1 global.

---

## Part 11 — Edit Show JD Section

Show JD Section now reads the v2 globals. It can show one section, the whole current JD, or the draft so far.

### 11.1 Description, input and output
1. Open **Show JD Section** → **Details**.
2. **Trigger** → **Description:** from 8.2.
3. **Inputs** → **SectionName**: keep its settings and update its **Description** from 8.2.
4. **Outputs** → **SectionShown**: update its **Description** from 8.2.

### 11.2 Delete the old body
Delete every node below the trigger (bottom up, **…** → **Delete**). Keep the input and the output. **Save.**

### 11.3 Guard: no job loaded
1. **+** → **Add a condition** → `IsBlank(Global.JDJobCode)`.
2. In its branch:
   - **Send a message:** `There's no job loaded for an update right now. Which job would you like to look at?`
   - **End current topic**.

### 11.4 Work out which part to show
Below the 11.3 block: **Set a variable value** → **Create new** → `Topic.Section` → formula:
```powerfx
With(
  { k: Lower(Substitute(Topic.SectionName, " ", "")) },
  If(
    "draft" in k || "change" in k, "Draft",
    "purpose" in k, "Purpose",
    "dut" in k, "Principal Duties",
    "edu" in k, "Education",
    "exp" in k, "Work Experience",
    "cert" in k || "licen" in k, "Certifications/Licenses",
    "ksa" in k || "knowledge" in k || "skill" in k, "KSAs",
    "all" in k || "whole" in k || "full" in k || "job" in k || "jd" in k, "All",
    ""
  )
)
```
This accepts your v1 keys (`PrincipalDuties`, `WorkExperience`, `KSA`, …), display names, and loose wording.

### 11.5 Guard: unknown section
1. **+** → **Add a condition** → `Topic.Section = ""`.
2. In its branch:
   - **Send a message:** `Which part would you like to see? Purpose, Principal Duties, Education, Work Experience, Certifications/Licenses, KSAs, the whole job description, or your changes so far.`
   - **End current topic**.

### 11.6 Draft view
1. **+** → **Add a condition** → `Topic.Section = "Draft"`.
2. In its branch:
   1. **Set a variable value** → `Topic.SectionShown` (the output) → formula:
      ```powerfx
      If(
        IsBlank(Global.JDDraft),
        "There are no changes in your draft yet. What's changing about the job?",
        "Here's everything in your draft for **" & Global.JDJobTitle & "** so far:" & Char(10) & Char(10) &
        Global.JDChangesFull &
        If(
          Boolean(ParseJSON(Global.JDDraft).title.requested),
          Char(10) & Char(10) & "**Title review**: proposed title " & Text(ParseJSON(Global.JDDraft).title.proposed),
          ""
        )
      )
      ```
   2. **Send a message** → **{x}** `Topic.SectionShown`.
   3. **End current topic**.

### 11.7 Section or whole-JD view
Below the 11.6 block:
1. **Set a variable value** → `Topic.SectionShown` → formula:
```powerfx
With(
  {
    secs: Table(
      { n: "Purpose", t: Global.JDOrigPurpose, p: Global.JDPropPurpose },
      { n: "Principal Duties", t: Global.JDOrigDuties, p: Global.JDPropDuties },
      { n: "Education", t: Global.JDOrigEducation, p: Global.JDPropEducation },
      { n: "Work Experience", t: Global.JDOrigExperience, p: Global.JDPropExperience },
      { n: "Certifications/Licenses", t: Global.JDOrigCerts, p: Global.JDPropCerts },
      { n: "KSAs", t: Global.JDOrigKSAs, p: Global.JDPropKSAs }
    )
  },
  If(
    Topic.Section = "All",
    "Here's the current job description for **" & Global.JDJobTitle & "**:",
    "Here's the current **" & Topic.Section & "** for **" & Global.JDJobTitle & "**:"
  ) & Char(10) & Char(10) &
  Concat(
    Filter(secs, Topic.Section = "All" || n = Topic.Section),
    With(
      { L: Split(t, "<br>") },
      If(Topic.Section = "All", "**" & n & "**" & Char(10) & Char(10), "") &
      If(
        IsBlank(t),
        "_This section is empty._",
        If(
          StartsWith(First(L).Value, "•"),
          Concat(L, If(StartsWith(ThisRecord.Value, "•"), "- " & Trim(Mid(ThisRecord.Value, 2)), ThisRecord.Value), Char(10)),
          Concat(L, ThisRecord.Value, Char(10) & Char(10))
        )
      ) &
      If(IsBlank(p), "", Char(10) & Char(10) & "_Your draft changes this section._")
    ),
    Char(10) & Char(10)
  ) &
  If(IsBlank(Global.JDDraft), "", Char(10) & Char(10) & "Ask ""what have I changed?"" to see your draft.")
)
```
(In Power Fx, a quote mark inside text is typed twice: `""`.)
2. **Send a message** → **{x}** `Topic.SectionShown`.

**Save.**

Bulleted lines show as `- ` list items, which avoids the code-block problem. Paragraph lines are separated by blank lines so they don't run together. The view shows the current official text, never the full updated JD.

✅ **Part 11 done when:** the topic saves without errors.

---

## Part 12 — Edit Cancel or Switch → Discard JD Update

### 12.1 Rename and describe
1. Open **Cancel or Switch JD Update** → **Details** → **Name:** `Discard JD Update`.
2. **Trigger** → **Description:** from 8.2.

### 12.2 Delete the old body, then the inputs
1. Delete every node below the trigger (bottom up).
2. **Details** → **Inputs** → delete **Mode** (and **NewJob**, if you have it): select each → trash icon.
3. **Outputs** → delete **SwitchStatus**, if you have it.
4. **Save.**

### 12.3 Guard: nothing in progress
1. **Add a condition** → formula:
   ```powerfx
   IsBlank(Global.JDDraft) && IsBlank(Global.JDJobCode)
   ```
2. In its branch:
   - **Send a message:** `You're all set. There's no update in progress right now.`
   - **Topic management** → **End all topics**.

### 12.4 Confirm
Below the 12.3 block: **Ask a question**:
- **Message:** `Discard this update for ` → **{x}** `Global.JDJobTitle` → `? This can't be undone.`
- **Identify:** Multiple choice → `Yes, discard`, `No, keep it`
- **Save as:** **Create new** → `Topic.Confirm`

### 12.5 Branches
**Yes, discard:**
1. **Go to another topic** → **Reset JD Update**.
2. **Send a message:** `Done. Those changes are discarded. If you'd like to update a job, just tell me which one and what's changing.`
3. **End all topics**.

**No, keep it:**
1. **Send a message:** `Okay, your draft is still here.`
2. **End current topic**.

**Save.**

### 12.6 Connect Submit's Cancel branch
1. Open **Submit JD Update** → the **Cancel update** branch (7.15).
2. Above the **End current topic** node: **+** → **Go to another topic** → **Discard JD Update**.
3. **Save.**

✅ **Part 12 done when:** both topics save without errors.

---

## Part 13 — Finish the switch over

### 13.1 Check your lookup's links into the update (from L9)
Open your job lookup topic(s):

| If you find | Do this |
|---|---|
| A **Go to another topic → Start JD Update** node | Keep it. If it now shows a **ChangeRequest** input, leave it blank |
| A **Go to another topic → Discard JD Update** node (formerly Cancel or Switch, e.g. with Mode = Switch) | Delete it. Start JD Update handles switching now. It probably shows an error because the Mode input is gone |
| A condition on **Global.UpdateInProgress** | Change its formula to `Not(IsBlank(Global.JDJobCode))` (true while a job is loaded for an update) |
| Any other v1 global (OriginalJD, Changes, …) | Note what it does, and tell me |

**Save** each topic you changed.

### 13.2 Tool availability
**Tools** → for each of **JD Drafter**, **JD Final Check**, **Get JD Reference** and **Save JD Update Request**, check that **When will this be used?** is **Only when referenced by topics or agents**.

Leave **Fuzzy match**, **Get JD Details** and **Related Levels** as they are, since your lookup uses them.

### 13.3 Instructions
**Overview** → **Instructions** → **Edit** → select all → paste the 8.1 text → **Save**.

### 13.4 Greeting (optional)
**Topics** → **System** → **Conversation Start** → replace the greeting with the 8.3 text → **Save**.

### 13.5 Fresh session
In the test pane, click **Start new test session** (the refresh icon). Then go to Part 14.

✅ **Part 13 done when:**
- the lookup topic(s) save without errors;
- the new instructions are saved;
- the topics list shows these update topics **on**: Start JD Update, Draft JD Update, Show JD Section, Submit JD Update, Discard JD Update, Reset JD Update.

---

## Part 14 — Tests and tuning

Start a new test session for each group. Watch the **activity map** to confirm which topic ran, and use **Variables** to check globals.

### 14.1 Starting and viewing

| # | Say | Expect |
|---|---|---|
| T1 | I want to update the Universal Banker I job description | Your lookup finds and confirms the job as it does today → Start JD Update: "I've got **Universal Banker I** ready to update. What's changing…". No cards, no full JD |
| T2 | *(new session)* Our Universal Banker Is are going to start opening small business accounts | Lookup → Start JD Update → Draft JD Update runs straight away (both show in the activity map). Add lines for Principal Duties (probably also KSAs), a "No change needed" list, any Sales/Non-Sales concern as a note rather than a question, and either the justification ask or a next step |
| T3 | Show me the current principal duties | Show JD Section: clean `- ` bullets, no grade, code, salary type or status, and "_Your draft changes this section._" if T2 ran |
| T4 | Show me the whole job description | Show JD Section (All): all six sections, current text |
| T5 | What have I changed so far? | Show JD Section (Draft): Add/Remove lines for every changed section |
| T6 | *(mid-update)* Show me the Universal Banker II job | Your lookup shows it as today. In **Variables**, `JDDraft` is unchanged |
| T7 | What grade is the Universal Banker II? | A polite decline: HR manages that |

> **T2 asks "what's changing" instead of drafting?** The orchestrator didn't fill ChangeRequest. This happens when your lookup topic redirects into Start, since a redirect can't pass the original message. The manager just re-states the change. If you want it automatic, tell me how your lookup ends and we'll pass the request through.

### 14.2 Drafting

| # | Say | Expect |
|---|---|---|
| T8 | Make that duty mention they refer complex needs to the business banking team | Only Principal Duties shown, plus the "Also in your draft" line |
| T9 | Drop the KSA change | KSAs leave the draft |
| T10 | *(new session)* I need to update a job: they'll handle wire transfers now → *(agent asks which job)* → Operations Specialist II | The draft reflects wire transfers |
| T11 | Tellers will approve overdrafts now | The in-scope version ("reviews… refers for approval") with a one-sentence reason |
| T12 | *(on a Level I job)* add a duty you know appears in its Level II | Draft plus a level-drift note naming Level II |
| T13 | The lead will have final authority on team decisions and work independently | A neutral rewrite plus a classification note, with no legal terms |
| T14 | Also make this role exempt | That part is blocked and the rest continues; `JDHardStops` has the request |
| T15 | The lead will now do performance reviews | People Management noted; the question comes at submit |
| T16 | They train new tellers now | **No** People Management note |
| T17 | Retitle it Small Business Banker | Title recorded and never suggested; submitting with only a title is blocked |
| T18 | *(on a custodian or similar role)* Add opening small business accounts | A relevance question before drafting |
| T19 | Actually, let's do the Teller job instead → confirm Teller | Switch confirmation. **No** keeps the UB I draft; **Yes** loads Teller with an empty draft |
| T20 | Add that Maria is great with clients | not_feasible: JDs describe the role |
| T21 | *(a job with Required/Preferred endings)* ask for a degree change | The new Education line keeps the exact ending format |
| T22 | *(a job with no Certifications)* They'll need a notary commission | Certifications shows only an Add line with a bullet, and no blank "Remove:" line |

### 14.3 Submitting

| # | Say | Expect |
|---|---|---|
| T23 | Looks good, send it | One message with all the questions → answer → summary → **Submit to HR** → Submitted! plus the link. The request item is complete, including BusinessJustification. **In the redline, untouched duties show as unchanged**, including on a job whose stored duties have extra spaces |
| T24 | *(check the T23 HR email)* | The indirect cards, level block, and section and reason chips render as in a v1 email; the justification is at the top of the HR summary |
| T25 | Submit without ever giving a reason, and skip it in the answers | The justification gate asks once |
| T26 | At "Ready to send it to HR?", type **What happens after I submit?** | **Doesn't submit**; the drafter answers; the draft is unchanged |
| T27 | At "Ready to send it to HR?", type **yes but drop the KSA change** | Doesn't submit; the KSA change is removed |
| T28 | After T26, say **send it** | The summary and the submit question again; the confirming questions are **not** asked again |
| T29 | With one indirect question only, submit | The message says "one quick question" without "answer them all" |
| T30 | Scrap this update → then: that's it, thanks | Discard asks once; the goodbye doesn't trigger Discard |

### 14.4 Plan check
1. Ask for a big Principal Duties rewrite on a job with many duties ("reorder and tighten all the duties").
2. In the activity map you may occasionally see JD Drafter run **twice**. That's the retry catching a bad plan.
3. In **Variables**, `JDPropDuties` should never contain a duplicated line.

### 14.5 Where to fix what

| If you see | Fix it in |
|---|---|
| Wrong sections chosen, weak wording, too strict or too lenient | JD Drafter: SECTION ROUTING, WRITING STANDARDS, CALIBRATION EXAMPLES; the reference file |
| Level judgments off | Reference file level profiles; the Related Levels output |
| The wrong topic picked | The descriptions (8.2) first, then the instructions |
| The agent restates the draft | Instructions step 3; check that Draft JD Update has no outputs |
| Too many confirming questions | JD Drafter INDIRECT FIELDS criteria |
| HR summary thin | JD Final Check task 8 |
| HR email missing items or lists look wrong | The Part 4 key table; the 7.13 formats |
| "I couldn't build that draft cleanly" appears often | JD Drafter OUTPUT rules on `keep`; add a calibration example with a full keep list; check the `JDContext` numbering |

Your 14 persona scripts in `JD-Agent-Sample-Dialogues.md` still apply. Run them after these tests.

✅ **Part 14 done when:** T1–T30 pass. Then publish and move to UAT.

---

## Part 15 — Clean up after UAT

Only after UAT sign-off, in each environment:

| Remove | Where |
|---|---|
| **Save Section Change**, **Preview Section Change**, **Log Hard Stop**, **Request Title Review**, **Review and Submit JD Update** | **Topics** → each → **…** → **Delete** |
| **JD Section Reviewer**, **JD Final Review**, **JD Review Router** | **Tools** → each → **…** → **Delete** |
| v1 globals: UpdateInProgress, OriginalJD, OriginalJDText, SelectedSections, AddedSections, UpdateReasons, OtherReason, Changes, PendingChecks, HardStopLog, ManagerNotes, TitleReviewRequested, RelatedLevels, FollowupsDone, and any others the v1 topics created | Open **Variables** in any topic; a global with no remaining references can be deleted. Skip any that your lookup still uses |
| `JD-Agent-Instructions-v1-backup.txt` | Keep it until v2 has run for a while, then archive it |

Keep every flow, the templates, the lists, the libraries and the reference file.

---

## Appendix A — Firm information to fill in

| # | Marker | Where | What | Probably found in… |
|---|---|---|---|---|
| A1 | Education / Work Experience endings | JD Drafter WRITING STANDARDS | One exact real example of each | An existing JD |
| A2 | Level dimensions + profiles | Reference file; JD Drafter SCOPE | Definitions, verbs and core duties per level (**Lead first**) | JD knowledge file, job architecture docs, your lead-role audit notes |
| A3 | Approved phrases | Reference file | Standard duty wording | Existing JDs |
| A4 | Job family notes | Reference file | A summary per family | Job families file |
| A5 | Hard stop rules | JD Drafter RULES | Additional hard stops | Your `[INSERT HARD STOP RULES]` list |
| A6 | Overtime-classification criteria | JD Drafter; JD Final Check task 6 | Signals and patterns | Qualification criteria document |
| A7 | Indirect-field criteria | JD Drafter INDIRECT FIELDS | Signals and non-signals per field | Qualification criteria document |
| A8 | Routing + style rules | JD Drafter | Your rules | JD knowledge file / writing guide |
| A9 | Calibration examples (10–15) | JD Drafter | Real requests with the right handling (half of them "this is fine") | Past manager emails, your persona scripts |
| A10 | Reason categories | JD Final Check task 2 | Your L8 labels, exactly | L8 |
| A11 | Level similarity criteria | JD Final Check task 4 | Your criteria | JD Final Review's `[INSERT LEVEL SIMILARITY CRITERIA]` |
| A12 | Company name, HR contact | Prompts, instructions | Names | — |

**The order that pays off fastest:** A7 → A6 → A2 (Lead first) → A9 → A5 → A10, then the rest.

---

## Appendix B — Name reference

**Key between topics and flows:** Job Code, as today.

**Flows:**
- Unchanged: Fuzzy match · Get JD Details · Build Redline Rows · Split Req Pref · Send HR Review Email · Daily CSV
- Changed: Related Levels (restricted fields stripped, if needed) · Save JD Update Request (+ BusinessJustification)
- New: Get JD Reference (topics-only)

**Prompts:** JD Drafter · JD Final Check (both topics-only)

**Topics:**
- Unchanged: your lookup
- Edited: Start JD Update · Show JD Section · Discard JD Update (was Cancel or Switch)
- New: Draft JD Update · Submit JD Update · Reset JD Update (redirect only)
- Off, then deleted: Save Section Change · Preview Section Change · Log Hard Stop · Request Title Review · Review and Submit JD Update

**Globals (26):**
- Job: JDJobCode · JDJobTitle
- Tidy copy: JDOrigPurpose · JDOrigDuties · JDOrigEducation · JDOrigExperience · JDOrigCerts · JDOrigKSAs
- Context: JDContext · JDHRContext · JDRelatedLevels · JDReference
- Draft: JDRequestLog · JDDraft · JDChangesFull
- Proposed: JDPropPurpose · JDPropDuties · JDPropEducation · JDPropExperience · JDPropCerts · JDPropKSAs
- Submit: JDHardStops · JDFinalReview · JDJustification · JDCheckAnswers · JDCheckDraft

**Exact section names (the prompt and the formulas must match):** Purpose · Principal Duties · Education · Work Experience · Certifications/Licenses · KSAs

**Files / columns:** JD Expert Reference.txt (JD Templates) · BusinessJustification (JD Update Requests)

---

## Appendix C — Troubleshooting

| Problem | Cause / fix |
|---|---|
| `ParseJSON` errors in Draft or Submit | The prompt's Output isn't set to JSON (3.4 / 4.3), a key is missing (re-apply the example JSON), or the text property isn't `.text` (L7) |
| Start asks "Which job description…?" right after the job was confirmed | 10.3 reads the wrong variable. Check L1: `[[L1: JOBCODE]]` must be what Get JD Details uses |
| Start says "We're already working on X" for a different job | The lookup didn't update JOBCODE before Start ran. Check the lookup's flow and instructions step 1 |
| The agent asks "what's changing" though the user already said | ChangeRequest wasn't filled (see the note under 14.1) |
| JDContext shows one long line per section | Get JD Details returns a separator the tidy copy doesn't know. Send me one raw value from Variables |
| Untouched duties show as Removed + Added in the redline | Build Redline Rows cleans text differently from the tidy copy (e.g. it doesn't collapse double spaces). Send me one stored duty line exactly as it appears in the list |
| A section's changes never show or save | The section name doesn't match exactly. The plan check now catches this ("I couldn't build that draft cleanly"); compare the drafter's names with Appendix B |
| "I couldn't build that draft cleanly" appears often | The drafter misnumbers `keep`s. Add a calibration example with a full keep list; check the `JDContext` numbering; try a stronger model |
| `Sequence`, `With`, `ForAll`, `Distinct`, `Mid` or `Last(FirstN())` not recognized | Rare. Bring the exact error text back and the formula will be reworked |
| A prompt input rejected as blank | Wrap it: `If(IsBlank(x), "(none)", x)` |
| Show JD Section says "Which part would you like to see?" for a valid section | Check what the orchestrator passed in SectionName (activity map), and add that word to 11.4 |
| The agent repeats the draft after Draft JD Update | Check that the topic has **no outputs**; tighten instructions step 3 |
| The agent writes JD wording itself | Instructions RULES line 2; the Draft JD Update description |
| A typed reply at "Ready to send it?" submits | 7.11 steps 3–4: the guard node must sit between the question and your condition, and the auto-generated branches must be deleted |
| Questions asked again after a side question | The 7.6 condition; `JDCheckAnswers` / `JDCheckDraft` must be set after the question |
| HR email fails at the FinalReviewJSON parse, or is missing items | JD Final Check keys and types (Part 4 table) |
| HR email chips look odd | The SectionsChanged and Reasons separators (7.13) |
| Discard runs after "that's it" | The Discard description (8.2) |
| The lookup topic shows an error on a redirect node | It pointed to Cancel or Switch with Mode (13.1) |

---

## Appendix D — Later

- **Search and browse jobs** ("show me all the lead roles", "which jobs mention lending"): a Find Jobs flow plus a safe Get Job viewer. Designed; build when you're ready.
- **Keep restricted fields away from the orchestrator entirely:** once lookups use a safe viewer, set Get JD Details to topics-only.
- **Source data cleanup** in the daily CSV flow: optional now, since the tidy copy covers updates. Worth doing if bullets keep rendering oddly elsewhere.
- **HR email token for the justification:** add a `{{BusinessJustification}}` block to `HR Review Email.html` and a Token List row in Send HR Review Email. Until then, it's at the top of the HR summary.
- **Finish the Purpose inline slots:** independent of v2.
- **Other 📋 items:** removed Req/Pref ending fix, requirement-level flag, Edu/Exp paragraph slots, HR email phase 2 (reply processing), word-level bullet redlines.
- **Cross-family role drift at submit:** compare against similar titles.
- **HR alignment tools** (single-JD review, ladder review, batch audit) in a separate HR-facing agent, reusing the JD Drafter knowledge.
- **Create section:** reuse the JD Drafter approach.
- **Multi-job updates** ("add this duty to every Universal Banker level"). For now, it's one job per update.
