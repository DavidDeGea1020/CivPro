# JD Change Document — Build Guide

**Builds on:** the JD Update feature (Save JD Update Request flow, Review and Submit JD Update topic)
**Goal:** when a manager submits an update, generate two Word documents from your JD template with redline formatting:

- **User copy**: removed text struck through in red, added text highlighted in yellow, unchanged text plain. No Grade, Job Code, Salary/Hourly, or Status. Shared with the requester only, and linked in the agent's "Submitted!" message.
- **HR copy**: same redline, plus the restricted fields and HR notes. Saved in an HR-only library.

Both links are saved on the request item in **JD Update Requests**, so your HR flow can pick them up later.

> **Note on UI labels:** Power Automate and Copilot Studio rename things often. If a label doesn't match exactly, look for the closest equivalent.

> **Licensing:** *Populate a Microsoft Word template* is a **premium** action. Flows called from a Copilot Studio agent generally run under the agent's licensing, but confirm with your Power Platform admin before deploying to UAT/QA.

---

## Contents

0. [How it works](#part-0--how-it-works)
1. [Build the templates](#part-1--build-the-templates)
2. [Libraries, permissions, and list columns](#part-2--libraries-permissions-and-list-columns)
3. [Child flow: Build Redline Rows](#part-3--child-flow-build-redline-rows)
4. [Extend Save JD Update Request](#part-4--extend-save-jd-update-request)
5. [Update the agent](#part-5--update-the-agent)
6. [Testing](#part-6--testing)
- [Appendix A — Name reference](#appendix-a--name-reference)
- [Appendix B — Troubleshooting](#appendix-b--troubleshooting)

---

## Part 0 — How it works

```
Manager clicks "Submit to HR" (Part 11.7 of the update guide)
        │  passes the 6 proposed sections (blank = unchanged)
        ▼
Save JD Update Request flow
  1. Create item in JD Update Requests          (already built)
  2. Get the original JD from your JD list by Job Code
  3. For each of the 6 sections → Build Redline Rows child flow
        original vs proposed, line by line → Kept / Added / Removed
  4. Populate USER template → save to JD Change Documents → share with requester
  5. Populate HR template   → save to JD Change Documents - HR
  6. Save both links on the request item
  7. Respond to the agent with the user's link
        │
        ▼
Agent: "Submitted! Here's a copy for your records: [Open your copy]"
```

**How the redline works:** each section in the template is a **repeating row** with three side-by-side fields: Kept (plain), Added (yellow, bold), and Removed (red, strikethrough). The child flow turns each section into a list of rows, and each row fills exactly one of the three fields. Word repeats the row once per line.

**What the redline can and can't do:**
- It compares **whole lines**. If one word in a duty changes, the old duty shows as removed and the new one as added. HR redlines usually work this way for bullet lists.
- Removed lines appear at the **end** of their section, not where they originally were.
- Exact duplicate lines within a section collapse into one.

---

## Part 1 — Build the templates

You need Word **desktop**, since content controls can't be added in Word for the web. Start from your blank JD template.

### 1.1 Turn on the Developer tab
1. **File** → **Options** → **Customize Ribbon**.
2. In the right-hand list, check **Developer** → **OK**.

### 1.2 Create the two redline styles
1. **Home** → click the small arrow at the bottom right of the **Styles** group to open the Styles pane → click **New Style** (the A+ icon at the bottom of the pane).
2. First style:
   - **Name:** `JD Added`
   - **Style type:** Character
   - Click **B** (bold)
   - **Format** → **Border** → **Shading** tab → **Fill:** Yellow → **Apply to:** Text → **OK**
   - **OK**
3. Second style:
   - **Name:** `JD Removed`
   - **Style type:** Character
   - **Font color:** Red
   - **Format** → **Font** → check **Strikethrough** → **OK**
   - **OK**

> Word's highlighter can't be built into a style, but yellow shading looks the same.

### 1.3 Build the Principal Duties redline row
1. Under the **Principal Duties** heading, delete any placeholder text and leave **one empty bulleted line**.
2. Place your cursor on that bullet → **Developer** → **Plain Text Content Control** (the **Aa** icon). Click it **three times** so you have three controls side by side on the same line.
3. Click the **first** control → **Developer** → **Properties**:
   - **Title:** `DutiesKept` · **Tag:** `DutiesKept`
   - **OK**
4. Click the **second** control → **Properties**:
   - **Title:** `DutiesAdded` · **Tag:** `DutiesAdded`
   - Check **Use a style to format text typed into the empty control** → **Style:** JD Added
   - **OK**
5. Click the **third** control → **Properties**:
   - **Title:** `DutiesRemoved` · **Tag:** `DutiesRemoved`
   - Check **Use a style to format text typed into the empty control** → **Style:** JD Removed
   - **OK**
6. Clear the placeholder text, so empty controls don't print "Click or tap here to enter text":
   1. **Developer** → **Design Mode** (turn on).
   2. In each of the three controls, select all the placeholder text, type `200B`, then press **Alt+X**. This replaces it with an invisible zero-width space.
   3. Click **Design Mode** again to turn it off.
7. Select the **entire bulleted line**, including all three controls.
8. **Developer** → **Repeating Section Content Control** (the icon with two stacked boxes).
9. Click the repeating section's outer border → **Properties**:
   - **Title:** `DutiesRows` · **Tag:** `DutiesRows`
   - **OK**

### 1.4 Repeat for the other five sections

Use the same steps and the names below. Use a **bulleted** line for any section your template shows as bullets, and a **plain** paragraph otherwise.

| Section | Repeating section | Kept | Added | Removed |
|---|---|---|---|---|
| Purpose | `PurposeRows` | `PurposeKept` | `PurposeAdded` | `PurposeRemoved` |
| Principal Duties | `DutiesRows` | `DutiesKept` | `DutiesAdded` | `DutiesRemoved` |
| Education | `EducationRows` | `EducationKept` | `EducationAdded` | `EducationRemoved` |
| Work Experience | `ExperienceRows` | `ExperienceKept` | `ExperienceAdded` | `ExperienceRemoved` |
| Certifications | `CertsRows` | `CertsKept` | `CertsAdded` | `CertsRemoved` |
| KSAs | `KSARows` | `KSAKept` | `KSAAdded` | `KSARemoved` |

> **Shortcut:** copy the finished Duties repeating section into each other section, then rename the four Titles and Tags. The styles and cleared placeholders copy along with it. Switch a copy from bulleted to plain with **Home** → **Bullets** if needed.

### 1.5 Single-value fields

Wherever each value belongs in your template, insert a **Plain Text Content Control**, set **Title** and **Tag** to the same name, and clear the placeholder as in 1.3, step 6.

| Control | What it shows |
|---|---|
| `JobTitle` | Current job title |
| `RequestID` | Request number |
| `RequestedBy` | Requester's email |
| `RequestDate` | Submission date |
| `Reasons` | Reasons for update |
| `PeopleManagement` | Current value |
| `SalesNonSales` | Current value |
| `RelationshipManager` | Current value |
| `NMLS` | Current value |
| `ProposedTitle` | Proposed title, if requested |
| `TitleJustification` | Title justification, if requested |

- For `Reasons` and `TitleJustification`: **Properties** → check **Allow carriage returns (multiple paragraphs)**.
- **Delete** any Grade, Job Code, Salary/Hourly, or Status fields from this version.
- If you don't want a request header (ID, date, requester), skip those controls. The flow simply won't fill them.

**Add a legend** near the top so readers know how to read the redline. Type it as plain text, applying the two styles to the sample words:

> *Proposed changes:* <mark>**added text**</mark> · ~~removed text~~

Save as **`JD Change Template - User.docx`**.

### 1.6 HR template
1. **File** → **Save As** → **`JD Change Template - HR.docx`**.
2. Add plain text controls (same method) for: `Grade`, `JobCode`, `SalaryType`, `Status`.
3. At the end, add an **HR Notes** heading and a plain text control for each of the following, with **Allow carriage returns** checked:

| Control | Shows |
|---|---|
| `IndirectFlags` | Confirmed indirect impacts |
| `HardStops` | Blocked requests |
| `LevelRecommendation` | Level similarity note |
| `TitleSupportAssessment` | HR-only title assessment |
| `HRSummary` | AI summary for HR |

4. **Save**.

### 1.7 Check both templates

Before uploading:
- **Developer** → **Design Mode** on → confirm every control shows its tag name and that none still shows "Click or tap here".
- Every Title is **unique** within the document, and the Title matches the Tag.
- Each of the six sections has exactly **one** repeating row containing three controls.

---

## Part 2 — Libraries, permissions, and list columns

### 2.1 Templates library
1. On your JD SharePoint site → **+ New** → **Document library** → name **JD Templates** → **Create**.
2. Upload both templates.
3. **Settings** (gear) → **Library settings** → **Permissions for this document library** → **Stop Inheriting Permissions** → **OK**.
4. Check the **Members** and **Visitors** groups → **Remove User Permissions**. Keep Owners, HR, and yourself.

### 2.2 User copies library
1. **+ New** → **Document library** → **JD Change Documents** → **Create**.
2. Same permission steps as 2.1. Managers get access only to their **own** files; the flow grants that per file in Part 4.

### 2.3 HR copies library
1. **+ New** → **Document library** → **JD Change Documents - HR** → **Create**.
2. Same permission steps as 2.1, keeping **HR only**.

> **Connection account:** the account behind the flow's SharePoint and Word connections needs **Edit** access to all three libraries and the JD Update Requests list.

### 2.4 New columns on JD Update Requests
Open the **JD Update Requests** list → **+ Add column**:

| Column | Type |
|---|---|
| `UserDocLink` | Multiple lines of text (plain) |
| `HRDocLink` | Multiple lines of text (plain) |

> Multiple lines avoids the 255-character limit that long SharePoint URLs can hit in single-line or hyperlink columns.

### 2.5 Find your JD list's internal column names
The flow reads the original JD directly from your JD list. Expressions need each column's **internal** name, which can differ from its display name.

1. Open your JD list → **Settings** → **List settings**.
2. Click each column below. Its internal name is at the end of the browser URL after `Field=`. For example, `Field=Principal_x0020_Duties` means the internal name is `Principal_x0020_Duties`.
3. Fill in the right column:

| Field | Internal name |
|---|---|
| Job Code | `________` |
| Grade | `________` |
| Salary/Hourly | `________` |
| Status | `________` |
| People Management | `________` |
| Sales/Non-Sales | `________` |
| Relationship Manager | `________` |
| NMLS Required | `________` |
| Purpose | `________` |
| Principal Duties and Responsibilities | `________` |
| Education Requirements | `________` |
| Work Experience Requirements | `________` |
| Certifications/Licenses | `________` |
| Knowledge Skills Abilities | `________` |

> **Choice and Yes/No columns** return differently. A Choice column returns an object, so you'd read `?['Grade']?['Value']`, and Yes/No returns `true`/`false`. Check the types as you go. Appendix B covers how to see the raw output.

---

## Part 3 — Child flow: Build Redline Rows

One reusable flow that compares a section's original text with its proposed text and returns the rows for the template. You call it six times, once per section.

**Child flows must live in a solution.** Build this in the same solution as Save JD Update Request.

### 3.1 Create the flow
1. Go to **make.powerapps.com** → **Solutions** → open your JD solution.
2. **+ New** → **Automation** → **Cloud flow** → **Instant**.
3. Name: **Build Redline Rows** · Trigger: **Manually trigger a flow** → **Create**.

### 3.2 Inputs
1. On the trigger, click **+ Add an input** → **Text** → name it `Original`.
2. **+ Add an input** → **Text** → name it `Proposed`.
3. Make both optional: click the **⋯** next to each input → **Make the field optional**.

> **Input keys:** in expressions, the first Text input is usually `triggerBody()?['text']` and the second `triggerBody()?['text_1']`. To confirm, click the trigger → **⋯** → **Peek code** and look under `properties`. The expressions below assume `text` and `text_1`.

### 3.3 Line break helper
1. **+ New step** → **Compose** → rename to `NL`.
2. **Inputs** → **Expression** tab:

```
decodeUriComponent('%0A')
```

### 3.4 Clean the original text
**Compose** → rename `OriginalClean` → Expression:

```
replace(replace(replace(replace(replace(replace(coalesce(triggerBody()?['text'], ''), '<br />', outputs('NL')), '<br/>', outputs('NL')), '<br>', outputs('NL')), decodeUriComponent('%0D'), ''), '&nbsp;', ' '), '&amp;', '&')
```

This turns your `<br>` separators into real line breaks and removes common HTML leftovers.

### 3.5 Clean the proposed text
**Compose** → rename `ProposedClean` → Expression:

```
if(empty(trim(coalesce(triggerBody()?['text_1'], ''))), outputs('OriginalClean'), replace(replace(replace(replace(replace(replace(triggerBody()?['text_1'], '<br />', outputs('NL')), '<br/>', outputs('NL')), '<br>', outputs('NL')), decodeUriComponent('%0D'), ''), '&nbsp;', ' '), '&amp;', '&'))
```

> **Blank proposed = unchanged section.** In that case the proposed text becomes the original, so every line comes out as Kept.

### 3.6 Split the original into clean lines
1. **+ New step** → **Data Operation** → **Select** → rename `OriginalLines`.
   - **From** → Expression:
     ```
     split(outputs('OriginalClean'), outputs('NL'))
     ```
   - **Map:** click the **T** icon (*Switch to text mode*) → Expression:
     ```
     trim(if(or(startsWith(trim(item()), '•'), startsWith(trim(item()), '-'), startsWith(trim(item()), '*'), startsWith(trim(item()), '·')), substring(trim(item()), 1, sub(length(trim(item())), 1)), trim(item())))
     ```
     This strips a leading bullet character. Your template adds its own bullets.
2. **+ New step** → **Data Operation** → **Filter array** → rename `OriginalList`.
   - **From:** `body('OriginalLines')` (Expression)
   - Click **Edit in advanced mode** and enter:
     ```
     @greater(length(item()), 0)
     ```
     This removes empty lines.

### 3.7 Split the proposed text into clean lines
Repeat 3.6 with these changes:
- Select `ProposedLines`, with From `split(outputs('ProposedClean'), outputs('NL'))` and the same Map expression.
- Filter array `ProposedList`, with From `body('ProposedLines')` and the same condition.

### 3.8 Rows for proposed lines (kept or added)
**Select** → rename `ProposedRows`.
- **From:** `body('ProposedList')`
- **Map** (key/value mode, not text mode). Add three rows:

| Key | Value (Expression) |
|---|---|
| `Kept` | `if(contains(body('OriginalList'), item()), item(), '')` |
| `Added` | `if(contains(body('OriginalList'), item()), '', item())` |
| `Removed` | `''` |

### 3.9 Rows for removed lines
1. **Filter array** → rename `RemovedLines`.
   - **From:** `body('OriginalList')`
   - Advanced mode:
     ```
     @not(contains(body('ProposedList'), item()))
     ```
2. **Select** → rename `RemovedRows`.
   - **From:** `body('RemovedLines')`
   - **Map:**

| Key | Value (Expression) |
|---|---|
| `Kept` | `''` |
| `Added` | `''` |
| `Removed` | `item()` |

### 3.10 Combine
**Compose** → rename `AllRows` → Expression:

```
union(body('ProposedRows'), body('RemovedRows'))
```

### 3.11 Return the rows
1. **+ New step** → search **Respond to a PowerApp or flow** → select it.
2. **+ Add an output** → **Text** → name `Rows` → Expression:
   ```
   string(outputs('AllRows'))
   ```
3. **Save**.

### 3.12 Test it on its own
1. **Test** → **Manually** → **Test**.
2. **Original:** `• Processes deposits<br>• Opens accounts<br>• Refers clients to specialists`
3. **Proposed:** `• Processes deposits` + new line + `• Opens consumer and small business accounts`
4. **Run flow**. Open the run and expand **AllRows**. You should see:
   - `Processes deposits`, with Kept filled
   - `Opens consumer and small business accounts`, with Added filled
   - `Opens accounts` and `Refers clients to specialists`, with Removed filled
5. Run again with **Proposed** blank. Every line should come back as Kept.

---

## Part 4 — Extend Save JD Update Request

Open **Save JD Update Request** from your solution → **Edit**.

### 4.1 Add trigger inputs
On the **When an agent calls the flow** trigger, add six **Text** inputs, each made optional (**⋯** → **Make the field optional**):

| Input | Holds |
|---|---|
| `ProposedPurpose` | New Purpose text, or blank if unchanged |
| `ProposedDuties` | New Principal Duties |
| `ProposedEducation` | New Education |
| `ProposedExperience` | New Work Experience |
| `ProposedCerts` | New Certifications |
| `ProposedKSA` | New KSAs |

### 4.2 Make room after Create item
Your flow currently runs **Create item** → **Respond to the agent**. Everything new goes **between** them.

### 4.3 Initialize the link variable
Variables can't be initialized inside a Scope, so do this first:

1. Click **+** between Create item and Respond → **Initialize variable**.
   - **Name:** `DocLink` · **Type:** String · **Value:** *(leave empty)*

### 4.4 Add a Scope
1. **+** below Initialize variable → search **Scope** → add it → rename to `Build Documents`.
2. Steps 4.5 to 4.12 all go **inside** this Scope. If any of them fails, the request is still saved and the agent still responds (4.13).

### 4.5 Get the original JD
Inside the Scope:

1. **+** → **SharePoint** → **Get items** → rename `Get JD`.
   - **Site Address:** your JD site
   - **List Name:** your JD list
   - **Filter Query:** `JobCodeInternalName eq '` + JobCode (dynamic content from the trigger) + `'`
     For example: `Job_x0020_Code eq '12345'`
   - **Top Count:** `1`
2. **+** → **Compose** → rename `JD` → Expression:
   ```
   first(body('Get_JD')?['value'])
   ```

> From here on, read a column as `outputs('JD')?['InternalName']`, using your names from Part 2.5.

### 4.6 Run the child flow six times
For each section: **+** → **Flows** connector → **Run a Child Flow** → choose **Build Redline Rows**. Rename and map each one:

| Rename to | Original (Expression) | Proposed (Dynamic content) |
|---|---|---|
| `Redline Purpose` | `outputs('JD')?['PurposeInternal']` | ProposedPurpose |
| `Redline Duties` | `outputs('JD')?['DutiesInternal']` | ProposedDuties |
| `Redline Education` | `outputs('JD')?['EducationInternal']` | ProposedEducation |
| `Redline Experience` | `outputs('JD')?['ExperienceInternal']` | ProposedExperience |
| `Redline Certs` | `outputs('JD')?['CertsInternal']` | ProposedCerts |
| `Redline KSA` | `outputs('JD')?['KSAInternal']` | ProposedKSA |

Replace each `...Internal` with your actual internal name.

> **Tip:** add the first one, then use **⋯** → **Copy to my clipboard** and paste it five times, editing each copy.

### 4.7 Rename the row keys to match each section's controls
The child flow returns generic `Kept`, `Added`, and `Removed` keys, but each template section uses its own control names. Add one **Select** per section:

1. **+** → **Data Operation** → **Select** → rename `Rows Purpose`.
   - **From** → Expression: `json(body('Redline_Purpose')?['rows'])`
   - **Map** (key/value):

| Key | Value (Expression) |
|---|---|
| `PurposeKept` | `item()?['Kept']` |
| `PurposeAdded` | `item()?['Added']` |
| `PurposeRemoved` | `item()?['Removed']` |

2. Repeat for each section:

| Select name | From | Key prefix |
|---|---|---|
| `Rows Duties` | `json(body('Redline_Duties')?['rows'])` | `Duties` |
| `Rows Education` | `json(body('Redline_Education')?['rows'])` | `Education` |
| `Rows Experience` | `json(body('Redline_Experience')?['rows'])` | `Experience` |
| `Rows Certs` | `json(body('Redline_Certs')?['rows'])` | `Certs` |
| `Rows KSA` | `json(body('Redline_KSA')?['rows'])` | `KSA` |

> Action names become `Redline_Purpose` (spaces turn into underscores) in expressions. If you named actions differently, match your names.

### 4.8 Request date
**Compose** → rename `RequestDate` → Expression:
```
formatDateTime(convertFromUtc(utcNow(), 'Eastern Standard Time'), 'MMMM d, yyyy')
```

### 4.9 Fill the user template
1. **+** → **Word Online (Business)** → **Populate a Microsoft Word template** → rename `Populate User Doc`.
   - **Location:** your SharePoint site
   - **Document Library:** JD Templates
   - **File:** `JD Change Template - User.docx`
2. The template's fields load. Fill them in:

| Field | Value |
|---|---|
| JobTitle | JobTitle (trigger) |
| RequestID | ID (from **Create item**) |
| RequestedBy | RequestedBy (trigger) |
| RequestDate | Outputs of **RequestDate** |
| Reasons | Reasons (trigger) |
| PeopleManagement | Expression `outputs('JD')?['PeopleMgmtInternal']` |
| SalesNonSales | Expression `outputs('JD')?['SalesInternal']` |
| RelationshipManager | Expression `outputs('JD')?['RMInternal']` |
| NMLS | Expression `outputs('JD')?['NMLSInternal']` |
| ProposedTitle | ProposedTitle (trigger) |
| TitleJustification | TitleJustification (trigger) |

3. For each **repeating section** field (PurposeRows, DutiesRows, and so on):
   - Click **Switch to input entire array** (the **T** icon on that field).
   - Enter the matching Select output as an Expression:

| Field | Expression |
|---|---|
| PurposeRows | `body('Rows_Purpose')` |
| DutiesRows | `body('Rows_Duties')` |
| EducationRows | `body('Rows_Education')` |
| ExperienceRows | `body('Rows_Experience')` |
| CertsRows | `body('Rows_Certs')` |
| KSARows | `body('Rows_KSA')` |

> If your template fields don't appear, re-select the file. If a field is missing, its content control's Title wasn't set (go back to Part 1.7).

### 4.10 Save the user copy and share it
1. **+** → **SharePoint** → **Create file** → rename `Create User File`.
   - **Site Address:** your site
   - **Folder Path:** `/JD Change Documents`
   - **File Name** → Expression:
     ```
     concat('JD Change Request ', outputs('Create_item')?['body/ID'], ' - ', replace(replace(triggerBody()?['text'], '/', '-'), ':', '-'), '.docx')
     ```
     Replace `triggerBody()?['text']` with the JobTitle trigger input's key (see Appendix B), or build the name with dynamic content instead.
   - **File Content:** Microsoft Word Document (from **Populate User Doc**)
2. **+** → **SharePoint** → **Grant access to an item or a folder** → rename `Share With Requester`.
   - **Site Address:** your site
   - **Library Name:** JD Change Documents
   - **Id:** ItemId (from **Create User File**)
   - **Recipients:** RequestedBy (trigger)
   - **Roles:** Can view
   - **Message:** *(optional)* `Your job description change request`
   - **Notify Recipients:** No (the agent gives them the link)
3. **+** → **SharePoint** → **Get file properties** → rename `User File Props`.
   - **Site Address** / **Library Name:** same as above
   - **Id:** ItemId (from **Create User File**)
4. **+** → **Set variable** → **Name:** DocLink → **Value** → Expression:
   ```
   concat(outputs('User_File_Props')?['body/{Link}'], '?web=1')
   ```
   `?web=1` makes the file open in Word for the web.

> If `{Link}` doesn't resolve, delete the expression and pick **Link to item** from **User File Props** in dynamic content, then type `?web=1` after it.

### 4.11 Fill and save the HR copy
1. **+** → **Populate a Microsoft Word template** → rename `Populate HR Doc`.
   - **File:** `JD Change Template - HR.docx`
   - Fill every field exactly as in 4.9, plus:

| Field | Value |
|---|---|
| Grade | `outputs('JD')?['GradeInternal']` |
| JobCode | JobCode (trigger) |
| SalaryType | `outputs('JD')?['SalaryInternal']` |
| Status | `outputs('JD')?['StatusInternal']` |
| IndirectFlags | IndirectFlags (trigger) |
| HardStops | HardStops (trigger) |
| LevelRecommendation | LevelRecommendation (trigger) |
| TitleSupportAssessment | TitleSupportAssessment (trigger) |
| HRSummary | HRSummary (trigger) |

2. **+** → **Create file** → rename `Create HR File`.
   - **Folder Path:** `/JD Change Documents - HR`
   - **File Name:** same expression as 4.10, adding ` (HR)` before `.docx`
   - **File Content:** from **Populate HR Doc**
3. **+** → **Get file properties** → rename `HR File Props`.
   - **Library Name:** JD Change Documents - HR
   - **Id:** ItemId (from **Create HR File**)

### 4.12 Save both links on the request
**+** → **SharePoint** → **Update item** → rename `Save Doc Links`.
- **Site Address:** your site · **List Name:** JD Update Requests
- **Id:** ID (from **Create item**)
- **Title:** JobTitle (trigger). Update item needs required columns filled again.
- **UserDocLink:** `variables('DocLink')`
- **HRDocLink:** Expression `concat(outputs('HR_File_Props')?['body/{Link}'], '?web=1')`

That's the end of the Scope.

### 4.13 Make the response run no matter what
1. Drag **Respond to the agent** below the **Build Documents** Scope, if it isn't already there.
2. On **Respond to the agent** → **⋯** → **Configure run after** (or the **Settings** tab → **Run after**):
   - Check **is successful** and **has failed**
   - Uncheck the others → **Done**
3. On **Respond to the agent** → **+ Add an output** → **Text** → name `DocLink` → value: `variables('DocLink')`.
4. **Save**.

If document generation fails, `DocLink` comes back empty, the request is still saved, and the agent tells the user it was submitted without a link. You'll see the failure in the run history.

---

## Part 5 — Update the agent

### 5.1 Refresh the flow node
1. In Copilot Studio, open **Review and Submit JD Update** → find the **Save JD Update Request** node in the **Submit to HR** branch.
2. The new inputs and output may not appear automatically. If not:
   - Note your existing mappings (or keep the table from the update guide handy)
   - Delete the node → **+** → **Add a tool** → **Flow** → **Save JD Update Request** again
   - Re-enter all the existing mappings

### 5.2 Map the new inputs

| Flow input | Value |
|---|---|
| ProposedPurpose | `Global.Changes.Purpose` |
| ProposedDuties | `Global.Changes.PrincipalDuties` |
| ProposedEducation | `Global.Changes.Education` |
| ProposedExperience | `Global.Changes.WorkExperience` |
| ProposedCerts | `Global.Changes.Certifications` |
| ProposedKSA | `Global.Changes.KSA` |

Blank values mean "unchanged," and the child flow shows those sections as plain text.

### 5.3 Capture the output
On the node's **Outputs**, make sure the output variable is named `Topic.DocLink` (rename it if it got a default name).

### 5.4 Update the confirmation message
1. Directly after the flow node, add **Set a variable value** → new variable `Topic.DocLine` → Formula:
   ```powerfx
   If(
     IsBlank(Topic.DocLink),
     "",
     Char(10) & Char(10) & "Here's a copy of your request for your records: [Open your copy](" & Topic.DocLink & ")"
   )
   ```
2. Edit the existing **Submitted!** message so it ends with `{Topic.DocLine}`:

   > Submitted! Your request for **{Topic.JobTitle}** is with HR for review (reference #{Topic.RequestID}).{Topic.DocLine}
   >
   > Anything else I can help with?

   Use whatever title variable you settled on when fixing the InvalidPropertyPath error.

### 5.5 Sign-in requirement
**Grant access** needs the requester's **email**. `System.User.Email` only has a value when the agent requires sign-in:
- **Settings** → **Security** → **Authentication** → **Authenticate with Microsoft** (or your tenant's setup)

If the email is blank, Grant access fails, the Scope fails, and the user gets no link. The request still saves.

**Publish** the agent when you're done.

---

## Part 6 — Testing

Test the flow on its own first, then end to end through the agent.

### 6.1 Flow-only test
1. Open **Save JD Update Request** → **Test** → **Manually**.
2. Enter a real Job Code, your email in RequestedBy, and sample text in **ProposedDuties** only (with one kept line, one new line, and one original line left out).
3. Run it, then check:
   - Both files appear in their libraries
   - The user copy has no Grade, Job Code, Salary/Hourly, or Status
   - Duties show plain, yellow, and red-strikethrough lines correctly
   - Other sections show as plain original text
   - The JD Update Requests item has both links
   - You can open the user copy link

### 6.2 End-to-end tests

| # | Test | Expected |
|---|---|---|
| 1 | Change one duty, submit | Doc shows the old duty struck through and the new one highlighted; link in the Submitted message |
| 2 | Change Purpose (a paragraph) | Old paragraph struck through, new paragraph highlighted |
| 3 | Add a section mid-update | That section's changes appear in the doc |
| 4 | Change nothing in Education | Education appears plain and unchanged |
| 5 | Request a title review | Proposed title and justification appear in both docs |
| 6 | Open the user link as another manager | Access denied |
| 7 | Open the HR library as a manager | Access denied |
| 8 | Force a failure (e.g., rename a template temporarily) | Request still saved; Submitted message has no link |
| 9 | Original duties contain `&` or extra spaces | Shows cleanly, no `&amp;` |
| 10 | A JD section is empty in the list | Section is blank, no error |

---

## Appendix A — Name reference

**Templates:** `JD Change Template - User.docx`, `JD Change Template - HR.docx` (in **JD Templates**)

**Libraries:** JD Templates · JD Change Documents · JD Change Documents - HR

**Repeating sections and their controls:**

| Section | Repeating | Kept | Added | Removed |
|---|---|---|---|---|
| Purpose | PurposeRows | PurposeKept | PurposeAdded | PurposeRemoved |
| Duties | DutiesRows | DutiesKept | DutiesAdded | DutiesRemoved |
| Education | EducationRows | EducationKept | EducationAdded | EducationRemoved |
| Experience | ExperienceRows | ExperienceKept | ExperienceAdded | ExperienceRemoved |
| Certifications | CertsRows | CertsKept | CertsAdded | CertsRemoved |
| KSAs | KSARows | KSAKept | KSAAdded | KSARemoved |

**Single fields (both templates):** JobTitle, RequestID, RequestedBy, RequestDate, Reasons, PeopleManagement, SalesNonSales, RelationshipManager, NMLS, ProposedTitle, TitleJustification

**HR only:** Grade, JobCode, SalaryType, Status, IndirectFlags, HardStops, LevelRecommendation, TitleSupportAssessment, HRSummary

**Flow additions:** child flow **Build Redline Rows** (inputs Original, Proposed; output Rows) · six `Proposed...` trigger inputs · `DocLink` output

---

## Appendix B — Troubleshooting

**How do I see what an expression is actually getting?**
Add a temporary **Compose** with the value, run the flow, and open the run to inspect it. For the JD record, Compose `outputs('JD')` shows every column with its internal name and format.

**How do I find a trigger input's key for expressions?**
Click the trigger → **⋯** → **Peek code**. Inputs are listed under `properties` with keys like `text`, `text_1`, `text_2`. Or skip expressions and insert the input from **Dynamic content**.

**The repeating sections come out empty**
- Make sure the Select's keys **exactly** match the inner control Titles (e.g., `DutiesKept`, not `Duties Kept`).
- Switch the template field back from "entire array" mode to see the expected sub-field names.
- Check that the child flow's `Rows` output isn't empty: expand **Redline Duties** in the run.

**Every line shows as removed and re-added**
The original and proposed text differ invisibly: extra spaces, different bullet characters, or `&amp;` vs `&`. Compose both cleaned versions in the child flow run and compare. Add another `replace(...)` to the cleaning expressions for any extra character you find.

**Original text still has `<div>` or other tags**
Your column may be **Enhanced rich text**. Add replacements for those tags in 3.4, or tell me what the raw text looks like and I'll adjust the cleaning.

**"Click or tap here to enter text" appears in the doc**
That control's placeholder wasn't cleared. Repeat Part 1.3, step 6 for it.

**Highlighting or strikethrough is missing**
The control isn't using its style. Open **Properties** and confirm **Use a style to format text typed into the empty control** is checked with the right style.

**Grant access fails**
RequestedBy is blank or isn't a valid email in your tenant. See Part 5.5.

**Choice column shows `{"Value": ...}` in the doc**
Read it as `outputs('JD')?['InternalName']?['Value']`.

**Run a Child Flow isn't available**
Both flows must be in the **same solution**, and the child must use the **Manually trigger a flow** trigger with a **Respond to a PowerApp or flow** action.
