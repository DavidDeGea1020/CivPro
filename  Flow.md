# Build Guide: "Create JD Change Request" Flow
**JD Expert Agent · Power Automate (agent flow) · Word template · SharePoint** · v2
**Follow in order, top to bottom.**

---

## 0. What this flow does

When a user confirms "Submit" in the **Update or View Job Description** topic (Step 30), the agent calls this flow with the original JD and the edited draft. The flow:

1. Compares the original and draft **field by field** to find what actually changed
2. Fills in **your existing JD template**:
   - Unchanged fields appear as normal text
   - Changed text fields appear **shaded**, with the previous wording in gray strikethrough underneath
   - In the bulleted sections (Principal Duties, KSAs), each bullet is marked individually: kept bullets stay normal, new or reworded bullets are **shaded**, and removed bullets appear in gray strikethrough
3. Saves the document to the **JD Change Requests** library
4. Stores the **change summary, requester notes, and HR review flags** in the library's columns, ready for the email (they are **not** in the document)
5. Returns a request ID to the agent

It **does not send email**. The separate email flow, built later, will read the library columns to build the email and attach the document (see Part 6).

### What goes where

| Content | Document | Library columns (→ future email) |
|---|---|---|
| The twelve JD fields, with changes highlighted | ✅ | |
| Summary table of changes (field, previous, requested) | | ✅ `ChangeSummaryHtml` |
| Requester notes (the running change log) | | ✅ `ChangeNotes` |
| Items for HR review | | ✅ `ReviewFlags` |
| Request ID, requester, date | (file name only) | ✅ |
| Job Code | | ✅ HR-only |

### Why the flow compares the fields itself

The Apply JD Changes prompt already wrote a change summary, but that's AI-generated text. The highlighting comes from a deterministic comparison in the flow, so a field or bullet is only marked if its text actually changed.

### Build order

| Part | What |
|---|---|
| 1 | Environment variables and connections |
| 2 | JD Change Requests library |
| 3 | Add content controls to your existing template |
| 4 | The flow |
| 5 | Testing |
| 6 | Connecting the topic and the future email flow |

---

## 1. Prerequisites and setup

### 1.1 Confirm you have

- [ ] Access to the **JD Expert Agent** solution in DEV
- [ ] Your existing **JD template** (.docx)
- [ ] Word **desktop** (Word for the web can't insert content controls)
- [ ] A **Word Online (Business)** connection. *Populate a Microsoft Word template* is a premium action; confirm with your Power Platform admin that premium connectors are available for agent flows in your environment.
- [ ] A saved **`JDJson`** sample from a Get JD Requester View run

### 1.2 Environment variables

| Name | Type | Value (DEV) |
|---|---|---|
| `env_JD_SiteUrl` | Text | The HR JD SharePoint site URL (should already exist) |
| `env_JD_RequestsLibrary` | Text | `JD Change Requests` |

### 1.3 Connection references

Confirm the solution has connection references for **SharePoint** and **Word Online (Business)**.

---

## 2. Create the JD Change Requests library

### 2.1 Create the library

On the HR JD SharePoint site: **+ New → Document library** → **JD Change Requests**

### 2.2 Add the columns

**Create each column with no spaces in the name** so internal names stay clean.

| Column name | Type | Holds |
|---|---|---|
| `RequestId` | Single line of text | e.g. `JDU-20260916-143015` |
| `JobCode` | Single line of text | HR-only internal ID |
| `JobTitle` | Single line of text | Original job title |
| `RequesterName` | Single line of text | |
| `RequesterEmail` | Single line of text | |
| `ChangedFields` | Multiple lines of text, **plain text** | e.g. `Purpose, People Management` |
| `ChangeSummaryHtml` | Multiple lines of text, **plain text** | Ready-made HTML table for the email body |
| `ChangeNotes` | Multiple lines of text, **plain text** | The requester's running change log |
| `ReviewFlags` | Multiple lines of text, **plain text** | Items for HR review |
| `RequestStatus` | Choice: `Created`, `Sent to HR`, `Approved`, `Rejected` · default `Created` | |

For the multi-line columns, make sure **Append changes to existing text** is **off**, and the type is **Plain text**, not rich text.

These columns are the **handoff contract** for the email flow. Don't rename them once it exists.

### 2.3 Restrict access

**Library settings → Permissions for this document library → Stop inheriting permissions**, then limit access to HR. The library stores Job Code.

### 2.4 Templates library

If your template isn't already in SharePoint, create a **JD Templates** document library for it.

---

## 3. Add content controls to your existing template

You're not building a new document. You're placing **content controls** into your existing template where the field values go. The flow fills those controls in.

**Work on a copy.** Save your template as **JD Change Request Template.docx** and leave the original untouched.

### 3.1 Two kinds of fields

| Fields | Approach |
|---|---|
| Job Title, Salary/Hourly, People Management, Sales/Non-Sales, Relationship Manager, NMLS Required, Purpose, Education Requirements, Work Experience Requirements, Certifications/Licenses | **Three controls** per field: normal, changed (shaded), previous (strikethrough). The whole field is marked when anything in it changes. |
| Principal Duties and Responsibilities, Knowledge Skills Abilities | **A repeating bulleted line** with three controls in it. The flow creates one bullet per line and marks each bullet individually. |

**Why bullets need special handling:** text poured into a single control with line breaks only gets a bullet on the first line. Everything after it becomes indented plain text. A repeating section creates a real new bulleted paragraph for every item, so your bullet formatting survives.

If Education Requirements or Certifications/Licenses are also bulleted in your template, use the bullet approach (3.6) for those too, and tell Eric so the flow gets the matching steps.

### 3.2 Check what the "box" is

Click the border of the Principal Duties box.

- **If it's a table cell** (the Table Design / Layout tabs appear): fine, continue.
- **If it's a text box or shape** (the Shape Format tab appears): convert it. Content controls inside text boxes are often **not detected** by the Populate action. Replace the text box with a **single-cell table** styled the same way (Insert → Table → 1×1, then match the borders and shading), and move the heading and bullets into it.

Do the same check for the KSAs box.

### 3.3 Turn on the Developer tab

**File → Options → Customize Ribbon →** check **Developer** → OK.

### 3.4 Create the two styles

**Home → Styles pane → New Style** (the **A+** button at the bottom of the pane):

**`JD Changed`**
- Style type: **Character**
- **Format → Border → Shading tab → Fill:** light yellow

**`JD Previous`**
- Style type: **Character**
- **Format → Font:** gray color, **Strikethrough** checked

Shading is used instead of highlight because highlight can't be saved as part of a style. Because these are *character* styles, they only affect the text inside the control. Your template's fonts and paragraph formatting stay as they are.

### 3.5 Text fields: three controls each

For each of the ten text fields:

1. Delete any sample or placeholder value currently in the template for that field.
2. Put the cursor where the value goes.
3. **Developer → Plain Text Content Control** (the **Aa** icon). This is the **normal** control.
4. Press **Enter**, insert a second control (the **changed** one), press **Enter**, insert a third (the **previous** one).
5. For each control: **Developer → Properties**:
   - **Title** and **Tag**: the exact name from the table below
   - **Use a style to format text typed into the empty control**: checked for `_New` (JD Changed) and `_Prev` (JD Previous); unchecked for the normal control
   - **Allow carriage returns**: checked for multi-line fields

| Field in your template | Normal | Changed (JD Changed) | Previous (JD Previous) | Allow carriage returns |
|---|---|---|---|---|
| Job Title | `JobTitle` | `JobTitle_New` | `JobTitle_Prev` | no |
| Salary/Hourly | `PayType` | `PayType_New` | `PayType_Prev` | no |
| People Management | `PeopleManagement` | `PeopleManagement_New` | `PeopleManagement_Prev` | no |
| Sales/Non-Sales | `SalesDesignation` | `SalesDesignation_New` | `SalesDesignation_Prev` | no |
| Relationship Manager | `RelationshipManager` | `RelationshipManager_New` | `RelationshipManager_Prev` | no |
| NMLS Required | `NMLSRequired` | `NMLSRequired_New` | `NMLSRequired_Prev` | no |
| Purpose | `Purpose` | `Purpose_New` | `Purpose_Prev` | **yes** |
| Education Requirements | `EducationRequirements` | `EducationRequirements_New` | `EducationRequirements_Prev` | **yes** |
| Work Experience Requirements | `WorkExperienceRequirements` | `WorkExperienceRequirements_New` | `WorkExperienceRequirements_Prev` | **yes** |
| Certifications/Licenses | `CertificationsLicenses` | `CertificationsLicenses_New` | `CertificationsLicenses_Prev` | **yes** |

**Designations in a table:** if your template shows Salary/Hourly, People Management, and the rest in a table, put all three controls in the value cell, each on its own line.

**Blank lines:** empty controls take up an empty line. For single-line fields, you can put all three controls **on the same line separated by a space** instead of pressing Enter. Only one is ever filled for an unchanged field, and for a changed one the new and previous values sit side by side. Try both and keep whichever looks better in your layout.

### 3.6 Bulleted fields: one repeating bullet

For **Principal Duties and Responsibilities**:

1. Inside the box, delete all the existing bullets **except one**. Delete that bullet's text too, leaving a single empty bullet (the bullet symbol with nothing after it).
2. With the cursor on that empty bullet, insert **three Plain Text Content Controls side by side** on the same line, with no space or Enter between them.
3. Properties for each:

| Order on the line | Title and Tag | Style | Allow carriage returns |
|---|---|---|---|
| 1st | `PrincipalDutiesItem` | none | no |
| 2nd | `PrincipalDutiesItem_New` | JD Changed | no |
| 3rd | `PrincipalDutiesItem_Prev` | JD Previous | no |

4. Select the **entire bulleted paragraph**, including the paragraph mark at the end. Turn on **Home → Show/Hide ¶** to see it, then triple-click the line.
5. **Developer → Repeating Section Content Control** (the icon with a **+**).
6. **Properties** of the repeating section: Title and Tag = `PrincipalDutiesList`

Repeat for **Knowledge Skills Abilities** with:

| Order | Title and Tag | Style |
|---|---|---|
| 1st | `KSAsItem` | none |
| 2nd | `KSAsItem_New` | JD Changed |
| 3rd | `KSAsItem_Prev` | JD Previous |
| Repeating section | `KSAsList` | |

The flow fills exactly one of the three controls on each bullet, so every bullet shows one piece of text in the right style.

### 3.7 Clear the placeholder text

Empty controls show "Click or tap here to enter text." unless you remove it:

1. **Developer → Design Mode** (on)
2. In each of the **36 controls** (30 text-field controls + 6 bullet controls), replace the placeholder text with a **single space**
3. **Design Mode** (off)

### 3.8 Save and upload

1. Save as **JD Change Request Template.docx** (Word Document, not .dotx or .docm).
2. Upload it to the **JD Templates** library.
3. Quick check: type into a few controls and confirm the shaded and struck-through styles apply automatically. Close **without saving**.

> **ALM note:** *Populate a Microsoft Word template* reads the controls when you select the file in the designer, so it needs a fixed file. Keep **one** template location that all environments' flows point to. If you change the template's controls later, reselect the file in the action.

---

## 4. Build the flow

### 4.1 Create the flow

1. In the **JD Expert Agent** solution: **+ New → Automation → Cloud flow → Instant**
2. Name: **Create JD Change Request**
3. Trigger: **When an agent calls the flow** (may be labeled *Run a flow from Copilot*)

### 4.2 Trigger inputs

Add seven **Text** inputs:

| Input | Receives from the topic |
|---|---|
| `JobCode` | `Global.varJobCode` |
| `OriginalJDJson` | `Global.varOriginalJDJson` |
| `UpdatedJDJson` | `Global.varWorkingJDJson` |
| `ChangeNotes` | `Global.varChangeLogText` |
| `ReviewFlags` | `Global.varReviewFlagsText` |
| `RequesterName` | `System.User.DisplayName` |
| `RequesterEmail` | `System.User.Email` |

> **Insert inputs with the dynamic content picker.** The trigger stores them under generated names (`text`, `text_1`, …). Where this guide writes `<UpdatedJDJson>`, insert that input's token.

### 4.3 Try scope

**+ New step → Scope** → rename to **Try**. Build Steps 4.4–4.16 **inside** it.

### 4.4 Compose `RequestId`

```
concat('JDU-', formatDateTime(convertFromUtc(utcNow(), 'Pacific Standard Time'), 'yyyyMMdd-HHmmss'))
```

### 4.5 Compose `Original` and `Updated`

- **Compose `Original`:** `json(<OriginalJDJson>)`
- **Compose `Updated`:** `json(<UpdatedJDJson>)`

### 4.6 Compose `FieldKeys`

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

### 4.7 Select `AllFields`

- **From:** `outputs('FieldKeys')`
- **Map** (key/value):

| Key | Value |
|---|---|
| `ChangeField` | `item()?['label']` |
| `ChangeBefore` | `coalesce(string(outputs('Original')?[item()?['key']]), '')` |
| `ChangeAfter` | `coalesce(string(outputs('Updated')?[item()?['key']]), '')` |

### 4.8 Filter array `ChangedFields`

- **From:** `body('AllFields')`
- **Edit in advanced mode:**
```
@not(equals(trim(item()?['ChangeBefore']), trim(item()?['ChangeAfter'])))
```

### 4.9 Condition: any changes?

`length(body('ChangedFields'))` **is equal to** `0`

**True:**
1. **Respond to the agent**: `Success` = `false`, `RequestId` = blank, `ChangedFieldCount` = `0`, `Message` = `No differences found`
2. **Terminate** → **Succeeded**

**False:** empty. Continue below.

### 4.10 Build the bullet rows for Principal Duties

Seven actions that split the duties into lines and label each line as kept, new, or removed.

**1. Select `DutiesOrigRaw`**
- From:
```
split(replace(coalesce(string(outputs('Original')?['PrincipalDuties']), ''), decodeUriComponent('%0D'), ''), decodeUriComponent('%0A'))
```
- Map: switch to **text mode** (the **T** icon):
```
if(or(startsWith(trim(item()), '•'), startsWith(trim(item()), '-'), startsWith(trim(item()), '*')), trim(substring(trim(item()), 1)), trim(item()))
```
This splits the field into lines and strips any bullet character typed at the start, since the template adds its own bullets.

**2. Filter array `DutiesOrig`**
- From: `body('DutiesOrigRaw')`
- Advanced mode: `@greater(length(item()), 0)` (drops blank lines)

**3. Select `DutiesUpdRaw`** — same as #1, but using `outputs('Updated')?['PrincipalDuties']`

**4. Filter array `DutiesUpd`** — same as #2, from `body('DutiesUpdRaw')`

**5. Select `DutiesKeptNew`** — every line in the updated version
- From: `body('DutiesUpd')`
- Map (key/value):

| Key | Value |
|---|---|
| `PrincipalDutiesItem` | `if(contains(body('DutiesOrig'), item()), item(), '')` |
| `PrincipalDutiesItem_New` | `if(contains(body('DutiesOrig'), item()), '', item())` |
| `PrincipalDutiesItem_Prev` | `''` |

A line that existed before goes in the normal control; a new or reworded line goes in the shaded one.

**6. Filter array `DutiesRemovedLines`** — lines that were in the original but not the update
- From: `body('DutiesOrig')`
- Advanced mode: `@not(contains(body('DutiesUpd'), item()))`

**7. Select `DutiesRemoved`**
- From: `body('DutiesRemovedLines')`
- Map (key/value): `PrincipalDutiesItem` = `''`, `PrincipalDutiesItem_New` = `''`, `PrincipalDutiesItem_Prev` = `item()`

**8. Compose `DutiesRows`** — combines them, kept and new bullets first, removed at the end:
```
if(and(empty(body('DutiesKeptNew')), empty(body('DutiesRemoved'))), json('[{"PrincipalDutiesItem":"None listed","PrincipalDutiesItem_New":"","PrincipalDutiesItem_Prev":""}]'), union(body('DutiesKeptNew'), body('DutiesRemoved')))
```

**What a reworded bullet looks like:** "Processes payroll" edited to "Processes payroll and off-cycle payments" shows as a new shaded bullet in place, and the old wording struck through at the bottom of the list. Both are visible to HR.

> **`union()` note:** it removes exact duplicate rows, so two identical bullets would appear once. That's rare in a JD and usually a mistake anyway.

### 4.11 Build the bullet rows for KSAs

Repeat all eight actions from 4.10 with these substitutions:

| In 4.10 | For KSAs |
|---|---|
| `['PrincipalDuties']` | `['KSAs']` |
| `DutiesOrigRaw`, `DutiesOrig`, `DutiesUpdRaw`, `DutiesUpd` | `KSAsOrigRaw`, `KSAsOrig`, `KSAsUpdRaw`, `KSAsUpd` |
| `DutiesKeptNew`, `DutiesRemovedLines`, `DutiesRemoved`, `DutiesRows` | `KSAsKeptNew`, `KSAsRemovedLines`, `KSAsRemoved`, `KSAsRows` |
| `PrincipalDutiesItem`, `_New`, `_Prev` | `KSAsItem`, `KSAsItem_New`, `KSAsItem_Prev` |

Tip: in the designer, **Copy to my clipboard** on each action and paste it, then rename and edit.

### 4.12 Populate a Microsoft Word template

**Word Online (Business) → Populate a Microsoft Word template**
- Location: HR JD SharePoint site · Document Library: JD Templates · File: **JD Change Request Template.docx**

The action lists every control after you pick the file.

**Bulleted lists (repeating sections)** — click the icon to **switch to input entire array**:

| Control | Value |
|---|---|
| `PrincipalDutiesList` | `outputs('DutiesRows')` |
| `KSAsList` | `outputs('KSAsRows')` |

**Text fields — three expressions each.** Pattern for `Purpose`:

**`Purpose`** (unchanged → normal):
```
if(equals(trim(coalesce(string(outputs('Original')?['Purpose']), '')), trim(coalesce(string(outputs('Updated')?['Purpose']), ''))), coalesce(string(outputs('Updated')?['Purpose']), ''), '')
```

**`Purpose_New`** (changed → shaded):
```
if(equals(trim(coalesce(string(outputs('Original')?['Purpose']), '')), trim(coalesce(string(outputs('Updated')?['Purpose']), ''))), '', coalesce(string(outputs('Updated')?['Purpose']), '(removed)'))
```

**`Purpose_Prev`** (changed → struck through):
```
if(equals(trim(coalesce(string(outputs('Original')?['Purpose']), '')), trim(coalesce(string(outputs('Updated')?['Purpose']), ''))), '', concat('Previously: ', coalesce(string(outputs('Original')?['Purpose']), '(blank)')))
```

Repeat for the other nine text fields by swapping the key in the expressions and the control name:

`JobTitle` · `PayType` · `PeopleManagement` · `SalesDesignation` · `RelationshipManager` · `NMLSRequired` · `EducationRequirements` · `WorkExperienceRequirements` · `CertificationsLicenses`

(Principal Duties and KSAs are handled by the lists above, so they don't get these expressions.)

> Copy the three expressions into a text editor, replace `Purpose` with the next key, and paste. Replace only inside the expressions, one field at a time.

### 4.13 Build the email content

These go into library columns for the future email flow, **not** into the document.

**1. Select `ChangedLabels`**
- From: `body('ChangedFields')`
- Map (text mode): `item()?['ChangeField']`

**2. Select `ChangeRowsHtml`** — one HTML table row per changed field
- From: `body('ChangedFields')`
- Map (text mode):
```
concat('<tr><td style="border:1px solid #ccc;padding:6px;vertical-align:top"><b>', item()?['ChangeField'], '</b></td><td style="border:1px solid #ccc;padding:6px;vertical-align:top;color:#777777;text-decoration:line-through">', replace(replace(replace(replace(item()?['ChangeBefore'], '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), decodeUriComponent('%0A'), '<br>'), '</td><td style="border:1px solid #ccc;padding:6px;vertical-align:top;background-color:#FFF3B0">', replace(replace(replace(replace(item()?['ChangeAfter'], '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), decodeUriComponent('%0A'), '<br>'), '</td></tr>')
```
The `&amp;`/`&lt;`/`&gt;` replacements stop characters like "&" in a job description from breaking the HTML. Line breaks become `<br>` so bullets stay on separate lines in the email.

**3. Compose `ChangeSummaryHtml`**
```
concat('<table style="border-collapse:collapse;font-family:Segoe UI,Arial,sans-serif;font-size:13px"><tr><th style="border:1px solid #ccc;padding:6px;text-align:left;background-color:#f3f3f3">Field</th><th style="border:1px solid #ccc;padding:6px;text-align:left;background-color:#f3f3f3">Previous</th><th style="border:1px solid #ccc;padding:6px;text-align:left;background-color:#f3f3f3">Requested</th></tr>', join(body('ChangeRowsHtml'), ''), '</table>')
```

The email flow can drop this straight into the email body.

### 4.14 Compose `FileName`

```
concat('JD Change Request - ', replace(replace(replace(replace(replace(replace(replace(replace(replace(string(outputs('Original')?['JobTitle']), '/', '-'), '\', '-'), ':', '-'), '*', ''), '?', ''), '"', ''), '<', ''), '>', ''), '|', '-'), ' - ', outputs('RequestId'), '.docx')
```

Removes characters SharePoint doesn't allow in file names.

### 4.15 Create file

**SharePoint → Create file**
- Site Address: `env_JD_SiteUrl`
- Folder Path: the JD Change Requests library
- File Name: `outputs('FileName')`
- File Content: the document output of *Populate a Microsoft Word template*

### 4.16 Update file properties

**SharePoint → Update file properties**
- Site Address: `env_JD_SiteUrl` · Library Name: `env_JD_RequestsLibrary`
- **Id:** the **ItemId** output of *Create file*

| Property | Value |
|---|---|
| RequestId | `outputs('RequestId')` |
| JobCode | `<JobCode>` |
| JobTitle | `outputs('Original')?['JobTitle']` |
| RequesterName | `<RequesterName>` |
| RequesterEmail | `<RequesterEmail>` |
| ChangedFields | `join(body('ChangedLabels'), ', ')` |
| ChangeSummaryHtml | `outputs('ChangeSummaryHtml')` |
| ChangeNotes | `<ChangeNotes>` |
| ReviewFlags | `if(empty(trim(coalesce(<ReviewFlags>, ''))), 'None', <ReviewFlags>)` |
| RequestStatus | `Created` |

If the columns don't load, pick the library from the dropdown temporarily to load them, then switch back to the environment variable.

### 4.17 Respond to the agent (success)

Last action inside **Try**:

| Output | Type | Value |
|---|---|---|
| `Success` | Yes/No | `true` |
| `RequestId` | Text | `outputs('RequestId')` |
| `ChangedFieldCount` | Number | `length(body('ChangedFields'))` |
| `Message` | Text | `Created` |

### 4.18 Catch scope

1. Below **Try** (outside it): **Scope** → rename **Catch**
2. **... → Configure run after:** check **has failed** and **has timed out**, uncheck **is successful**
3. Inside: **Respond to the agent** — `Success` = `false`, `RequestId` = blank, `ChangedFieldCount` = `0`, `Message` = `Request creation failed`

> **All three Respond actions** (Step 4.9, 4.17, 4.18) **must have identical output names and types**, or Copilot Studio rejects the flow.

### 4.19 Save and turn on

Save, confirm the flow is **on**, and confirm it's in the JD Expert Agent solution.

### Flow at a glance

```
When an agent calls the flow (7 inputs)
└─ Try
   ├─ Compose RequestId, Original, Updated, FieldKeys
   ├─ Select AllFields → Filter ChangedFields
   ├─ Condition: no changes? → Respond (false) → Terminate
   ├─ Principal Duties bullets (8 actions) → DutiesRows
   ├─ KSAs bullets (8 actions) → KSAsRows
   ├─ Populate a Microsoft Word template
   ├─ Select ChangedLabels, Select ChangeRowsHtml, Compose ChangeSummaryHtml
   ├─ Compose FileName
   ├─ Create file
   ├─ Update file properties
   └─ Respond to the agent (true)
└─ Catch → Respond to the agent (false)
```

---

## 5. Test the flow

### 5.1 Test data

Use **Test → Manually** if available; otherwise test through the topic (5.4).

**OriginalJDJson**
```json
{"JobTitle":"Payroll Specialist II","PayType":"Hourly","PeopleManagement":"No","SalesDesignation":"Non-Sales","RelationshipManager":"No","NMLSRequired":"No","Purpose":"Processes semi-monthly payroll for the bank.","PrincipalDuties":"Processes payroll\nReconciles payroll accounts\nAnswers employee pay questions","EducationRequirements":"High school diploma or equivalent","WorkExperienceRequirements":"2 years of payroll experience","KSAs":"Knowledge of payroll regulations\nAttention to detail","CertificationsLicenses":"None"}
```

**UpdatedJDJson** — Purpose reworded, one duty added, one duty removed, People Management changed
```json
{"JobTitle":"Payroll Specialist II","PayType":"Hourly","PeopleManagement":"Yes","SalesDesignation":"Non-Sales","RelationshipManager":"No","NMLSRequired":"No","Purpose":"Processes semi-monthly and off-cycle payroll for the bank.","PrincipalDuties":"Processes payroll\nReconciles payroll accounts\nPrepares quarterly payroll audit reports","EducationRequirements":"High school diploma or equivalent","WorkExperienceRequirements":"2 years of payroll experience","KSAs":"Knowledge of payroll regulations\nAttention to detail","CertificationsLicenses":"None"}
```

Other inputs: any job code, your name and email, `ChangeNotes` = `• Added off-cycle payroll to the purpose`, `ReviewFlags` = `• People management designation changed; HR should review.`

### 5.2 Check the document

| Section | Expected |
|---|---|
| Purpose | New wording shaded; "Previously: …" struck through below |
| People Management | "Yes" shaded; "Previously: No" struck through |
| Principal Duties | Real bullets: "Processes payroll" and "Reconciles payroll accounts" normal · "Prepares quarterly payroll audit reports" shaded · "Answers employee pay questions" struck through at the end |
| KSAs | Two normal bullets, nothing marked |
| Every other field | Normal text only |
| Formatting | Your template's fonts, layout, and bullet style unchanged |
| Nothing extra | No summary table, notes, flags, Job Code, Grade, Status, or placeholder text |

### 5.3 Check the library item

| Column | Expected |
|---|---|
| ChangedFields | `People Management, Purpose, Principal Duties and Responsibilities` (in FieldKeys order) |
| ChangeSummaryHtml | An HTML string starting with `<table` |
| ChangeNotes, ReviewFlags | The values you sent |
| RequestStatus | Created |

To preview the HTML, copy the `ChangeSummaryHtml` value into a text file, save it as `.html`, and open it in a browser. You should see a three-column table, previous values struck through and requested values shaded.

### 5.4 Edge cases

| Test | Expected |
|---|---|
| Identical Original and Updated | Success = false, "No differences found", no file |
| Only a trailing space added to a field | No change detected |
| A duty with `•` typed at the start in SharePoint | Shows once, with only the template's bullet |
| All duties removed | Every original duty struck through |
| Empty duties in both | One bullet reading "None listed" |
| A job title containing `/` | Saves with `-` in the file name |
| A description containing `&` or `<` | Email HTML renders correctly |
| Malformed UpdatedJDJson | Catch runs, Success = false |

---

## 6. Connect it

### 6.1 Topic Step 30

**Call an action → Create JD Change Request** with the inputs from Step 4.2. Map outputs: `Success` → `Topic.varSubmitSuccess`, `RequestId` → `Topic.varRequestId`, `Message` → `Topic.varSubmitMessage`.

Test end to end: find a job, add a duty, remove a duty, change the purpose, say "that's all", submit, and check the library.

### 6.2 The future email flow (don't build yet)

Recommended trigger: **SharePoint → When a file is created (properties only)** on JD Change Requests. Everything the email needs is already in the item:

| Email part | Source |
|---|---|
| Subject | `JobTitle`, `RequestId` |
| Requested by | `RequesterName`, `RequesterEmail` |
| Summary of changes | `ChangeSummaryHtml` (paste into the HTML body as-is) |
| Requester notes | `ChangeNotes` (replace line breaks with `<br>`) |
| Items for HR review | `ReviewFlags` (replace line breaks with `<br>`) |
| Job Code (HR copy only) | `JobCode` |
| Attachment | Get file content of the created file |

After sending, the email flow sets `RequestStatus` to `Sent to HR`.

---

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Populate action doesn't list some controls | They're inside a text box or shape (convert to a table, Step 3.2), aren't **Plain Text** controls, or have no Title |
| Bullets: only the first line has a bullet | Duties were poured into a single control. Use the repeating section (Step 3.6) |
| Bullets appear but with no bullet symbol | The repeating section doesn't include the whole bulleted paragraph. Reselect the full line, including ¶, and recreate it |
| Extra empty bullet in the list | The repeating section wasn't switched to **input entire array**, or the first row's controls have placeholder text |
| Every duty shows as new | The original and updated lines differ in whitespace or bullet characters. Check `DutiesOrig` and `DutiesUpd` in run history |
| "Click or tap here to enter text" in output | Placeholder not replaced with a space (Step 3.7) |
| Shading/strikethrough missing | Control's **Use a style** box unchecked, or the style isn't a **Character** style |
| Template formatting changed | A paragraph style was applied instead of a character style |
| Email HTML shows raw tags | The column is rich text; change it to plain text. Or the email body isn't set to HTML |
| Create file fails on the name | A character in the title isn't handled in 4.14; add a `replace()` |
| Update file properties can't find the file | **Id** must be **ItemId** from Create file |
| Copilot Studio rejects the flow | The three Respond actions differ |
| Topic times out | Agent flows must respond quickly (roughly 100 seconds); find the slow action in run history |

---

## Checklist

- [ ] Environment variables and connection references in place
- [ ] Library created with all ten columns, multi-line columns plain text, HR-only permissions
- [ ] Template copy has two character styles, 30 text-field controls, 2 repeating bullet sections (6 controls), placeholders cleared
- [ ] Bulleted boxes are tables, not text boxes
- [ ] Flow built with Try/Catch and three identical Respond actions
- [ ] Section 5 tests pass, including the bullet cases
- [ ] Topic Step 30 wired and tested end to end
