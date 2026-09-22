# Build Guide: "Create JD Change Request" Flow
**JD Expert Agent · Power Automate (agent flow) · Word template · SharePoint**
**Follow in order, top to bottom.**

---

## 0. What this flow does

When a user confirms "Submit" in the **Update or View Job Description** topic (Step 30), the agent calls this flow with the original JD and the edited draft. The flow:

1. Compares the original and draft **field by field** to find what actually changed
2. Fills a Word template: unchanged fields in normal text; changed fields **shaded**, with the previous wording shown in gray strikethrough underneath
3. Adds a summary table of every change at the top
4. Saves the document to the **JD Change Requests** library with tracking columns
5. Returns a request ID to the agent

It **does not send email**. A separate email flow, built later, will pick up new documents from the library (see Part 6).

### Why the flow compares the fields itself

The Apply JD Changes prompt already produced a change summary, but that's AI-generated text. The highlighting in the document comes from a deterministic comparison in the flow, so a field is only ever shaded if its text actually changed. Nothing can be highlighted by mistake.

### Build order

| Part | What | Why this order |
|---|---|---|
| 1 | Environment variables and connections | Everything else references them |
| 2 | JD Change Requests library | The flow saves here |
| 3 | Word template | The flow's Populate action reads the template's controls |
| 4 | The flow itself | Needs Parts 1–3 to exist |
| 5 | Testing | |
| 6 | Connecting the topic and the future email flow | |

---

## 1. Prerequisites and setup

### 1.1 Confirm you have

- [ ] Access to the **JD Expert Agent** solution in DEV
- [ ] The SharePoint site used for the Job Descriptions list
- [ ] Word desktop (the web version can't insert content controls)
- [ ] A **Word Online (Business)** connection. *Populate a Microsoft Word template* is a premium action; confirm with your Power Platform admin that premium connectors are available for agent flows in your environment.
- [ ] A saved **`JDJson`** sample from a Get JD Requester View run

### 1.2 Environment variables

In the solution, confirm or create:

| Name | Type | Value (DEV) |
|---|---|---|
| `env_JD_SiteUrl` | Text | The HR JD SharePoint site URL (should already exist) |
| `env_JD_RequestsLibrary` | Text | `JD Change Requests` |

### 1.3 Connection references

Confirm the solution has connection references for **SharePoint** and **Word Online (Business)**. Create the Word one if it's missing.

---

## 2. Create the JD Change Requests library

### 2.1 Create the library

1. On the HR JD SharePoint site: **+ New → Document library**
2. Name: **JD Change Requests**

### 2.2 Add the tracking columns

**Create each column with no spaces in the name** so the internal names stay clean (you can rename the display names afterward if you want spaces).

| Column name | Type | Notes |
|---|---|---|
| `RequestId` | Single line of text | |
| `JobCode` | Single line of text | Internal ID, HR-only |
| `JobTitle` | Single line of text | |
| `RequesterName` | Single line of text | |
| `RequesterEmail` | Single line of text | |
| `ChangedFields` | Multiple lines of text | Set to **plain text** |
| `ReviewFlags` | Multiple lines of text | Set to **plain text** |
| `RequestStatus` | Choice | Choices: `Created`, `Sent to HR`, `Approved`, `Rejected` · Default: `Created` |

These columns are the **handoff contract** for the future email flow. Don't rename them once the email flow exists.

### 2.3 Restrict access

**Library settings → Permissions for this document library → Stop inheriting permissions**, then limit access to HR. The library stores Job Code as metadata, which requesters shouldn't see.

### 2.4 Create a templates library (if you don't have one)

**+ New → Document library** → **JD Templates**. The Word template lives here.

---

## 3. Build the Word template

### 3.1 How the template works

Each JD field gets **three** plain-text content controls, stacked on top of each other under the field's label. The flow fills in only the ones that apply:

| Control | Formatting | Filled when |
|---|---|---|
| `Purpose` | Normal | The field did **not** change |
| `Purpose_New` | Yellow shading | The field **changed** (new wording) |
| `Purpose_Prev` | Gray strikethrough | The field **changed** (old wording, prefixed "Previously:") |

Empty controls are invisible in the finished document, so an unchanged field shows one normal line, and a changed field shows the shaded new text with the old text struck through beneath it.

The template contains **no Job Code, Grade, or Status**, since the document may be shared with the requester later.

### 3.2 Turn on the Developer tab

Word desktop: **File → Options → Customize Ribbon →** check **Developer** → OK.

### 3.3 Create the two styles

**Home → Styles pane → New Style** (the **A+** button at the bottom of the pane):

**Style 1**
- Name: `JD Changed`
- Style type: **Character**
- **Format → Border → Shading tab → Fill:** light yellow
- OK

**Style 2**
- Name: `JD Previous`
- Style type: **Character**
- **Format → Font:** gray font color, **Strikethrough** checked, size 1 pt smaller than body text
- OK

Shading is used instead of highlight because highlight can't be saved as part of a style.

### 3.4 Lay out the document

Type the static text first; you'll insert controls into it in Step 3.5.

1. **Header:** logo, and the title **Job Description — Change Request**
2. **Request details** (a 2-column table):

| Request ID | *(control)* |
|---|---|
| Requested by | *(control)* |
| Submitted on | *(control)* |

3. **Legend** (a line of normal text): *Shaded text = requested change. Struck-through gray text = previous wording.*
4. **Summary of changes** (a heading, then a 3-column table built in Step 3.6)
5. **Items for HR review** (heading + one control)
6. **Requester notes** (heading + one control)
7. **Job title** (heading + three controls)
8. **Designations** (a 2-column table, one row per designation; the right cell holds three controls):
   - Salary/Hourly
   - People Management
   - Sales/Non-Sales
   - Relationship Manager
   - NMLS Required
9. One section per long field (heading + three controls under each):
   - Purpose
   - Principal Duties and Responsibilities
   - Education Requirements
   - Work Experience Requirements
   - Knowledge, Skills and Abilities
   - Certifications/Licenses

### 3.5 Insert the content controls

For every control:
1. Place the cursor where it goes.
2. **Developer → Plain Text Content Control** (the **Aa** icon).
3. With the control selected: **Developer → Properties**:
   - **Title:** the exact name from the tables below
   - **Tag:** the same name
   - Check **Use a style to format text typed into the empty control**, then pick the style from the tables below (or leave unchecked for normal)
   - For multi-line fields, check **Allow carriage returns (multiple paragraphs)**
   - OK

**Header controls**

| Title and tag | Style | Allow carriage returns |
|---|---|---|
| `RequestId` | none | no |
| `RequesterName` | none | no |
| `SubmittedOn` | none | no |
| `ReviewFlags` | none | **yes** |
| `ChangeNotes` | none | **yes** |

**Field controls** — three per field, stacked in this order under each label:

| Field | Normal control | Changed control (JD Changed) | Previous control (JD Previous) | Allow carriage returns |
|---|---|---|---|---|
| Job title | `JobTitle` | `JobTitle_New` | `JobTitle_Prev` | no |
| Salary/Hourly | `PayType` | `PayType_New` | `PayType_Prev` | no |
| People Management | `PeopleManagement` | `PeopleManagement_New` | `PeopleManagement_Prev` | no |
| Sales/Non-Sales | `SalesDesignation` | `SalesDesignation_New` | `SalesDesignation_Prev` | no |
| Relationship Manager | `RelationshipManager` | `RelationshipManager_New` | `RelationshipManager_Prev` | no |
| NMLS Required | `NMLSRequired` | `NMLSRequired_New` | `NMLSRequired_Prev` | no |
| Purpose | `Purpose` | `Purpose_New` | `Purpose_Prev` | **yes** |
| Principal Duties | `PrincipalDuties` | `PrincipalDuties_New` | `PrincipalDuties_Prev` | **yes** |
| Education Requirements | `EducationRequirements` | `EducationRequirements_New` | `EducationRequirements_Prev` | **yes** |
| Work Experience | `WorkExperienceRequirements` | `WorkExperienceRequirements_New` | `WorkExperienceRequirements_Prev` | **yes** |
| KSAs | `KSAs` | `KSAs_New` | `KSAs_Prev` | **yes** |
| Certifications/Licenses | `CertificationsLicenses` | `CertificationsLicenses_New` | `CertificationsLicenses_Prev` | **yes** |

That's 36 field controls plus 5 header controls. **The names must match the JSON keys exactly**, including capitalization.

Tip: put each of a field's three controls in its own paragraph so a filled `_Prev` control appears on its own line below the `_New` one. For the designations table, put all three in the same cell, each on its own line.

### 3.6 Build the summary-of-changes table (repeating section)

1. Insert a **3-column table with 2 rows**.
2. Row 1 (header), normal text: **Field · Previous · Requested**
3. Row 2: insert a plain text control in each cell:

| Cell | Title and tag | Style | Allow carriage returns |
|---|---|---|---|
| 1 | `ChangeField` | none | no |
| 2 | `ChangeBefore` | JD Previous | **yes** |
| 3 | `ChangeAfter` | JD Changed | **yes** |

4. Select the **entire second row** (click in the left margin next to it).
5. **Developer → Repeating Section Content Control** (the icon with a **+** on a page).
6. **Properties:** Title and Tag = `ChangeSummary`.

The flow will create one row per changed field.

### 3.7 Clear the placeholder text

Empty controls normally show "Click or tap here to enter text." in the finished document. Remove it:

1. **Developer → Design Mode** (on)
2. Click inside each control and replace the placeholder text with a **single space**
3. **Design Mode** (off)

Do this for all 44 controls (5 header + 36 field + 3 in the summary row).

### 3.8 Save and upload

1. Save as **JD Change Request Template.docx** (Word Document, not .dotx or .docm).
2. Upload it to the **JD Templates** library.
3. **Quick check:** open it, type into a few controls, and confirm the shaded and struck-through styles apply automatically. Then close **without saving**, or re-upload a clean copy.

> **ALM note:** *Populate a Microsoft Word template* reads the template's controls when you select the file in the designer, so it needs a fixed file, not a dynamic path. Keep **one** template location that DEV, UAT, and QA flows all point to. If you ever change the template's controls, reselect the file in the action so it picks up the change.

---

## 4. Build the flow

### 4.1 Create the flow

1. Open the **JD Expert Agent** solution → **+ New → Automation → Cloud flow → Instant**.
2. Name: **Create JD Change Request**
3. Trigger: **When an agent calls the flow** (may appear as *Run a flow from Copilot* / *When Power Virtual Agents calls a flow*).

### 4.2 Add the trigger inputs

Add seven **Text** inputs, named exactly:

| Input | What it receives |
|---|---|
| `JobCode` | `Global.varJobCode` |
| `OriginalJDJson` | `Global.varOriginalJDJson` |
| `UpdatedJDJson` | `Global.varWorkingJDJson` |
| `ChangeNotes` | `Global.varChangeLogText` |
| `ReviewFlags` | `Global.varReviewFlagsText` |
| `RequesterName` | `System.User.DisplayName` |
| `RequesterEmail` | `System.User.Email` |

> **About input references:** the trigger stores inputs under generated names like `text`, `text_1`, `text_2`. **Always insert inputs using the dynamic content picker**, never by typing `triggerBody()?['...']` yourself. Where this guide writes `<UpdatedJDJson>`, it means "insert the UpdatedJDJson token."

### 4.3 Add the Try scope

1. **+ New step → Scope**, rename it **Try**.
2. Build Steps 4.4 through 4.14 **inside** the Try scope.

### 4.4 Compose `RequestId`

**Compose**, rename to `RequestId`:
```
concat('JDU-', formatDateTime(convertFromUtc(utcNow(), 'Pacific Standard Time'), 'yyyyMMdd-HHmmss'))
```
Produces IDs like `JDU-20260916-143015`.

### 4.5 Compose `Original` and `Updated`

**Compose**, rename to `Original`:
```
json(<OriginalJDJson>)
```

**Compose**, rename to `Updated`:
```
json(<UpdatedJDJson>)
```

This turns the text sent by the agent back into JSON objects the flow can read field by field.

### 4.6 Compose `FieldKeys`

**Compose**, rename to `FieldKeys`, and paste as the input:

```json
[
  { "key": "JobTitle", "label": "Job Title" },
  { "key": "PayType", "label": "Salary/Hourly" },
  { "key": "PeopleManagement", "label": "People Management" },
  { "key": "SalesDesignation", "label": "Sales/Non-Sales" },
  { "key": "RelationshipManager", "label": "Relationship Manager" },
  { "key": "NMLSRequired", "label": "NMLS Required" },
  { "key": "Purpose", "label": "Purpose" },
  { "key": "PrincipalDuties", "label": "Principal Duties and Responsibilities" },
  { "key": "EducationRequirements", "label": "Education Requirements" },
  { "key": "WorkExperienceRequirements", "label": "Work Experience Requirements" },
  { "key": "KSAs", "label": "Knowledge, Skills and Abilities" },
  { "key": "CertificationsLicenses", "label": "Certifications/Licenses" }
]
```

This list drives the comparison, in document order.

### 4.7 Select `AllFields`

**Select**, rename to `AllFields`:
- **From:** `outputs('FieldKeys')`
- **Map** (key/value mode):

| Key | Value |
|---|---|
| `ChangeField` | `item()?['label']` |
| `ChangeBefore` | `coalesce(string(outputs('Original')?[item()?['key']]), '')` |
| `ChangeAfter` | `coalesce(string(outputs('Updated')?[item()?['key']]), '')` |

This produces one row per field with its before and after values. The key names match the controls in the template's summary table.

### 4.8 Filter array `ChangedFields`

**Filter array**, rename to `ChangedFields`:
- **From:** `body('AllFields')`
- Click **Edit in advanced mode** and paste:
```
@not(equals(trim(item()?['ChangeBefore']), trim(item()?['ChangeAfter'])))
```

Only rows where the text actually differs are kept. `trim()` ignores stray spaces at the start or end.

### 4.9 Condition: any changes?

**Condition:** `length(body('ChangedFields'))` **is equal to** `0`

**True branch** (nothing actually changed):
1. **Respond to the agent** with the outputs in Step 4.15, set to:
   - `Success` = `false`
   - `RequestId` = *(blank)*
   - `ChangedFieldCount` = `0`
   - `Message` = `No differences found`
2. **Terminate** → Status: **Succeeded**

**False branch:** leave empty. Continue below the condition.

### 4.10 Select `ChangedLabels`

**Select**, rename to `ChangedLabels`:
- **From:** `body('ChangedFields')`
- Switch Map to **text mode** (the **T** icon) and enter: `item()?['ChangeField']`

Produces a simple list like `["Purpose", "People Management"]` for the library column.

### 4.11 Populate a Microsoft Word template

**Word Online (Business) → Populate a Microsoft Word template**
- **Location:** the HR JD SharePoint site
- **Document Library:** JD Templates
- **File:** JD Change Request Template.docx

After you select the file, the action lists every control. Fill them in:

**Header controls**

| Control | Value |
|---|---|
| `RequestId` | `outputs('RequestId')` |
| `RequesterName` | `<RequesterName>` token |
| `SubmittedOn` | `formatDateTime(convertFromUtc(utcNow(), 'Pacific Standard Time'), 'MMMM d, yyyy')` |
| `ReviewFlags` | `if(empty(trim(coalesce(<ReviewFlags>, ''))), 'None', <ReviewFlags>)` |
| `ChangeNotes` | `<ChangeNotes>` token |

**ChangeSummary (repeating section)**

Click the icon to **switch to input entire array**, then enter:
```
body('ChangedFields')
```

**Field controls — the pattern**

Each field uses the same three expressions with only the key changing. Here's the pattern for `Purpose`:

**`Purpose`** (normal, when unchanged):
```
if(equals(trim(coalesce(string(outputs('Original')?['Purpose']), '')), trim(coalesce(string(outputs('Updated')?['Purpose']), ''))), coalesce(string(outputs('Updated')?['Purpose']), ''), '')
```

**`Purpose_New`** (shaded, when changed):
```
if(equals(trim(coalesce(string(outputs('Original')?['Purpose']), '')), trim(coalesce(string(outputs('Updated')?['Purpose']), ''))), '', coalesce(string(outputs('Updated')?['Purpose']), '(removed)'))
```

**`Purpose_Prev`** (struck through, when changed):
```
if(equals(trim(coalesce(string(outputs('Original')?['Purpose']), '')), trim(coalesce(string(outputs('Updated')?['Purpose']), ''))), '', concat('Previously: ', coalesce(string(outputs('Original')?['Purpose']), '(blank)')))
```

**Repeat for all twelve fields.** Copy the three expressions into a text editor, find-and-replace `Purpose` with the next key, and paste. The keys:

`JobTitle` · `PayType` · `PeopleManagement` · `SalesDesignation` · `RelationshipManager` · `NMLSRequired` · `Purpose` · `PrincipalDuties` · `EducationRequirements` · `WorkExperienceRequirements` · `KSAs` · `CertificationsLicenses`

> **Find-and-replace caution:** replace only the key inside `['...']` and the control name. Don't replace across the whole document at once, or a key like `KSAs` could collide with other text.

### 4.12 Compose `FileName`

**Compose**, rename to `FileName`:
```
concat('JD Change Request - ', replace(replace(replace(replace(replace(replace(replace(replace(replace(string(outputs('Original')?['JobTitle']), '/', '-'), '\', '-'), ':', '-'), '*', ''), '?', ''), '"', ''), '<', ''), '>', ''), '|', '-'), ' - ', outputs('RequestId'), '.docx')
```

Removes characters SharePoint doesn't allow in file names (titles like "Salary/Hourly Analyst" would otherwise fail). Produces names like `JD Change Request - Payroll Specialist II - JDU-20260916-143015.docx`.

### 4.13 Create file

**SharePoint → Create file**
- **Site Address:** `env_JD_SiteUrl`
- **Folder Path:** `/` + `env_JD_RequestsLibrary` (or pick the JD Change Requests library)
- **File Name:** `outputs('FileName')`
- **File Content:** the **Success document** / body output from *Populate a Microsoft Word template*

### 4.14 Update file properties

**SharePoint → Update file properties**
- **Site Address:** `env_JD_SiteUrl`
- **Library Name:** `env_JD_RequestsLibrary`
- **Id:** the **ItemId** output from *Create file*

| Property | Value |
|---|---|
| RequestId | `outputs('RequestId')` |
| JobCode | `<JobCode>` token |
| JobTitle | `outputs('Original')?['JobTitle']` |
| RequesterName | `<RequesterName>` token |
| RequesterEmail | `<RequesterEmail>` token |
| ChangedFields | `join(body('ChangedLabels'), ', ')` |
| ReviewFlags | `<ReviewFlags>` token |
| RequestStatus | `Created` |

If the library columns don't appear, confirm the Library Name value resolves correctly, or temporarily select the library from the dropdown to load them.

### 4.15 Respond to the agent (success)

Still inside **Try**, after Step 4.14:

**Respond to the agent** with four outputs:

| Output | Type | Value |
|---|---|---|
| `Success` | Yes/No (Boolean) | `true` |
| `RequestId` | Text | `outputs('RequestId')` |
| `ChangedFieldCount` | Number | `length(body('ChangedFields'))` |
| `Message` | Text | `Created` |

### 4.16 Add the Catch scope

1. Below the Try scope (outside it), add **+ New step → Scope**, rename to **Catch**.
2. On the Catch scope: **... → Configure run after** → check **has failed** and **has timed out**, uncheck **is successful** → Done.
3. Inside Catch, add **Respond to the agent** with the **same four outputs**:

| Output | Value |
|---|---|
| `Success` | `false` |
| `RequestId` | *(blank)* |
| `ChangedFieldCount` | `0` |
| `Message` | `Request creation failed` |

> **Every Respond to the agent action in the flow must declare the same output names and types** (the one in Step 4.9, Step 4.15, and here). Copilot Studio rejects the flow if they differ.

Failures show up in the flow's run history for troubleshooting.

### 4.17 Save and turn on

Save the flow and make sure it's **turned on**. It must be in the JD Expert Agent solution for the topic to see it.

### Flow at a glance

```
When an agent calls the flow (7 inputs)
└─ Try
   ├─ Compose RequestId
   ├─ Compose Original
   ├─ Compose Updated
   ├─ Compose FieldKeys
   ├─ Select AllFields
   ├─ Filter array ChangedFields
   ├─ Condition: no changes?
   │   └─ True → Respond (Success=false) → Terminate
   ├─ Select ChangedLabels
   ├─ Populate a Microsoft Word template
   ├─ Compose FileName
   ├─ Create file
   ├─ Update file properties
   └─ Respond to the agent (Success=true)
└─ Catch (runs only if Try failed or timed out)
   └─ Respond to the agent (Success=false)
```

---

## 5. Test the flow

### 5.1 Test data

Agent-triggered flows can usually be tested with **Test → Manually**, which asks for each input. If your version won't let you, skip to 5.3 and test through the topic.

Use your real `JDJson` for **OriginalJDJson**, and a copy with two fields edited for **UpdatedJDJson**. Example:

**OriginalJDJson**
```json
{"JobTitle":"Payroll Specialist II","PayType":"Hourly","PeopleManagement":"No","SalesDesignation":"Non-Sales","RelationshipManager":"No","NMLSRequired":"No","Purpose":"Processes semi-monthly payroll for the bank.","PrincipalDuties":"Processes payroll\nReconciles payroll accounts","EducationRequirements":"High school diploma or equivalent","WorkExperienceRequirements":"2 years of payroll experience","KSAs":"Knowledge of payroll regulations","CertificationsLicenses":"None"}
```

**UpdatedJDJson** (Purpose and People Management changed)
```json
{"JobTitle":"Payroll Specialist II","PayType":"Hourly","PeopleManagement":"Yes","SalesDesignation":"Non-Sales","RelationshipManager":"No","NMLSRequired":"No","Purpose":"Processes semi-monthly and off-cycle payroll for the bank.","PrincipalDuties":"Processes payroll\nReconciles payroll accounts","EducationRequirements":"High school diploma or equivalent","WorkExperienceRequirements":"2 years of payroll experience","KSAs":"Knowledge of payroll regulations","CertificationsLicenses":"None"}
```

Other inputs: any job code, your name and email, `ChangeNotes` = `• Added off-cycle payroll to the purpose`, `ReviewFlags` = `• People management designation changed; HR should review.`

### 5.2 What to check

| Check | Expected |
|---|---|
| **ChangedFields** output in run history | Exactly 2 rows: Purpose and People Management |
| New file in JD Change Requests | Named `JD Change Request - Payroll Specialist II - JDU-….docx` |
| Summary table in the document | 2 rows, previous in gray strikethrough, requested shaded |
| Purpose and People Management sections | New text shaded, "Previously: …" struck through below |
| Every other section | One line of normal text, no shading, no "Previously" |
| No placeholder text | No "Click or tap here to enter text" anywhere |
| No HR-only data in the document | No Job Code, Grade, or Status |
| File properties | All filled; RequestStatus = Created |
| Respond output | Success = true, ChangedFieldCount = 2 |

### 5.3 Edge-case tests

| Test | Expected |
|---|---|
| Identical Original and Updated JSON | Success = false, Message = "No differences found", no file created |
| Updated has only a trailing space added to one field | Treated as no change |
| A job title containing `/` | File saves with `-` in the name |
| Malformed JSON in UpdatedJDJson (e.g., delete a `}`) | Catch runs, Success = false |
| A field with several lines of duties | Line breaks preserved in the document |

---

## 6. Connect it

### 6.1 In the Update or View Job Description topic (Step 30)

Replace the placeholder with **Call an action → Create JD Change Request**:

| Flow input | Topic value |
|---|---|
| `JobCode` | `Global.varJobCode` |
| `OriginalJDJson` | `Global.varOriginalJDJson` |
| `UpdatedJDJson` | `Global.varWorkingJDJson` |
| `ChangeNotes` | `Global.varChangeLogText` |
| `ReviewFlags` | `Global.varReviewFlagsText` |
| `RequesterName` | `System.User.DisplayName` |
| `RequesterEmail` | `System.User.Email` |

Outputs: `Success` → `Topic.varSubmitSuccess`, `RequestId` → `Topic.varRequestId`, `Message` → `Topic.varSubmitMessage`. `ChangedFieldCount` can be left unmapped or saved to `Topic.varChangedFieldCount`.

Then run an end-to-end test from the topic: find a job, apply two changes, say "that's all", submit, and check the library.

### 6.2 The future email flow (don't build yet)

When the email flow is built after the Create section, it should **not** modify this flow. Two ways to connect:

- **Recommended — library trigger:** the email flow starts on *SharePoint → When a file is created (properties only)* in JD Change Requests, reads the tracking columns, sends the document to HR, and sets `RequestStatus` to `Sent to HR`.
- **Alternative — child flow:** add *Run a Child Flow* in this flow between Steps 4.14 and 4.15.

The library columns from Step 2.2 are the contract between the two flows.

---

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Populate action doesn't list the controls | Controls aren't **Plain Text** content controls, have no Title, or the file is .dotx/.docm. Reselect the file after fixing |
| A control is missing from the action's list | Its Title or Tag is blank or misspelled |
| "Click or tap here to enter text" in the output | Placeholder not replaced with a space (Step 3.7) |
| Shading or strikethrough doesn't appear | The control's **Use a style** box isn't checked, or the style isn't a **Character** style |
| Summary table shows one blank row | ChangeSummary wasn't switched to **input entire array**, or the row controls' titles don't match `ChangeField` / `ChangeBefore` / `ChangeAfter` |
| Every field shows as changed | OriginalJDJson and UpdatedJDJson use different key names or casing; compare them in run history |
| `json()` fails in Compose Original/Updated | The input isn't valid JSON (often escaped or truncated); check the raw input in run history |
| Create file fails on the name | A character in the job title isn't handled in Step 4.12; add another `replace()` |
| Update file properties can't find the file | The **Id** must be the **ItemId** from Create file, not the file identifier/path |
| Copilot Studio rejects the flow | The three Respond actions don't have identical output names and types |
| Topic times out waiting | Agent flows must respond quickly (roughly 100 seconds); check which action is slow in run history |
| Works in DEV, fails after import | Template file location or Word connection reference not set in the target environment |

---

## Checklist

- [ ] Environment variables and connection references in place
- [ ] JD Change Requests library created with all eight columns, HR-only permissions
- [ ] Template: two styles, 44 controls with exact names, repeating section, placeholders cleared
- [ ] Template uploaded to JD Templates
- [ ] Flow built with Try / Catch and three identical Respond actions
- [ ] Section 5 tests pass
- [ ] Topic Step 30 wired to the flow and tested end to end
