# JD Update Workflow — Build Guide

Sep 28, 2026 · @Eric

## Overview

The update workflow uses a hub-and-spoke design. One hub topic reads `Global.CurrentStep` and sends the user to the right section topic, and every section topic ends back at the hub. The user's position is stored in global variables, not in the topic stack. That means they can ask a side question, go back, jump ahead, or open their change list and still land on the same step.

&#91;embedded content: JD update architecture · hub, five section topics, review\]

Initialize, the hub, Review JD Changes and Switch JD Job can all be called by the orchestrator at any point. Section topics are only ever opened by the hub.

You will build these topics:

| Topic | Trigger | What it does |
| --- | --- | --- |
| Initialize JD Update | The agent chooses | Explains the review, collects reasons and sections, loads the job description, sets up state |
| Continue JD Update (the hub) | The agent chooses, plus redirects | Decides which section comes next; handles resume, back, skip and jump |
| JD Section – Purpose (and one per section) | It's redirected to | Shows current text, keep or revise, AI comments and flags, saves the change |
| Review JD Changes | The agent chooses, plus redirects | Shows requested changes; revise, remove, keep reviewing, or submit |
| Switch JD Job | The agent chooses | Confirms discarding changes, resets state, restarts the job search |

Build in this order, testing as you go:

1. Settings and section list (Step 1)
2. Global variables (Step 2)
3. Initialize JD Update (Step 3)
4. The hub (Step 4)
5. The prompt and ONE section topic, tested end to end (Step 5)
6. The change log (Step 6), then copy the section topic for the other sections
7. Review JD Changes (Step 7)
8. Switch JD Job (Step 8)
9. Agent instructions and topic descriptions (Step 9)
10. The full test script (Step 10)

Do all of this in your DEV solution so the topics and the prompt travel to UAT and QA with the agent.

## Step 1: Prerequisites and settings

Confirm three settings, fix the section list, and create one entity before you build any topics.

### 1.1 Confirm generative orchestration is on

1. Open the agent and go to **Settings → Generative AI**.
2. Under orchestration, confirm the agent uses generative AI to choose topics and tools. (The label has changed a few times; it is the setting that lets the agent pick topics by their descriptions.)
3. Save.

The whole design depends on this. The orchestrator picks topics by description and fills topic inputs from what the user says.

### 1.2 Decide how the job reaches the update

Your search tool and Get JD Details already work. Initialize JD Update will take the job code as a **topic input** that the orchestrator fills from the search results it already saw. Initialize then calls Get JD Details itself and stores the result in a global variable. Section topics cannot read tool results the orchestrator received directly, so they need the job description stored in a variable.

Write down the exact output field names Get JD Details returns (for example `Purpose`, `PrincipalDuties`, `EducationRequirements`, `KSA`, `CertificationsLicenses`). You will reference them in Steps 3 and 5.

### 1.3 Fix the section list

These are the five sections managers can revise, in the order they appear on the job description. The **Key** is what the adaptive card returns and what every formula compares against. Keep keys to one word with no spaces or commas, because the card returns multi-select answers as one comma-separated string.

| Step | Key | Label shown to users | Get JD Details field |
| --- | --- | --- | --- |
| 1 | Purpose | Purpose | Purpose |
| 2 | Duties | Principal Duties and Responsibilities | Principal Duties and Responsibilities |
| 3 | Education | Education Requirements | Education Requirements |
| 4 | KSA | Knowledge, Skills and Abilities | Knowledge Skills Abilities |
| 5 | Certifications | Certifications/Licenses | Certifications/Licenses |

### 1.4 Create the JD Section entity

The hub uses this entity so the orchestrator can turn "go back to duties" or "skip this one" into a clean value.

1. Go to **Settings → Entities → Add an entity → Closed list**.
2. Name it **JD Section**.
3. Add these items and synonyms:

| Item | Synonyms |
| --- | --- |
| Purpose | purpose statement, summary, overview, job purpose |
| Duties | principal duties, responsibilities, tasks, duties and responsibilities |
| Education | education requirements, degree, schooling |
| KSA | knowledge skills and abilities, skills, competencies, KSAs |
| Certifications | certifications, licenses, licensing, credentials, certs |
| Previous | back, go back, previous section, last section |
| Next | skip, skip this, next section, move on |
| Summary | my changes, changes so far, review, summary |

4. Turn on **Smart matching** if it is offered, so small typos still match.
5. Save.

## Step 2: Create the global variables

Eleven global variables hold the whole state of an update. Because they are global, every topic reads and writes the same values, whatever topic the user wandered into.

### 2.1 How to create a global variable

1. In a topic, add **Variable management → Set a variable value**.
2. Under **Set variable**, choose **Create a new variable**.
3. Click the new variable to open its **Variable properties** pane.
4. Rename it (for example `CurrentStep`).
5. Under **Usage**, choose **Global (any topic can access)**. The name now shows as `Global.CurrentStep`.
6. Set its value. A variable gets its type from the first value you give it, so set each one where the table says.

You will create most of these in the setup nodes of Initialize JD Update (Step 3). Create them all there, even ones other topics change later.

### 2.2 The variables

| Variable | Type | First set in | Purpose |
| --- | --- | --- | --- |
| Global.JobCode | String | Initialize | Key passed to every flow. Never shown to users. |
| Global.JobTitle | String | Initialize | Used in messages. |
| Global.JD | Record | Initialize (Get JD Details output) | Current text of each section. |
| Global.RequestId | String | Initialize | Unique ID for this update. Guards against old topics saving to a new update. |
| Global.UpdateActive | Boolean | Initialize | True while a review is in progress. |
| Global.UpdateReasons | String | Initialize | The reasons from the card, passed to the prompt and the submit flow. |
| Global.AllSections | Table | Initialize | Master list of the five sections from Step 1.3. |
| Global.Sections | Table | Initialize | The sections this user chose, in job description order. |
| Global.CurrentStep | Number | Initialize | Step number of the section in progress. 99 means every section is done. |
| Global.ChangeLog | Table | Initialize | One row per revised section. |
| Global.ReturnToSummary | Boolean | Initialize | True when the user is revising from the summary, so the hub returns to the summary afterwards. |

### 2.3 Why CurrentStep uses step numbers

`Global.CurrentStep` stores the section's **Step** number from the master list, not its position in the user's list. If a user picks Purpose, Education and Certifications, the steps are 1, 3 and 5. Moving forward and back then becomes a simple filter:

- Next section: `First(Filter(Global.Sections, Step > Global.CurrentStep)).Step`
- Previous section: `Last(Filter(Global.Sections, Step < Global.CurrentStep)).Step`

Both return blank when there is no next or previous section. That is how the hub knows it is finished.

## Step 3: Build Initialize JD Update

This topic runs once per update. It checks that a job is selected, sets up every global variable, loads the job description, explains the review, collects reasons and sections, and hands off to the hub.

### 3.1 Trigger and description

1. Open your existing initialize topic (or create a new topic) and name it **Initialize JD Update**.
2. Set the trigger to **The agent chooses**.
3. Description:

> Starts a guided update of a job description. Use only after the user has picked a specific job from the job search results and says they want to update, revise, change or edit its job description. Do not use to resume an update that is already in progress.

### 3.2 Inputs

Open **Details → Inputs** and add two inputs. For both, let the agent fill them automatically and turn off prompting the user.

| Input | Type | Description |
| --- | --- | --- |
| JobCode | String | The job code of the job the user selected, taken from the job search results. Never ask the user for it and never show it. |
| JobTitle | String | The title of the job the user selected, taken from the job search results. |

### 3.3 Nodes, in order

**Node 1 – Condition: no job selected.** Condition: `IsBlank(Topic.JobCode)`.

- True: **Message** "Which job would you like to update? Tell me the title and I'll find it." then **End current topic**.
- All other conditions: continue.

**Node 2 – Condition: update already in progress.** Condition: `Global.UpdateActive = true`.

- If `Global.JobCode = Topic.JobCode`: **Message** "You already have an update in progress for {Global.JobTitle}. Picking up where you left off." Then **Redirect** to Continue JD Update, then **End current topic**.
- If the job codes differ: **Redirect** to Switch JD Job, then **End current topic**.
- All other conditions: continue.

**Node 3 – Setup.** Add one **Set a variable value** node per line. Use the formula (fx) editor for each value.

| Variable | Value |
| --- | --- |
| Global.JobCode | `Topic.JobCode` |
| Global.JobTitle | `Topic.JobTitle` |
| Global.RequestId | `GUID()` |
| Global.UpdateActive | `false` |
| Global.ReturnToSummary | `false` |
| Global.CurrentStep | `0` |
| Global.UpdateReasons | `""` |
| Global.AllSections | the Table formula below |
| Global.Sections | `Filter(Global.AllSections, false)` |
| Global.ChangeLog | the empty-table formula below |

If `GUID()` is not accepted, use `System.Conversation.Id & "-" & Text(Now(), "yyyymmddhhmmss")`.

Global.AllSections:

```
Table(
  {Step: 1, Name: "Purpose", Label: "Purpose"},
  {Step: 2, Name: "Duties", Label: "Principal Duties and Responsibilities"},
  {Step: 3, Name: "Education", Label: "Education Requirements"},
  {Step: 4, Name: "KSA", Label: "Knowledge, Skills and Abilities"},
  {Step: 5, Name: "Certifications", Label: "Certifications/Licenses"}
)
```

Global.ChangeLog (an empty table that already has its columns, so later formulas know its shape):

```
Filter(
  Table({Section: "", Label: "", Step: 0, Original: "", Proposed: "",
         Comments: "", Flags: "", Justification: ""}),
  false
)
```

**Node 4 – Load the job description.** Add **Add a tool → Get JD Details** and pass `Global.JobCode`. Then store the results in one record keyed by the section keys, so section topics can read `Global.JD.Duties` and so on:

```
{
  Purpose: Topic.Purpose,
  Duties: Topic.PrincipalDuties,
  Education: Topic.EducationRequirements,
  KSA: Topic.KSA,
  Certifications: Topic.CertificationsLicenses
}
```

Replace the right-hand names with the output names your flow actually returns. Then add a **Condition**: `IsBlank(Global.JD.Purpose) && IsBlank(Global.JD.Duties)`. If true, **Message** "I couldn't load that job description. Can you tell me the job title again?", set `Global.JobCode` to `Blank()`, and **End current topic**.

**Node 5 – Message: explain the review.** Keep this as its own node, before the card. When the user asks a side question at the card, only the card is shown again, not this message.

> Here's how the review works for **{Global.JobTitle}**:
>
> 1. Tell me why the job description is changing and which sections you want to review.
> 2. I'll walk you through each section one at a time. You can keep it as is or describe a change.
> 3. I'll comment on each change and flag anything HR may need to look at more closely, like FLSA, people management or licensing.
> 4. At the end you'll see all your requested changes and can revise or remove any before sending them to HR.
>
> You can ask me questions, go back to a section, or check your changes at any time.

**Node 6 – Ask with adaptive card.** Paste this JSON. Swap in the reasons you already use, but keep every value free of commas.

```json
{
  "type": "AdaptiveCard",
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "version": "1.5",
  "body": [
    { "type": "TextBlock", "text": "When you're ready, tell me about this update", "weight": "Bolder", "size": "Medium", "wrap": true },
    { "type": "TextBlock", "text": "Why is this job description changing? Select all that apply.", "wrap": true },
    { "type": "Input.ChoiceSet", "id": "reasons", "isMultiSelect": true, "style": "expanded",
      "isRequired": true, "errorMessage": "Pick at least one reason.",
      "choices": [
        { "title": "Duties or responsibilities changed", "value": "Duties changed" },
        { "title": "Scope or level of the role changed", "value": "Scope changed" },
        { "title": "Education or experience requirements changed", "value": "Requirements changed" },
        { "title": "Licensing or regulatory change", "value": "Regulatory change" },
        { "title": "Reorganization", "value": "Reorganization" },
        { "title": "Other", "value": "Other" }
      ] },
    { "type": "Input.Text", "id": "reasonOther", "placeholder": "Anything else HR should know? (optional)", "isMultiline": true },
    { "type": "TextBlock", "text": "Which sections do you want to review?", "wrap": true, "spacing": "Medium" },
    { "type": "Input.ChoiceSet", "id": "sections", "isMultiSelect": true, "style": "expanded",
      "isRequired": true, "errorMessage": "Pick at least one section.",
      "value": "Purpose,Duties,Education,KSA,Certifications",
      "choices": [
        { "title": "Purpose", "value": "Purpose" },
        { "title": "Principal Duties and Responsibilities", "value": "Duties" },
        { "title": "Education Requirements", "value": "Education" },
        { "title": "Knowledge, Skills and Abilities", "value": "KSA" },
        { "title": "Certifications/Licenses", "value": "Certifications" }
      ] }
  ],
  "actions": [
    { "type": "Action.Submit", "title": "Start review", "data": { "step": "init" } }
  ]
}
```

Then, on the card node:

1. Click **Edit schema** and confirm the outputs are `reasons`, `reasonOther`, `sections` and `step`, all strings. Save them to topic variables with the same names.
2. Open the node's **Properties** and find the interruption setting (**Question behavior → Interruptions**). Turn on **Allow switching to another topic**.

**Node 7 – Save the answers.** Add these Set a variable value nodes:

| Variable | Value |
| --- | --- |
| Global.UpdateReasons | `Topic.reasons & If(IsBlank(Topic.reasonOther), "", ". Notes: " & Topic.reasonOther)` |
| Global.Sections | `Filter(Global.AllSections, Name in Split(Topic.sections, ","))` |
| Global.CurrentStep | `First(Global.Sections).Step` |
| Global.UpdateActive | `true` |

**Node 8 – Message.** "Let's start with {First(Global.Sections).Label}." (insert it as a formula).

**Node 9 – Redirect** to Continue JD Update. Leave the TargetSection input empty. Nothing comes after it.

### 3.4 Why the card shows again after a side question

With interruptions allowed, this is what happens when the user types a question while the card is waiting:

1. The orchestrator answers the question, either from knowledge or by running another topic.
2. When that answer finishes, Initialize JD Update resumes at the node it was paused on, the card.
3. The card is posted again, below the answer.

That re-post is the "stay on the same step" behavior you want. It is not a bug. Nodes 5 and 6 are split, and the card heading reads "When you're ready…", so the second copy reads naturally rather than like a repeat. Without **Allow switching**, the typed question is treated as an invalid card answer, and the user gets stuck.

The first copy of the card stays in the chat and can still be clicked. Either copy submits to the same waiting node, so both work.

## Step 4: Build the hub, Continue JD Update

The hub is the only topic that decides where the user goes next. It applies any navigation request, opens the section for `Global.CurrentStep`, and advances when that section ends. It then loops until every section is done, and finishes by opening the summary.

### 4.1 Trigger and description

1. Create a topic named **Continue JD Update**.
2. Trigger: **The agent chooses**.
3. Description:

> Continues the job description update that is already in progress. Use when the user wants to continue, resume, pick up where they left off, go back, go to the previous section, skip a section, move on, or jump to a specific section such as purpose, duties, education, KSAs or certifications. Do not use to start a new update.

### 4.2 Input

Add one input under **Details → Inputs**:

- Name: **TargetSection**
- Type: the **JD Section** entity from Step 1.4. (If your version only offers basic types for inputs, use String and list the allowed values in the description.)
- Let the agent fill it automatically; do not prompt the user.
- Description: "The section the user wants to go to: Purpose, Duties, Education, KSA or Certifications. Use Previous for going back, Next for skipping, Summary for reviewing changes. Leave empty when the user just wants to continue."

### 4.3 Nodes, in order

**Node 1 – Condition: no update in progress.** Condition: `Global.UpdateActive <> true`.

- True: **Message** "There's no update in progress right now. Which job would you like to update?" then **End current topic**.

**Node 2 – Set Topic.Target.** Create a string topic variable `Topic.Target` = `Text(Topic.TargetSection)`. This turns the entity value into plain text for the formulas below. If you used a String input, set it to `Topic.TargetSection` directly.

**Node 3 – Condition: apply the navigation request.** Add a Condition node with these branches:

| Branch condition | Nodes inside the branch |
| --- | --- |
| `Topic.Target = "Previous"` | Set `Global.CurrentStep` = `Coalesce(Last(Filter(Global.Sections, Step < Global.CurrentStep)).Step, First(Global.Sections).Step)`. Set `Global.ReturnToSummary` = `false`. |
| `Topic.Target = "Next"` | Set `Global.CurrentStep` = `Coalesce(First(Filter(Global.Sections, Step > Global.CurrentStep)).Step, 99)` |
| `Topic.Target = "Summary"` | **Redirect** to Review JD Changes, then **End current topic** |
| `!IsBlank(LookUp(Global.AllSections, Name = Topic.Target))` | Set `Global.Sections` = `Filter(Global.AllSections, Name in Global.Sections.Name Or Name = Topic.Target)`. Set `Global.CurrentStep` = `LookUp(Global.AllSections, Name = Topic.Target).Step` |
| All other conditions | Leave empty (the user just wants to continue) |

The fourth branch also adds the section to the user's list if they skipped it on the card. That makes "actually, let's do certifications too" work.

**Node 4 – Set Topic.SectionName** (rename this node **Dispatch**; the loop returns here). Value: `LookUp(Global.Sections, Step = Global.CurrentStep).Name`.

**Node 5 – Condition: all sections done.** Condition: `IsBlank(Topic.SectionName)`.

- True: Set `Global.CurrentStep` = `99`, **Redirect** to Review JD Changes, then **End current topic**.

**Node 6 – Condition: open the section.** One branch per section. Each branch holds a single **Redirect** node.

| Branch condition | Redirect to |
| --- | --- |
| `Topic.SectionName = "Purpose"` | JD Section – Purpose |
| `Topic.SectionName = "Duties"` | JD Section – Duties |
| `Topic.SectionName = "Education"` | JD Section – Education |
| `Topic.SectionName = "KSA"` | JD Section – KSA |
| `Topic.SectionName = "Certifications"` | JD Section – Certifications |

Create the section topics in Step 5 first if the Redirect picker cannot find them yet, then come back and fill these in.

**Node 7 – Condition: advance** (runs after any section topic ends, because Condition branches rejoin below the Condition node).

- `Global.ReturnToSummary = true`: Set `Global.ReturnToSummary` = `false` and Set `Global.CurrentStep` = `99`.
- All other conditions: Set `Global.CurrentStep` = `Coalesce(First(Filter(Global.Sections, Step > Global.CurrentStep)).Step, 99)`.

**Node 8 – Go to step → Dispatch.** Find it under **Topic management → Go to step**, then pick Node 4. If your version has no Go to step node, use **Redirect → Continue JD Update** instead. That also works, but it stacks another copy of the hub each time.

### 4.4 How the hub handles the cases you asked about

- **Side question mid-section.** The section topic pauses on its question, the orchestrator answers, and the section asks again. The hub never runs, and nothing changes.
- **"Go back."** The orchestrator starts a new copy of the hub with TargetSection = Previous. Node 3 moves CurrentStep back and Node 6 opens that section. The paused section underneath is cleared when the update ends (Step 7).
- **"Let's do duties."** The same path, with TargetSection = Duties.
- **"Skip this."** TargetSection = Next. The current section is left as it is today.

## Step 5: Build the prompt and the section topics

Build one prompt that every section shares. Then build one section topic, test it end to end, and copy it for the other four sections.

### 5.1 Create the JD Section Reviewer prompt

1. In any topic, choose **Add a tool → New prompt** (this is the prompt builder that replaced AI Builder prompts). You can also create it from the **Tools** page.
2. Name it **JD Section Reviewer**.
3. Add six text inputs: `SectionName`, `JobTitle`, `CurrentText`, `RequestedChange`, `UpdateReasons`, `PreviousProposal`. Give each a realistic sample value so you can test.
4. Paste the instructions below. Replace each `{Name}` with the matching input using the input picker.
5. Paste your FLSA, people management, Relationship Manager, Sales/Non-Sales, NMLS and Job Architecture criteria where marked.
6. Set the output format to **JSON**. Run a test, then save.

```
You are an HR job description reviewer at City National. A manager is proposing an update to one section of a job description. HR makes the final decision; your job is to help the manager write a clear request.

Job title: {JobTitle}
Section: {SectionName}
Current text: {CurrentText}
Manager's requested change: {RequestedChange}
Reasons for the update: {UpdateReasons}
Earlier proposal to build on (may be empty): {PreviousProposal}

Do the following:
1. Write the proposed section text that applies the manager's change. If an earlier proposal is given, start from it. Keep the style, tense and format of the current text. For lists, put one item per line starting with "- ". Do not add duties, requirements or credentials the manager did not ask for.
2. Write 2 to 4 short comments for the manager: whether the change is clear, anything vague HR is likely to ask about, and wording suggestions.
3. Check the change against the criteria below. List a criterion only when the change plausibly affects it.
   Criteria: FLSA classification, People Management, Relationship Manager, Sales/Non-Sales, NMLS Required, Job Architecture.
   [PASTE THE QUALIFICATION CRITERIA FROM YOUR DOCUMENT HERE]

Never mention grade, salary, pay type, status or job code.

Return only JSON in exactly this shape:
{
  "proposedText": "the full proposed section text",
  "comments": "your comments as short bullet lines",
  "flags": "comma-separated criteria names, or None",
  "flagReason": "one sentence per flagged criterion, or an empty string"
}
```

### 5.2 Create the first section topic: JD Section – Purpose

1. Create a topic named **JD Section – Purpose**.
2. Click the trigger, choose **Change trigger**, and pick **It's redirected to**. The orchestrator can now never open this topic on its own; only the hub can.
3. Build the nodes below.

**Node 1 – Section settings.** These are the only values that change when you copy the topic. Use Set a variable value nodes:

| Topic variable | Value |
| --- | --- |
| Topic.SectionName | `"Purpose"` |
| Topic.Label | `"Purpose"` |
| Topic.CurrentText | `Global.JD.Purpose` |
| Topic.StartedFor | `Global.RequestId` |
| Topic.PreviousProposal | `LookUp(Global.ChangeLog, Section = Topic.SectionName).Proposed` |
| Topic.Justification | `""` |

**Node 2 – Message: show the section.** Insert these as formulas:

> **{Topic.Label}** (section {CountRows(Filter(Global.Sections, Step <= Global.CurrentStep))} of {CountRows(Global.Sections)})
>
> Current text: {Topic.CurrentText}

Then add a **Condition** `!IsBlank(Topic.PreviousProposal)`. If true, add a **Message**: "You've already proposed this change: {Topic.PreviousProposal}. Choosing Keep will remove it."

**Node 3 – Question: keep or revise.** Multiple choice options: **Keep as is**, **Revise**. Save the answer to `Topic.Decision`. In the node's **Properties**, confirm **Allow switching to another topic** is on.

**Node 4 – Condition on Topic.Decision.**

- **Keep as is:** Set `Global.ChangeLog` = `Filter(Global.ChangeLog, Section <> Topic.SectionName)`. Then **Message** "Keeping {Topic.Label} as is." Then **End current topic**.
- **Revise:** continue to Node 5.

**Node 5 – Question: what should change** (rename the node **Ask change**; the rework loop returns here). Text: "What should change? You can paste new wording or describe the change in your own words." Identify: **User's entire response**. Save to `Topic.RequestedChange`.

**Node 6 – Tool: JD Section Reviewer.** Map the inputs:

| Prompt input | Value |
| --- | --- |
| SectionName | `Topic.Label` |
| JobTitle | `Global.JobTitle` |
| CurrentText | `Topic.CurrentText` |
| RequestedChange | `Topic.RequestedChange` |
| UpdateReasons | `Global.UpdateReasons` |
| PreviousProposal | `Topic.PreviousProposal` |

Save the output to `Topic.Review`. It is a record with `proposedText`, `comments`, `flags` and `flagReason`.

**Node 7 – Message: show the review.**

> Here's my take: {Topic.Review.comments}
>
> **Proposed {Topic.Label}:** {Topic.Review.proposedText}

**Node 8 – Condition: flagged?** Condition: `!IsBlank(Topic.Review.flags) && Topic.Review.flags <> "None"`.

- True:
  1. **Message** "Heads up: this change may affect **{Topic.Review.flags}**. {Topic.Review.flagReason} HR will take a closer look."
  2. **Question** "Would you like to add a short justification for HR?" with options **Add justification** and **Send anyway**.
  3. If **Add justification**: **Question** "What should HR know?" (User's entire response), saved to `Topic.Justification`.

**Node 9 – Question: confirm** (rename **Confirm**). Text: "What would you like to do with this change?" Options: **Accept**, **Rework it**, **Discard**. Save to `Topic.Confirm`.

**Node 10 – Condition on Topic.Confirm.**

- **Rework it:** Set `Topic.PreviousProposal` = `Topic.Review.proposedText`, then **Go to step → Ask change**.
- **Discard:** Set `Global.ChangeLog` = `Filter(Global.ChangeLog, Section <> Topic.SectionName)`. Then **Message** "Discarded. {Topic.Label} stays as it is today." Then **End current topic**.
- **Accept:**
  1. **Condition** `Topic.StartedFor <> Global.RequestId`. If true, **End current topic** without saving. This means the user switched jobs while this topic was paused.
  2. Set `Global.ChangeLog` with the upsert formula in Step 6.1.
  3. **Message** "Saved your change to {Topic.Label}."
  4. **End current topic**. The hub advances to the next section.

### 5.3 Test the first section before copying

In the test pane, start an update, pick only Purpose, and revise it. Check three things: the prompt output appears, the flags branch runs, and you land in the summary. Once that works, copy the topic.

### 5.4 Copy it for the other four sections

1. Open JD Section – Purpose, open the **…** menu, and choose **Open code editor**. Copy all of the YAML.
2. Create a new topic, open its code editor, paste, and save.
3. Rename it (for example **JD Section – Duties**) and confirm the trigger is still **It's redirected to**.
4. Edit only Node 1: SectionName `"Duties"`, Label `"Principal Duties and Responsibilities"`, CurrentText `Global.JD.Duties`.
5. Repeat for Education, KSA and Certifications, then fill in the Redirects in the hub's Node 6.

All five topics are identical apart from Node 1. You could build one **JD Section Review** topic that takes SectionName as an input instead. That is less upkeep, but it goes against the one-topic-per-section plan you were given. Split out a separate topic only when a section needs different handling, for example duties as a numbered list.

## Step 6: Record changes in the change log

Keep changes in `Global.ChangeLog` while the user reviews, because it is instant and every topic can read it. Write them to SharePoint once, at submit. For a section, "upsert" means removing any earlier row for that section and adding the new one, so a section never appears twice.

### 6.1 The upsert formula (section topics, Accept branch)

Set `Global.ChangeLog` to:

```
Table(
  Filter(Global.ChangeLog, Section <> Topic.SectionName),
  {
    Section: Topic.SectionName,
    Label: Topic.Label,
    Step: Global.CurrentStep,
    Original: Topic.CurrentText,
    Proposed: Topic.Review.proposedText,
    Comments: Topic.Review.comments,
    Flags: Topic.Review.flags,
    Justification: Topic.Justification
  }
)
```

`Filter(...)` drops the old row for this section, and `Table(...)` combines what is left with the new record. The field names and types must match the empty table you created in Step 3, Node 3. If the formula editor rejects it, the most common cause is a type mismatch. For example, `Step` must be a number, and every other field must be text.

### 6.2 Removing a change

Used by Keep as is, Discard, and Remove in the summary:

```
Filter(Global.ChangeLog, Section <> Topic.SectionName)
```

### 6.3 Writing to SharePoint at submit

The update ends at storing the manager's changes, and the HR report is a separate flow. So the submit flow only needs to save rows.

1. Create a SharePoint list **JD Update Requests** with columns: RequestId, JobCode, JobTitle, UpdateReasons, Section, Original (multiple lines), Proposed (multiple lines), Comments (multiple lines), Flags, Justification (multiple lines), Status (choice: Submitted, Withdrawn), SubmittedBy.
2. Create an agent flow **Submit JD Update Request** with text inputs `RequestId`, `JobCode`, `JobTitle`, `UpdateReasons` and `ChangesJson`.
3. In the flow, add **Parse JSON** on `ChangesJson`. Use a sample from a test run to generate the schema.
4. Add **Apply to each** over the parsed array. Inside it, add **Create item** in JD Update Requests, with Status = Submitted.
5. Add **Respond to the agent** with a text output `Result` = "OK".
6. In the topic, pass `JSON(Global.ChangeLog)` as ChangesJson.

### 6.4 Optional: save after every section

A long review can run past the conversation's inactivity timeout, and then the in-memory log is lost. If managers tend to step away mid-review, save each accepted section as you go:

- Create a flow **Save JD Section Change** that looks up the item by RequestId and Section. It updates the item if one exists and creates one if not, with Status = Draft.
- Call it in the Accept branch, right after the upsert.
- At submit, have the flow change this request's Draft rows to Submitted instead of creating them.

Start with 6.3 alone. Add this only if timeouts turn out to be a real problem.

## Step 7: Build Review JD Changes

One topic serves both as the mid-process "show my changes" view and as the end-of-review summary. It lists only the requested changes, never a fully rewritten job description. The user can then submit, revise a section, remove a change, or go back to where they were.

### 7.1 Trigger and description

1. Create a topic named **Review JD Changes**.
2. Trigger: **The agent chooses** (the hub also redirects here).
3. Description:

> Shows the changes the user has requested so far in the job description update in progress. It lets them revise a section, remove a change, keep reviewing, or submit to HR. Use when the user asks what they have changed, wants to see a summary, wants to undo or remove a change, or is ready to submit or send the update to HR.

### 7.2 Nodes, in order

**Node 1 – Condition: no update in progress.** Condition: `Global.UpdateActive <> true`. If true: **Message** "There's no update in progress right now." then **End current topic**.

**Node 2 – Message: the change list** (rename **Show changes**). Insert this as one formula:

```
"**Requested changes for " & Global.JobTitle & "**" & Char(10) & Char(10) &
If(
  CountRows(Global.ChangeLog) = 0,
  "No changes requested yet.",
  Concat(
    Sort(Global.ChangeLog, Step),
    "**" & Label & "**" & Char(10) & Proposed &
    If(IsBlank(Flags) Or Flags = "None", "", Char(10) & "_May affect: " & Flags & "_") &
    If(IsBlank(Justification), "", Char(10) & "_Justification: " & Justification & "_"),
    Char(10) & Char(10)
  )
) &
If(
  Global.CurrentStep <> 99,
  Char(10) & Char(10) & "Still to review: " &
    Concat(Filter(Global.Sections, Step >= Global.CurrentStep), Label, ", "),
  ""
)
```

**Node 3 – Ask with adaptive card** (rename **Summary card**). In the card editor, switch from JSON to **Formula**, so the card can use variables. Paste:

```
{
  type: "AdaptiveCard",
  '$schema': "http://adaptivecards.io/schemas/adaptive-card.json",
  version: "1.5",
  body: [
    { type: "TextBlock", text: "What would you like to do next?", weight: "Bolder", wrap: true },
    { type: "Input.ChoiceSet", id: "section", placeholder: "Choose a section (for revise or remove)",
      choices: ForAll(Global.AllSections, { title: ThisRecord.Label, value: ThisRecord.Name }) }
  ],
  actions: [
    { type: "Action.Submit", title: "Submit to HR", data: { action: "submit", req: Global.RequestId } },
    { type: "Action.Submit", title: "Revise selected section", data: { action: "revise", req: Global.RequestId } },
    { type: "Action.Submit", title: "Remove selected change", data: { action: "remove", req: Global.RequestId } },
    { type: "Action.Submit", title: "Keep reviewing", data: { action: "continue", req: Global.RequestId } }
  ]
}
```

Then:

1. Click **Edit schema** and confirm the outputs `action`, `req` and `section` (all strings). Save them to topic variables with the same names.
2. In **Properties**, turn on **Allow switching to another topic**.

The section list covers all five sections, so users can revise one they originally kept.

**Node 4 – Condition: card from an earlier update.** Condition: `Topic.req <> Global.RequestId`. If true: **Message** "That card is from an earlier update. Here's your current list." then **Go to step → Show changes**.

**Node 5 – Condition on Topic.action.** Four branches:

**Branch: `Topic.action = "submit"`**

1. **Condition** `CountRows(Global.ChangeLog) = 0`. If true: **Message** "There aren't any changes to send yet. Pick a section to revise, or keep reviewing." then **Go to step → Summary card**.
2. **Condition** `Global.CurrentStep <> 99`. If true: **Question** (Boolean) "You still have sections you haven't reviewed. Send what you have to HR anyway?" If No: **Go to step → Summary card**.
3. **Add a tool → Submit JD Update Request** with RequestId = `Global.RequestId`, JobCode = `Global.JobCode`, JobTitle = `Global.JobTitle`, UpdateReasons = `Global.UpdateReasons`, ChangesJson = `JSON(Global.ChangeLog)`.
4. **Message** "Done. Your requested changes for {Global.JobTitle} are saved for HR review."
5. Reset the update (same Set nodes as Step 8, Node 2).
6. **End all topics**. This is what clears any paused section topics left under the hub. Without it, an old question can pop back up later.

**Branch: `Topic.action = "revise"`**

1. **Condition** `IsBlank(Topic.section)`. If true: **Message** "Pick a section first." then **Go to step → Summary card**.
2. Set `Global.Sections` = `Filter(Global.AllSections, Name in Global.Sections.Name Or Name = Topic.section)`.
3. Set `Global.CurrentStep` = `LookUp(Global.AllSections, Name = Topic.section).Step`.
4. Set `Global.ReturnToSummary` = `true`.
5. **Redirect** to Continue JD Update (TargetSection empty), then **End current topic**. The hub opens that one section and comes straight back here afterwards.

**Branch: `Topic.action = "remove"`**

1. **Condition** `IsBlank(LookUp(Global.ChangeLog, Section = Topic.section))`. If true: **Message** "There's no change to remove for that section." then **Go to step → Summary card**.
2. Set `Global.ChangeLog` = `Filter(Global.ChangeLog, Section <> Topic.section)`.
3. **Message** "Removed that change."
4. **Go to step → Show changes**.

**Branch: `Topic.action = "continue"`**

1. **Condition** `Global.CurrentStep = 99`. If true: **Message** "You've been through every section. Send your changes to HR, or pick a section to revise." then **Go to step → Summary card**.
2. Otherwise: **Message** "Picking up where you left off." Then **Redirect** to Continue JD Update, then **End current topic**.

## Step 8: Build Switch JD Job

This topic lets a user change which job they are updating at any point. It warns them before throwing away unsent changes, resets the state, and clears paused topics, so nothing from the old job resurfaces.

### 8.1 Trigger and description

1. Create a topic named **Switch JD Job**.
2. Trigger: **The agent chooses**.
3. Description:

> Use when the user wants to update a different job than the one they are working on, pick another job, change the job title or position they are updating, or start over with a different job. Do not use when the user only wants to look at or compare another job's description without switching.

The last sentence matters. It keeps "what does the Senior Analyst JD say about education?" as a side question that leaves the update in place.

### 8.2 Input

- Name: **NewJob** (String). Let the agent fill it; do not prompt.
- Description: "The title of the job the user wants to switch to, if they said one."

### 8.3 Nodes, in order

**Node 1 – Condition: unsent changes.** Condition: `Global.UpdateActive = true && CountRows(Global.ChangeLog) > 0`.

- True: **Question** (Boolean): "You have {CountRows(Global.ChangeLog)} requested change(s) for {Global.JobTitle} that haven't been sent. Switching jobs will discard them. Switch anyway?"
  - No: **Message** "Okay, we'll keep working on {Global.JobTitle}." Then **Redirect** to Continue JD Update, then **End current topic**.
  - Yes: continue.

**Node 2 – Reset the update.** Set a variable value nodes (reuse this block in the submit branch of Step 7):

| Variable | Value |
| --- | --- |
| Global.UpdateActive | `false` |
| Global.ChangeLog | `Filter(Global.ChangeLog, false)` |
| Global.Sections | `Filter(Global.AllSections, false)` |
| Global.CurrentStep | `0` |
| Global.ReturnToSummary | `false` |
| Global.UpdateReasons | `""` |
| Global.RequestId | `Blank()` |
| Global.JobCode | `Blank()` |
| Global.JobTitle | `Blank()` |
| Global.JD | `Blank()` |

`Filter(..., false)` empties a table but keeps its columns, so later formulas still work.

**Node 3 – Message.** Use a Condition on `IsBlank(Topic.NewJob)`:

- Blank: "Okay, I've cleared that update. Which job would you like to update instead?"
- Not blank: "Okay, I've cleared that update. Let's find {Topic.NewJob}. Just confirm by saying "update {Topic.NewJob}"."

**Node 4 – End all topics.** This must be the last node. It removes the old section topic that was paused underneath. Otherwise, as soon as this topic finished, the old section's question would be asked again for the old job.

### 8.4 Optional: one-step switch

The user's next message goes to the orchestrator, which runs your job search tool and then Initialize JD Update as normal. If you want to skip the extra confirmation when NewJob is filled, call your job search tool as a node between Node 3 and Node 4 with `Topic.NewJob`. Show the matches in a message, then end. The user's pick then goes to the orchestrator.

In testing, also check whether the orchestrator continues to the search on its own after this topic ends. If it does, you can drop the confirmation wording.

## Step 9: Agent instructions and descriptions

The orchestrator decides which topic runs based on the agent instructions and each topic's description. These two things decide whether a side question stays a side question.

### 9.1 Add to the agent instructions

Open **Overview → Instructions** and add this block. Keep anything you already have for the General and Create features.

```
Job description updates
- Updating a job description is a guided review. First find the job with the job search tool. When the user picks a job and wants to update it, use Initialize JD Update with that job's code and title.
- While an update is in progress, never start a new update. To continue, go back, skip or jump to a section, use Continue JD Update. To see, remove or submit changes, use Review JD Changes. To update a different job, use Switch JD Job.
- If the user asks a question during an update, answer it briefly and do not restart or leave the update. The review picks up automatically after your answer.
- Looking at or comparing another job's description during an update is a side question. It is not a switch. Answer it without changing the job being updated.
- Never show job code, grade, status or salary/hourly.
- Never write out the full updated job description. Only summarize the requested changes.
```

### 9.2 Check the topic descriptions

Only these four topics should be visible to the orchestrator. Their descriptions are in Steps 3.1, 4.1, 7.1 and 8.1.

| Topic | Should fire on | Should NOT fire on |
| --- | --- | --- |
| Initialize JD Update | "I want to update the Loan Officer JD" after the job is found | "continue", "go back" |
| Continue JD Update | "continue", "go back", "skip this", "let's do duties" | "update a different job" |
| Review JD Changes | "what have I changed?", "I'm ready to submit", "remove my education change" | a question about what a section means |
| Switch JD Job | "I want to update a different job instead" | "what does the Senior Analyst JD say?" |

If a topic fires on the wrong phrases in testing, add the phrase to the other topic's description as a "Do not use when…" sentence. That usually works better than adding more "use when" phrases.

### 9.3 Check the five section topics are hidden

Open each JD Section topic and confirm the trigger reads **It's redirected to**. If one still says The agent chooses, the orchestrator may open it directly, before the hub has set CurrentStep.

## Step 10: Test script

Run each case in the test pane, starting from a fresh test conversation (use the refresh button between cases). Keep the activity map open so you can see which topic or tool the orchestrator picked at each turn. Tick each case off as it passes.

### Core path

- [ ] **Happy path.** Pick a job, start the update, choose two reasons and three sections. Keep one section and revise two, then submit. Expect: the three sections in job description order, "section 1 of 3" counters, and a summary listing two changes. The flow should create two SharePoint rows.
- [ ] **Flagged change.** In Duties, add "supervise two analysts." Expect: a People Management flag, the justification question, and the flag and justification in the summary.
- [ ] **Rework loop.** Revise, choose Rework it, and give a second instruction. Expect: the second proposal builds on the first.
- [ ] **Hidden fields.** Throughout, the user never sees job code, grade, status or salary/hourly.

### Breakaway questions

- [ ] **Question at the reasons card.** Type "what does FLSA mean?" Expect: an answer, then the card again. Submitting it proceeds normally.
- [ ] **Question mid-section.** At Keep or Revise, ask "what's the difference between a KSA and a duty?" Expect: an answer, then the same section's question again.
- [ ] **Compare another job.** Mid-section, ask "what does the Senior Analyst JD say for education?" Expect: an answer, the same section resumes, and the summary still shows the original job title.
- [ ] **Restart attempt.** Mid-update, say "I want to update the job description." Expect: "You already have an update in progress… picking up where you left off."

### Navigation

- [ ] **Go back.** In section 3, say "go back." Expect: section 2 opens and shows your earlier proposal.
- [ ] **Jump to an unselected section.** Say "let's do certifications too." Expect: Certifications opens, and the counter now counts it.
- [ ] **Skip.** Say "skip this one." Expect: the next section opens and the skipped one is unchanged.
- [ ] **Changes so far.** Mid-section, say "show my changes so far," then choose Keep reviewing. Expect: the same section again.

### Summary actions

- [ ] **Revise from summary.** At the end, revise one section. Expect: only that section, then straight back to the summary.
- [ ] **Remove.** Remove a change. Expect: it disappears from the list.
- [ ] **Early submit.** Submit before finishing every section. Expect: the "still have sections" warning.
- [ ] **Old card.** Scroll up and click an earlier copy of the summary card. Expect: it acts on the current list, or says the card is from an earlier update.

### Switching jobs

- [ ] **Switch, then decline.** With changes pending, say "I want to update a different job," then answer No. Expect: the update resumes.
- [ ] **Switch, then confirm.** Repeat and answer Yes. Expect: you're asked which job. After choosing it and starting a new update, the old job's section question never comes back.

## Troubleshooting

Most problems come from four things: a missing **Allow switching** setting, a section topic with the wrong trigger, a missing **End all topics** node, or a type mismatch in a table formula.

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| A typed question at a card or choice question gets "I didn't understand" or a re-prompt | Interruptions are off on that node | Properties → Allow switching to another topic |
| The orchestrator opens a section topic directly, with a blank job description | The section topic's trigger is The agent chooses | Change it to It's redirected to (Step 9.3) |
| "Continue" or "go back" restarts the update | Initialize's description is too broad, or Node 2 is missing | Add the "Do not use to resume" sentence and the UpdateActive check |
| Comparing another job switches the job | Switch JD Job's description is too broad | Keep its "Do not use when the user only wants to look at…" sentence |
| An old section question pops up after submit or switch | No End all topics at the end of submit or Switch JD Job | Add End all topics as the last node |
| The hub keeps opening the same section | Node 7 (advance) is skipped, or the section topic redirects instead of ending | Section topics must end with End current topic, never a Redirect back to the hub |
| Go back jumps to the wrong section | CurrentStep holds a position instead of a step number | Store the Step from Global.AllSections (Step 2.3) |
| Global.Sections is empty after the card | Card values contain spaces or commas, or differ in case from the keys | Use the exact keys from Step 1.3 as card values |
| The ChangeLog upsert formula errors | Field names or types differ from the empty table in Step 3 | Match every field and type; Step must be a number |
| The formula card will not save | Mixed record shapes in body are rejected in your version | Build the card in JSON with a static section list, and keep the Formula card only for the actions |
| Prompt output fields are blank | The prompt output format is text, not JSON | Set the output to JSON and re-map Node 6 |
| A global variable is blank in another topic | The variable was created with topic scope | Variable properties → Usage → Global |
| TargetSection is never filled | The input description or entity synonyms are too thin | Add synonyms to JD Section, and list the values in the input description |
