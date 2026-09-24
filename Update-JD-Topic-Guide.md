# Update Job Description Topic: Build Guide (Part 1: Job Selection)

This topic gets the job the user wants to update, resolves it to one Job Code with the **Search Job Description Searcher** tool (showing a dropdown when several jobs match), and then displays the current job description with **Get JD Details**.

---

## Before you build: control when the tool runs

Because the search flow is now an agent tool, the orchestrator could call it by itself when someone says "update the BSA Data Analyst JD." It would answer directly, skip your topic, and show no dropdown.

To prevent that, open the tool's settings and set its availability to **only when referenced by topics or agents**. The Update topic then decides when the search runs.

---

## Update Job Description topic, node by node

### 1. Trigger

- **Generative orchestration:** give the topic a clear description, such as *"Use when a user wants to update, edit, or change an existing job description."*
- **Classic orchestration:** add trigger phrases such as:
  - *I want to update a job description*
  - *Edit the BSA Data Analyst JD*
  - *Change the duties for a role*

### 2. Topic input (generative orchestration only)

Under **Details → Input**, add:

| Name | Type | Description |
|---|---|---|
| `JobTitleRequest` | String | *The job title or description of the job the user wants to update, such as "BSA Data Analyst". Leave blank if not mentioned.* |

Turn off **Should prompt user**, because step 3 handles a blank value.

With this input, "I want to update a BSA Data Analyst's job description" fills it with *BSA Data Analyst* automatically. With classic orchestration, skip this input and always ask in step 3.

### 3. Ask for the job if it wasn't given

Add a **Condition**: `Topic.JobTitleRequest` **is blank**

- **True:** add a **Question** node:
  - **Message:** *Which job description would you like to update? You can give the title or describe the role.*
  - **Identify:** User's entire response
  - **Save as:** `Topic.JobTitleRequest`
  - **Node name:** **Ask for job** (the retry path jumps back to this node)

### 4. Call the search tool

Add a node, choose **Add a tool**, and pick **Search Job Description Searcher**.

| Inputs | Value |
|---|---|
| `SearchText` | `Topic.JobTitleRequest` |
| `SearchMode` | `Auto` |

| Outputs | Save as |
|---|---|
| `status` | `Topic.SearchStatus` |
| `matchesJson` | `Topic.MatchesJson` |

### 5. Parse the matches

Add a **Parse value** node:

- **Parse value:** `Topic.MatchesJson`
- **Data type:** From sample data, using this sample:

```json
[{ "jobCode": "ABC123", "jobTitle": "Sample Title", "score": 0.85, "matchedTerms": "loan" }]
```

- **Save as:** `Topic.Matches`

### 6. Branch on the status

Add a **Condition** with three branches.

#### Branch: `single`

Add two **Set a variable value** nodes:

- `Topic.SelectedJobCode` = `First(Topic.Matches).jobCode`
- `Topic.SelectedJobTitle` = `First(Topic.Matches).jobTitle`

#### Branch: `multiple`

Add **Ask with adaptive card** and switch it to **Formula** mode:

```
{ type: "AdaptiveCard", version: "1.5",
  body: [
    { type: "TextBlock", text: "Which job description would you like to update?", wrap: true },
    { type: "Input.ChoiceSet", id: "selectedJobCode", style: "compact", isRequired: true,
      placeholder: "Select a job",
      choices: ForAll(Topic.Matches, { title: jobTitle, value: jobCode }) } ],
  actions: [{ type: "Action.Submit", title: "Select" }] }
```

- Map the card's output `selectedJobCode` to `Topic.SelectedJobCode`.
- Then set `Topic.SelectedJobTitle` = `LookUp(Topic.Matches, jobCode = Topic.SelectedJobCode).jobTitle`

#### Branch: All other conditions (`none`)

1. **Message:** *I couldn't find a match for that. Try the exact title, or describe a couple of the job's main duties.*
2. **Set a variable value:** clear `Topic.JobTitleRequest` (set it to blank).
3. **Go to step → Ask for job**

To cap retries, add a `Topic.SearchAttempts` counter: increase it by 1 in this branch, and after two failed attempts, show a message pointing the user to their HR Business Partner and end the topic.

### 7. Where the single and multiple branches meet

1. **Set a variable value:** `Global.SelectedJobCode` = `Topic.SelectedJobCode`, so later update steps can use it.
2. **Call Get JD Details** with Job Code = `Topic.SelectedJobCode`. Save its outputs to `Topic.JD_Purpose`, `Topic.JD_Duties`, `Topic.JD_KSA`, `Topic.JD_Education`, `Topic.JD_Experience`, `Topic.JD_Certs`, and the allowed flag fields.
3. **Message** node displaying the job description (insert each variable with the `{x}` button):

```
Here's the current job description for **{Topic.SelectedJobTitle}**:

**Purpose**
{Topic.JD_Purpose}

**Principal Duties and Responsibilities**
{Topic.JD_Duties}

**Knowledge, Skills and Abilities**
{Topic.JD_KSA}

**Education**
{Topic.JD_Education}

**Work Experience**
{Topic.JD_Experience}

**Certifications/Licenses**
{Topic.JD_Certs}

People manager: {Topic.JD_PeopleMgmt} · Sales: {Topic.JD_Sales} · NMLS required: {Topic.JD_NMLS}
```

For sections that may be empty, insert a formula instead of the plain variable, for example `If(IsBlank(Topic.JD_Certs), "None listed", Topic.JD_Certs)`.

4. For now, end the topic with a **Message**: *What would you like to change?* The change-collection steps will go here next.

---

## Test these before moving on

| User says | Expected |
|---|---|
| "I want to update a BSA Data Analyst's job description" | No question asked. Goes straight to the JD, or to a dropdown if several BSA roles match. |
| "I want to update a job description" | Asks which job first. |
| "Update the analyst JD" | Dropdown, then the chosen JD displays. |
| "Update the zzqx job" | Rephrase message, then asks again. |
| Any of the above | Job Code, Grade, Status, and Salary/Hourly never appear. |

---

## Reuse for the View feature

Steps 3–6 are generic "which job?" logic. When you build the View feature, you can move them into a shared topic with a `SelectedJobCode` output, and have both Update and View redirect to it.
