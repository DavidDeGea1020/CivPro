# JD Expert Agent — Update Feature Build Guide

**Platform:** Copilot Studio (classic), generative orchestration
**Builds on:** your existing fuzzy match flow, Get JD Details flow, and Related Levels flow
**Goal:** a free-flowing, conversational JD update experience. The agent talks, while small topics and prompt tools handle the parts that must be reliable underneath.

> **Note on UI labels:** Copilot Studio renames menus often. If a label here doesn't match exactly, look for the closest equivalent. The node types and settings are the same.

---

## Contents

0. [How it all fits together](#part-0--how-it-all-fits-together)
1. [Prep: variable reference and your existing flow outputs](#part-1--prep)
2. [Turn on generative orchestration](#part-2--turn-on-generative-orchestration)
3. [SharePoint list and Save JD Update Request flow](#part-3--sharepoint-list-and-save-flow)
4. [Prompt tool: JD Section Reviewer](#part-4--prompt-tool-jd-section-reviewer)
5. [Prompt tool: JD Final Review](#part-5--prompt-tool-jd-final-review)
6. [Topic: Start JD Update](#part-6--topic-start-jd-update)
7. [Topic: Show JD Section](#part-7--topic-show-jd-section)
8. [Topic: Save Section Change](#part-8--topic-save-section-change)
9. [Topic: Log Hard Stop](#part-9--topic-log-hard-stop)
10. [Topic: Request Title Review](#part-10--topic-request-title-review)
11. [Topic: Review and Submit JD Update](#part-11--topic-review-and-submit-jd-update)
12. [Topic: Cancel or Switch JD Update](#part-12--topic-cancel-or-switch-jd-update)
13. [Agent instructions](#part-13--agent-instructions)
14. [Testing](#part-14--testing)
- [Appendix A — Insert points checklist](#appendix-a--insert-points-checklist)
- [Appendix B — Troubleshooting](#appendix-b--troubleshooting)

---

## Part 0 — How it all fits together

```
User confirms job (your existing match + Get JD Details flow)
        │
        ▼
[Start JD Update]  ← scripted: Section card → Reasons card → set up state
        │
        ▼
   ┌─────────── Generative orchestration (the "conversation") ───────────┐
   │  Agent talks naturally, guided by instructions. It calls:            │
   │   • [Show JD Section]      → displays current text of a section      │
   │   • [Save Section Change]  → runs Section Reviewer prompt, saves     │
   │   • [Log Hard Stop]        → records blocked requests for HR         │
   │   • [Request Title Review] → sets title review flag                  │
   │   • [Cancel or Switch]     → discards the update                     │
   │  Side questions are answered from knowledge without losing place.    │
   └──────────────────────────────────────────────────────────────────────┘
        │  user says they're done
        ▼
Agent asks indirect-impact confirming questions + title questions (conversationally)
        │
        ▼
[Review and Submit]  ← runs Final Review prompt (level check + HR assessment),
                       shows summary, submit / edit / cancel, saves to SharePoint
```

**The principle:** topics never script the conversation. They behave like functions. The agent calls them with inputs, they do one reliable job, and they return outputs that the agent turns into natural replies.

**Flag timing:**

| Flag | Fields | When the user sees it |
|---|---|---|
| Hard stop | Salary Type + your rules | Immediately, at any point |
| Indirect | People Management, Sales/Non-Sales, Relationship Manager, NMLS* | Collected quietly, confirmed with questions at the end |
| Level | Related levels (e.g., UB1 vs UB2) | At review, shown to user and HR as a recommendation |
| Title review | Title | Justification and proposed title asked at the end |

\* NMLS is included as indirect. Delete it everywhere if it no longer applies.

---

## Part 1 — Prep

### 1.1 Write down your existing flow outputs

Open your **Get JD Details** flow and note the exact output name for each field. You'll map them in Part 6. Fill in the right-hand column:

| JD field | Your Get JD Details output name |
|---|---|
| Job Title | `________` |
| Purpose | `________` |
| Principal Duties and Responsibilities | `________` |
| Education Requirements | `________` |
| Work Experience Requirements | `________` |
| Certifications/Licenses | `________` |
| Knowledge Skills Abilities | `________` |
| People Management | `________` |
| Sales/Non-Sales | `________` |
| Relationship Manager | `________` |
| NMLS Required | `________` |
| Salary/Hourly | `________` |

Also note:
- The variable your existing topic stores the confirmed Job Code in. This guide assumes **`Global.JobCode`**. If yours is a topic variable, change its **Usage** to **Global** in its Variable properties.
- The output name of your **Related Levels** flow's JSON. This guide calls it `RelatedLevelsJSON`.

### 1.2 Section keys

Use these exact keys everywhere: cards, formulas, and prompt inputs. Spaces and spelling matter.

| Key | Display name |
|---|---|
| `Purpose` | Purpose |
| `PrincipalDuties` | Principal Duties and Responsibilities |
| `Education` | Education Requirements |
| `WorkExperience` | Work Experience Requirements |
| `Certifications` | Certifications and Licenses |
| `KSA` | Knowledge, Skills and Abilities |

### 1.3 Global variable reference

You'll create all of these in Part 6. This table is for reference.

| Variable | Type | Holds |
|---|---|---|
| `Global.UpdateInProgress` | Boolean | True while an update is active |
| `Global.OriginalJD` | Record | Every field of the confirmed JD |
| `Global.OriginalJDText` | Text | Same JD flattened to text, for prompts |
| `Global.RelatedLevels` | Text | JSON of other levels of this job |
| `Global.SelectedSections` | Text | Comma list from the Section card |
| `Global.AddedSections` | Text | Sections added mid-update |
| `Global.UpdateReasons` | Text | Comma list from the Reasons card |
| `Global.OtherReason` | Text | "Other" text box |
| `Global.Changes` | Record | Proposed text per section (blank = unchanged) |
| `Global.PendingChecks` | Record | Possible indirect impacts with evidence |
| `Global.HardStopLog` | Text | Blocked requests, for HR |
| `Global.TitleReviewRequested` | Boolean | Title review requested |

---

## Part 2 — Turn on generative orchestration

1. Open your **JD Expert** agent in Copilot Studio.
2. Click **Settings** (top right).
3. Click **Generative AI** in the left pane.
4. Under **Orchestration**, select **Yes** / **Generative** (the option that lets the agent dynamically use topics, tools, and knowledge).
5. Click **Save**.
6. Go back to the agent's **Overview** page and confirm the **Instructions** box is visible. You'll fill it in Part 13.

> If your General (knowledge) features relied on classic trigger phrases, test them after this change. With generative orchestration, topic **descriptions** decide routing, not trigger phrases.

---

## Part 3 — SharePoint list and Save Flow

This is where the update request is stored. Your separate HR email/report flow will read from this list later.

### 3.1 Create the list

1. Open the SharePoint site that holds your JD list.
2. Click **+ New** → **List** → **Blank list**.
3. Name: **JD Update Requests**. Click **Create**.
4. Add these columns (**+ Add column** → choose type → name → **Save**):

| Column | Type |
|---|---|
| Title *(already exists, rename display to "Job Title")* | Single line |
| JobCode | Single line |
| RequestedBy | Single line |
| SectionsChanged | Single line |
| SectionsAddedMidUpdate | Single line |
| Reasons | Single line |
| OtherReason | Multiple lines |
| ChangesDetail | Multiple lines (plain text) |
| IndirectFlags | Multiple lines |
| HardStops | Multiple lines |
| LevelRecommendation | Multiple lines |
| TitleReviewRequested | Yes/No |
| ProposedTitle | Single line |
| TitleJustification | Multiple lines |
| TitleSupportAssessment | Multiple lines |
| HRSummary | Multiple lines |
| RequestStatus | Choice: Submitted, In Review, Approved, Declined (default: Submitted) |

### 3.2 Create the flow

Create it inside your solution so it moves cleanly through DEV → UAT → QA.

1. In Copilot Studio, open **Topics** → open any topic (you'll delete the node afterward), or create the flow from your **Solution** in Power Apps (**+ New** → **Automation** → **Cloud flow** → **Instant**).
2. Trigger: **When an agent calls the flow** (older name: *Run a flow from Copilot*).
3. In the trigger, click **+ Add an input** and add each of these as **Text** (except where noted):

| Input name | Type |
|---|---|
| JobTitle | Text |
| JobCode | Text |
| RequestedBy | Text |
| SectionsChanged | Text |
| SectionsAdded | Text |
| Reasons | Text |
| OtherReason | Text |
| ChangesDetail | Text |
| IndirectFlags | Text |
| HardStops | Text |
| LevelRecommendation | Text |
| TitleReviewRequested | Yes/No |
| ProposedTitle | Text |
| TitleJustification | Text |
| TitleSupportAssessment | Text |
| HRSummary | Text |

4. Click **+ New step** → search **SharePoint** → **Create item**.
   - **Site Address:** your site
   - **List Name:** JD Update Requests
   - Map each column to the matching trigger input from the dynamic content panel.
   - **RequestStatus Value:** Submitted
5. Click **+ New step** → **Respond to the agent** (*Respond to Copilot*).
   - **+ Add an output** → **Text** → name `RequestID` → value: **ID** from Create item.
6. Name the flow **Save JD Update Request** → **Save**.
7. Test it once manually with dummy text to confirm an item appears in the list.

---

## Part 4 — Prompt tool: JD Section Reviewer

Runs every time a section change is saved. It catches hard stops (as a backstop), collects possible indirect impacts, and generates cross-section reminders. It does **not** compare levels; that happens once at the end.

### 4.1 Create the prompt

1. In your agent, click **Tools** (or **Actions**) in the top nav.
2. Click **+ Add a tool** → **New tool** → **Prompt**.
3. Name it: **JD Section Reviewer**.
4. Create inputs: click **+ Add content** (or the input icon) → **Text**, and add each of these. Give each a sample value so you can test.

| Input name | Sample value for testing |
|---|---|
| `SectionName` | PrincipalDuties |
| `OriginalText` | Processes deposits; opens accounts; refers clients to specialists |
| `ProposedText` | Opens consumer and small business accounts; manages a portfolio of 50 business clients; supervises two part-time tellers |
| `UpdateReasons` | EditingQualifications,Title |
| `FullJD` | *(paste a real JD as text)* |
| `OtherChanges` | None |

5. Paste these instructions. Insert each input chip where you see `{InputName}`. Type `/` or use **+ Add content** to place the chip.

```
You are an HR job architecture reviewer at a bank. You review ONE proposed
change to ONE section of an existing job description. Your output is used by
another agent; it is not shown to the user directly.

Section being changed: {SectionName}
Original text of this section: {OriginalText}
Proposed new text: {ProposedText}
Reasons the manager gave for this update: {UpdateReasons}
Full current job description (includes confidential fields):
{FullJD}
Other changes already made in this update:
{OtherChanges}

Do these checks.

1) HARD STOPS
A hard stop is a change that is never allowed through this process.
- Any change that would alter the role's Salary Type (exempt/non-exempt,
  salaried/hourly) is a hard stop. This includes language about overtime,
  hourly pay, or changing exempt status.
[INSERT HARD STOP RULES]
If a hard stop applies, set hard_stop to true and write hard_stop_reason as
one plain sentence a manager would understand. Do not state the role's
current Salary Type.

2) INDIRECT IMPACTS
These fields cannot be edited directly, but the proposed change may imply
they should change. Only flag when the proposed text, together with other
changes, gives real evidence. Write the evidence in a short phrase, or leave
the field empty.
- pm_check (People Management): the role may now supervise, manage, or have
  direct reports.
- sales_check (Sales/Non-Sales): the role may now carry sales goals,
  quotas, incentives, or primary selling responsibility.
- rm_check (Relationship Manager): the role may now own or manage client
  relationships or portfolios.
- nmls_check (NMLS Required): the role may now originate or offer
  residential mortgage loans.
[INSERT INDIRECT CRITERIA]

3) CROSS-SECTION REMINDERS
If this change makes another editable section inconsistent, write one short
reminder per affected section. Examples:
- New duties not reflected in Purpose → remind about Purpose.
- New duties needing knowledge not in KSAs → remind about KSAs.
- Education and Work Experience no longer consistent with each other.
Only mention these sections: Purpose, Principal Duties, Education, Work
Experience, Certifications, KSAs. Leave empty if none.

4) TITLE REVIEW SIGNAL
Set title_review_suggested to true only if the changes so far are significant
enough that the current job title may no longer describe the role.

RULES
- Never mention grade, job code, or the value of Salary Type.
- Do not compare this job to other levels of the job.
- Return ONLY valid JSON in exactly this format, no extra text.
```

6. Set **Output** to **JSON**. Paste this as the example/schema:

```json
{
  "hard_stop": false,
  "hard_stop_reason": "",
  "pm_check": "",
  "sales_check": "",
  "rm_check": "",
  "nmls_check": "",
  "reminders": "",
  "title_review_suggested": false
}
```

7. Choose your model (the default is fine to start).
8. Click **Test**. With the sample values above, you should get `pm_check` filled (tellers) and probably `rm_check` filled (portfolio).
9. Click **Save**.

---

## Part 5 — Prompt tool: JD Final Review

Runs once, in Review and Submit. It handles level similarity and writes the HR-only assessment.

1. **Tools** → **+ Add a tool** → **New tool** → **Prompt**.
2. Name: **JD Final Review**.
3. Inputs (Text):

| Input name | Sample value |
|---|---|
| `CurrentTitle` | Universal Banker 1 |
| `OriginalJD` | *(full JD text)* |
| `ChangesText` | *(a few sections with ORIGINAL/PROPOSED)* |
| `RelatedLevels` | *(JSON from your Related Levels flow)* |
| `UpdateReasons` | EditingQualifications,Title |
| `TitleReviewRequested` | true |
| `ProposedTitle` | Small Business Banker |
| `TitleJustification` | Role is now mostly business clients |
| `IndirectConfirmations` | Relationship Manager: confirmed, manages ~50 client portfolio. Sales: no sales goals. |

4. Instructions:

```
You are an HR job architecture reviewer at a bank. A manager has finished
requesting updates to an existing job description. Review the full request.

Current job title: {CurrentTitle}
Original job description:
{OriginalJD}
Requested changes (ORIGINAL vs PROPOSED per section):
{ChangesText}
Other levels of this same job (JSON):
{RelatedLevels}
Reasons for update: {UpdateReasons}
Title review requested: {TitleReviewRequested}
Proposed title: {ProposedTitle}
Manager's title justification: {TitleJustification}
Manager's answers about indirect impacts: {IndirectConfirmations}

TASKS

1) LEVEL SIMILARITY
Compare the job AS IT WOULD BE AFTER the proposed changes against each other
level in the related levels JSON. If the updated job substantially overlaps
with a different level's duties, scope, or requirements (higher OR lower),
set level_match to true, put that level's title in matched_level_title, and
write level_recommendation: two or three friendly sentences addressed to the
manager, naming the overlapping duties and asking if they'd still like to
submit. Example tone: "Your updates sound a lot like what Universal Banker 2
already covers, especially managing a client portfolio. If this role has grown
into that work, a level review might be a better fit. Would you still like to
submit as is?"
[INSERT LEVEL SIMILARITY CRITERIA]
If there is no meaningful overlap, set level_match to false and leave the
other two fields empty.

2) TITLE SUPPORT ASSESSMENT (HR ONLY)
If a title review was requested, write two or three neutral sentences for HR
on whether the requested changes support a title change, and why. Note if the
changes seem thin relative to the request. Otherwise leave empty.

3) HR SUMMARY
Write a concise summary for the HR reviewer: what changed, why, what was
flagged, and anything HR should look at closely.

RULES
- Never reveal grade, job code, or Salary Type value in level_recommendation.
- Return ONLY valid JSON in exactly this format.
```

5. Output: **JSON**, with this format:

```json
{
  "level_match": false,
  "matched_level_title": "",
  "level_recommendation": "",
  "title_support_assessment": "",
  "hr_summary": ""
}
```

6. **Test** → **Save**.

---

## Part 6 — Topic: Start JD Update

Scripted on purpose. It shows the two cards and sets up all state, then ends so orchestration takes over.

### 6.1 Create the topic

1. Click **Topics** → **+ Add a topic** → **From blank**.
2. Click the topic name at the top → rename to **Start JD Update**.
3. On the **Trigger** node, in **Describe what the topic does**, enter:

   > Starts a job description update after the user has confirmed which job they want to update. Use when the user wants to update, edit, change, or revise a job description and a job has been confirmed. Do not use for viewing a job description only.

> **Connecting to your existing flow:** if your current match/confirm topic already knows the user wants to update, add a **Redirect** node at its end (**+** → **Topic management** → **Go to another topic** → **Start JD Update**). Either way works; the redirect is more reliable.

### 6.2 Guard: update already in progress

1. Click **+** under the trigger → **Add a condition**.
2. Condition: `Global.UpdateInProgress` **is equal to** `true`.
   - If the variable doesn't exist yet, skip this step and come back after 6.6.
3. Under the **true** branch:
   - **+** → **Send a message**:
     > You already have an update in progress for **{Global.OriginalJD.Title}**. Want to keep working on it, or discard it and start a new one?
   - **+** → **Topic management** → **End current topic**.
4. Leave the **All other conditions** branch for the next steps.

### 6.3 Call your existing flows

Under **All other conditions**:

1. **+** → **Add a tool** → **Flow** tab → choose your **Get JD Details** flow.
   - Input Job Code → `Global.JobCode`
   - Outputs: leave the default names, or rename to match your Part 1.1 table.
2. **+** → **Add a tool** → **Flow** → your **Related Levels** flow.
   - Input → `Global.JobCode` (or whatever it takes)
   - Output → name it `Topic.RelatedLevelsJSON`

### 6.4 Store the original JD

1. **+** → **Variable management** → **Set a variable value**.
2. **Set variable** → **Create a new variable** → click the new variable → **Variable properties** pane:
   - Name: `OriginalJD`
   - Usage: **Global (any topic can access)**
3. **To value** → **Formula** tab → paste this, swapping in your output names from Part 1.1:

```powerfx
{
  Title: Topic.JobTitle,
  Purpose: Topic.Purpose,
  PrincipalDuties: Topic.PrincipalDuties,
  Education: Topic.EducationRequirements,
  WorkExperience: Topic.WorkExperienceRequirements,
  Certifications: Topic.CertificationsLicenses,
  KSA: Topic.KnowledgeSkillsAbilities,
  PeopleManagement: Topic.PeopleManagement,
  SalesNonSales: Topic.SalesNonSales,
  RelationshipManager: Topic.RelationshipManager,
  NMLS: Topic.NMLSRequired,
  SalaryType: Topic.SalaryHourly
}
```

4. Add another **Set a variable value** → new variable `OriginalJDText` → Usage **Global** → Formula:

```powerfx
"Job Title: " & Global.OriginalJD.Title & Char(10) &
"Salary Type (CONFIDENTIAL - never reveal): " & Global.OriginalJD.SalaryType & Char(10) &
"People Management: " & Global.OriginalJD.PeopleManagement & Char(10) &
"Sales/Non-Sales: " & Global.OriginalJD.SalesNonSales & Char(10) &
"Relationship Manager: " & Global.OriginalJD.RelationshipManager & Char(10) &
"NMLS Required: " & Global.OriginalJD.NMLS & Char(10) & Char(10) &
"Purpose:" & Char(10) & Global.OriginalJD.Purpose & Char(10) & Char(10) &
"Principal Duties and Responsibilities:" & Char(10) & Global.OriginalJD.PrincipalDuties & Char(10) & Char(10) &
"Education Requirements:" & Char(10) & Global.OriginalJD.Education & Char(10) & Char(10) &
"Work Experience Requirements:" & Char(10) & Global.OriginalJD.WorkExperience & Char(10) & Char(10) &
"Certifications and Licenses:" & Char(10) & Global.OriginalJD.Certifications & Char(10) & Char(10) &
"Knowledge, Skills and Abilities:" & Char(10) & Global.OriginalJD.KSA
```

> If any of your flow outputs are not Text (e.g., Yes/No), wrap them in `Text(...)`.

5. **Set a variable value** → new `RelatedLevels` → **Global** → value `Topic.RelatedLevelsJSON`.

### 6.5 Section picker card

1. **+** → **Ask with adaptive card**.
2. Click the node → **Edit adaptive card** (or the card JSON panel) → replace everything with:

```json
{
  "type": "AdaptiveCard",
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "version": "1.5",
  "body": [
    {
      "type": "TextBlock",
      "text": "Which sections would you like to update?",
      "weight": "Bolder",
      "size": "Medium",
      "wrap": true
    },
    {
      "type": "TextBlock",
      "text": "Pick as many as you need. You can add more later if something comes up.",
      "isSubtle": true,
      "wrap": true
    },
    {
      "type": "Input.ChoiceSet",
      "id": "sections",
      "isMultiSelect": true,
      "style": "expanded",
      "isRequired": true,
      "errorMessage": "Pick at least one section.",
      "choices": [
        { "title": "Purpose", "value": "Purpose" },
        { "title": "Principal Duties and Responsibilities", "value": "PrincipalDuties" },
        { "title": "Education Requirements", "value": "Education" },
        { "title": "Work Experience Requirements", "value": "WorkExperience" },
        { "title": "Certifications and Licenses", "value": "Certifications" },
        { "title": "Knowledge, Skills and Abilities", "value": "KSA" }
      ]
    }
  ],
  "actions": [
    { "type": "Action.Submit", "title": "Next" }
  ]
}
```

3. Click **Save** in the card editor. The node's **Outputs** now show `sections` (text). Confirm it's saved as `Topic.sections`.

### 6.6 Reasons card

1. **+** → **Ask with adaptive card** → paste:

```json
{
  "type": "AdaptiveCard",
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "version": "1.5",
  "body": [
    {
      "type": "TextBlock",
      "text": "What's the reason for this update?",
      "weight": "Bolder",
      "size": "Medium",
      "wrap": true
    },
    {
      "type": "Input.ChoiceSet",
      "id": "reasons",
      "isMultiSelect": true,
      "style": "expanded",
      "isRequired": true,
      "errorMessage": "Pick at least one reason.",
      "choices": [
        { "title": "Upscales", "value": "Upscales" },
        { "title": "Editing Qualifications", "value": "EditingQualifications" },
        { "title": "Aligning KSAs", "value": "AligningKSAs" },
        { "title": "Title", "value": "Title" },
        { "title": "Other", "value": "Other" }
      ]
    },
    {
      "type": "Input.Text",
      "id": "otherReason",
      "placeholder": "If Other, tell us a bit more",
      "isMultiline": true
    }
  ],
  "actions": [
    { "type": "Action.Submit", "title": "Start updating" }
  ]
}
```

2. **Save**. Outputs: `Topic.reasons`, `Topic.otherReason`.

> Edit the reason list to match your final options. Keep the `Title` value exactly as is, because the formula below depends on it.

### 6.7 Set up the rest of the state

Add one **Set a variable value** node per row. Create each as a new variable, set **Usage: Global**, and use the **Formula** tab for the value.

| Variable | Formula |
|---|---|
| `SelectedSections` | `Topic.sections` |
| `AddedSections` | `""` |
| `UpdateReasons` | `Topic.reasons` |
| `OtherReason` | `If(IsBlank(Topic.otherReason), "", Topic.otherReason)` |
| `TitleReviewRequested` | `"Title" in Topic.reasons` |
| `HardStopLog` | `""` |
| `Changes` | `{Purpose: "", PrincipalDuties: "", Education: "", WorkExperience: "", Certifications: "", KSA: ""}` |
| `PendingChecks` | `{PeopleManagement: "", SalesNonSales: "", RelationshipManager: "", NMLS: ""}` |
| `UpdateInProgress` | `true` |

Now go back to step 6.2 and finish the condition if you skipped it.

### 6.8 Hand off to the conversation

1. **+** → **Send a message**. Keep it short, because the agent takes over right after:

   > Got it, let's update **{Global.OriginalJD.Title}**. We'll work through the sections you picked, and you can jump around, ask questions, or add sections anytime.

2. **+** → **Topic management** → **End current topic**.
3. **Save** the topic.

> **Optional, for a smoother start:** instead of a static message, add a **Redirect** to **Show JD Section** (Part 7) with the first selected section, `First(Split(Global.SelectedSections, ",")).Value`. The user lands straight in the first section.

---

## Part 7 — Topic: Show JD Section

Shows the **exact** current text of a section, so the agent never paraphrases or invents it.

1. **Topics** → **+ Add a topic** → **From blank** → name **Show JD Section**.
2. Trigger description:

   > Shows the user the current text of one editable section of the job description being updated. Use at the start of working on a section, or whenever the user asks to see a section's current text during an update.

3. Click **Details** (toolbar) → **Input** tab → **Create a new variable**:
   - Name: `SectionName`
   - **How will the agent fill this input?** Dynamically fill with best option
   - **Identify as:** User's entire response (text)
   - **Description:**
     > The section key. Must be exactly one of: Purpose, PrincipalDuties, Education, WorkExperience, Certifications, KSA. Map the user's wording to the closest key (e.g., "duties" → PrincipalDuties, "skills" → KSA, "experience" → WorkExperience).
   - **Should prompt user:** On
4. **Output** tab → **Create a new variable**:
   - Name: `SectionShown` (Text)
   - Description: `The current text of the section, already displayed to the user. Do not repeat it.`
5. Back on the canvas → **+** → **Add a condition**:
   - Formula (switch to formula view): `!(Topic.SectionName in ["Purpose","PrincipalDuties","Education","WorkExperience","Certifications","KSA"])`
   - **True branch:** Set `Topic.SectionShown` = `"Not an editable section. Only Purpose, Principal Duties, Education, Work Experience, Certifications, and KSAs can be edited."` → **End current topic**.
6. **All other conditions:**
   - **Set a variable value** → `Topic.SectionShown` → Formula:

```powerfx
Switch(Topic.SectionName,
  "Purpose", Global.OriginalJD.Purpose,
  "PrincipalDuties", Global.OriginalJD.PrincipalDuties,
  "Education", Global.OriginalJD.Education,
  "WorkExperience", Global.OriginalJD.WorkExperience,
  "Certifications", Global.OriginalJD.Certifications,
  "KSA", Global.OriginalJD.KSA,
  "")
```

   - **Set a variable value** → new `Topic.DisplayName` → Formula:

```powerfx
Switch(Topic.SectionName,
  "Purpose", "Purpose",
  "PrincipalDuties", "Principal Duties and Responsibilities",
  "Education", "Education Requirements",
  "WorkExperience", "Work Experience Requirements",
  "Certifications", "Certifications and Licenses",
  "KSA", "Knowledge, Skills and Abilities",
  "")
```

   - **Send a message:**

     > Here's the current **{Topic.DisplayName}**:
     >
     > {Topic.SectionShown}

7. **Save**.

> If the user already proposed an edit for this section, the agent should show the proposal in conversation. This topic always shows the **original**.

---

## Part 8 — Topic: Save Section Change

The core of the feature. Every confirmed section edit goes through this topic, so the reviewer **always** runs.

### 8.1 Create the topic and inputs

1. **+ Add a topic** → **From blank** → **Save Section Change**.
2. Trigger description:

   > Saves the user's confirmed new text for one section of the job description being updated, and reviews it for flags. Use ONLY after the user has confirmed the final wording for that section. Call once per confirmed section; call again if the user later revises the same section.

3. **Details** → **Input** tab. Create:

| Name | Identify as | Description | Prompt user |
|---|---|---|---|
| `SectionName` | User's entire response | Section key, exactly one of: Purpose, PrincipalDuties, Education, WorkExperience, Certifications, KSA. | Off |
| `ProposedText` | User's entire response | The complete final text for this section exactly as the user confirmed it. Full section, not just the changed lines. | Off |

4. **Output** tab. Create (all Text unless noted):

| Name | Description |
|---|---|
| `SaveStatus` | "Saved", "Blocked", or "Invalid section". |
| `HardStopMessage` | If blocked, a plain explanation to share with the user. |
| `Reminders` | Cross-section reminders. Mention lightly; offer to add the section. |
| `TitleReviewSuggested` (Boolean) | If true and no title review was requested, suggest one once. |
| `PendingChecksSummary` | Possible indirect impacts so far. Do NOT mention mid-update. Ask confirming questions about each when the user says they are done. |

### 8.2 Validate the section

1. **+** → **Add a condition** → formula:
   `!(Topic.SectionName in ["Purpose","PrincipalDuties","Education","WorkExperience","Certifications","KSA"])`
2. **True:** Set `Topic.SaveStatus` = `"Invalid section"` → **End current topic**.

### 8.3 Build reviewer inputs

Under **All other conditions**:

1. **Set a variable value** → new `Topic.OriginalSectionText` → the same `Switch(...)` formula from Part 7, step 6.
2. **Set a variable value** → new `Topic.OtherChanges` → Formula:

```powerfx
With(
  {
    t: Table(
      {S: "Purpose", T: Global.Changes.Purpose},
      {S: "PrincipalDuties", T: Global.Changes.PrincipalDuties},
      {S: "Education", T: Global.Changes.Education},
      {S: "WorkExperience", T: Global.Changes.WorkExperience},
      {S: "Certifications", T: Global.Changes.Certifications},
      {S: "KSA", T: Global.Changes.KSA}
    )
  },
  If(
    CountRows(Filter(t, !IsBlank(T) && S <> Topic.SectionName)) = 0,
    "None",
    Concat(Filter(t, !IsBlank(T) && S <> Topic.SectionName), S & ": " & T, Char(10) & Char(10))
  )
)
```

### 8.4 Call the reviewer

1. **+** → **Add a tool** → **Prompt** tab → **JD Section Reviewer**.
2. Map inputs:

| Prompt input | Value |
|---|---|
| SectionName | `Topic.SectionName` |
| OriginalText | `Topic.OriginalSectionText` |
| ProposedText | `Topic.ProposedText` |
| UpdateReasons | `Global.UpdateReasons & If(IsBlank(Global.OtherReason), "", " (Other: " & Global.OtherReason & ")")` |
| FullJD | `Global.OriginalJDText` |
| OtherChanges | `Topic.OtherChanges` |

3. Output variable: name it `Topic.Review`.

> **Reading the output:** with JSON output, the fields usually appear under `Topic.Review.structuredOutput` (e.g., `Topic.Review.structuredOutput.hard_stop`). If your node only exposes a text output instead, add a **Set a variable value** → `Topic.R` = `ParseJSON(Topic.Review.text)`, then read fields as `Boolean(Topic.R.hard_stop)` and `Text(Topic.R.pm_check)`. The formulas below use `Topic.Review.structuredOutput.` (shortened to **`R.`** for readability). Replace `R.` with your actual path.

### 8.5 Hard stop branch

1. **+** → **Add a condition** → `R.hard_stop` **is equal to** `true`.
2. **True branch:**
   - **Set** `Global.HardStopLog` = `Global.HardStopLog & Char(10) & "- [" & Topic.SectionName & "] " & R.hard_stop_reason`
   - **Set** `Topic.SaveStatus` = `"Blocked"`
   - **Set** `Topic.HardStopMessage` = `R.hard_stop_reason`
   - **End current topic** (the change is **not** saved)

### 8.6 Save branch

Under **All other conditions**, add these **Set a variable value** nodes in order.

**a) Save the change**: `Global.Changes` =

```powerfx
{
  Purpose: If(Topic.SectionName = "Purpose", Topic.ProposedText, Global.Changes.Purpose),
  PrincipalDuties: If(Topic.SectionName = "PrincipalDuties", Topic.ProposedText, Global.Changes.PrincipalDuties),
  Education: If(Topic.SectionName = "Education", Topic.ProposedText, Global.Changes.Education),
  WorkExperience: If(Topic.SectionName = "WorkExperience", Topic.ProposedText, Global.Changes.WorkExperience),
  Certifications: If(Topic.SectionName = "Certifications", Topic.ProposedText, Global.Changes.Certifications),
  KSA: If(Topic.SectionName = "KSA", Topic.ProposedText, Global.Changes.KSA)
}
```

> Re-saving a section overwrites it, so revisions never pile up.

**b) Track sections added mid-update**: `Global.AddedSections` =

```powerfx
If(
  Topic.SectionName in Global.SelectedSections || Topic.SectionName in Global.AddedSections,
  Global.AddedSections,
  If(IsBlank(Global.AddedSections), Topic.SectionName, Global.AddedSections & "," & Topic.SectionName)
)
```

**c) Accumulate indirect checks**: `Global.PendingChecks` =

```powerfx
{
  PeopleManagement: If(IsBlank(R.pm_check), Global.PendingChecks.PeopleManagement, R.pm_check),
  SalesNonSales: If(IsBlank(R.sales_check), Global.PendingChecks.SalesNonSales, R.sales_check),
  RelationshipManager: If(IsBlank(R.rm_check), Global.PendingChecks.RelationshipManager, R.rm_check),
  NMLS: If(IsBlank(R.nmls_check), Global.PendingChecks.NMLS, R.nmls_check)
}
```

**d) Outputs:**

| Output | Formula |
|---|---|
| `Topic.SaveStatus` | `"Saved"` |
| `Topic.Reminders` | `R.reminders` |
| `Topic.TitleReviewSuggested` | `R.title_review_suggested && !Global.TitleReviewRequested` |
| `Topic.PendingChecksSummary` | *(below)* |

```powerfx
Concat(
  Filter(
    Table(
      {F: "People Management", E: Global.PendingChecks.PeopleManagement},
      {F: "Sales/Non-Sales", E: Global.PendingChecks.SalesNonSales},
      {F: "Relationship Manager", E: Global.PendingChecks.RelationshipManager},
      {F: "NMLS Required", E: Global.PendingChecks.NMLS}
    ),
    !IsBlank(E)
  ),
  F & ": " & E,
  Char(10)
)
```

3. **Save** the topic. No message node. The agent words the reply from the outputs.

---

## Part 9 — Topic: Log Hard Stop

Hard stops can come up in conversation before anything is saved (e.g., "can we make it hourly?"). The agent detects them from its instructions and calls this topic to record them for HR.

1. **+ Add a topic** → **From blank** → **Log Hard Stop**.
2. Trigger description:

   > Records a user's request that is not allowed through the job description update process (a hard stop), such as changing salary type or exempt status. Call immediately whenever the user requests a hard-stop change at any point in an update.

3. **Inputs:**

| Name | Description | Prompt user |
|---|---|---|
| `Field` | The restricted field the user tried to change (e.g., Salary Type). | Off |
| `UserRequest` | A one-sentence summary of what the user asked for. | Off |

4. **Output:** `Logged` (Text), with description `Confirmation. Explain the restriction to the user in one or two sentences and continue the update.`
5. Canvas:
   - **Set** `Global.HardStopLog` = `Global.HardStopLog & Char(10) & "- [" & Topic.Field & "] " & Topic.UserRequest`
   - **Set** `Topic.Logged` = `"Logged"`
6. **Save**.

---

## Part 10 — Topic: Request Title Review

Lets the agent turn on a title review mid-conversation, and enforces your rule that it can't happen without an update.

1. **+ Add a topic** → **From blank** → **Request Title Review**.
2. Trigger description:

   > Use when the user asks to change the job title, request a title review, or agrees to a suggested title review.

3. **Output:** `TitleReviewStatus` (Text), with description `"Added" means it will be requested at submission. "No update in progress" means explain that title reviews are submitted alongside a job description update, and offer to start one.`
4. Canvas:
   - **Condition:** `Global.UpdateInProgress` is equal to `true`
     - **True:** Set `Global.TitleReviewRequested` = `true` → Set `Topic.TitleReviewStatus` = `"Added"`
     - **All other conditions:** Set `Topic.TitleReviewStatus` = `"No update in progress"`
5. **Save**.

---

## Part 11 — Topic: Review and Submit JD Update

Assembles everything, runs the final review, shows the summary, and saves.

### 11.1 Create the topic and inputs

1. **+ Add a topic** → **From blank** → **Review and Submit JD Update**.
2. Trigger description:

   > Builds the final review summary of the job description update and lets the user submit it to HR. Use when the user says they are done updating, are ready to submit, or wants to see a summary of their changes. Before calling, ask the user the confirming questions for any potential indirect impacts, and if a title review was requested, ask for their proposed title and justification.

3. **Inputs** (all Text, **Should prompt user: Off**):

| Name | Description |
|---|---|
| `IndirectConfirmations` | The user's answers to the confirming questions about each potential indirect impact (People Management, Sales/Non-Sales, Relationship Manager, NMLS), e.g., "Relationship Manager: yes, manages ~50 clients. Sales: no." Use "None" if there were no potential impacts. |
| `ProposedTitle` | The job title the user proposes, only if a title review was requested. Otherwise "N/A". |
| `TitleJustification` | The user's reason why the current title no longer fits, only if a title review was requested. Otherwise "N/A". |

### 11.2 Guard: no changes

1. **Condition** (formula):

```powerfx
IsBlank(Global.Changes.Purpose) && IsBlank(Global.Changes.PrincipalDuties) &&
IsBlank(Global.Changes.Education) && IsBlank(Global.Changes.WorkExperience) &&
IsBlank(Global.Changes.Certifications) && IsBlank(Global.Changes.KSA)
```

2. **True:**
   - **Send a message:**
     > There aren't any saved changes yet, so there's nothing to submit. Title reviews also need at least one job description change to go with them. Which section would you like to start with?
   - **End current topic**

### 11.3 Title fallback (deterministic safety net)

Under **All other conditions**:

1. **Condition:** `Global.TitleReviewRequested && (IsBlank(Topic.ProposedTitle) || Topic.ProposedTitle = "N/A")`
   - **True:** **+** → **Ask a question**: "What title would you suggest for this role?" → **Identify:** User's entire response → save as `Topic.ProposedTitle`.
2. Same pattern for `TitleJustification`: "In a sentence or two, why doesn't **{Global.OriginalJD.Title}** fit the role anymore?"

> These only fire if the agent skipped the questions. Normally it asks them naturally beforehand.

### 11.4 Build the changes text

**Set** new `Topic.ChangesText` =

```powerfx
Concat(
  Filter(
    Table(
      {S: "Purpose", O: Global.OriginalJD.Purpose, N: Global.Changes.Purpose},
      {S: "PrincipalDuties", O: Global.OriginalJD.PrincipalDuties, N: Global.Changes.PrincipalDuties},
      {S: "Education", O: Global.OriginalJD.Education, N: Global.Changes.Education},
      {S: "WorkExperience", O: Global.OriginalJD.WorkExperience, N: Global.Changes.WorkExperience},
      {S: "Certifications", O: Global.OriginalJD.Certifications, N: Global.Changes.Certifications},
      {S: "KSA", O: Global.OriginalJD.KSA, N: Global.Changes.KSA}
    ),
    !IsBlank(N)
  ),
  "### " & S & If(S in Global.AddedSections, " (added during update)", "") & Char(10) &
  "ORIGINAL:" & Char(10) & O & Char(10) &
  "PROPOSED:" & Char(10) & N,
  Char(10) & Char(10)
)
```

**Set** new `Topic.SectionsChanged` =

```powerfx
Concat(
  Filter(
    Table(
      {D: "Purpose", N: Global.Changes.Purpose},
      {D: "Principal Duties", N: Global.Changes.PrincipalDuties},
      {D: "Education", N: Global.Changes.Education},
      {D: "Work Experience", N: Global.Changes.WorkExperience},
      {D: "Certifications", N: Global.Changes.Certifications},
      {D: "KSAs", N: Global.Changes.KSA}
    ),
    !IsBlank(N)
  ),
  D, ", "
)
```

### 11.5 Run the Final Review prompt

1. **+** → **Add a tool** → **Prompt** → **JD Final Review**.
2. Map:

| Input | Value |
|---|---|
| CurrentTitle | `Global.OriginalJD.Title` |
| OriginalJD | `Global.OriginalJDText` |
| ChangesText | `Topic.ChangesText` |
| RelatedLevels | `Global.RelatedLevels` |
| UpdateReasons | `Global.UpdateReasons` |
| TitleReviewRequested | `Text(Global.TitleReviewRequested)` |
| ProposedTitle | `If(Global.TitleReviewRequested, Topic.ProposedTitle, "N/A")` |
| TitleJustification | `If(Global.TitleReviewRequested, Topic.TitleJustification, "N/A")` |
| IndirectConfirmations | `Topic.IndirectConfirmations` |

3. Output → `Topic.Final` (fields read the same way as Part 8.4; shortened to **`F.`** below).

### 11.6 Show the summary

1. **Set** new `Topic.SummaryText` =

```powerfx
"**Job:** " & Global.OriginalJD.Title & Char(10) & Char(10) &
"**Sections changed:** " & Topic.SectionsChanged & Char(10) & Char(10) &
"**Reasons:** " & Global.UpdateReasons &
  If(IsBlank(Global.OtherReason), "", " — " & Global.OtherReason) & Char(10) & Char(10) &
If(IsBlank(Topic.IndirectConfirmations) || Topic.IndirectConfirmations = "None", "",
  "**For HR review:** " & Topic.IndirectConfirmations & Char(10) & Char(10)) &
If(IsBlank(Global.HardStopLog), "",
  "**Noted for HR (not changed):**" & Global.HardStopLog & Char(10) & Char(10)) &
If(Global.TitleReviewRequested,
  "**Title review:** Proposed \"" & Topic.ProposedTitle & "\". " & Topic.TitleJustification & Char(10) & Char(10), "") &
If(F.level_match, "**One thing to consider:** " & F.level_recommendation, "")
```

2. **Send a message:**
   > Here's your update request:
   >
   > {Topic.SummaryText}

> This shows an **overview** of the request, not the full rewritten JD, matching your rule. To let users see the actual section text, add an "Show my changes" option in 11.7 that prints `Topic.ChangesText`.

### 11.7 Submit, edit, or cancel

1. **+** → **Ask a question**:
   - Question: `What would you like to do?`
   - **Identify:** Multiple choice options
   - Options: `Submit to HR`, `Make more changes`, `Cancel this update`
   - Save response as `Topic.Decision`

2. Three branches are created automatically.

**Submit to HR:**
   - **+** → **Add a tool** → **Flow** → **Save JD Update Request**. Map:

| Flow input | Value |
|---|---|
| JobTitle | `Global.OriginalJD.Title` |
| JobCode | `Global.JobCode` |
| RequestedBy | `System.User.Email` *(or `System.User.DisplayName`)* |
| SectionsChanged | `Topic.SectionsChanged` |
| SectionsAdded | `Global.AddedSections` |
| Reasons | `Global.UpdateReasons` |
| OtherReason | `Global.OtherReason` |
| ChangesDetail | `Topic.ChangesText` |
| IndirectFlags | `Topic.IndirectConfirmations` |
| HardStops | `Global.HardStopLog` |
| LevelRecommendation | `If(F.level_match, F.matched_level_title & ": " & F.level_recommendation, "")` |
| TitleReviewRequested | `Global.TitleReviewRequested` |
| ProposedTitle | `If(Global.TitleReviewRequested, Topic.ProposedTitle, "")` |
| TitleJustification | `If(Global.TitleReviewRequested, Topic.TitleJustification, "")` |
| TitleSupportAssessment | `F.title_support_assessment` |
| HRSummary | `F.hr_summary` |

   - **Send a message:**
     > Submitted! Your request for **{Global.OriginalJD.Title}** is with HR for review (reference #{Topic.RequestID}). Anything else I can help with?
   - **Redirect** → **Cancel or Switch JD Update**, passing `Mode` = `"Reset"` (see Part 12). This clears the state silently.

**Make more changes:**
   - **Send a message:** `Sure, what would you like to change?`
   - **End current topic** (the conversation continues with everything kept)

**Cancel this update:**
   - **Redirect** → **Cancel or Switch JD Update** with `Mode` = `"Cancel"`.

3. **Save**.

---

## Part 12 — Topic: Cancel or Switch JD Update

1. **+ Add a topic** → **From blank** → **Cancel or Switch JD Update**.
2. Trigger description:

   > Discards the job description update in progress. Use when the user wants to cancel, stop, start over, or switch to a different job during an update.

3. **Input:** `Mode` (Text)
   - Description: `"Cancel" if the user wants to stop, "Switch" if they want a different job, "Reset" only when called after a successful submission.`
   - Should prompt user: Off
4. Canvas:

   **a) Confirm (skip for Reset):**
   - **Condition:** `Topic.Mode <> "Reset"`
     - **True:** **Ask a question** → "This will discard the changes you've made to **{Global.OriginalJD.Title}**. Are you sure?" → Multiple choice: `Yes, discard`, `No, keep going` → `Topic.Confirm`
       - **No, keep going** branch → **Send a message**: "No problem, picking up where we left off." → **End current topic**

   **b) Clear state.** Add a **Set a variable value** node per row:

| Variable | Value |
|---|---|
| `Global.UpdateInProgress` | `false` |
| `Global.SelectedSections` | `""` |
| `Global.AddedSections` | `""` |
| `Global.UpdateReasons` | `""` |
| `Global.OtherReason` | `""` |
| `Global.TitleReviewRequested` | `false` |
| `Global.HardStopLog` | `""` |
| `Global.Changes` | `{Purpose: "", PrincipalDuties: "", Education: "", WorkExperience: "", Certifications: "", KSA: ""}` |
| `Global.PendingChecks` | `{PeopleManagement: "", SalesNonSales: "", RelationshipManager: "", NMLS: ""}` |

   **c) Wrap up:**
   - **Condition:** `Topic.Mode = "Switch"` → **Send a message**: "Done. Which job would you like to work on instead?" (The agent then routes the answer to your match flow.)
   - `Topic.Mode = "Cancel"` → **Send a message**: "Update discarded. Anything else I can help with?"
   - `Reset` → no message.

5. **Save**.

---

## Part 13 — Agent instructions

1. Go to the agent's **Overview** page → **Instructions** → **Edit**.
2. Keep your existing General-section instructions. Add this block below them:

```
JOB DESCRIPTION UPDATES

You are a knowledgeable, friendly job description partner helping managers
update existing job descriptions for HR review. Sound like an expert
colleague, not a form. Keep replies short and conversational.

STARTING
- When a user wants to update a job description, help them find and confirm
  the job first, then use Start JD Update.

WORKING ON SECTIONS (while an update is in progress)
- Work through the sections the user selected. Use Show JD Section to show the
  current text of a section before discussing changes to it.
- Let the user describe changes in their own words. Draft the revised section
  for them. Improve wording where helpful (clear action verbs, specific scope,
  no vague duties) and briefly explain any wording you changed.
- If the user describes changes for several sections at once, sort them into
  the right sections yourself and confirm.
- When the user confirms a section's final wording, call Save Section Change
  with the full final text.
- After saving:
  - If SaveStatus is "Blocked", explain HardStopMessage in one or two
    sentences and continue.
  - If Reminders is not empty, mention it briefly and offer to add that
    section to the update.
  - If TitleReviewSuggested is true, suggest a title review once. If the user
    agrees, use Request Title Review.
  - Do NOT mention PendingChecksSummary yet.
- Users may revisit a saved section; just save it again.
- Users may add sections they didn't pick at the start. Only these sections
  can be edited: Purpose, Principal Duties, Education, Work Experience,
  Certifications, Knowledge Skills and Abilities.
- If the user asks a side question, answer it, then return to where they
  left off.
- Never show Grade, Job Code, Salary Type, or Status. Never show the full
  updated job description; only the requested changes.
- Do not comment on similarity to other job levels during the update. That
  is handled at review.

HARD STOPS (check every message, act immediately)
- Never allow a change to Salary Type (exempt/non-exempt, salaried/hourly,
  overtime eligibility).
[INSERT HARD STOP RULES]
- When a hard stop comes up, call Log Hard Stop, explain in one or two
  sentences that it can't be changed through this process and HR will see
  the request, then continue the update.

INDIRECT FIELDS
People Management, Sales/Non-Sales, Relationship Manager, and NMLS Required
cannot be edited directly. Potential impacts are tracked automatically in
PendingChecksSummary. When the user says they are done, ask a confirming
question for each item in the latest PendingChecksSummary, one or two at a
time, conversationally:
- People Management: "Does this role now have direct reports?"
- Relationship Manager: "Does this role now manage client portfolios?"
- Sales/Non-Sales: [INSERT QUESTION]
- NMLS Required: [INSERT QUESTION]
[INSERT INDIRECT CRITERIA]

TITLE REVIEWS
- A title review can only be submitted together with job description
  changes. If the user asks about changing the title, use Request Title
  Review. If no update is in progress, explain this and offer to start one.
- If a title review is requested, before review ask the user for (1) their
  proposed title and (2) why the current title no longer fits.

FINISHING
- When the user is done: ask the indirect confirming questions, then the
  title questions if needed, then call Review and Submit JD Update with the
  answers.
- If the user wants to cancel, start over, or switch jobs, use Cancel or
  Switch JD Update.
```

3. **Save**.

---

## Part 14 — Testing

Use the **Test** pane. Click **Reset** (circular arrow) between tests so globals clear. Turn on **Track between topics** (or the activity map) to see which topic and tool fired.

| # | Test | Expected result |
|---|---|---|
| 1 | Pick Duties only. Make one clean edit. Say done. Submit. | Show JD Section → Save Section Change (Saved) → Review → SharePoint item created |
| 2 | In Duties, add "supervises two tellers". | No mention mid-update. At the end: "Does this role now have direct reports?" |
| 3 | Mid-update: "can we make them hourly?" | Immediate explanation, Log Hard Stop fires, update continues, appears under "Noted for HR" |
| 4 | Edit Duties with a new client-facing focus, Purpose not selected. | Reminder offering to add Purpose; accepting shows "(added during update)" in ChangesDetail |
| 5 | Edit UB1 with clearly UB2-level duties. | Level recommendation appears in the summary only, and in the SharePoint item |
| 6 | Pick "Title" on the Reasons card. | At the end, asked for proposed title and justification |
| 7 | Outside any update: "can I change my team's job title?" | Explains it goes with a JD update, offers to start one |
| 8 | Say "I'm done" with zero saved changes. | "Nothing to submit yet" guard message |
| 9 | Mid-update, ask "what's FLSA?" then continue. | Answer from knowledge, then returns to the same section |
| 10 | Mid-update: "actually I meant Universal Banker 2". | Cancel or Switch fires, confirms, clears, asks for the new job |
| 11 | Revise a saved section twice. | Only the latest text appears in the summary |
| 12 | Try to edit Grade or Salary Type through Show JD Section. | "Not an editable section" |

**Tuning tips:**
- If the agent saves before the user confirms → strengthen "ONLY after the user has confirmed" in the Save Section Change description.
- If it raises indirect flags mid-update → reinforce "Do NOT mention PendingChecksSummary yet" in both instructions and the output description.
- If routing to a topic is unreliable → the **topic description** is almost always the fix, not the instructions.

---

## Appendix A — Insert points checklist

| Location | Placeholder | What goes there |
|---|---|---|
| Part 4 — Section Reviewer prompt | `[INSERT HARD STOP RULES]` | Your hard stop criteria |
| Part 4 — Section Reviewer prompt | `[INSERT INDIRECT CRITERIA]` | Qualification criteria for People Mgmt, Sales, RM, NMLS |
| Part 5 — Final Review prompt | `[INSERT LEVEL SIMILARITY CRITERIA]` | How close is "too close" to another level |
| Part 13 — Instructions | `[INSERT HARD STOP RULES]` | Same rules, phrased for the agent |
| Part 13 — Instructions | `[INSERT QUESTION]` ×2 | Sales/Non-Sales and NMLS confirming questions |
| Part 13 — Instructions | `[INSERT INDIRECT CRITERIA]` | Optional short version of the criteria |
| Part 1.1 | Output name table | Your Get JD Details output names |

> Keep hard stop rules **identical in meaning** in the prompt and the instructions. The instructions catch them in conversation; the prompt catches anything that slips into saved text.

---

## Appendix B — Troubleshooting

**"Name isn't valid" in a Power Fx formula**
The variable doesn't exist yet or is spelled differently. Create the variable first, then paste the formula. Check that global variables have **Usage: Global**.

**Prompt output fields don't appear**
Confirm the prompt's output is set to **JSON** and re-save it. Then delete and re-add the prompt node in the topic so it picks up the new schema. Fallback: use `ParseJSON` (Part 8.4 note).

**The `in` checks match the wrong section**
`in` on text is a substring match. The section keys in this guide don't overlap, so they're safe. If you add new keys, make sure none is contained in another.

**Agent paraphrases the section instead of calling Show JD Section**
Add to instructions: "Always use Show JD Section to display current text; never retype it from memory."

**Adaptive card returns nothing**
Make sure the card has an `Action.Submit` button and the input `id`s are exactly `sections`, `reasons`, `otherReason`.

**Topic fires at the wrong time**
Make the description more specific about when **not** to use it. Descriptions drive routing under generative orchestration.

**Variables carry over between tests**
Use **Reset** in the test pane. In production, the Cancel or Switch topic handles resets.
