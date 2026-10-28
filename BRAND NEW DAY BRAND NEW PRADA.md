# JD Expert v2: Conversational Update Build Guide

**Builds on:** your current JD Expert agent (Copilot Studio classic, generative orchestration), as listed in `JD-Expert-Component-Inventory.md`. It reuses Fuzzy match (MatchJobTitle), Get JD Details, Related Levels, and Save JD Update Request with its child flows (Build Redline Rows, Split Req Pref, Send HR Review Email).
**Goal:** Managers describe what's changing about a job in plain words. The agent drafts every affected section in house style. It judges scope, level and overtime-classification risk, revises on request, and captures a business justification. It then submits to HR through your existing Save flow, redline documents and HR email. Users can also search and browse job descriptions freely ("show me all the lead roles").
**Build in:** DEV.
**As of:** October 28, 2026 (revised against your component inventory)

> **How to read the markers in this guide**
> - `[[FIRM: …]]` marks information only you have: your criteria, rules, standard wording and examples. Paste it in where marked. Every one is listed in **Appendix A**, along with where it probably lives on your work computer.
> - `[[CHECK: …]]` marks something to confirm in your tenant, such as a column's internal name or an existing flow's input or output name.
> - `{InputName}` inside prompt text means "insert that prompt input here." In the prompt editor, delete the `{InputName}` text, type `/`, and pick the input.

---

## Contents

- Part 0: How it works
- Part 1: Prep (backup, retire old topics, column names, reference file, new column)
- Part 2: Find Jobs flow
- Part 3: Get Job flow (safe view)
- Part 4: Get JD Reference flow + checks on your existing flows
- Part 5: Global variables + Reset JD Update topic
- Part 6: Start JD Update topic
- Part 7: JD Drafter prompt
- Part 8: Draft JD Update topic
- Part 9: JD Final Check prompt
- Part 10: Submit JD Update topic (+ Save flow change)
- Part 11: Discard JD Update topic
- Part 12: Agent instructions, descriptions, greeting, knowledge
- Part 13: Tests and tuning
- Appendix A: Firm information to fill in
- Appendix B: Name reference
- Appendix C: Troubleshooting
- Appendix D: Later
- Appendix E: Goals check

---

## Part 0: How it works

### 0.1 What the manager experiences

> **Manager:** Can I see all the lead roles?
> **Agent:** I found 23 job titles with "Lead" in them: Operations Lead, Deposit Services Lead, … Want me to narrow it down by area, or open one?
>
> **Manager:** Our Universal Banker Is are going to start opening small business accounts.
> **Agent:** Got it. For Universal Banker I, opening small business accounts adds a new task and new product knowledge:
> **Principal Duties**: Adds opening small business deposit accounts.
> - Add: Opens small business deposit accounts, gathering required business documentation and completing account-opening procedures.
>
> **KSAs**: Adds small business product knowledge.
> - Add: Knowledge of small business deposit products and documentation requirements.
>
> No change needed: Purpose, Education, Work Experience, Certifications/Licenses
> - Opening business accounts can affect how a role is classified for sales. I'll confirm that with you before it goes to HR.
>
> What's driving the change? HR will want the business reason.
>
> **Manager:** We're rolling out small business banking in all branches. Also make it clear they refer complex business needs to the business banking team.
> **Agent:** *(revises only that duty and shows it)*
>
> **Manager:** What does a Universal Banker II do differently?
> **Agent:** *(opens UB II and compares. The draft for UB I is untouched.)*
>
> **Manager:** Looks good, send it.
> **Agent:** Before I send this to HR, one quick question: Will this role have sales or referral goals for business accounts?
> **Manager:** No, just referrals when needed.
> **Agent:** *(summary)* Ready to send it to HR?  →  **Submit to HR**  →  link to the redlined document; HR gets the email.

There are no section cards, no section-by-section walk, and no decision loop. The manager can talk in any order: search, ask side questions, revise, undo.

### 0.2 The pieces

```
MANAGER ──► ORCHESTRATOR  (agent instructions: how to behave)
                │
  READ (any time)            UPDATE (thin topics)                          COMMIT
  ───────────────────        ──────────────────────────────────────        ──────────────────────────────
  Fuzzy match (existing)     Start JD Update ─► Get JD Details (existing)    Submit JD Update
  Find Jobs   (new)                          ├► Related Levels (existing)      ├► JD Final Check (prompt)
  Get Job     (new)                          └► Get JD Reference (new)         └► Save JD Update Request
  Knowledge                  Draft JD Update ─► JD Drafter (prompt)                 └► redlines + HR email
                             Discard JD Update                                          (existing)
                             Reset JD Update (internal helper)
```

**Job Code is the key** every tool passes along, the same as v1. Fuzzy match and Find Jobs return it. Get Job, Start JD Update, Get JD Details, Related Levels and the Save flow take it.

### 0.3 Five design rules (keep these in mind while building)

1. **Thin topics.** A topic calls a tool, stores the result, and shows it. There are no section walks and no decision loops. The orchestrator runs the conversation.
2. **The drafter speaks for the draft.** The JD Drafter prompt writes the changes and the notes about them, and Draft JD Update shows them exactly as written. The orchestrator handles everything else: search, viewing, side questions.
3. **The AI proposes, code applies.** For each changed section, the drafter returns a *line plan*: "keep original line 3", "new line: …". Power Fx then builds the proposed text. Untouched lines are copied byte for byte, so your redlines stay clean and the normalization problems go away.
4. **Restricted fields never reach the orchestrator or the drafter.** Get JD Details returns every field, so it becomes topics-only; the orchestrator views jobs through the new Get Job, which returns safe fields only. Grade and Salary Type go into a hidden global that only JD Final Check sees, and only for HR-only fields. Job Code travels between tools as in v1, and the instructions keep it out of chat.
5. **What's submitted is what was shown.** The draft lives in a global. The Save flow gets its values from globals, never from text the orchestrator retyped.

### 0.4 What's new, reused and retired

| New | Reused (existing) | Retired (turned off, not deleted) |
|---|---|---|
| Find Jobs flow (lists, counts, content search) | Fuzzy match + MatchJobTitle (finding one job by name) | Find/confirm job topic ("Update or View Job Description") |
| Get Job flow (safe view of one job) | Get JD Details (loads the full record inside Start JD Update; becomes topics-only) | Start JD Update (v1) |
| Get JD Reference flow | Related Levels | Show JD Section |
| JD Drafter prompt | Save JD Update Request + Build Redline Rows + Split Req Pref + Send HR Review Email (one new input) | Preview Section Change |
| JD Final Check prompt (keeps v1's FinalReviewJSON keys) | Word templates, libraries, HR email template | Save Section Change |
| Start / Draft / Submit / Discard / Reset JD Update topics | JD Update Requests list (one new column) | Log Hard Stop |
| JD Expert Reference.txt file | Daily CSV flow · JD knowledge and job families files · `JD HR Review Mailbox` | Request Title Review |
| BusinessJustification column | | Review and Submit JD Update · Cancel or Switch JD Update |
| | | Sections + Reasons cards, JD Section Reviewer, JD Review Router, readiness follow-ups |

Your old JD Final Review prompt stays untouched. JD Final Check is a new prompt, so you can roll back.

### 0.5 Where the expertise lives

| Knowledge | Lives in |
|---|---|
| How to judge and write: scope tests, section routing, writing standards, overtime-classification signals, indirect-field criteria, hard stops, titles, severity, calibration examples | **JD Drafter** prompt (Part 7) |
| Level profiles, approved phrases, job family notes | **JD Expert Reference.txt** in SharePoint (Part 1.4), loaded per job and passed to the prompt. You edit the file; no republish needed |
| The real neighboring levels | **Related Levels** flow output, loaded per job |
| Level similarity, classification (HR only), HR summary | **JD Final Check** prompt (Part 9) |
| How to behave in conversation | **Agent instructions** (Part 12) |
| Answers to general questions ("what's a Lead?") | **Knowledge** (your JD knowledge file, job families file, and optionally the reference file) |
| Restricted fields, formats, what gets saved | **Code**: flows and Power Fx |

### 0.6 Time estimate

| Part | Work | Estimate |
|---|---|---|
| 1 | Prep: backup, retire old topics, column names, reference file shell, new column | 1–1.5 h |
| 2 | Find Jobs flow | 1–1.5 h |
| 3 | Get Job flow (safe view) + adjust your lookup flows | 45–60 min |
| 4 | Get JD Reference flow + checks on your existing flows | 30–45 min |
| 5 | Globals + Reset JD Update topic | 30–45 min |
| 6 | Start JD Update topic | 45–60 min |
| 7 | JD Drafter prompt (setup only) | 1 h |
| 8 | Draft JD Update topic | 2–3 h |
| 9 | JD Final Check prompt | 45 min |
| 10 | Submit JD Update topic + Save flow change | 2–3 h |
| 11 | Discard JD Update topic | 20 min |
| 12 | Instructions, descriptions, greeting, knowledge | 45 min |
| 13 | Tests and tuning | 4–6 h |
| A | Filling in your firm's information (criteria, level profiles, phrases, examples) | 3–6 h, depending on how ready your documents are |
| | **Total** | **about 16–25 hours**: roughly 3–4 focused days, or about 2 weeks alongside regular work |

The biggest quality lever is Appendix A, not the plumbing. Expect most tuning time in Part 13 to go into the JD Drafter prompt and the reference file.

### 0.7 Rules: what carries over and what changes

**Carried over from v1:**
- Editable sections: Purpose, Principal Duties, Education, Work Experience, Certifications/Licenses, KSAs.
- Indirect fields are never edited, only confirmed at the end: People Management, Sales/Non-Sales, Relationship Manager, NMLS Required.
- Restricted fields are never shown and never changed: Grade, Job Code, Salary Type, Status.
- A hard stop is any Salary Type change, plus `[[FIRM: additional hard stop rules]]`. Hard stops are logged for HR.
- Title review: the user proposes the title, the agent never suggests one, and supporting section changes are required.
- One job per update, finished in one session, no saved drafts. Switching jobs discards the update (after a confirmation).
- Never show the full updated JD.
- Principal Duties are stored as `• Text` lines separated by `<br>`. Education and Work Experience keep their Required/Preferred endings.

**Changed in v2 (decide whether you agree before building):**
- **Business justification (new):** every update must carry one before it can be submitted.
- **Title review:** the manager asks for it in conversation instead of picking it on a card.
- **Level similarity:** the drafter flags level drift *during* drafting, as a one-sentence advisory note, so the manager isn't surprised at the end. JD Final Check still gives the formal recommendation at submit for the manager and HR.
- **Reasons for update:** no longer picked on a card up front. JD Final Check infers the reason categories from the conversation for the request record.
- **HR readiness follow-ups:** replaced by the drafter's `needs_info` questions while drafting, plus the single question message at submit.

### 0.8 Your current components in v2

Based on `JD-Expert-Component-Inventory.md` (status keys as in the inventory).

| Component | Today | In v2 |
|---|---|---|
| Find/confirm job topic | ❓ | **Retired.** The orchestrator calls Fuzzy match and Get Job directly |
| Start JD Update | ✅ | **Replaced** by a new Start JD Update (no cards, no JD dump, reuses Get JD Details and Related Levels) |
| Show JD Section | ✅ | **Retired.** Get Job shows any section |
| Preview Section Change | ✅ | **Retired.** Draft JD Update shows Add/Remove lines for every section, not just Principal Duties |
| Save Section Change | ✅ | **Retired.** Draft JD Update saves the whole draft |
| Log Hard Stop | ✅ | **Retired.** Draft JD Update logs hard stops |
| Request Title Review | ✅ | **Retired.** The drafter records title requests |
| Review and Submit JD Update | ✅ + 🔧 | **Replaced** by Submit JD Update. **Stop work on the readiness follow-ups (🔧)**; v2 doesn't use them |
| Cancel or Switch JD Update | ✅ | **Replaced** by Discard JD Update plus the switch guard in Start JD Update |
| JD Section Reviewer | ✅ | **Replaced** by JD Drafter |
| JD Final Review | ✅ + 🔧 | **Replaced** by JD Final Check, which keeps every key Send HR Review Email reads from FinalReviewJSON |
| JD Review Router | ✅ | **Retired.** There's no decision loop to route |
| Fuzzy match + MatchJobTitle | ❓ | **Reused** for finding one job by name (typo-tolerant) |
| Get JD Details | ❓ | **Reused** inside Start JD Update; set to topics-only because it returns restricted fields |
| Related Levels | ❓ | **Reused** inside Start JD Update |
| Save JD Update Request | ✅ | **Reused** plus one new input (BusinessJustification) |
| Build Redline Rows (+ 🔧 Paragraph mode) | ✅ | **Reused.** Finish the Purpose inline slots on their own track; v2 doesn't change them |
| Split Req Pref | ✅ | **Reused** |
| Send HR Review Email | ✅ testing | **Reused** unchanged. The justification arrives inside HRSummary until you add a token |
| Daily CSV ingestion | ❓ | **Reused.** The duties cleanup (📋) is still worth doing: Get Job's display and the Remove lines both read the stored text |
| JD list, JD Update Requests, libraries, templates, `JD HR Review Mailbox` | | **Reused.** One new list column and one new file in JD Templates |
| v1 globals (UpdateInProgress, OriginalJD, Changes, …) | | **Unused.** All v2 globals start with `JD`; delete the v1 ones after UAT |
| Designed, not built (📋) | | Reasons check → replaced by inferred reason categories. Role-fit check → covered by the drafter's SCOPE tests. Removed Req/Pref ending fix, requirement-level flag, Edu/Exp paragraph slots, HR email phase 2, word-level bullet redlines → unaffected; still on your list. Create section → can reuse the JD Drafter approach later |

---

## Part 1: Prep

### 1.1 Back up the solution

1. Go to **make.powerapps.com** → pick your **DEV** environment (top right).
2. Left menu → **Solutions** → open your JD solution.
3. Top bar → **Export solution** → **Next** → **Unmanaged** → **Export**.
4. When the banner says it's ready, select **Download**. Keep the .zip as your rollback point.

### 1.2 Retire the old update topics

1. Go to **copilotstudio.microsoft.com** → DEV environment → open the **JD Expert** agent.
2. Top tabs → **Topics**.
3. For each of these 9 topics: your **Find/confirm job** topic (for example "Update or View Job Description", if it exists as a topic), **Start JD Update, Show JD Section, Preview Section Change, Save Section Change, Log Hard Stop, Request Title Review, Review and Submit JD Update, Cancel or Switch JD Update**:
   1. Open the topic.
   2. Top bar → **Details**. In **Name**, add the prefix `zOLD - ` (for example, `zOLD - Start JD Update`). This frees the names for the new topics and sorts the old ones to the bottom.
   3. **Save**.
   4. Back in the **Topics** list, switch the topic's toggle in the list row to **Off**.
4. **Tools** tab: leave **JD Section Reviewer**, **JD Review Router** and **JD Final Review** alone. They're only referenced by topics, so with their topics off they won't run.
5. Don't change **Fuzzy match**, **Get JD Details** or **Related Levels** yet. Parts 3 and 4 adjust them.

> You can roll back any time by turning the zOLD topics back on and the new ones off. You'll also open the zOLD topics in Parts 4, 9 and 10 to copy settings from v1.

### 1.3 Record your column internal names

Flow expressions need SharePoint **internal** column names. These often differ from display names, and they're cut off at 32 characters.

1. Open the **JD list** in SharePoint → **Settings** (gear) → **List settings**.
2. Under **Columns**, click each column below. The browser URL ends with `&Field=<InternalName>`. Copy that value.
3. Fill in the table. Keep it open, because you'll paste these into Parts 2–4.

| Display name | Internal name | Column type (Text, Choice, Yes/No) |
|---|---|---|
| Job Title | `[[CHECK: internal name — often Title]]` | |
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
| Job Code | `[[CHECK]]` | |
| Grade | `[[CHECK]]` | |
| Salary/Hourly (Salary Type) | `[[CHECK]]` | |
| Status | `[[CHECK]]` | |

> **Choice columns:** in expressions, a Choice column's text is `item()?['Name']?['Value']`, not `item()?['Name']`. This guide writes the plain form. Add `?['Value']` for any column you marked **Choice**.
>
> **Job Code type:** note whether Job Code is a **Text** or **Number** column. Get Job's filter (Part 3.2) depends on it.

Also note:
- **Section separator:** open one JD in the list and confirm Principal Duties lines are separated by `<br>`. Check KSAs and Certifications too. If they use a different separator, note it: `[[CHECK: separator per section]]`.
- **Education / Work Experience ending format:** copy one real example of each ending, exactly as stored: `[[FIRM: e.g. "...Bachelor's degree in Finance Required Or"]]` and `[[FIRM: e.g. "...3 years of branch banking experience. Required."]]`.

### 1.4 Create the JD Expert Reference file

This file holds the level profiles, approved phrases and job family notes. The agent reads it every time a job is loaded, so you can improve the agent by editing this file, without republishing.

1. On your computer, open **Notepad** → paste the template below → **File → Save As** → name `JD Expert Reference.txt`, encoding **UTF-8**.
2. Fill in the `[[FIRM]]` parts now or later (see Appendix A). Keep the file under about 15,000 characters. **Never put Grade, Job Code, salary or status information in it.**
3. In SharePoint, open the **JD Templates** library (the same place as `HR Review Email.html`) → **Upload → Files** → pick the file.
4. Repeat in each environment's site when you deploy, the same way you handle the email template.

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
[[FIRM: more]]

=== JOB FAMILY NOTES ===
Per family: what the family does, its usual ladder, anything unusual.
[[FIRM: paste or condense from your job families file]]
```

### 1.5 Add the BusinessJustification column

1. Open the **JD Update Requests** list in SharePoint.
2. **+ Add column** → **Multiple lines of text** → **Next**.
3. Name: `BusinessJustification`. Leave the other defaults → **Save**.
4. Do the same in UAT and QA when you deploy (or include it in your list provisioning, if you script that).

✅ **Part 1 done when:** you have the backup .zip, the 8 old topics are off and prefixed `zOLD - `, the column table is filled in, the reference file is uploaded (placeholders can stay for now), and the new column exists.

---

## Part 2: Find Jobs flow

**What it does:** searches the JD list by title words and/or content words and returns a list of titles, each with its **Job Code** (the same key your other flows use). It handles "all the lead roles" and "which jobs mention lending", which your Fuzzy match can't do because it returns the top 5 title matches. For one job the user names, the orchestrator keeps using Fuzzy match. Find Jobs returns no restricted columns other than Job Code.

### 2.1 Create the flow

1. Copilot Studio → JD Expert agent → **Tools** tab → **+ Add a tool** → **+ New tool** → **Agent flow**.
2. The designer opens with two actions: **When an agent calls the flow** and **Respond to the agent**.
3. Top left, rename the flow `Find Jobs`.
4. Leave **Express mode** off for this flow (the results text can be long).

### 2.2 Trigger inputs (add them in this exact order)

Select **When an agent calls the flow** → **+ Add an input**:

| Order | Type | Name | Description | Optional? |
|---|---|---|---|---|
| 1 | Text | `TitleQuery` | Word or phrase that must appear in the job title | Yes |
| 2 | Text | `ContentQuery` | Word or phrase to find anywhere in the JD text | Yes |
| 3 | Number | `MaxResults` | How many results to return (default 25, max 50) | Yes |

To make an input optional: select **…** next to the input → **Make the field optional**.

> If Job Code is a **Number** column, wrap it in the map below as `string(item()?['…'])`.
>
> Because you added them in this order, the expressions below refer to them as `triggerBody()?['text']`, `triggerBody()?['text_1']` and `triggerBody()?['number']`. If you're unsure, use the **Dynamic content** picker to insert the input inside the expression instead.

### 2.3 Compose: TitleQ

1. **+** (below the trigger) → search `Compose` → **Compose**.
2. Rename the action `TitleQ` (select its title).
3. **Inputs** → **fx** (expression) → paste:
```
toLower(trim(coalesce(triggerBody()?['text'], '')))
```
4. **Add**.

### 2.4 Compose: ContentQ

Same steps. Name: `ContentQ`. Expression:
```
toLower(trim(coalesce(triggerBody()?['text_1'], '')))
```

### 2.5 Compose: MaxN

Same steps. Name: `MaxN`. Expression:
```
if(less(coalesce(triggerBody()?['number'], 0), 1), 25, min(triggerBody()?['number'], 50))
```

### 2.6 SharePoint Get items: Get JDs

1. **+** → search `Get items` → **SharePoint – Get items**. Rename: `Get JDs`.
2. **Site Address:** the same site (or environment variable) your Get JD Details flow uses.
3. **List Name:** your JD list.
4. **Advanced parameters** → show all, then fill in:
   - **Filter Query:** `[[CHECK: Status internal name]] eq '[[FIRM: value that means active]]'`. Leave it blank if every row in the list is active.
   - **Order By:** `[[CHECK: Job Title internal name]] asc`
   - **Top Count:** `5000`
5. The action's **…** → **Settings** → **Pagination: On** → **Threshold:** `5000` → **Done**.

### 2.7 Filter array: Matches

1. **+** → search `Filter array` → **Data Operation – Filter array**. Rename: `Matches`.
2. **From:** Dynamic content → **Get JDs** → **body/value** (shown as *value*).
3. Condition row:
   - **Left box:** select **fx** → paste the expression below, replacing each `[[CHECK]]` with the internal name from Part 1.3 (add `?['Value']` to any Choice column):
```
and(or(equals(outputs('TitleQ'), ''), contains(toLower(coalesce(item()?['[[CHECK: Job Title]]'], '')), outputs('TitleQ'))), or(equals(outputs('ContentQ'), ''), contains(toLower(concat(coalesce(item()?['[[CHECK: Purpose]]'], ''), ' ', coalesce(item()?['[[CHECK: Principal Duties]]'], ''), ' ', coalesce(item()?['[[CHECK: KSAs]]'], ''), ' ', coalesce(item()?['[[CHECK: Education]]'], ''), ' ', coalesce(item()?['[[CHECK: Work Experience]]'], ''), ' ', coalesce(item()?['[[CHECK: Certifications]]'], ''))), outputs('ContentQ'))))
```
   - **Operator:** `is equal to`
   - **Right box:** **fx** → `true`

> In plain words: keep a row if (no title search was asked, or the title contains it) AND (no content search was asked, or any section's text contains it).

### 2.8 Compose: Top

**+** → **Compose** → rename `Top` → **fx**:
```
take(body('Matches'), outputs('MaxN'))
```

### 2.9 Select: Lines

1. **+** → search `Select` → **Data Operation – Select**. Rename: `Lines`.
2. **From:** **fx** → `outputs('Top')`
3. Next to **Map**, switch to **text mode** (the toggle icon on the right of the Map box).
4. **Map** → **fx** →
```
concat(item()?['[[CHECK: Job Title]]'], ' (code ', item()?['[[CHECK: Job Code]]'], ')')
```

**Optional:** to let the agent answer questions like "which lead roles have people management?", use this map instead (add `?['Value']` for Choice columns):
```
concat(item()?['[[CHECK: Job Title]]'], ' (code ', item()?['[[CHECK: Job Code]]'], ') | People Management: ', coalesce(item()?['[[CHECK: People Management]]'], ''), ' | Sales/Non-Sales: ', coalesce(item()?['[[CHECK: Sales/Non-Sales]]'], ''))
```

### 2.10 Compose: ResultsText

**+** → **Compose** → rename `ResultsText` → **fx**:
```
join(body('Lines'), decodeUriComponent('%0A'))
```

### 2.11 Respond to the agent

Select **Respond to the agent** (it must be the last action; drag it below ResultsText if needed) → **+ Add an output**:

| Type | Name | Value (fx) | Description |
|---|---|---|---|
| Number | `Total` | `length(body('Matches'))` | Total number of matching jobs |
| Number | `Shown` | `length(outputs('Top'))` | How many are listed in Results |
| Text | `Results` | `outputs('ResultsText')` | One job per line: title (job code) |

### 2.12 Save, test, publish

1. **Save** (top right).
2. **Test** → **Manually** → **Test** → TitleQuery `lead` → leave the rest blank → **Run flow**. Check: Total is above 0, and Results lists titles with job codes.
3. Test again with ContentQuery `lending` and TitleQuery blank.
4. **Publish**.

### 2.13 Configure it as a tool

1. Back in Copilot Studio → **Tools** → **Find Jobs** (if it's not listed: **+ Add a tool** → **Flow** → pick it → **Add and configure**).
2. **Description:** paste from Part 12.2.
3. **Inputs:** for each input, select it and paste the input description from Part 12.2. Set **How will the agent fill this input?** to **Dynamically fill with best option**.
4. **Additional details → When will this be used?** → **Agent may use this tool at any time**.
5. **Completion:** leave the default (the agent writes the response).
6. **Save**.
7. Make sure the flow is in your solution: make.powerapps.com → **Solutions** → your solution → **Add existing → Automation** → pick **Cloud flow** or **Agent flow** (whichever lists it) → add **Find Jobs** if it's missing.

✅ **Part 2 done when:** in the agent's **Test** pane, "show me all the lead roles" returns a list of titles and a count, with no job codes shown.

---

## Part 3: Get Job flow (safe view)

**Why a new flow when Get JD Details already works:** Get JD Details returns every field, including Grade, Salary/Hourly and Status. In v1 your topics kept those out of view. In v2 the orchestrator looks jobs up itself, and whatever a tool returns lands in its context. Get Job returns only the safe fields, already cleaned for display, so the orchestrator can show, quote and compare jobs freely. Get JD Details keeps its job, loading the full record inside Start JD Update, and becomes topics-only.

**What it does:** takes a Job Code (from Fuzzy match or Find Jobs) and returns the job's six sections and indirect fields, cleaned for display.

### 3.1 Create the flow

1. **Tools** → **+ Add a tool** → **+ New tool** → **Agent flow**. Rename: `Get Job`. Express mode off.
2. Trigger → **+ Add an input** → **Text** → `JobCode` → description: `The job code from Fuzzy match or Find Jobs`.

### 3.2 Get items: Get job

1. **+** → **SharePoint – Get items**. Rename: `Get job`.
2. **Site Address / List Name:** same as Find Jobs.
3. **Advanced parameters**:
   - **Filter Query:** type `[[CHECK: Job Code internal name]] eq '` → insert Dynamic content **JobCode** → type `'`. If Job Code is a **Number** column, leave out both quote marks.
   - **Top Count:** `1`

### 3.3 Compose: Job

**+** → **Compose** → rename `Job` → **fx**:
```
first(body('Get_job')?['value'])
```

### 3.4 Six cleanup Composes

These remove `<br>`, tabs, non-breaking spaces and stray spacing, and turn `•` into markdown bullets. That prevents the code-block display problem you hit before.

For each row below: **+** → **Compose** → rename as shown → **fx** → paste the template with the column swapped in.

Template (replace `COL`):
```
replace(replace(replace(replace(replace(replace(replace(coalesce(outputs('Job')?['COL'], ''), '<br>', decodeUriComponent('%0A')), decodeUriComponent('%C2%A0'), ' '), decodeUriComponent('%09'), ' '), '•', '- '), '    ', ' '), '  ', ' '), '  ', ' ')
```

| Compose name | COL |
|---|---|
| `CleanPurpose` | `[[CHECK: Purpose]]` |
| `CleanDuties` | `[[CHECK: Principal Duties]]` |
| `CleanEducation` | `[[CHECK: Education]]` |
| `CleanExperience` | `[[CHECK: Work Experience]]` |
| `CleanCerts` | `[[CHECK: Certifications]]` |
| `CleanKSAs` | `[[CHECK: KSAs]]` |

### 3.5 Compose: Overview

**+** → **Compose** → rename `Overview`. In **Inputs**, type the text below. Wherever you see `{CleanPurpose}` etc., delete that placeholder and insert the matching Compose's **Outputs** from Dynamic content. For `{PM}`, `{Sales}`, `{RM}` and `{NMLS}`, select **fx** and enter `outputs('Job')?['<internal name>']` (add `?['Value']` for Choice columns).

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

### 3.6 Respond to the agent

| Type | Name | Value | Description |
|---|---|---|---|
| Text | `JobTitle` | **fx** `coalesce(outputs('Job')?['[[CHECK: Job Title]]'], '')` | The job's title |
| Text | `Found` | **fx** `if(empty(outputs('Job')), 'no', 'yes')` | "no" if no job has this code |
| Text | `Overview` | Dynamic: **Overview → Outputs** | The current job description, formatted for display |

**Save** → **Test** with a known job code → check that the bullets look clean → **Publish**.

### 3.7 Configure as a tool

Same as 2.13. Description and input description come from Part 12.2. Availability: **Agent may use this tool at any time**.

### 3.8 Adjust your two existing lookup flows

1. **Tools** → **Get JD Details** → **When will this be used?** → **Only when referenced by topics or agents** → **Save**. The new Start JD Update still calls it; the orchestrator no longer can.
2. **Tools** → **Fuzzy match** → **Description:** paste from Part 12.2, so the orchestrator uses it for "one job by name" and Find Jobs for lists. Keep **Agent may use this tool at any time**.
3. Check what Fuzzy match returns. Titles, job codes and scores are fine. If it returns any other restricted field (Grade, Salary/Hourly, Status), remove that output from its Respond step.

✅ **Part 3 done when:** "show me the univeral banker 1 job description" (typo on purpose) runs **Fuzzy match → Get Job** and shows clean sections with no grade, job code, salary type or status.

---

## Part 4: Get JD Reference flow + checks on your existing flows

**What it does:** adds a small flow that reads the JD Expert Reference file, plus three checks so Start JD Update (Part 6) can reuse Get JD Details and Related Levels.

### 4.1 Create Get JD Reference

1. **Tools** → **+ Add a tool** → **+ New tool** → **Agent flow**. Rename: `Get JD Reference`. Express mode off.
2. No inputs are needed. (If the designer insists on one, add an optional Text input named `Unused`.)
3. **+** → **SharePoint – Get file content using path**. Rename: `Get reference`.
   - **Site Address:** the site that holds **JD Templates**.
   - **File Path:** browse to `JD Templates/JD Expert Reference.txt` → `[[CHECK: path as shown, e.g. /JD Templates/JD Expert Reference.txt]]`.
4. **Respond to the agent** → **+ Add an output** → **Text** → `Reference` → **fx**: the same expression your **Send HR Review Email** flow uses to turn the template file into text. That's usually `base64ToString(body('Get_reference')?['$content'])`; if the test run already shows plain text, use `body('Get_reference')`.
5. **Save** → **Test** → check that Reference shows your file's text → **Publish**.
6. Copilot Studio → **Tools** → **Get JD Reference** → **Description:** `Internal. Reads the JD Expert reference file. Used only by Start JD Update.` → **When will this be used?** → **Only when referenced by topics or agents** → **Save**. Add it to the solution if it's missing (2.13 step 7).

### 4.2 Write down Get JD Details' outputs

Start JD Update maps these one by one. Open **zOLD - Start JD Update**, select its **Get JD Details** node, and note the output variable for each field:

| Field | Get JD Details output |
|---|---|
| Job Title | `[[CHECK]]` |
| Job Code | `[[CHECK]]` |
| Purpose | `[[CHECK]]` |
| Principal Duties | `[[CHECK]]` |
| Education | `[[CHECK]]` |
| Work Experience | `[[CHECK]]` |
| Certifications/Licenses | `[[CHECK]]` |
| KSAs | `[[CHECK]]` |
| People Management | `[[CHECK]]` |
| Sales/Non-Sales | `[[CHECK]]` |
| Relationship Manager | `[[CHECK]]` |
| NMLS Required | `[[CHECK]]` |
| Salary/Hourly | `[[CHECK]]` |
| Grade | `[[CHECK]]` |

> If Get JD Details returns **one** JSON or record output instead of separate fields, note how v1 read it into `Global.OriginalJD` (for example `ParseJSON(…)` or `Topic.Result.Purpose`) and use the same pattern in Part 6.
> The section outputs must be the **raw** stored text (with `• ` and `<br>`), not a cleaned version, because the line numbering in Part 6 and the line rebuild in Part 8 split on `<br>`. If Get JD Details cleans the text, bring the output names here and we'll adjust.

### 4.3 Check the Related Levels output

Open your **Related Levels** flow and look at what it returns.
- If it returns **Grade, Salary/Hourly or Status** for the other levels, add a **Select** before its Respond step that keeps only titles and section text. In v1 that JSON only reached JD Final Review and the Router, which were told to hide restricted data. In v2 the drafter writes to the manager, so strip those fields at the source.
- Note its **input** (probably Job Code) and its **output name**: `[[CHECK: Related Levels input = ?, output = ?]]`. You'll need both in Part 6.
- Copilot Studio → **Tools** → **Related Levels** → **When will this be used?** → **Only when referenced by topics or agents**.

### 4.4 Confirm the Save flow's availability

Your inventory shows **Save JD Update Request** is already topics-only. Confirm it: **Tools** → **Save JD Update Request** → **When will this be used?** = **Only when referenced by topics or agents**.

✅ **Part 4 done when:** Get JD Reference returns the file text, the 4.2 table is filled in, and Related Levels returns no restricted fields.

---

## Part 5: Global variables + Reset JD Update topic

**What it does:** creates every v2 global in one place, with the right type, and resets them all. Start, Submit and Discard redirect here. All v2 globals start with `JD`, so they never collide with your v1 globals (UpdateInProgress, OriginalJD, Changes, and so on), which stay untouched until cleanup.

### 5.1 Create the topic

1. **Topics** → **+ Add a topic** → **From blank**.
2. Top bar → **Details** → **Name:** `Reset JD Update` → close Details.
3. Select the **Trigger** node → **…** (or **Change trigger**) → **It's redirected to**. The topic now runs only when another topic sends it here; the orchestrator can't pick it.

### 5.2 Add one Set variable node per global

For each row: **+** → **Variable management** → **Set a variable value** → **Set variable** → **Create new** → select the new variable's name → in the **Variable properties** panel, set **Variable name** to the name below and **Usage** to **Global (any topic can access)** → close the panel → **To value** → **Formula** (fx) → type the value → **Insert**.

| # | Variable | Value | Holds |
|---|---|---|---|
| 1 | `JDJobCode` | `""` | Job Code of the job being updated. Also the "a job is loaded" marker. Passed to flows; never shown in chat |
| 2 | `JDJobTitle` | `""` | Title |
| 3 | `JDOrigPurpose` | `""` | Original Purpose (raw) |
| 4 | `JDOrigDuties` | `""` | Original Principal Duties (raw) |
| 5 | `JDOrigEducation` | `""` | Original Education (raw) |
| 6 | `JDOrigExperience` | `""` | Original Work Experience (raw) |
| 7 | `JDOrigCerts` | `""` | Original Certifications/Licenses (raw) |
| 8 | `JDOrigKSAs` | `""` | Original KSAs (raw) |
| 9 | `JDContext` | `""` | Numbered job text for the prompts (safe fields only) |
| 10 | `JDHRContext` | `""` | Salary Type + Grade. HR-only; only JD Final Check gets it |
| 11 | `JDRelatedLevels` | `""` | Related Levels output |
| 12 | `JDReference` | `""` | Reference file text |
| 13 | `JDRequestLog` | `""` | Everything the manager asked for, in order |
| 14 | `JDDraft` | `""` | The current draft (drafter JSON) |
| 15 | `JDChangesFull` | `""` | Readable text of all changes (for JD Final Check) |
| 16 | `JDPropPurpose` | `""` | Proposed Purpose (blank = unchanged) |
| 17 | `JDPropDuties` | `""` | Proposed Principal Duties |
| 18 | `JDPropEducation` | `""` | Proposed Education |
| 19 | `JDPropExperience` | `""` | Proposed Work Experience |
| 20 | `JDPropCerts` | `""` | Proposed Certifications/Licenses |
| 21 | `JDPropKSAs` | `""` | Proposed KSAs |
| 22 | `JDHardStops` | `""` | Hard-stop requests, for HR |
| 23 | `JDFinalReview` | `""` | JD Final Check JSON (saved as FinalReviewJSON) |
| 24 | `JDJustification` | `""` | Business justification |

**Save.** No end node is needed: when a redirected topic finishes, it returns to the topic that called it.

> `""` counts as blank in Power Fx (`IsBlank("")` is true), so later checks can use `IsBlank(Global.JDDraft)`.

✅ **Part 5 done when:** all 24 globals appear in the variable picker of any topic (open **Variables** in the canvas toolbar to check).

---

## Part 6: Start JD Update topic

**What it does:** loads the job being updated into the globals, using your existing **Get JD Details** and **Related Levels** plus the new **Get JD Reference**. If a draft for a different job exists, it confirms before switching. It shows nothing else, because drafting happens next.

### 6.1 Create the topic

1. **Topics** → **+ Add a topic** → **From blank** → **Details** → **Name:** `Start JD Update`. (The v1 topic was renamed `zOLD - Start JD Update` in Part 1.2, so the name is free.)
2. **Trigger:** keep **The agent chooses**. **Description:** paste from Part 12.2.

### 6.2 Input and output

**Details** → **Inputs** tab → **Create a new variable**:
- **Name:** `JobCode`
- **How will the agent fill this input?** Dynamically fill with best option
- **Identify as:** User's entire response
- **Should prompt user:** Off
- **Description:** paste from Part 12.2.

**Outputs** tab → **Create a new variable**:
- **Name:** `LoadedJob` (Text)
- **Description:** paste from Part 12.2.

> **Layout tip for 6.3–6.5:** add the three guard conditions **one after another**, each **below** the previous condition block (use the **+** under the point where the branches rejoin), not nested inside **All other conditions**. Each guard's true branch ends the topic, except the "Yes, switch" path, which falls through to 6.6.

### 6.3 Guard: no job

1. **+** → **Add a condition** → **…** → **Change to formula** →
```
IsBlank(Trim(Topic.JobCode))
```
2. Under the condition: **+** → **Send a message** → `Which job description would you like to update?` → **+** → **Topic management** → **End current topic**.

### 6.4 Guard: same job already loaded

1. Below the 6.3 condition block: **+** → **Add a condition** → formula:
```
Trim(Topic.JobCode) = Global.JDJobCode
```
2. Under it: **Set a variable value** → `Topic.LoadedJob` = formula `Global.JDJobTitle` → **End current topic**.

### 6.5 Guard: switching jobs with unsent changes

1. Below the 6.4 condition block: **+** → **Add a condition** → formula:
```
Not(IsBlank(Global.JDDraft))
```
2. Under it: **+** → **Ask a question**:
   - **Message:** `You have unsent changes to ` then insert variable `{x} Global.JDJobTitle` then `. Discard them and switch jobs?`
   - **Identify:** Multiple choice options → `Yes, switch` / `No, keep working`
   - **Save user response as:** `Topic.SwitchChoice`
3. Copilot Studio adds a condition branch under the question for each option. In the **No, keep working** branch:
   - **Send a message:** `No problem, we'll keep working on ` + `{x} Global.JDJobTitle` + `.`
   - **Set a variable value:** `Topic.LoadedJob` = `Global.JDJobTitle`
   - **End current topic**
4. Leave the **Yes, switch** branch empty. It falls through to 6.6.

### 6.6 Reset, then load with Get JD Details

Below the 6.5 condition block:

1. **+** → **Topic management** → **Go to another topic** → **Reset JD Update**.
2. **+** → **Add a tool** → **Get JD Details**:
   - Its Job Code input → formula `Trim(Topic.JobCode)`
   - Outputs: keep the default variable names. They match your 4.2 table.

### 6.7 Guard: job not found

**+** → **Add a condition** → formula `IsBlank(Topic.[[CHECK: Job Title output from 4.2]])` → under it:
- **Send a message:** `I couldn't find that job. Which one did you mean?`
- **End current topic**

### 6.8 Store the job in globals

Below the 6.7 block, add one **Set a variable value** per row (select the existing global; the value is a formula). Replace each `[[CHECK]]` with the output name from your 4.2 table. If an output isn't text (a record or number), wrap it in `Text(…)`.

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

### 6.9 Indirect fields summary

**Set a variable value** → **Create new** → `Topic.IndirectSummary` → formula:
```
"People Management: " & Topic.[[CHECK: People Management output]] &
"; Sales/Non-Sales: " & Topic.[[CHECK: Sales/Non-Sales output]] &
"; Relationship Manager: " & Topic.[[CHECK: Relationship Manager output]] &
"; NMLS Required: " & Topic.[[CHECK: NMLS Required output]]
```

### 6.10 Reference file

1. **+** → **Add a tool** → **Get JD Reference**. Output: `Topic.Reference`.
2. **Set a variable value** → `Global.JDReference` → formula:
```
If(IsBlank(Topic.Reference), "(no reference file found)", Topic.Reference)
```

### 6.11 Build the numbered job context

**Set a variable value** → `Global.JDContext` → formula:

```
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

> **Why numbered:** the drafter refers to original lines by these numbers ("keep line 3"). The numbering comes from the same `Split(…, "<br>")` that Part 8 uses to rebuild the text, so the numbers always match.
> If Part 1.3 showed a different separator for KSAs or Certifications, change `"<br>"` for that section here **and** in Part 8.

### 6.12 Related Levels

1. **+** → **Add a tool** → **Related Levels** → map its input (from 4.3) to `Global.JDJobCode`, or to `Global.JDJobTitle` if it takes a title.
2. **Set a variable value** → `Global.JDRelatedLevels` → formula:
```
If(IsBlank(Topic.[[CHECK: Related Levels output variable]]), "(no related levels found)", Topic.[[CHECK: Related Levels output variable]])
```
If the output is a record or table rather than text, wrap it: `JSON(Topic.<output>)`.

### 6.13 Set the output

**Set a variable value** → `Topic.LoadedJob` → formula `Global.JDJobTitle`. **Save.**

✅ **Part 6 done when:** in the Test pane, "I want to update the Universal Banker I job" runs Fuzzy match → Start JD Update. Open **Variables** (canvas toolbar) during the test and check that `JDContext` shows numbered lines and `JDJobCode` is filled in but never shown in chat.

---

## Part 7: JD Drafter prompt

**What it does:** this is the agent's expertise. It understands the request, tests scope and level, routes the change to sections, drafts in house style, flags concerns at the right severity, tracks indirect fields, title and justification, and writes the message the manager reads. It replaces JD Section Reviewer.

### 7.1 Create the prompt

1. **Tools** → **+ Add a tool** → **+ New tool** → **Prompt**.
2. Top left, rename: `JD Drafter`.
3. **Model / Settings** (the model picker or ⚙ in the prompt editor):
   - **Model:** the most capable model your tenant offers for prompts. If replies take more than about 20 seconds in testing, try the next one down.
   - **Temperature:** `0.2`–`0.3`, if the setting is available. Low is better for consistent drafting.

### 7.2 Add the six inputs

In the prompt editor, select **+ Add content** (or **Input**) → **Text** for each input. Give each one the exact name and paste a short **sample value** (used only when you test in the editor):

| Input name | Sample value for testing |
|---|---|
| `JobContext` | Copy `Global.JDContext` from a Part 6 test (open Variables while testing) |
| `AdjacentLevels` | `(none)` |
| `Reference` | Paste your reference file text |
| `CurrentDraft` | `(none yet)` |
| `RequestHistory` | `- They will start opening small business accounts.` |
| `LatestRequest` | `They will start opening small business accounts.` |

### 7.3 Paste the instructions

Paste the text below into the instructions box. Then replace each `{InputName}` with the real input: delete the text, type `/`, and pick the input. Fill in the `[[FIRM]]` parts now, or leave them and come back (Appendix A).

> If the editor rejects the length, move the **CALIBRATION EXAMPLES** block into the reference file under a new heading `=== CALIBRATION EXAMPLES ===` and replace it here with `See CALIBRATION EXAMPLES in REFERENCE.`

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

EVERYTHING THE MANAGER HAS ASKED FOR IN THIS UPDATE, IN ORDER:
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
- Role drift: the change pulls in the core work of a different function or job family. Draft it and add an "advise" finding.
- Scope creep: authority clearly beyond this level (approving, setting policy, final decisions, hiring) for a role that doesn't have it. Offer the in-scope version (for example "reviews and recommends" instead of "approves") and explain in one sentence.
- Not job content: requests about a person, or things a JD doesn't cover. Status "not_feasible".
Level framework: [[FIRM: your level definitions and dimensions, or write "see REFERENCE" once the reference file is complete]]

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
- Match the existing JD's tone and format. Write new lines without a bullet character; the system adds it.
- Education and Work Experience lines must end exactly like the existing lines in that section: [[FIRM: Education ending format, e.g. "... Required Or" / "... Preferred Or"]] and [[FIRM: Work Experience ending format, e.g. a final sentence "Required." / "Preferred."]].
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
Add a field to "indirect" only when there is a real signal. Include its current value from THE JOB, the evidence, and one plain yes/no question for the manager.
[[FIRM: your criteria for each field, from your qualification criteria document. Replace the starter examples below.]]
- People Management. Signals: direct reports, hiring, firing, performance reviews, approving time off or pay. Not signals: training, guiding, coordinating schedules, leading huddles, being an escalation point (typical of Leads).
- Sales/Non-Sales. Signals: [[FIRM: e.g. sales goals, product quotas, incentive-based selling]]. Not signals: [[FIRM: e.g. answering product questions, opening accounts at the client's request, referrals without goals]].
- Relationship Manager. Signals: owning and growing a defined portfolio of client relationships. Not signals: serving clients who come in.
- NMLS Required. Signals: taking mortgage loan applications, or offering or negotiating mortgage terms. Not signals: referring clients to mortgage staff.
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
  - lines: the complete new section, in order. Each item is {"keep": n, "new": ""}, which copies original line n exactly, or {"keep": 0, "new": "text"} for new or reworded text. Leaving out an original line number removes that line. Use only line numbers that exist in THE JOB for that section. Purpose is usually a single {"keep": 0, "new": "..."}.
- unchanged: on a first draft or a broadened request, the sections you checked and left alone, each with a short reason. Otherwise [].
- indirect: accumulated. Carry forward items from the CURRENT DRAFT that still apply and add new ones. Each item has field, current, evidence, question.
- findings: this turn's concerns. Each has severity (block | confirm | advise), about, note, suggestion.
- hard_stops: only those in the LATEST REQUEST. Each has field and request.
- title: requested (true/false), proposed, reason.
- justification: the business reason, if given anywhere, in the manager's words; otherwise "".
- message: intro, notes (an array of strings), ask.
```

### 7.4 Set the output to JSON

1. Below the instructions, find **Output** → change **Text** to **JSON**.
2. Select **Edit format** (or **Edit schema / example**) → replace the example with the JSON below → **Apply**. The builder infers the schema from this example. Every array has one complete item so that all fields are kept.

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

### 7.5 Test in the editor

1. Select **Test**. Check that:
   - `changes` lists Principal Duties (and probably KSAs) using `keep`/`new` lines;
   - the original line numbers are all kept;
   - `unchanged` lists the other sections;
   - `message.ask` is a next step or the justification question.
2. Change **LatestRequest** to `Make this role exempt` and test. `status` should be `hard_stop`.
3. **Save**.

### 7.6 Tool settings

1. **Tools** → **JD Drafter** → **Description:** `Internal. Drafts and judges job description changes. Used only by the Draft JD Update topic.`
2. **When will this be used?** → **Only when referenced by topics or agents** → **Save**.

✅ **Part 7 done when:** the editor test returns valid JSON for a normal request, a revision (paste the previous output into CurrentDraft and ask "make it shorter"), and a hard stop.

---

## Part 8: Draft JD Update topic

**What it does:** every change, revision, undo or answer about the update runs through here. It calls JD Drafter, saves the draft, builds the proposed section text with code, and shows the manager exactly what changed, in the drafter's voice. **It has no outputs**, so the orchestrator doesn't repeat it.

### 8.1 Create the topic

1. **Topics** → **+ Add a topic** → **From blank** → **Details** → **Name:** `Draft JD Update`.
2. **Trigger:** **The agent chooses**. **Description:** paste from Part 12.2.

### 8.2 Input

**Details** → **Inputs** → **Create a new variable**:
- **Name:** `UpdateRequest`
- **How will the agent fill this input?** Dynamically fill with best option
- **Identify as:** User's entire response
- **Should prompt user:** On. **Question:** `What's changing about this job?`
- **Description:** paste from Part 12.2.

Do **not** add outputs.

### 8.3 Guard: no job loaded

1. **+** → **Add a condition** → formula:
```
IsBlank(Global.JDJobCode)
```
2. Under it: **Send a message** → `Which job description is this for?` → **End current topic**.

### 8.4 Log the request

Below the condition block: **Set a variable value** → `Global.JDRequestLog` → formula:
```
Global.JDRequestLog & "- " & Topic.UpdateRequest & Char(10)
```

### 8.5 Call JD Drafter

**+** → **Add a tool** → **JD Drafter**. Map the inputs (formula for each):

| Input | Formula |
|---|---|
| JobContext | `Global.JDContext` |
| AdjacentLevels | `If(IsBlank(Global.JDRelatedLevels), "(none)", Global.JDRelatedLevels)` |
| Reference | `Global.JDReference` |
| CurrentDraft | `If(IsBlank(Global.JDDraft), "(none yet)", Global.JDDraft)` |
| RequestHistory | `Global.JDRequestLog` |
| LatestRequest | `Topic.UpdateRequest` |

**Output:** save as `Topic.DraftOut`.

> `[[CHECK]]`: in your existing topics you read prompt JSON with `ParseJSON(Topic.X.text)`. If this node's output shows a different field (for example `structuredOutput`), use that wherever this guide writes `Topic.DraftOut.text`.

### 8.6 Read the status

**Set a variable value** → **Create new** → `Topic.Status` → formula:
```
Text(ParseJSON(Topic.DraftOut.text).status)
```

### 8.7 Log hard stops for HR

**Set a variable value** → `Global.JDHardStops` → formula:
```
Global.JDHardStops & Concat(Table(ParseJSON(Topic.DraftOut.text).hard_stops), "- " & Text(ThisRecord.Value.field) & ": " & Text(ThisRecord.Value.request) & Char(10))
```

### 8.8 Create the display variable first

**Set a variable value** → **Create new** → `Topic.ChangesShown` → formula `""`.
(It must exist above the condition so both branches can use it. This is the lesson from v1.)

### 8.9 Condition: a new draft is ready

**+** → **Add a condition** → formula:
```
Topic.Status = "ready"
```

Under it, add these nodes **in this order**:

**8.9a Save the draft.** **Set a variable value** → `Global.JDDraft` →
```
If(
  CountRows(Table(ParseJSON(Topic.DraftOut.text).changes)) = 0 &&
    Not(Boolean(ParseJSON(Topic.DraftOut.text).title.requested)),
  "",
  Topic.DraftOut.text
)
```
(If the manager removed every change, the draft is cleared.)

**8.9b Build the six proposed sections.** Add six **Set a variable value** nodes. Each uses this template; swap in the three values from the table:

```
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
        { bullet: If(StartsWith(Trim(First(orig).Value), "•"), "• ", "") },
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

> **What this does:** for each line in the drafter's plan, `keep: n` copies original line *n* exactly and `keep: 0` inserts the new text (with `• ` added if the section is bulleted). Lines are joined with `<br>`, the same storage format your Save flow and Build Redline Rows expect. A section with no changes stays `""`, which your Save flow already treats as untouched (the Split Req Pref blank fix).

**8.9c Readable text of all changes (for JD Final Check).** **Set a variable value** → `Global.JDChangesFull` →
```
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

**8.9d What to show this turn.** **Set a variable value** → `Topic.ChangesShown` (the existing one) →
```
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

> The manager sees only the sections touched this turn (all of them on the first draft), plus a one-line reminder of the other sections still in the draft. That keeps revisions short and conversational.

Leave **All other conditions** empty. When the status isn't "ready", the saved draft is not changed.

### 8.10 Send the message

Below the condition block: **+** → **Send a message** → in the message box select **{x}** → **Formula** → paste → **Insert**:
```
With(
  { d: ParseJSON(Topic.DraftOut.text) },
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
```

**Save.** The topic ends here. With no outputs, the orchestrator has nothing to restate.

### 8.11 Try it

In the Test pane:
1. `Our Universal Banker Is are going to start opening small business accounts.` The agent should find the job, load it, and show the draft with Add lines, "No change needed", and a note or justification question.
2. `Make that duty mention they refer complex business needs to the business banking team.` Only Principal Duties should show, plus the "Also in your draft" line.
3. `Drop the KSA change.` KSAs should leave the draft.
4. Open **Variables** and check `JDPropDuties`: original lines should be identical, and the new line should start with `• `.

✅ **Part 8 done when:** all four checks pass, and nothing in chat shows a full updated JD, a grade, a job code or a salary type.

---

## Part 9: JD Final Check prompt

**What it does:** runs once at submit. It extracts the business justification and the indirect-field answers, compares the updated job with neighboring levels, checks title support, adds an HR-only overtime-classification note, and writes the change summary and HR summary. It replaces JD Final Review for v2 (the old prompt stays untouched for rollback).

**It must stay compatible with Send HR Review Email.** That flow parses **FinalReviewJSON** to build the email (indirect items, flags, level and title notes). So JD Final Check returns every key v1's JD Final Review returned, with the same types, plus five new ones.

### 9.1 Create

1. **Tools** → **+ Add a tool** → **+ New tool** → **Prompt** → rename `JD Final Check`.
2. Model and temperature: same as 7.1.
3. Inputs (all **Text**), with test samples:

| Input | Sample |
|---|---|
| `JobContext` | a `Global.JDContext` value |
| `HRContext` | `Salary Type: Non-Exempt; Grade: 5` |
| `AdjacentLevels` | `(none)` |
| `Draft` | a JD Drafter JSON output from your Part 7 test |
| `ChangesText` | `**Principal Duties**: Adds opening small business deposit accounts.` |
| `RequestHistory` | `- They will start opening small business accounts.` |
| `CheckQuestions` | `- Will this role have sales or referral goals for business accounts?` |
| `CheckAnswers` | `No, referrals only. We're rolling out small business banking in every branch.` |

### 9.2 Start from your v1 output format

1. **Tools** → **JD Final Review** → open the prompt → **Output** → **Edit format** → copy the example JSON into a scratch file. Also copy v1's instruction text for indirect items, levels compared and title support. You'll reuse both.
2. Your inventory lists v1's keys as: `level_match` · `matched_level_title` · `level_recommendation` · `levels_compared` · `title_supported` · `title_support_assessment` · `change_summary` · `hr_summary` · `indirect_items[]` {field, evidence, answer, status} · `readiness` · `followups[]` {question, why, type}.
3. JD Final Check keeps all of these with **the same types** (for example, if `levels_compared` is a list in v1, keep it a list), and adds: `justification` · `reason_categories[]` · `classification_note_hr` · `unresolved[]` · a `note` inside each `indirect_items` entry.

### 9.3 Instructions

Paste, then swap each `{Input}` for the real input (type `/`). Where a task says "as in v1", you can paste your v1 wording for that task in place of mine.

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

EVERYTHING THE MANAGER ASKED FOR:
{RequestHistory}

QUESTIONS ASKED AT SUBMIT:
{CheckQuestions}

THE MANAGER'S ANSWERS:
{CheckAnswers}

=== TASKS ===
1. justification: the business reason for this update in the manager's own words (from the answers or the messages), lightly cleaned. Use the DRAFT's justification if it has one. "" if they never gave one. Never invent one.
2. reason_categories: every category that fits, chosen only from: [[FIRM: your reason list, e.g. Upscales; Editing Qualifications; Aligning KSAs; Title; Adding/Removing responsibilities; Changing reporting relationship/people leadership; Other]].
3. indirect_items: one entry per item in DRAFT.indirect, with:
   - field;
   - evidence: the drafter's evidence;
   - answer: the manager's answer ("Yes", "No", "Not sure" or "Not answered");
   - status: [[CHECK: the status values and rules from your v1 JD Final Review prompt]];
   - note: a short note in the manager's words.
4. Level, as in v1: compare the job AFTER the changes with NEIGHBORING LEVELS using [[FIRM: level similarity criteria]]. level_match is true only if the updated job now reads substantially like another level; matched_level_title names it. levels_compared: [[CHECK: same format as v1]]. level_recommendation is one plain, friendly sentence for the manager ("" if there's no concern). Never mention grade or pay.
5. Title, as in v1: if DRAFT.title.requested is true, decide whether the section changes support the proposed title (title_supported) and explain briefly for HR (title_support_assessment). Never suggest a title. If no title was requested, use true and "".
6. classification_note_hr: using HR-ONLY CONTEXT and [[FIRM: overtime-classification criteria from your qualification criteria document]], say whether the new wording could affect this job's overtime classification, and why. "" if there's no concern.
7. change_summary, as in v1: one line per changed section, as "- Section: what changed".
8. hr_summary: 3 to 6 sentences for the HR reviewer: what's changing, why (justification), any concerns (level, classification, indirect answers, hard stops in the requests), and what HR should look at first.
9. unresolved: any question in QUESTIONS ASKED AT SUBMIT that the manager didn't answer.
10. readiness: always [[CHECK: the v1 readiness value that means ready, e.g. "ready"]]. followups: always []. (v2 asks its questions before this review runs.)

=== OUTPUT ===
Return only JSON with every key present (use "", [] or false when empty).
```

### 9.4 Output JSON

**Output** → **JSON** → **Edit format** → paste your v1 example from 9.2, then add the new keys so it looks like this. Keep v1's types wherever they differ from this example.

```json
{
  "justification": "We're rolling out small business banking in all branches.",
  "reason_categories": ["Adding/Removing responsibilities"],
  "level_match": false,
  "matched_level_title": "",
  "level_recommendation": "",
  "levels_compared": "Universal Banker II",
  "title_supported": true,
  "title_support_assessment": "",
  "classification_note_hr": "",
  "change_summary": "- Principal Duties: Adds opening small business deposit accounts.",
  "hr_summary": "Short summary for HR.",
  "indirect_items": [
    { "field": "Sales/Non-Sales", "evidence": "Business account opening may carry goals.", "answer": "No", "status": "confirmed", "note": "Referrals only, no goals." }
  ],
  "readiness": "ready",
  "followups": [ { "question": "", "why": "", "type": "" } ],
  "unresolved": ["Question text"]
}
```

### 9.5 Test, save, set availability

1. **Test** with the samples, then **Save**.
2. **Tools** → **JD Final Check** → **Description:** `Internal. Final review before HR submission. Used only by the Submit JD Update topic.`
3. **When will this be used?** → **Only when referenced by topics or agents** → **Save**.

✅ **Part 9 done when:** the test returns the justification from CheckAnswers, `indirect_items` with "No", an hr_summary, and every v1 key from 9.2.

---

## Part 10: Submit JD Update topic (+ Save flow change)

**What it does:** asks the remaining confirming questions in **one** message, guarantees a business justification, runs JD Final Check, shows a summary, and submits through your existing Save flow. Like your v1 Review and Submit, it has **no outputs**; it resets inline and uses **End all topics**.

### 10.1 Add BusinessJustification to the Save flow

1. Open **Save JD Update Request** (Copilot Studio → **Tools** → select it → open the flow, or from make.powerautomate.com → **My flows / Solutions**).
2. Trigger **When an agent calls the flow** → **+ Add an input** → **Text** → `BusinessJustification` → **…** → **Make the field optional**.
3. Open the **Create item** action that creates the **JD Update Requests** item → find the **BusinessJustification** column → insert the trigger input **BusinessJustification**.
4. **Save** → **Publish**.
5. Back in Copilot Studio → **Tools** → **Save JD Update Request**. Make sure the new input appears (reopen the tool if needed). It's already topics-only (Part 4.4).

> The HR email doesn't show the new column yet. Until you add a token for it (Appendix D), the justification also goes at the top of **HRSummary** (see the mapping in 10.12), so HR sees it right away.

### 10.2 Create the topic

1. **Topics** → **+ Add a topic** → **From blank** → **Name:** `Submit JD Update`.
2. **Trigger:** **The agent chooses**. **Description:** from Part 12.2.
3. No inputs. No outputs.

### 10.3 Guard: nothing to submit

**+** → **Add a condition** → formula `IsBlank(Global.JDDraft)` → under it:
- **Send a message:** `There aren't any changes to send yet. What's changing about the job?`
- **End current topic**

### 10.4 Guard: title change with no supporting changes

Below 10.3's block: **+** → **Add a condition** → formula:
```
Boolean(ParseJSON(Global.JDDraft).title.requested) && CountRows(Table(ParseJSON(Global.JDDraft).changes)) = 0
```
Under it:
- **Send a message:** `A title review needs supporting changes in the job description, such as new duties or a broader purpose. What's changed about the work that supports the new title?`
- **End current topic**

### 10.5 Create the answer variable

**Set a variable value** → **Create new** → `Topic.CheckAnswers` → formula `"(none)"`.

### 10.6 Build the questions

**Set a variable value** → **Create new** → `Topic.CheckQuestions` → formula:
```
With(
  { d: ParseJSON(Global.JDDraft) },
  Concat(Table(d.indirect), "- " & Text(ThisRecord.Value.question) & Char(10)) &
  If(Boolean(d.title.requested) && IsBlank(Text(d.title.proposed)), "- What title are you proposing for this role?" & Char(10), "") &
  If(Boolean(d.title.requested) && IsBlank(Text(d.title.reason)), "- Why does the title need to change?" & Char(10), "") &
  If(IsBlank(Text(d.justification)), "- What's the business reason for this update? HR uses it when reviewing the request." & Char(10), "")
)
```

### 10.7 Ask them all at once (only if there are any)

1. **+** → **Add a condition** → formula `Not(IsBlank(Topic.CheckQuestions))`.
2. Under it: **+** → **Ask a question**:
   - **Message** → **{x}** → **Formula** →
```
"Before I send this to HR, a few quick questions:" & Char(10) & Char(10) & Topic.CheckQuestions & Char(10) & "You can answer them all in one message."
```
   - **Identify:** User's entire response
   - **Save user response as:** select the existing `Topic.CheckAnswers`.

### 10.8 Run JD Final Check

Below the 10.7 block: **+** → **Add a tool** → **JD Final Check**:

| Input | Formula |
|---|---|
| JobContext | `Global.JDContext` |
| HRContext | `Global.JDHRContext` |
| AdjacentLevels | `If(IsBlank(Global.JDRelatedLevels), "(none)", Global.JDRelatedLevels)` |
| Draft | `Global.JDDraft` |
| ChangesText | `Global.JDChangesFull` |
| RequestHistory | `Global.JDRequestLog` |
| CheckQuestions | `If(IsBlank(Topic.CheckQuestions), "(none)", Topic.CheckQuestions)` |
| CheckAnswers | `Topic.CheckAnswers` |

Output: `Topic.FinalOut`.

### 10.9 Store the result and the justification

1. **Set a variable value** → `Global.JDFinalReview` → `Topic.FinalOut.text`
2. **Set a variable value** → `Global.JDJustification` → `Text(ParseJSON(Global.JDFinalReview).justification)`

### 10.10 Justification gate (always on)

1. **+** → **Add a condition** → `IsBlank(Global.JDJustification)`.
2. Under it: **Ask a question**:
   - **Message:** `One thing HR needs before I send this: what's the business reason for this update? A sentence or two is fine.`
   - **Identify:** User's entire response → **Save as:** `Topic.JustAnswer` (new)
   - **Set a variable value** → `Global.JDJustification` → `Topic.JustAnswer`

> Between the drafter's light ask, the submit question and this gate, no update reaches HR without a business justification.

### 10.11 Show the summary

Below the 10.10 block: **Send a message** → **{x}** → **Formula**:
```
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

### 10.12 Ask to submit

1. **Ask a question**:
   - **Message:** `Ready to send it to HR?`
   - **Identify:** Multiple choice options:
     - `Submit to HR`. Synonyms: `submit`, `send`, `send it`, `yes`, `looks good`
     - `Keep editing`. Synonyms: `edit`, `change`, `not yet`, `wait`
     - `Cancel update`. Synonyms: `cancel`, `discard`, `scrap it`
   - **Save as:** `Topic.Decision`
2. The question node's **Properties** → **Question behavior**: keep **Allow switching to another topic** on. If the manager types a new edit instead of choosing, the orchestrator routes it to Draft JD Update.
3. Copilot Studio adds one condition branch per option under the question. Fill them in as 10.13–10.15 describe.

### 10.13 Branch: Submit to HR

In the **Submit to HR** branch:

1. **Add a tool** → **Save JD Update Request**. Map every input. The input names below are the ones in your inventory:

| Save flow input | New value (formula) |
|---|---|
| JobTitle | `Global.JDJobTitle` |
| JobCode | `Global.JDJobCode` |
| RequestedBy | the same value v1 used (copy it from **zOLD - Review and Submit JD Update**) |
| SectionsChanged | `Concat(Table(ParseJSON(Global.JDDraft).changes), Text(ThisRecord.Value.section), ",")` |
| SectionsAdded | `""` |
| Reasons | `Concat(Table(ParseJSON(Global.JDFinalReview).reason_categories), Text(ThisRecord.Value), ",")` |
| OtherReason | `""` |
| ChangesDetail | `Text(ParseJSON(Global.JDFinalReview).change_summary)` |
| IndirectFlags | `Concat(Table(ParseJSON(Global.JDFinalReview).indirect_items), Text(ThisRecord.Value.field) & ": " & Text(ThisRecord.Value.answer) & If(IsBlank(Text(ThisRecord.Value.note)), "", " (" & Text(ThisRecord.Value.note) & ")"), Char(10))` |
| HardStops | `Global.JDHardStops` |
| LevelRecommendation | `Text(ParseJSON(Global.JDFinalReview).level_recommendation)` |
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
| **BusinessJustification** (new) | `Global.JDJustification` |

2. **Match v1's formats.** Send HR Review Email splits some of these columns into lists, so before your first test submit, open a v1 item in **JD Update Requests** and compare:
   - **SectionsChanged:** v2 sends display names (`Principal Duties,Work Experience`). If v1 stored keys like `PrincipalDuties,WorkExperience`, use this formula instead:
```
Concat(Table(ParseJSON(Global.JDDraft).changes), Switch(Text(ThisRecord.Value.section), "Principal Duties", "PrincipalDuties", "Work Experience", "WorkExperience", "Certifications/Licenses", "Certifications", "KSAs", "KSA", Text(ThisRecord.Value.section)), ",")
```
   - **Reasons:** v1 joined card values with `,`, and so does the formula above. If v1 used `, ` or `;`, change the separator to match.
   - **IndirectFlags, HardStops, ManagerNotes:** v2 puts one item per line. If v1 used a different separator, change `Char(10)` to match (and the `- ` / `Char(10)` pieces in Part 8.7 for HardStops).
3. **Send a message:** reuse your v1 "Submitted!" message with the **DocLink** output, for example: `Submitted! HR has your update request for **{Global.JDJobTitle}**. Here's your copy with the changes marked: [Download your copy]({Topic.DocLink})`
4. **Go to another topic** → **Reset JD Update**.
5. **Topic management** → **End all topics**.

### 10.14 Branch: Keep editing

In the **Keep editing** branch:
- **Send a message:** `Sure. What would you like to change?`
- **End current topic**

### 10.15 Branch: Cancel update

In the **Cancel update** branch: **Go to another topic** → **Discard JD Update** (built in Part 11; come back and add this node after Part 11).

**Save.**

✅ **Part 10 done when:** a full update submits, the JD Update Requests item has BusinessJustification filled in, the redline document shows untouched lines unchanged, and the HR email arrives with the justification at the top of the HR summary.

---

## Part 11: Discard JD Update topic

### 11.1 Create

1. **Topics** → **+ Add a topic** → **From blank** → **Name:** `Discard JD Update`.
2. **Trigger:** **The agent chooses** → **Description:** from Part 12.2. No inputs, no outputs.

### 11.2 Guard: nothing in progress

**Add a condition** → formula:
```
IsBlank(Global.JDDraft) && IsBlank(Global.JDJobCode)
```
Under it: **Send a message** `There's no update in progress right now.` → **End current topic**.

### 11.3 Confirm

Below the block: **Ask a question**:
- **Message:** `Discard this update for ` + `{x} Global.JDJobTitle` + `? This can't be undone.`
- **Identify:** Multiple choice → `Yes, discard` / `No, keep it`
- **Save as:** `Topic.Confirm`

### 11.4 Branches

Copilot Studio adds a branch per option under the question.

In the **Yes, discard** branch:
1. **Go to another topic** → **Reset JD Update**
2. **Send a message:** `Done. Those changes are discarded. If you'd like to update a job, just tell me what's changing.`
3. **End all topics**

In the **No, keep it** branch:
1. **Send a message:** `Okay, your draft is still here.`
2. **End current topic**

**Save.** Then go back to Part 10.15 and add the **Go to another topic → Discard JD Update** node.

✅ **Part 11 done when:** "scrap this update" asks once and clears the draft, and a following "that's it" just gets a friendly goodbye.

---

## Part 12: Agent instructions, descriptions, greeting, knowledge

### 12.1 Agent instructions

1. **Overview** tab → **Instructions** → **Edit**.
2. Copy the current instructions (your ~7.6k-character `JD-Agent-Instructions.txt` version) into `JD-Agent-Instructions-v1-backup.txt` for rollback.
3. Replace them with the text below (about 4,600 characters, well under the 8,000 limit). Fill in the two `[[FIRM]]` markers.
4. **Save.**

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
- Never show, mention, guess, or discuss Grade, Job Code, Salary Type (exempt/non-exempt, salaried/hourly) or Status. Job codes in tool results are only for passing between tools. If asked, say HR manages those and they can't be changed here.
- Never write job description wording yourself, and never show a complete updated job description. All drafting goes through Draft JD Update so it's checked and saved.
- Never suggest a job title. Titles come from the user.
- Don't ask the confirming questions about people management, sales, relationship manager or NMLS yourself; Submit JD Update asks them.
- Never say a request was sent to HR unless Submit JD Update confirmed it.

STYLE
Conversational, warm and brief. Plain language; no HR jargon unless the user uses it. Short paragraphs; bullets only for lists. At most one question per reply. Don't over-explain or apologize. When the user is done ("that's it", "thanks"), close in one friendly line and don't call any tools.

WHEN YOU DON'T KNOW
If a process question isn't covered by your knowledge, say so and suggest [[FIRM: HR contact or mailbox]].
```

### 12.2 Descriptions (paste into each tool or topic)

| Where | Text |
|---|---|
| **Fuzzy match**: tool description | Finds one specific job by name, even with typos, abbreviations or level variations ("UB 2", "univ banker ii"). Use when the user names a particular job to view or update. Returns up to 5 ranked matches with their job codes. If one clearly fits, use it; if several are close, ask which one. Never show job codes to the user. |
| **Find Jobs**: tool description | Searches all job descriptions. Use for any request to list, count, or browse jobs (for example "all lead roles", "banker jobs", "jobs that mention lending"). For one job the user names, use Fuzzy match instead. Returns the total count and one line per job: title (job code). Use the code with Get Job or Start JD Update. Never show job codes to the user. |
| Find Jobs → TitleQuery | A word or short phrase that must appear in the job title, such as "lead" or "universal banker". Use the most distinctive word. Leave blank for content-only searches. |
| Find Jobs → ContentQuery | A word or short phrase to find anywhere in the job description text, such as "lending" or "wire". Leave blank for title searches. |
| Find Jobs → MaxResults | How many jobs to list. Default 25, maximum 50. |
| **Get Job**: tool description | Shows the current, official job description for one job: Purpose, Principal Duties, Education, Work Experience, Certifications/Licenses, KSAs, and other details. Use when the user wants to see, read, or compare a job or a section. Viewing doesn't start or change an update. If Found is "no", the code didn't match a job. |
| Get Job → JobCode | The job code from Fuzzy match or Find Jobs results. |
| **Start JD Update**: trigger description | Loads a job so the user can update its job description. Use when the user wants to change, update, revise or rewrite a specific job's description and you have its job code from Fuzzy match or Find Jobs, including when they want to switch the update to a different job. Don't use it just to view a job; use Get Job for that. |
| Start JD Update → JobCode | The job code of the job to update, from the Fuzzy match or Find Jobs results. Never ask the user for it; run Fuzzy match first if you don't have it. |
| Start JD Update → output LoadedJob | The job now loaded for updating. Next: if the user already described what's changing, use Draft JD Update; otherwise ask what's changing about the job. Don't show the job description unless asked. |
| **Draft JD Update**: trigger description | Drafts or revises the changes for the job description being updated and shows them to the user. Use every time the user describes a change to the job, asks to revise the draft (reword, shorten, add, remove, undo), or answers a question about the update, including the business reason. It shows its own results; don't repeat them. |
| Draft JD Update → UpdateRequest | What the user wants changed, in their own words. Include details from earlier messages that belong to this request (for example, a change they described before naming the job). For a revision, the revision they asked for. For an answer, the question and their answer. |
| **Submit JD Update**: trigger description | Finishes the job description update and sends it to HR: asks any final confirming questions, makes sure there's a business justification, shows a summary, and submits after the user confirms. Use when the user says the draft is done or wants to send or submit it ("looks good", "send it to HR", "submit", "that's all the changes"). |
| **Discard JD Update**: trigger description | Throws away the job description changes in progress. Use only when the user clearly wants to cancel or scrap the update ("cancel this update", "scrap these changes", "never mind the update"). Don't use when the user is simply finished talking ("that's it", "thanks", "no thanks"). |
| Get JD Details, Get JD Reference, Related Levels, JD Drafter, JD Final Check, Save JD Update Request | **When will this be used?** → **Only when referenced by topics or agents** |

### 12.3 Greeting

1. **Topics** → **System** → **Conversation Start** → edit the greeting message:
```
Hi! I'm your job description expert. I can find job descriptions (try "show me all the lead roles"), explain how they work, and help you update one. Just tell me what's changing about the job and I'll draft the changes for HR.
```
2. **Save.**

### 12.4 Knowledge check

1. **Knowledge** tab: keep your **JD knowledge** and **job families** markdown files.
2. **Remove the SharePoint JD list if it's a knowledge source.** Your inventory flags it as one to check. Select it → **…** → **Delete**. Find Jobs and Get Job now cover what it did, without restricted columns, and native list knowledge can reach every column the user can see.
3. Optional: **+ Add knowledge** → **SharePoint** → add the `JD Expert Reference.txt` file, so "what's the difference between a Lead and a Supervisor?" is answered from the same source the drafter uses.
4. If the JD document library is a knowledge source, check its documents for Grade, Job Code, Salary Type or Status.

### 12.5 Final setup

1. Test pane → **Start new test session** (the refresh icon). Run Part 13.
2. **Publish** only after the tests pass.

---

## Part 13: Tests and tuning

### 13.1 Test script

Start a new test session for each group. Watch the **activity map** to confirm which tool or topic ran.

| # | Say | Expect |
|---|---|---|
| T1 | Can I see all the lead roles? | Find Jobs (TitleQuery "lead"). List of titles with a count; no job codes |
| T2 | Which jobs mention lending? | Find Jobs (ContentQuery "lending") |
| T3 | Show me the Universal Banker I job description | Fuzzy match → Get Job. Clean bullets; no grade, code, salary type or status |
| T4 | Show me the univeral banker 2 job | Fuzzy match handles the typo |
| T5 | What grade is the Universal Banker II? | Polite decline: HR manages that |
| T6 | Our Universal Banker Is are going to start opening small business accounts | Fuzzy match → Start JD Update → Draft JD Update. Add lines for Duties (and likely KSAs); "No change needed" list; Sales/Non-Sales mentioned as a note, not asked; justification asked or next step |
| T7 | Make that duty mention they refer complex needs to the business banking team | Only Principal Duties shown; "Also in your draft" line |
| T8 | Drop the KSA change | KSAs leave the draft |
| T9 | (new session) I need to update a job, they'll handle wire transfers now → *agent asks which job* → Operations Specialist II | The draft reflects wire transfers (UpdateRequest carried the earlier detail) |
| T10 | Tellers will approve overdrafts now | An in-scope version is offered (reviews/refers), with a one-sentence reason |
| T11 | (on a Level I job) add a duty you know appears in its Level II | Draft plus a level-drift note naming Level II |
| T12 | The lead will have final authority on team decisions and work independently | Neutral rewrite plus a classification note; no legal terms |
| T13 | Also make this role exempt | That part is blocked, the rest continues; HardStops logged for HR |
| T14 | The lead will now do performance reviews | People Management noted; asked at submit |
| T15 | Retitle it Small Business Banker | Title recorded and never suggested; a title-only submit is blocked |
| T16 | (mid-update) What does a Universal Banker II do differently? | Get Job for UB II; afterwards "ok, back to it" shows the draft intact |
| T17 | Actually let's do the Teller job instead | Switch confirmation; "No" keeps the draft |
| T18 | Looks good, send it | One message with all questions → answer → summary → Submit → DocLink. The request item is complete, including BusinessJustification; the redline shows untouched lines identical |
| T19 | (check the T18 HR email) | Indirect items, level note, sections and reasons render like a v1 email; the justification is at the top of the HR summary |
| T20 | Submit without ever giving a reason, and skip it in the answers | The justification gate asks once |
| T21 | Scrap this update → then: that's it, thanks | Discard asks once; the goodbye doesn't trigger Discard |
| T22 | Add that Maria is great with clients | not_feasible: JDs describe the role |
| T23 | Run T6 on a job whose Education has Required/Preferred endings, and ask for a degree change | The new Education line keeps the exact ending format |
| T24 | (any session) check the activity map | Get JD Details only ever runs inside Start JD Update |

Your 14 persona scripts in `JD-Agent-Sample-Dialogues.md` still apply. Run them after these.

### 13.2 Where to fix what

| If you see | Fix it in |
|---|---|
| Wrong sections chosen, weak wording, too strict or too lenient | JD Drafter: SECTION ROUTING, WRITING STANDARDS, CALIBRATION EXAMPLES; the reference file |
| Level judgments off | Reference file level profiles; check the Related Levels output |
| The agent picks the wrong tool or topic (for example Find Jobs for one named job) | Descriptions (12.2) first, then instructions |
| The agent restates the draft after Draft JD Update | Instructions step 3 and the Draft JD Update description |
| Too many confirming questions at submit | JD Drafter INDIRECT FIELDS criteria (fewer false signals) |
| HR summary is thin | JD Final Check task 8 |
| HR email is missing items, or lists look wrong | Part 9.2 (keys and types) and Part 10.13 step 2 (formats) |
| Untouched lines changed in the redline | The drafter dropped or renumbered a `keep` (see Appendix C) |

---

## Appendix A: Firm information to fill in

**Lookups in your own agent (about 10 minutes each; do these before Part 6):**

| # | Marker | Where | What to find | Where to look |
|---|---|---|---|---|
| A1 | Column internal names, Job Code type | Part 1.3 → Parts 2, 3 | Internal names and column types | SharePoint list settings |
| A2 | Active status value | Part 2.6 | The Status value that means active | JD list / daily CSV |
| A3 | Separator per section | Parts 1.3, 6.11, 8.9 | `<br>` or other | One JD row in the list |
| A4 | Get JD Details output names | Parts 4.2 → 6.6–6.9 | Output variable per field | zOLD - Start JD Update |
| A5 | Related Levels input and output | Parts 4.3, 6.12 | Names, and whether it returns restricted fields | The Related Levels flow |
| A6 | Reference file path | Part 4.1 | Path | JD Templates library |
| A7 | v1 Final Review output format, indirect status rules, levels_compared format, readiness value | Part 9 | Example JSON and instruction text | JD Final Review prompt |
| A8 | v1 list formats and RequestedBy value | Part 10.13 | SectionsChanged keys, separators, RequestedBy | A v1 JD Update Requests item; zOLD - Review and Submit JD Update |

**Your firm's knowledge (the quality lever):**

| # | Marker | Where | What to paste | Probably on your work computer as… |
|---|---|---|---|---|
| A9 | Education / Work Experience ending formats | Part 1.3, JD Drafter WRITING STANDARDS | Exact endings | An existing JD |
| A10 | Level dimensions and level profiles | Reference file; JD Drafter SCOPE | Definitions, verbs, core duties per level | JD knowledge file, job architecture docs, your lead-role audit notes |
| A11 | Approved phrases | Reference file | Standard duty wording | Existing JDs and templates |
| A12 | Job family notes | Reference file | Per-family summaries | Job families file |
| A13 | Hard stop rules | JD Drafter THE RULES | Additional hard stops | Your `[INSERT HARD STOP RULES]` list |
| A14 | Overtime-classification criteria | JD Drafter; JD Final Check task 6 | Signals and patterns | Qualification criteria document |
| A15 | Indirect-field criteria | JD Drafter INDIRECT FIELDS | Signals / not signals per field | Qualification criteria document (`[INSERT INDIRECT CRITERIA]`) |
| A16 | Additional routing rules | JD Drafter SECTION ROUTING | Your rules | JD knowledge file |
| A17 | Other style rules | JD Drafter WRITING STANDARDS | Your rules | JD knowledge file / writing guide |
| A18 | Calibration examples (10–15) | JD Drafter CALIBRATION EXAMPLES | Real requests and the right handling | Past manager emails, your 14 persona scripts |
| A19 | Reason categories | JD Final Check task 2 | Your list | v1 Reasons card options |
| A20 | Level similarity criteria | JD Final Check task 4 | Your criteria | `[INSERT LEVEL SIMILARITY CRITERIA]` in v1 JD Final Review |
| A21 | Company name, HR contact | Prompts and instructions | Names | — |

**Order that pays off fastest:** A1–A8 (so the build works), then A15 → A14 → A10 (Lead first, from your audit) → A18 → A13 → the rest.

---

## Appendix B: Name reference

**Key between tools:** Job Code (as in v1).

**Flows:** Fuzzy match (existing) · Find Jobs (new) · Get Job (new) · Get JD Details (existing, now topics-only) · Get JD Reference (new) · Related Levels (existing) · Save JD Update Request (existing, + BusinessJustification input) · Build Redline Rows · Split Req Pref · Send HR Review Email (existing, unchanged)

**Prompts:** JD Drafter · JD Final Check

**Topics:** Start JD Update · Draft JD Update · Submit JD Update · Discard JD Update · Reset JD Update (redirect only) · zOLD - ×9 (off)

**Globals (24):** JDJobCode · JDJobTitle · JDOrigPurpose · JDOrigDuties · JDOrigEducation · JDOrigExperience · JDOrigCerts · JDOrigKSAs · JDContext · JDHRContext · JDRelatedLevels · JDReference · JDRequestLog · JDDraft · JDChangesFull · JDPropPurpose · JDPropDuties · JDPropEducation · JDPropExperience · JDPropCerts · JDPropKSAs · JDHardStops · JDFinalReview · JDJustification

**Exact section names (prompt ↔ formulas):** Purpose · Principal Duties · Education · Work Experience · Certifications/Licenses · KSAs

**Files and columns:** JD Expert Reference.txt (JD Templates) · BusinessJustification (JD Update Requests)

---

## Appendix C: Troubleshooting

| Problem | Cause / fix |
|---|---|
| `ParseJSON` errors in Draft or Submit | The prompt returned text, not JSON: set Output to JSON (7.4 / 9.4). A key is missing: the prompt must return every key; re-apply the example JSON |
| A section's changes never show or save | The section name doesn't match exactly (e.g. "Duties" instead of "Principal Duties"). Check the prompt's names against Appendix B |
| Lines removed that the manager didn't ask to remove | The drafter left out a `keep`. Add a calibration example showing a full keep list, and check the numbering in `Global.JDContext` |
| A duplicated last line in a proposed section | The drafter used a `keep` number beyond the section's length. Same fix as above |
| Line numbers in JDContext look wrong (one long line per section) | Get JD Details returns cleaned text without `<br>`. Use its raw output (Part 4.2 note) |
| `Sequence`, `With` or `Last(FirstN())` not recognized | Rare in Copilot Studio. Bring the exact error text back to this chat and we'll rework that formula |
| A prompt input is rejected as blank | Wrap the input as in 8.5: `If(IsBlank(x), "(none)", x)` |
| The agent repeats the draft after Draft JD Update | Make sure the topic has **no outputs**; tighten instructions step 3 |
| The agent writes JD wording itself | Instructions RULES line 2; Draft JD Update description ("every time…") |
| The orchestrator uses Find Jobs for one named job, or Fuzzy match for "all lead roles" | Tool descriptions (12.2) for both; each names the other |
| The orchestrator calls Get JD Details directly | Set it to topics-only (3.8) |
| Find Jobs returns nothing | Internal names wrong, a Choice column missing `?['Value']`, or the Status filter value is wrong. Test the flow alone |
| Find Jobs is slow | Use **Limit Columns by View** on Get items with a view that has only the needed columns |
| Get Job or Start JD Update says the job isn't found | Spaces around the code (the guide trims them), or Job Code is a Number column and the filter still has quotes (3.2) |
| Send HR Review Email fails at the FinalReviewJSON parse, or the email is missing indirect items or level notes | JD Final Check must return every v1 key with v1's types (9.2–9.4) |
| HR email lists show odd items (one long item, stray spaces, unknown section names) | Formats don't match v1: SectionsChanged keys and separators (10.13 step 2) |
| Duties display as code blocks in Get Job | Extra spaces in the source; add another `replace(…, '  ', ' ')` pass in the cleanup expression, and add the duties cleanup to the daily CSV flow |
| A Question node keeps re-asking when the user types something else | Keep **Allow switching to another topic** on; add synonyms to the choices |
| Orchestrator runs Discard after "that's it" | Tighten the Discard description; your v1 lesson still applies |
| The redline shows unchanged duties as changed | Should no longer happen (kept lines are copied byte for byte). If it does, the Save flow's Get JD may read different text than Get JD Details; check that both read the same column |

---

## Appendix D: Later

- **HR email token for the justification:** add a `BusinessJustification` block or token to `HR Review Email.html` (through your template agent and spec), then map it in Send HR Review Email. Until then it's at the top of HR Summary.
- **Readiness follow-ups (🔧 in v1):** stop work on them; v2 doesn't use them.
- **Reasons check and role-fit check (📋):** no longer needed; reason categories are inferred and the drafter's SCOPE tests cover role fit.
- **Daily CSV duties cleanup (📋):** still worth doing; it improves Get Job's display and the Remove lines.
- **Finish the inline Purpose redline (🔧 Paragraph mode):** independent of this build; it works the same with the new proposed text.
- **Other designed-not-built items** (removed Req/Pref ending fix, requirement-level flag, Edu/Exp paragraph slots, HR email phase 2, word-level bullet redlines): unaffected by v2.
- **Role drift across families:** at submit, search for similar titles and content with Find Jobs and pass the results to JD Final Check.
- **HR alignment tools** (single-JD review, ladder review, batch audit) in a separate HR agent, reusing the JD Drafter knowledge.
- **Create section:** can reuse the JD Drafter approach.
- **Clean up v1** after UAT sign-off: delete the zOLD topics, JD Section Reviewer, JD Review Router, and the v1 globals.

---

## Appendix E: Goals check

| Your goal | How v2 meets it | Where |
|---|---|---|
| Much less rigid; no big topics | No cards, no section walk, no decision loop. Five thin topics; the orchestrator runs the conversation; the manager can talk in any order | Parts 6, 8, 10, 11, 12 |
| Describe an update, and the agent drafts every affected section | The drafter routes the change to sections and checks all six | Part 7 SECTION ROUTING |
| Can still update one section directly | "Rewrite duty 3 to…" works the same way; the drafter touches only what's needed | Part 7 HOW TO WORK step 2 |
| Expert on scope, levels, similar jobs, section placement, wording | Job identity, scope tests, neighboring levels, level profiles, writing standards with reasons, calibration examples | Parts 1.4, 6.12, 7 |
| Catches wording that implies an overtime-status change | Classification signals → neutral rewrite + confirm note; HR-only classification note at submit | Parts 7, 9 |
| Balanced, not too restrictive | Severity tiers; default to drafting; style fixed silently; concerns raised once | Part 7 severity |
| Conversational, like a great AI agent | The drafter writes its own message (intro, notes, one ask); only touched sections are shown on revisions; side questions are welcome; warm, brief style | Parts 7, 8, 12 |
| Better data use ("all the lead roles", content search) | Find Jobs returns lists and counts; Fuzzy match still finds one job by name with typos; Get Job anytime | Parts 2, 3 |
| Business justification on every update | The drafter asks once, lightly; the submit question asks; the gate guarantees it; saved to a new column and shown to HR | Parts 7, 10 |
| Submission and HR report | Your Save flow, redlines and HR email are reused; FinalReviewJSON and list formats stay v1-compatible | Parts 9, 10 |
| Reuses what you've built | Fuzzy match, Get JD Details, Related Levels, Save flow and its child flows, templates, lists, mailbox | Parts 0.8, 3, 4, 6, 10 |
| Rules preserved | Restricted fields never reach the orchestrator or drafter; hard stops logged; title rules; one job per update; never the full updated JD | Parts 3, 4, 6, 7, 10 |

**Known limits to watch in testing**
- The drafter's quality depends on Appendix A. With placeholders still in, it falls back on general good practice.
- Line plans rely on the drafter keeping line numbers straight. The display shows every removal, so a slip is visible to the manager before submit.
- Each draft is one prompt call (expect a few seconds to around 20, depending on the model). Revisions show only touched sections to keep turns light.
- The HR email depends on JD Final Check matching v1's FinalReviewJSON keys and types (9.2). Test T19 confirms it.
- Cross-family role drift isn't checked yet (Appendix D).
