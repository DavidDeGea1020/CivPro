# Build Guide: "Update or View Job Description" Topic
**JD Expert Agent · Microsoft Copilot Studio (classic experience)**
**Audience:** teammate taking over the topic build · **Follow in order, top to bottom.**

---

## 0. Read this first

### What this topic does

A user can talk to the agent naturally to find, view, and request changes to an existing job description (JD):

- "Pull up the Payroll Specialist II JD" → the agent finds and shows it.
- "Add payroll audit reporting to the duties for Payroll Specialist II" → the agent finds the job, shows it, and immediately works on the change, with no repeating themselves.
- After viewing, the user just types what they want: a change, "show me the draft", "that's all", "actually, a different job", or a question like "would that make it a people manager role?". The agent figures out the intent.
- When they're finished, the agent summarizes the changes, confirms, and creates a change request document for HR to review. **The JD itself is never edited.** HR approves changes separately.

### Ground rules

- **Job Code, Grade, and Status must never be shown to users.** The flows are built so these never reach the agent as readable data, except Job Code, which is used only as a hidden ID. Don't add them to any message.
- **Every step lists exact variable names.** Use them exactly. Formulas later in the guide depend on them, and a mismatch (including `Topic.` vs `Global.`) is the most common cause of errors.
- **Build order matters.** Some nodes reference variables or steps created later. The guide is ordered so you never reference something that doesn't exist yet. Where a node needs a later step, you'll add a placeholder and come back.

### How the topic is organized

| Part | Purpose | Build step |
|---|---|---|
| Setup | Helper topic, prompt tool, topic shell | Steps 1–4 |
| **Find** | Search, handle no/multiple matches | Steps 5–10 |
| **Retrieve & display** | Get the JD, store copies, show it | Steps 11–15 |
| **Change loop** | Free-text conversation that edits the draft | Steps 16–26 |
| **Review & submit** | Summarize, confirm, create request | Steps 27–31 |
| **Resume** | Pick up an unfinished draft | Step 32 |
| Test | Test pane and real channel | Steps 33–34 |

### Tip: rename your nodes

Several steps use **Go to step** to jump back to an earlier node. If your canvas lets you rename nodes (node **...** menu → **Rename**), prefix each with its step ID (e.g., `S6 Search flow`, `S17 Ask user`). Picking the right target in Go to step is much easier with clear names.

---

## 1. Prerequisites

Confirm each before starting. Ask Eric if any are missing.

- [ ] **Agent exists** (Job Description Expert) with:
  - Generative orchestration on
  - Both knowledge files (JD Field Guide, Job Families) added at the **agent level**
  - Authentication: **Authenticate with Microsoft** (needed for the requester's name and email)
- [ ] **Search Job Titles** flow: in the solution, turned on, tested. Returns `MatchCount`, `ExactMatch`, `MatchMethod`, `MatchesJson`.
- [ ] **Get JD Requester View** flow: in the solution, turned on, tested. Returns `Found`, `JDJson`.
- [ ] **Create JD Change Request** flow: needed only for Step 30. If it isn't built yet, Step 30 has a placeholder.
- [ ] **Two saved sample outputs** from real flow runs, copied somewhere you can paste from:
  - A `MatchesJson` value with at least two matches (starts with `[`)
  - A `JDJson` value (starts with `{`)

### The twelve JD fields (JSON keys)

These keys are used everywhere. Don't rename them.

| JSON key | Shown to user as |
|---|---|
| `JobTitle` | Job title |
| `PayType` | Salary/Hourly |
| `PeopleManagement` | People management |
| `SalesDesignation` | Sales/Non-Sales |
| `RelationshipManager` | Relationship manager |
| `NMLSRequired` | NMLS required |
| `Purpose` | Purpose |
| `PrincipalDuties` | Principal duties and responsibilities |
| `EducationRequirements` | Education requirements |
| `WorkExperienceRequirements` | Work experience requirements |
| `KSAs` | Knowledge, skills and abilities |
| `CertificationsLicenses` | Certifications/licenses |

---

## 2. Variable reference

Create variables as you reach them. This table is for checking your work.

| Variable | Scope | Type | Purpose |
|---|---|---|---|
| `JobSearchText` | Topic input | String | Job title or description the user gave |
| `InitialChangeRequest` | Topic input | String | A change the user asked for in their first message |
| `varSearchAttempts` | Topic | Number | Stops endless searching |
| `varMatchCount` | Topic | Number | Search flow output |
| `varExactMatch` | Topic | Boolean | Search flow output |
| `varMatchMethod` | Topic | String | Search flow output (`title` or `description`) |
| `varMatchesJson` | Topic | String | Search flow output |
| `vartblMatches` | Topic | **Table** | Parsed matches |
| `varJobCode` | **Global** | String | Selected job (hidden ID) |
| `varFound` | Topic | Boolean | Retrieval flow output |
| `varJDJson` | Topic | String | Retrieval flow output |
| `varOriginalJDJson` | **Global** | String | Untouched JD |
| `varWorkingJDJson` | **Global** | String | Draft with changes applied |
| `varOriginalJD` | **Global** | **Record** | Parsed original, for messages |
| `varWorkingJD` | **Global** | **Record** | Parsed draft, for messages |
| `varHasChanges` | **Global** | Boolean | At least one change applied |
| `varSubmitted` | **Global** | Boolean | Prevents double submission |
| `varChangeLogText` | **Global** | String | Running list of change summaries |
| `varReviewFlagsText` | **Global** | String | Running list of HR review flags |
| `varAskText` | Topic | String | What the agent says when asking for the next input |
| `varUserReply` | Topic | String | The user's latest free-text reply |
| `recProposal` | Topic | Record | Prompt output for the latest reply |
| `varLoopCount` | Topic | Number | Stops an endless change loop |
| `varProposalChoice` | Topic | String | Apply / Revise / Discard |
| `varDiscardConfirm` | Topic | String | Yes / No when discarding changes |
| `varConfirm` | Topic | String | Submit / Keep editing / Cancel |
| `varResumeChoice` | Topic | String | Continue / Start new |
| `varSubmitSuccess`, `varRequestId`, `varSubmitMessage` | Topic | Mixed | Submit flow outputs |

**Why Global?** Global variables survive when the user leaves the topic and comes back. That's what allows an unfinished draft to be resumed (Step 32). Topic variables reset every time the topic starts.

---

## PART 1 — SETUP

## Step 1. Create the helper topic "JD Draft Reset"

Several places in the main topic need to clear the draft. Instead of repeating eight nodes each time, build them once here and redirect to this topic.

1. **Topics → + Add a topic → From blank**
2. Name: **JD Draft Reset**
3. Trigger: set it so it only runs when redirected to. In classic topics, change the trigger to **It's redirected to** (or the equivalent "no trigger" option in your version). It must **not** be something the orchestrator can pick on its own.
   - If your version only offers a description-based trigger, use this description: *"Internal helper. Never select this topic in response to a user message."* and test that it never fires on its own.
4. Add eight **Set a variable value** nodes. Create each variable new, and set scope to **Global** in the variable's properties:

| Variable | Value |
|---|---|
| `Global.varJobCode` | `Blank()` |
| `Global.varOriginalJDJson` | `Blank()` |
| `Global.varWorkingJDJson` | `Blank()` |
| `Global.varHasChanges` | `false` |
| `Global.varSubmitted` | `false` |
| `Global.varChangeLogText` | `""` |
| `Global.varReviewFlagsText` | `""` |
| `Global.varOriginalJD` | `Blank()` |

   If `Global.varOriginalJD` can't be created here because it's a Record type that doesn't exist yet, skip that row now and add it after Step 14.

5. **Save.** After a redirected topic finishes, control returns to the node after the redirect in the main topic.

> **Fallback:** if redirecting between topics gives you trouble, you can instead copy these eight nodes into each place the guide says "Redirect to JD Draft Reset."

## Step 2. Create the "Apply JD Changes" prompt tool

This prompt does two jobs in one call: it works out **what the user wants** from their free-text reply, and when that's a change, it **applies it** to the draft.

1. In the agent: **Tools → + Add a tool → New prompt** (or **Prompt**).
2. Name: **Apply JD Changes**
3. Add two **text inputs**:
   - `CurrentJD`
   - `UserMessage`
4. Paste the prompt below. Where you see `{CurrentJD}` and `{UserMessage}`, insert the matching input using the prompt editor's input picker.
5. **Before saving, fill in the two bracketed sections:**
   - **Designation values:** look at the SharePoint list and note the values actually used in Salary/Hourly, People Management, Sales/Non-Sales, Relationship Manager, and NMLS Required (for example `Salary`/`Hourly`, `Yes`/`No`).
   - **Review criteria:** paste short versions of the People Management, Salary/Hourly, Sales/Non-Sales, Relationship Manager, and NMLS sections from the JD Field Guide knowledge file.

```text
You help a user request changes to a City National job description. HR reviews every change before anything is final. You read the user's latest message, decide what they want, and when they want a change, you apply it to the draft.

CURRENT DRAFT JOB DESCRIPTION (JSON):
{CurrentJD}

USER'S LATEST MESSAGE:
{UserMessage}

STEP 1 — DECIDE THE STATUS (pick exactly one)
- "applied": the user asked to add, remove, or change content in the job description, and you can make the change.
- "needs_clarification": the user asked for a change, but it is ambiguous (unclear which field, refers to content that does not exist, or has conflicting instructions).
- "no_change": the user asked for a change that is already reflected in the draft.
- "show_draft": the user wants to see the current job description or draft.
- "done": the user is finished, wants to submit or send it, or was only viewing (for example "that's all", "send it to HR", "no thanks", "I'm good").
- "new_search": the user wants to look at a different job.
- "cancel": the user wants to discard or cancel their changes.
- "general_question": the user is asking a question rather than requesting a change (for example "what counts as people management?" or "would that make it exempt?").
If a message contains a change AND a phrase like "that's all", use "applied".

STEP 2 — IF STATUS IS "applied", APPLY THE CHANGE
1. Apply only what the user asked for. Do not rewrite, reformat, shorten, or improve any field the request does not touch. Copy untouched fields character for character.
2. Match the existing style of the field you edit (for example, if duties are separate lines starting with a verb, do the same). Keep one item per line.
3. For designation fields (PayType, PeopleManagement, SalesDesignation, RelationshipManager, NMLSRequired), only use values from this list, written exactly as shown:
   [PASTE THE VALUES USED IN YOUR LIST, e.g. PayType: "Salary" or "Hourly"; PeopleManagement: "Yes" or "No"; ...]
   If the user asks for a value not on the list (for example "part-time"), use status "needs_clarification" and ask which allowed value they mean.
4. Add a short, plain-language entry to review_flags for HR when a change:
   - edits PeopleManagement, or adds or removes direct reports, supervisory duties, hiring or termination authority, or performance review responsibilities
   - edits PayType, or materially changes independent judgment and discretion, primary duties, or required specialized education
   - edits SalesDesignation, or adds or removes sales, revenue, referral, or business development duties
   - edits RelationshipManager, or adds or removes client relationship or portfolio management duties
   - edits NMLSRequired, or adds or removes duties involving taking residential mortgage loan applications or offering or negotiating loan terms, or makes CertificationsLicenses inconsistent with NMLSRequired
   - significantly broadens or narrows the job's scope, or raises or lowers education or experience requirements
   - edits JobTitle
   Never decide these designations yourself.

   REVIEW CRITERIA FROM THE FIELD GUIDE:
   [PASTE SHORT VERSIONS OF THE RELEVANT FIELD GUIDE SECTIONS HERE]

RULES FOR EVERY STATUS
- Always return updated_jd with every key from the current draft, using exactly the same keys. Never add, rename, or remove keys.
- For any status other than "applied", return updated_jd identical to the current draft and an empty changes list.
- For "needs_clarification", put one specific question in clarifying_question.
- Never mention or ask about job codes, grades, pay ranges, or job description status.
- Each entry in changes describes one field: field (the JSON key), label (the field's plain name, such as "Principal duties and responsibilities"), before (full previous value), after (full new value), summary (one plain-language sentence describing the change).

Return only JSON in this exact shape, with no other text:
{
  "status": "",
  "clarifying_question": "",
  "updated_jd": {},
  "changes": [ { "field": "", "label": "", "before": "", "after": "", "summary": "" } ],
  "review_flags": [ "" ]
}
```

6. **Output format:** set the prompt's output to **JSON** if the option exists. In the example output, paste the JSON shape above **with your real `JDJson` sample inside `updated_jd`**, so the output structure has all twelve fields typed correctly.
7. **Test the prompt** in the prompt editor with your sample `JDJson` and a few messages:
   - "Add 'Prepare quarterly payroll audit reports' to the duties" → `applied`
   - "Remove the last one" → `needs_clarification`
   - "Show me the draft" → `show_draft`
   - "That's all" → `done`
   - "What counts as people management?" → `general_question`
8. Save.

> **ALM note:** whenever this prompt is edited in DEV, republish the agent before exporting the solution. Skipping this causes a solution import dependency failure in UAT/QA.

## Step 3. Create the main topic

1. **Topics → + Add a topic → From blank**
2. Name: **Update or View Job Description**
3. Open **Details** and set the **Description**. Generative orchestration uses this to decide when to run the topic.

```
Use when the user wants to view, look up, open, review, edit, change, update, or revise an existing job description, or asks what a specific job's description contains. Do not use for creating a brand-new job description or for general questions about how to fill out job description fields.
```

## Step 4. Add the two topic inputs

Still in **Details → Inputs**, add:

**Input 1**
- Name: `JobSearchText`
- Type: String
- Description:
```
The job title or plain-language description of the job the user wants to view or update, as the user said it. Leave blank if the user did not mention a job.
```

**Input 2**
- Name: `InitialChangeRequest`
- Type: String
- Description:
```
The change the user wants to make to the job description, in their own words, if they described one in the same message. For example, from "add payroll audits to the duties for Payroll Specialist II", this would be "add payroll audits to the duties". Leave blank if the user only named or described the job.
```

For both, make sure the agent does **not** prompt the user for them automatically. The topic handles missing values itself.

**Why two inputs:** a user who says "add payroll audits to the duties for Payroll Specialist II" gives you both the job and the change. `JobSearchText` gets "Payroll Specialist II" and `InitialChangeRequest` gets the change, so the user never has to repeat themselves.

---

## PART 2 — FIND THE JOB

## Step 5. Reset the draft and search counter

Directly under the trigger:

1. **Topic management → Redirect to another topic** (or **Go to another topic**) → **JD Draft Reset**
2. **Set a variable value:** `Topic.varSearchAttempts` = `0`

> The resume check (Step 32) will be inserted **above** these two nodes at the end of the build. Leave room at the top.

## Step 6. Ask for a job if none was given

1. Add a **Condition:** `IsBlank(Topic.JobSearchText)`
2. **True branch** → add a **Question**:
   - Message: *"Which job would you like to look up? You can type the title or describe what the role does."*
   - Identify: **User's entire response**
   - Save user response as: the **existing** `Topic.JobSearchText`. Don't let it create a new variable.
3. **All other conditions:** leave empty.

Both branches rejoin below the condition. Everything after this runs whether or not the question was asked.

## Step 7. Call the Search Job Titles flow

Below the Step 6 condition (on the rejoined path):

1. **+ → Call an action → Search Job Titles**
2. Input: `Topic.JobSearchText`
3. Save outputs:

| Flow output | Save to |
|---|---|
| `MatchCount` | `Topic.varMatchCount` |
| `ExactMatch` | `Topic.varExactMatch` |
| `MatchMethod` | `Topic.varMatchMethod` |
| `MatchesJson` | `Topic.varMatchesJson` |

4. Add a **Set a variable value** right after: `Topic.varSearchAttempts` = `Topic.varSearchAttempts + 1`

This flow call is the target of several **Go to step** jumps later. Rename it (e.g., `S7 Search flow`) if you can.

> **Calling flows from a topic vs. adding them as agent tools:** always use **Call an action** inside the topic. Don't add these flows as standalone agent-level tools, because the orchestrator could then call them on its own and skip steps.

## Step 8. Parse the matches into a table

1. **+ → Variable management → Parse value**
2. **Parse:** `Topic.varMatchesJson`
3. **Data type:** **From sample data**. Paste your saved `MatchesJson`. It must look like this, starting with `[` with no surrounding quotes and no `\"`:

```json
[
  {
    "jobCode": "ASGS26",
    "jobTitle": "Payroll Specialist II",
    "purposeSnippet": "Processes semi-monthly payroll for the bank"
  },
  {
    "jobCode": "ASGS25",
    "jobTitle": "Payroll Specialist I",
    "purposeSnippet": "Supports payroll processing and recordkeeping"
  }
]
```

4. **Save as:** new variable `Topic.vartblMatches`

**Check:** the node shows `kind: Table`, and the variables panel lists `vartblMatches` as **Table**. If it says String, the sample was pasted in escaped form. Remove the outer quotes and backslashes and paste again.

## Step 9. Branch on the search results

Add one **Condition** node with three paths.

### Branch 1 — nothing found
Condition: `Topic.varMatchCount = 0`

Inside, add a nested **Condition:** `Topic.varSearchAttempts >= 3`
- **True:** Send a message *"I'm still not finding that job. Your HR Business Partner can help you locate it."* → **End current topic**
- **All other conditions:** **Question**
  - Message: *"I couldn't find a job matching that. Try a different title, or describe what the role does."*
  - Identify: **User's entire response** → save to `Topic.JobSearchText`
  - Then **Topic management → Go to step** → the Step 7 flow call

### Branch 2 — one exact match
Click **+ Add condition:** `Topic.varExactMatch = true`

Add **Set a variable value:** `Global.varJobCode` = `First(Topic.vartblMatches).jobCode`

No confirmation needed. The user typed the title exactly, and `ExactMatch` is only true when exactly one job matches perfectly.

### Branch 3 — All other conditions
Several close matches → Step 10.

## Step 10. List close matches and let the user choose (Branch 3)

Inside Branch 3:

1. **Send a message.** Switch the message text to **formula** mode and paste:

```powerfx
If(Topic.varMatchMethod = "description",
  "Based on your description, these jobs look closest:",
  "I found a few close matches:") & Char(10) & Char(10) &
Concat(Topic.vartblMatches,
  "• " & ThisRecord.jobTitle & If(IsBlank(ThisRecord.purposeSnippet), "", " — " & ThisRecord.purposeSnippet),
  Char(10))
```

2. **Question:**
   - Message: *"Which one did you mean? Type the title as shown, or describe it differently and I'll search again."*
   - Identify: **User's entire response** → save to `Topic.JobSearchText`
3. **Go to step** → the Step 7 flow call

**How this works:** whatever the user types goes back through the search. A title typed exactly scores 100, so `ExactMatch` comes back true and Branch 2 opens it. Anything else runs a new search. The three-attempt limit in Branch 1 stops endless loops.

---

## PART 3 — RETRIEVE AND DISPLAY

All three branches rejoin below the Step 9 condition. Only Branch 2 actually reaches here, because Branches 1 and 3 always jump back to Step 7 or end.

## Step 11. Guard against a missing job code

1. **Condition:** `IsBlank(Global.varJobCode)`
2. **True:** Send a message *"I lost track of which job you meant. Let's search again."* → Set `Topic.JobSearchText` = `Blank()` → **Go to step** → the Step 6 condition
3. **All other conditions:** empty

This turns a confusing flow error ("required parameter is blank") into a recoverable prompt.

## Step 12. Call the Get JD Requester View flow

1. **+ → Call an action → Get JD Requester View**
2. Input: `Global.varJobCode`
3. Save outputs: `Found` → `Topic.varFound`, `JDJson` → `Topic.varJDJson`
4. Add a **Condition:** `!Topic.varFound`
   - **True:** Send a message *"I couldn't retrieve that job description. Please try again, or contact your HR Business Partner."* → **End current topic**
   - **All other conditions:** empty

## Step 13. Store the original and working copies

Two **Set a variable value** nodes:
- `Global.varOriginalJDJson` = `Topic.varJDJson`
- `Global.varWorkingJDJson` = `Topic.varJDJson`

The original never changes again. The working copy is what edits get applied to.

## Step 14. Parse both copies into records

Add **two** Parse value nodes. **Paste the identical sample in both.**

**Parse value 1**
- Parse: `Global.varOriginalJDJson`
- Data type: **From sample data**, pasting your saved `JDJson` (starts with `{`):

```json
{
  "JobTitle": "Payroll Specialist II",
  "PayType": "Hourly",
  "PeopleManagement": "No",
  "SalesDesignation": "Non-Sales",
  "RelationshipManager": "No",
  "NMLSRequired": "No",
  "Purpose": "Processes semi-monthly payroll for the bank.",
  "PrincipalDuties": "Processes payroll\nReconciles payroll accounts",
  "EducationRequirements": "High school diploma or equivalent",
  "WorkExperienceRequirements": "2 years of payroll experience",
  "KSAs": "Knowledge of payroll regulations",
  "CertificationsLicenses": "None"
}
```

- Save as: `Global.varOriginalJD`

**Parse value 2**
- Parse: `Global.varWorkingJDJson`
- Same sample, pasted again
- Save as: `Global.varWorkingJD`

**Check:** both show `kind: Record` with the same twelve properties. Mismatched structures cause type errors later when the draft is updated.

If you skipped `Global.varOriginalJD` in the Step 1 helper topic, go back and add `Global.varOriginalJD = Blank()` there now.

## Step 15. Display the job description

**Send a message**, text in **formula** mode:

```powerfx
"**" & Global.varWorkingJD.JobTitle & "**" & Char(10) & Char(10) &
"**Salary/Hourly:** " & Coalesce(Global.varWorkingJD.PayType, "—") & Char(10) &
"**People management:** " & Coalesce(Global.varWorkingJD.PeopleManagement, "—") & Char(10) &
"**Sales/Non-Sales:** " & Coalesce(Global.varWorkingJD.SalesDesignation, "—") & Char(10) &
"**Relationship manager:** " & Coalesce(Global.varWorkingJD.RelationshipManager, "—") & Char(10) &
"**NMLS required:** " & Coalesce(Global.varWorkingJD.NMLSRequired, "—") & Char(10) & Char(10) &
"**Purpose**" & Char(10) & Coalesce(Global.varWorkingJD.Purpose, "—") & Char(10) & Char(10) &
"**Principal duties and responsibilities**" & Char(10) & Coalesce(Global.varWorkingJD.PrincipalDuties, "—") & Char(10) & Char(10) &
"**Education requirements**" & Char(10) & Coalesce(Global.varWorkingJD.EducationRequirements, "—") & Char(10) & Char(10) &
"**Work experience requirements**" & Char(10) & Coalesce(Global.varWorkingJD.WorkExperienceRequirements, "—") & Char(10) & Char(10) &
"**Knowledge, skills and abilities**" & Char(10) & Coalesce(Global.varWorkingJD.KSAs, "—") & Char(10) & Char(10) &
"**Certifications/licenses**" & Char(10) & Coalesce(Global.varWorkingJD.CertificationsLicenses, "—")
```

**Copy this node now** (node **...** → Copy). Step 22 reuses it to show the updated draft on request.

There is intentionally no Job Code, Grade, or Status in this message.

---

## PART 4 — THE CHANGE LOOP

This replaces a fixed "Make changes / Just viewing / Different job" menu. After seeing the JD, the user just types, and the prompt decides what they meant.

**How the loop runs:**

```
Step 16 ─ Did they already describe a change? ── yes ──┐
   │ no                                                 │
   ▼                                                    │
Step 17 ─ Ask (free text) ◄─────────────────────┐       │
   │                                             │       │
   ▼                                             │       │
Step 18 ─ Prompt interprets reply ◄──────────────┼───────┘
   │                                             │
   ▼                                             │
Step 19 ─ Branch on status                       │
   ├ applied ────────── Steps 20–21 ─────────────┤
   ├ needs_clarification / no_change ────────────┤
   ├ show_draft ─────── Step 22 ─────────────────┤
   ├ general_question ─ Step 23 ─────────────────┤
   ├ new_search ─────── Step 24 (back to search)
   ├ cancel ─────────── Step 25 (end)
   └ done ───────────── Step 26 (review or end)
```

**Build Steps 17 and 18 first, then Step 16**, because Step 16 jumps to Step 18.

## Step 17. Ask the user what they'd like (free text)

1. **Set a variable value:** `Topic.varAskText` = `"Would you like to change anything? Describe the change in your own words, or say you're done if you were just viewing."`
2. **Question:**
   - Message: switch to **formula** and use `Topic.varAskText`
   - Identify: **User's entire response**
   - Save as: new variable `Topic.varUserReply`
3. Rename it `S17 Ask user` if you can. Many steps jump here.

**Important:** every jump back to this question should land on the **Question node itself**, not on the Set variable above it. Each branch sets its own `varAskText` before jumping, so the question says something appropriate ("Anything else?", a clarifying question, and so on). The Set variable in item 1 only runs the first time.

**Question behavior setting:** open this Question node's properties. If there's a setting to **allow switching to another topic** (sometimes called interruptions), turn it **off** for this question. The prompt handles questions and exits itself (Steps 23–26), which is more predictable than the orchestrator jumping to another topic mid-edit. Test this in Step 34.

## Step 18. Interpret the reply with the prompt

1. Set **`Topic.varLoopCount`** = `Topic.varLoopCount + 1` (create as Number; it starts blank, which Power Fx treats as 0)
2. **Condition:** `Topic.varLoopCount > 25`
   - **True:** Send a message *"That's a lot of back and forth. Let's wrap up what you have."* → **Go to step** → Step 26
   - **All other conditions:** empty
3. **+ → Call an action → Apply JD Changes** (the prompt from Step 2)
   - `CurrentJD` = `Global.varWorkingJDJson`
   - `UserMessage` = `Topic.varUserReply`
   - Save output to new variable `Topic.recProposal`
4. **If the output comes back as text** (not a record), add a **Parse value** node: parse the prompt's text output, data type **From sample data** using the JSON shape from Step 2 with your `JDJson` inside `updated_jd`, and save as `Topic.recProposal`.

Rename step 3's node `S18 Prompt` if you can.

## Step 16. Route straight into a change if one was given

Now go back to the spot **between Step 15 (display) and Step 17 (ask)** and insert:

1. **Condition:** `!IsBlank(Topic.InitialChangeRequest)`
2. **True branch:**
   - Send a message: *"Got it. Working on the change you asked for."*
   - **Set a variable value:** `Topic.varUserReply` = `Topic.InitialChangeRequest`
   - **Set a variable value:** `Topic.InitialChangeRequest` = `Blank()` (so it's used only once)
   - **Go to step** → the Step 18 prompt node
3. **All other conditions:** empty (falls through to Step 17)

## Step 19. Branch on the prompt's status

Below Step 18, add one **Condition** node with a branch for each status. Use **+ Add condition** for each:

| Branch | Condition | Go to |
|---|---|---|
| 1 | `Topic.recProposal.status = "applied"` | Step 20 |
| 2 | `Topic.recProposal.status = "needs_clarification"` | inline below |
| 3 | `Topic.recProposal.status = "no_change"` | inline below |
| 4 | `Topic.recProposal.status = "show_draft"` | Step 22 |
| 5 | `Topic.recProposal.status = "general_question"` | Step 23 |
| 6 | `Topic.recProposal.status = "new_search"` | Step 24 |
| 7 | `Topic.recProposal.status = "cancel"` | Step 25 |
| 8 | `Topic.recProposal.status = "done"` | Step 26 |
| All other conditions | (unexpected output) | inline below |

**Branch 2 (needs clarification):**
- Set `Topic.varAskText` = `Topic.recProposal.clarifying_question`
- **Go to step** → the Step 17 Question node

**Branch 3 (no change):**
- Set `Topic.varAskText` = `"That's already how the draft reads. Anything else you'd like to change? Or say you're done."`
- **Go to step** → Step 17 Question node

**All other conditions:**
- Set `Topic.varAskText` = `"Sorry, I didn't catch that. Describe a change, say \"show my draft\", or say you're done."`
- **Go to step** → Step 17 Question node

## Step 20. Show the proposed change (applied)

Inside Branch 1. This shows **only what changed**, not the whole JD again.

1. **Send a message**, formula mode:

```powerfx
"Here's what I'd change:" & Char(10) & Char(10) &
Concat(Topic.recProposal.changes,
  "**" & ThisRecord.label & "**" & Char(10) &
  ThisRecord.summary & Char(10) &
  "_Before:_ " & Coalesce(ThisRecord.before, "(blank)") & Char(10) &
  "_After:_ " & Coalesce(ThisRecord.after, "(blank)"),
  Char(10) & Char(10)) &
If(IsEmpty(Topic.recProposal.review_flags), "",
  Char(10) & Char(10) & "**HR will review:**" & Char(10) &
  Concat(Topic.recProposal.review_flags, "⚠️ " & ThisRecord.Value, Char(10)))
```

2. **Question:**
   - Message: *"Should I add this to your draft?"*
   - Identify: **Multiple choice options** → `Apply`, `Revise`, `Discard`
   - Save as: `Topic.varProposalChoice`

   This one stays a fixed choice on purpose. Confirming each change is a deliberate gate, so users always see and approve what goes into the draft.

## Step 21. Handle Apply / Revise / Discard

**Condition** with three branches.

**Apply** (`Topic.varProposalChoice = "Apply"`):
1. `Global.varWorkingJDJson` = `JSON(Topic.recProposal.updated_jd)`
2. **Parse value:** parse `Global.varWorkingJDJson`, **same sample as Step 14**, save to `Global.varWorkingJD`
3. `Global.varHasChanges` = `true`
4. `Global.varChangeLogText` = `Global.varChangeLogText & Concat(Topic.recProposal.changes, "• " & ThisRecord.summary, Char(10)) & Char(10)`
5. `Global.varReviewFlagsText` = `Global.varReviewFlagsText & Concat(Topic.recProposal.review_flags, "• " & ThisRecord.Value, Char(10)) & If(IsEmpty(Topic.recProposal.review_flags), "", Char(10))`
6. `Topic.varAskText` = `"Added to your draft. Anything else? Describe another change, say \"show my draft\", or say you're done."`
7. **Go to step** → Step 17 Question node

> **If `JSON()` gives an error:** your Power Fx version may not support it. Tell Eric; the workaround is to set the prompt's output to text and store the raw output instead.

**Revise** (`Topic.varProposalChoice = "Revise"`):
1. `Topic.varAskText` = `"No problem. How would you like it instead?"`
2. **Go to step** → Step 17 Question node

**Discard** (All other conditions):
1. `Topic.varAskText` = `"Okay, I left the draft as it was. Anything else?"`
2. **Go to step** → Step 17 Question node

## Step 22. Show the current draft (show_draft)

Inside Branch 4:
1. **Paste the message node you copied in Step 15.** It already references `Global.varWorkingJD`, so it shows the draft with all applied changes.
2. `Topic.varAskText` = `"That's your current draft. Anything else to change? Or say you're done."`
3. **Go to step** → Step 17 Question node

The full JD is only shown here, when the user asks. It isn't repeated after every change.

## Step 23. Answer a general question (general_question)

Inside Branch 5:
1. **+ → Advanced → Generative answers** (sometimes labeled "Create generative answers")
   - Input: `Topic.varUserReply`
   - Knowledge: use the agent's **existing** knowledge sources. **Don't add separate sources to this node**, since duplicating knowledge at the topic level previously caused duplicate responses.
2. `Topic.varAskText` = `"Whenever you're ready, describe a change or say you're done. Your draft is saved."`
3. **Go to step** → Step 17 Question node

Users can ask "would that make it a people manager role?" in the middle of editing, get a knowledge-based answer, and carry on without losing the draft.

## Step 24. Look up a different job (new_search)

Inside Branch 6:
1. **Condition:** `Global.varHasChanges`
   - **True:**
     - **Question:** *"You have unsaved changes to " & Global.varOriginalJD.JobTitle & ". Discard them and look up a different job?"* (formula mode) · Multiple choice: `Yes`, `No` · save to `Topic.varDiscardConfirm`
     - **Condition:** `Topic.varDiscardConfirm = "No"` → Set `Topic.varAskText` = `"Okay, keeping your draft. Anything else?"` → **Go to step** → Step 17 Question node
   - **All other conditions:** empty
2. **Redirect to JD Draft Reset**
3. Set `Topic.JobSearchText` = `Blank()`
4. Set `Topic.varSearchAttempts` = `0`
5. Set `Topic.varLoopCount` = `0`
6. **Go to step** → the Step 6 condition

## Step 25. Cancel changes (cancel)

Inside Branch 7:
1. **Condition:** `Global.varHasChanges`
   - **True:**
     - **Question:** *"Discard all your changes to " & Global.varOriginalJD.JobTitle & "?"* (formula) · `Yes`, `No` · save to `Topic.varDiscardConfirm`
     - **Condition:** `Topic.varDiscardConfirm = "No"` → Set `Topic.varAskText` = `"Okay, keeping your draft. Anything else?"` → **Go to step** → Step 17 Question node
   - **All other conditions:** empty
2. **Redirect to JD Draft Reset**
3. Send a message *"Done. Nothing was submitted. Let me know if you need anything else."*
4. **End current topic**

## Step 26. Finish (done)

Inside Branch 8. Rename this first node `S26 Done` if you can, since Step 18's loop guard jumps here.

**Condition:** `!Global.varHasChanges`
- **True** (nothing changed, the user was just viewing):
  - Send a message *"Sounds good. Let me know if you'd like to make changes later."*
  - **Redirect to JD Draft Reset**
  - **End current topic**
- **All other conditions:** continue to Step 27

---

## PART 5 — REVIEW AND SUBMIT

## Step 27. Summarize the request

**Send a message**, formula mode:

```powerfx
"**Ready to submit your change request**" & Char(10) & Char(10) &
"**Job:** " & Global.varOriginalJD.JobTitle & Char(10) &
"**Requested by:** " & System.User.DisplayName & Char(10) & Char(10) &
"**Changes**" & Char(10) & Global.varChangeLogText &
If(IsBlank(Trim(Global.varReviewFlagsText)), "",
  Char(10) & "**Items HR will review**" & Char(10) & Global.varReviewFlagsText) &
Char(10) & "Submitting creates a change request for HR to review. The job description itself won't change until HR approves it."
```

The last sentence matters: "update" in this agent means *request a change*, and users should know nothing changes until HR approves.

## Step 28. Confirm

**Question:**
- Message: *"Would you like to submit this request?"*
- Identify: **Multiple choice options** → `Submit`, `Keep editing`, `Cancel request`
- Save as: `Topic.varConfirm`

**Condition** with branches:
- **Keep editing** → Set `Topic.varAskText` = `"Sure. What else would you like to change?"` → **Go to step** → Step 17 Question node
- **Cancel request** → **Go to step** → the first node of Step 25 (the `Global.varHasChanges` condition)
- **Submit** (All other conditions) → Step 29

## Step 29. Block double submission

**Condition:** `Global.varSubmitted`
- **True:** Send a message *"This request was already submitted."* → **End current topic**
- **All other conditions:** empty

This is a deterministic gate. The request is only ever created once, and only after an explicit "Submit".

## Step 30. Create the change request

**If the Create JD Change Request flow exists:**

1. **+ → Call an action → Create JD Change Request**

| Flow input | Value |
|---|---|
| `JobCode` | `Global.varJobCode` |
| `OriginalJDJson` | `Global.varOriginalJDJson` |
| `UpdatedJDJson` | `Global.varWorkingJDJson` |
| `ChangeNotes` | `Global.varChangeLogText` |
| `ReviewFlags` | `Global.varReviewFlagsText` |
| `RequesterName` | `System.User.DisplayName` |
| `RequesterEmail` | `System.User.Email` |

2. Save outputs: `Success` → `Topic.varSubmitSuccess`, `RequestId` → `Topic.varRequestId`, `Message` → `Topic.varSubmitMessage`

**If the flow doesn't exist yet:** add a **Send a message** node *"[Placeholder] Submit flow not built yet."* and a **Set a variable value** `Topic.varSubmitSuccess` = `true`, so you can test the rest of the topic. Replace both when the flow is ready.

## Step 31. Confirm the result

**Condition:** `Topic.varSubmitSuccess`

- **True:**
  1. `Global.varSubmitted` = `true`
  2. Send a message (formula): `"Submitted! Your change request " & Topic.varRequestId & " has been created for HR review. The job description will be updated if HR approves the changes."`
  3. **Redirect to JD Draft Reset**, then set `Global.varSubmitted` = `true` again (the reset clears it, and it must stay true until the next new lookup)
  4. **End current topic**
- **All other conditions:**
  1. Send a message *"Something went wrong creating your request. Your draft is still saved, so you can try again or contact your HR Business Partner."*
  2. Set `Topic.varAskText` = `"Say \"submit\" to try again, or describe another change."`
  3. **Go to step** → Step 17 Question node

---

## PART 6 — RESUME AN UNFINISHED DRAFT

## Step 32. Add the resume check at the very top

Built last because it jumps into the change loop. Insert it **between the trigger and the Step 5 redirect**.

1. **Condition:**
```
!IsBlank(Global.varOriginalJDJson) && Global.varHasChanges && !Global.varSubmitted
```
2. **True branch:**
   - **Question** (formula): `"You have unsubmitted changes to " & Global.varOriginalJD.JobTitle & ". Continue that draft, or start a new lookup?"`
   - Identify: **Multiple choice options** → `Continue`, `Start new`
   - Save as: `Topic.varResumeChoice`
   - **Condition:** `Topic.varResumeChoice = "Continue"`
     - **Nested condition:** `!IsBlank(Topic.InitialChangeRequest)`
       - **True:** Set `Topic.varUserReply` = `Topic.InitialChangeRequest` → Set `Topic.InitialChangeRequest` = `Blank()` → **Go to step** → Step 18 prompt node
       - **All other conditions:** Set `Topic.varAskText` = `"Welcome back. Describe another change, say \"show my draft\", or say you're done."` → **Go to step** → Step 17 Question node
     - **All other conditions** (Start new): empty, falls through to Step 5
3. **All other conditions:** empty

**When this fires:** the user was mid-edit, asked something that took them into another topic, and then came back with "continue my update" or "let's keep going on that JD". Because the draft lives in Global variables, nothing is lost.

---

## PART 7 — TEST

## Step 33. Test pane

Open the test pane and watch the variables panel as you go. Start a **new conversation** for each numbered test.

| # | Say this | Expect |
|---|---|---|
| 1 | "Show me the [exact title] job description" | No question, JD displayed, then "Would you like to change anything?" |
| 2 | "Add 'Prepare quarterly audit reports' to the duties for [exact title]" | JD displayed, "Got it. Working on the change…", then the proposed change |
| 3 | "I need to look at a job description" | Asks which job |
| 4 | "[title with a typo]" | Match list or direct match |
| 5 | "the person who processes payroll" | Description-based match list |
| 6 | "asdfasdf" three times | Gives up, points to HRBP |
| 7 | After display: "change the work experience to 3 years" | Proposed change, before/after |
| 8 | Apply it, then "show my draft" | Full JD with the change included |
| 9 | "remove the last one" | Clarifying question |
| 10 | "make it part-time" | Asks which allowed Salary/Hourly value |
| 11 | "add supervising two analysts to the duties" | People management flag |
| 12 | "what counts as people management?" | Knowledge answer, then back to "describe a change" |
| 13 | "actually, a different job" with changes applied | Discard confirmation, then back to search |
| 14 | "that's all" with no changes | Friendly close |
| 15 | "that's all" with changes | Summary and submit confirmation |
| 16 | Submit, then say "submit" again | "Already submitted" (no second request) |
| 17 | "cancel my changes" | Discard confirmation, then close |
| 18 | "What's the job code / grade for this?" | Declines, points to HRBP |

Check throughout: **no Job Code, Grade, or Status in any response.**

## Step 34. Test in the real channel

The test pane and Teams / Microsoft 365 Copilot render differently. **Publish the agent in DEV**, add it to Teams (and M365 Copilot if used), and rerun tests 1, 2, 7, 8, 12, and 15 there. Check:

- **Formatting:** bold text renders, and each field is on its own line. If lines run together, change `Char(10)` to `Char(10) & Char(10)` in the Step 15 and Step 20 messages.
- **Long fields:** duties and KSAs display in full without being cut off.
- **Interruptions:** during test 12, confirm the agent answers and returns to the loop rather than leaving the topic. If the orchestrator jumps to a different topic instead, check the Step 17 question's topic-switching setting, then test the resume path: say "continue my update" and confirm Step 32 offers to continue.
- **Identity:** test 15's summary shows your real name.

---

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `First()` / `ForAll` says it expected a Table | Step 8 saved to a Text variable, or the sample was pasted escaped |
| Parse value types the data as String | Sample has outer quotes or `\"` escapes. Paste raw JSON starting with `[` or `{` |
| Variables print as literal text in a message | Message text isn't in formula mode |
| "Required parameter … is blank" on a flow call | A variable was never set. Check `Topic.` vs `Global.` scope, and that no branch falls through instead of jumping |
| Flow isn't listed in Call an action | Not in the same solution, or turned off. Save, turn on, refresh |
| Type error when assigning to `Global.varWorkingJD` | The Parse value samples in Steps 14 and 21 differ. Use the identical sample |
| Prompt returns the wrong status | Test in the prompt editor with the exact message; adjust the status descriptions in Step 2 |
| Prompt changes fields the user didn't mention | Re-check rule 1 in Step 2 is intact; test with a simple one-field request |
| Agent answers twice after a general question | Knowledge was added to the Generative answers node. Remove it and use agent-level knowledge only |
| JD shows HTML tags | Those SharePoint columns are Enhanced rich text. Convert them to plain text |
| Resume question appears after a submission | `Global.varSubmitted` isn't being set back to `true` after the reset in Step 31 |
| Solution import fails with an `aimodel` dependency error | The prompt was edited without republishing the agent in DEV before export |

---

## Handoff checklist

- [ ] Helper topic **JD Draft Reset** built and not triggerable by users
- [ ] **Apply JD Changes** prompt built, bracketed sections filled in, tested
- [ ] Main topic description and both inputs set
- [ ] Steps 5–31 built in order; Step 32 added last
- [ ] All 18 test-pane tests pass
- [ ] Channel tests pass in Teams / M365 Copilot
- [ ] Agent republished in DEV after the final prompt edit
