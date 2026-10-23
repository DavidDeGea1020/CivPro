# HR Review Email: Click-by-Click Build Guide

**Agent:** Job Description Expert (classic Copilot Studio)
**Adds:** a designed HR email, sent automatically every time a manager submits a JD update request.
**Builds on:** *JD-Update-Feature-Build-Guide*, *JD-Change-Document-Build-Guide*, *JD-Review-Router-Build-Guide*
**Files that come with this guide:**
- `HR Review Email.html`: the production template, converted from your Claude Design file
- `HR Review Email - Sample Preview.html`: the same template filled with the "Full" sample, for reference only (don't upload it)

---

## Contents

1. [How it works](#1-how-it-works)
2. [Part 1 — Upload the template](#part-1--upload-the-template)
3. [Part 2 — SharePoint columns and the mailbox setting](#part-2--sharepoint-columns-and-the-mailbox-setting)
4. [Part 3 — Copilot Studio: capture the review data](#part-3--copilot-studio-capture-the-review-data)
5. [Part 4 — Save JD Update Request: store the new data](#part-4--save-jd-update-request-store-the-new-data)
6. [Part 5 — Child flow: create it and gather the data](#part-5--child-flow-create-it-and-gather-the-data)
7. [Part 6 — Child flow: build the lists, flags and values](#part-6--child-flow-build-the-lists-flags-and-values)
8. [Part 7 — Child flow: assemble the HTML](#part-7--child-flow-assemble-the-html)
9. [Part 8 — Child flow: attach, send and respond](#part-8--child-flow-attach-send-and-respond)
10. [Part 9 — Call the child flow from Save JD Update Request](#part-9--call-the-child-flow-from-save-jd-update-request)
11. [Part 10 — Test](#part-10--test)
12. [Appendix A — Placeholder reference](#appendix-a--placeholder-reference)
13. [Appendix B — Troubleshooting](#appendix-b--troubleshooting)
14. [Appendix C — Changing the template later](#appendix-c--changing-the-template-later)

---

## 1. How it works

```
Manager clicks Submit to HR
  └─ Save JD Update Request (existing flow)
       ├─ Create item  (now also saves FinalReviewJSON, ManagerNotes)
       ├─ Build Documents scope  (now also saves HRDocFileId, HRDocName)
       ├─ Respond to the agent   ← manager gets their answer here
       └─ Run a Child Flow: Send HR Review Email   ← NEW, runs after the manager is answered
            1. Read the request, the JD record, the requester's profile
            2. Turn the data into lists, flags and values
            3. Load HR Review Email.html from JD Templates
            4. Remove empty sections  (BLOCK markers)
            5. Build chips and impact cards  (REPEAT markers)
            6. Fill every {{Placeholder}}
            7. Attach the HR redline document and send to the HR mailbox
```

**How the template works**

| Marker | Example | What the flow does |
|---|---|---|
| `{{Name}}` | `{{JobTitle}}` | Replaces it with a value. |
| `<!--BLOCK:Name-->` … `<!--/BLOCK:Name-->` | `<!--BLOCK:Level-->` | Keeps or deletes everything between the markers. |
| `<!--REPEAT:Name-->` … `<!--/REPEAT:Name-->` | `<!--REPEAT:Reason-->` | Copies the snippet between the markers once per item. |

**Blocks in the template (14):** RequesterTitle, RequesterDept, OtherReason, AddedSections, Flags, NoFlags, DocOk, DocMissing, Level, LevelResponse (inside Level), Title, Indirect, HardStops, ManagerNotes

**Repeats (4):** Reason, Section, FlagChip (inside Flags), Indirect (inside Indirect)

**Build order:** Parts 1 → 10 in order. The child flow (Parts 5–8) must exist before Part 9 can call it.

---

## Part 1 — Upload the template

### 1.1 What changed from your design

`HR Review Email.html` is your Claude Design file converted for Power Automate. The look is the same; these are the only changes:

- Removed the design tool's wrapper, the 680px canvas and the "Subject line / Inbox preview" mock box.
- Every sample value replaced with a `{{Placeholder}}`, and every `href="#"` with a URL placeholder.
- Added the BLOCK and REPEAT markers.
- Merged the **No flags raised** and **document couldn't be generated** states (from the Minimal artboard) into the same file.
- Indirect-impact card colors are now placeholders (`{{ImpactCardBg}}`, `{{ImpactChipBg}}`) so one snippet can show Confirmed, Manager says no and Unclear.
- **Outlook fixes:** an Outlook-only 600px wrapper (desktop Outlook ignores `max-width` and would stretch the email), `mso-padding-alt` on the buttons (desktop Outlook ignores padding on links, which shrank the buttons), and a hidden preheader line for the inbox preview.
- Added phone rules so the three hero columns and two-column grids stack on small screens.
- Header renamed from "Job Description Jarvis" to "Job Description Expert" to match the footer. Search the file for `Job Description Expert` if you want a different name.

The file is plain ASCII, 48 KB. It was tested by running the exact block, repeat and placeholder steps from Part 7 against four scenarios (all blocks, no blocks, Level without the manager's response, Level removed) and rendering the results at desktop and phone widths.

### 1.2 Upload it

1. Open the SharePoint site that holds **JD Templates**.
2. Open the **JD Templates** library.
3. Click **Upload** → **Files** → choose `HR Review Email.html` → **Open**.
4. Confirm the file shows in the library with exactly that name (including the spaces).

> **Do this in every environment** (DEV, UAT, QA), same as the Word templates. The template is not part of the solution.

> **Don't open and save the file in SharePoint or Word.** Some editors rewrite HTML. If you need to change it, edit a local copy in a text editor (VS Code, Notepad) and upload again. See Appendix C.

---

## Part 2 — SharePoint columns and the mailbox setting

### 2.1 New columns on JD Update Requests

1. Open the **JD Update Requests** list.
2. For each row below: click **+ Add column** → choose the type → type the **Name** → **Save**.

| Name | Type | Notes |
|---|---|---|
| `FinalReviewJSON` | Multiple lines of text | The whole Final Review prompt result |
| `ManagerNotes` | Multiple lines of text | **Skip if you already built Router guide Appendix C** |
| `HRDocFileId` | Multiple lines of text | File ID of the HR redline document (can exceed 255 characters) |
| `HRDocName` | Single line of text | File name of the HR redline document |

3. For each **Multiple lines of text** column you just added: click the column header → **Column settings** → **Edit** → **More options** → make sure **Use enhanced rich text** is **off** → **Save**.

> Rich text would wrap the values in HTML and break `json()` in Part 5.

### 2.2 Environment variable for the HR mailbox

This lets DEV, UAT and QA send to different addresses without editing the flow.

1. Go to **make.powerapps.com** → pick your **DEV** environment → **Solutions** → open your JD solution.
2. Click **+ New** → **More** → **Environment variable**.
3. Fill in:
   - **Display name:** `JD HR Review Mailbox`
   - **Data type:** Text
   - **Default value:** the address HR reviews should go to in DEV (use your own address while testing)
4. Click **Save**.

> When you import the solution into UAT and QA, the import asks for this value. Enter that environment's HR mailbox.

---

## Part 3 — Copilot Studio: capture the review data

Three changes: the Final Review prompt returns more data, the router tags level notes, and the submit branch passes the new data to the flow.

### 3.1 Add an input to the JD Final Review prompt

1. In Copilot Studio, open the **Job Description Expert** agent.
2. Click **Tools** in the top nav → click **JD Final Review** → **Edit** (opens the prompt editor).
3. Click **+ Add content** → **Text** input (or the input/variable icon) → **+ New input**:
   - **Name:** `IndirectEvidence`
   - **Sample data:** `Relationship Manager: Manages a portfolio of ~40 business clients` (new line) `People Management: Trains new tellers`
4. In the instructions, find the line `Manager's answers about indirect impacts: {IndirectConfirmations}`. Put the cursor at the end of that line, press **Enter**, and type:
   ```
   Possible indirect impacts the agent detected while reviewing sections:
   ```
   then a space, then insert the **IndirectEvidence** chip (type `/` or use **+ Add content** → pick IndirectEvidence).

### 3.2 Add tasks to the prompt

1. Find the `RULES` heading in the instructions.
2. Put the cursor on the empty line **above** `RULES` and paste:

```
4) LEVELS COMPARED
In levels_compared, list the title of every level in the related levels
JSON, separated by ", ". Leave it empty if there are none.

5) INDIRECT IMPACT ITEMS
In indirect_items, add one item for each field that appears in the detected
indirect impacts or in the manager's answers about indirect impacts.
- field: exactly one of "People Management", "Sales/Non-Sales",
  "Relationship Manager", "NMLS Required"
- evidence: a short phrase describing what in the changes suggested this
  field may change. Use the detected evidence when given.
- answer: the manager's answer, short, in their own words where possible
- status: "Confirmed" if the manager said the role now has this,
  "Manager says no" if they said it does not, "Unclear" otherwise
Return an empty list if there are no indirect impacts.

FORMAT FOR change_summary
Write change_summary as one line per changed section. Start each line with
"- ", then the section name and a colon, then what changed. Example:
- Principal Duties: added managing a portfolio of ~40 business clients; removed processing routine cash transactions.
Use no bold or other markdown.
```

3. If your existing instructions already describe how to write `change_summary`, delete that old description so the two don't conflict.

### 3.3 Update the JSON output format

1. In the prompt editor, find the **Output** setting (JSON) → open the example/format.
2. Replace it with the following. **If your current format has fields not listed here, add them back in.**

```json
{
  "level_match": false,
  "matched_level_title": "",
  "level_recommendation": "",
  "levels_compared": "",
  "title_supported": true,
  "title_support_assessment": "",
  "change_summary": "",
  "hr_summary": "",
  "indirect_items": [
    {
      "field": "",
      "evidence": "",
      "answer": "",
      "status": ""
    }
  ]
}
```

3. Click **Test**. Check that `indirect_items` comes back as a list and `change_summary` uses `- Section:` lines.
4. Click **Save**.

### 3.4 Map the new input in Review and Submit JD Update

1. **Topics** → open **Review and Submit JD Update**.
2. Find the **JD Final Review** tool node (Part 11.5 of the update guide).
3. The new **IndirectEvidence** input now shows on the node. If it doesn't, click the node's **⋯** → **Refresh**, or delete and re-add the node and re-enter its mappings.
4. Click the **IndirectEvidence** value → **…** → **Formula** → paste:

```powerfx
With(
  {
    Items: Filter(
      Table(
        {F: "People Management", E: Global.PendingChecks.PeopleManagement},
        {F: "Sales/Non-Sales", E: Global.PendingChecks.SalesNonSales},
        {F: "Relationship Manager", E: Global.PendingChecks.RelationshipManager},
        {F: "NMLS Required", E: Global.PendingChecks.NMLS}
      ),
      !IsBlank(E)
    )
  },
  If(CountRows(Items) = 0, "None", Concat(Items, F & ": " & E, Char(10)))
)
```

5. Click **Insert** → **Save** the topic.

> Your existing title-support gate and summary still read `change_summary` and `title_supported` from the same result, so nothing else in the topic changes. The summary still shows the change lines as a list because each line starts with `- `.

### 3.5 Tag level-related manager notes in the router

The email shows notes about the level overlap inside the Level section, and all other notes in Manager Notes. The router tags them so the flow can tell them apart.

1. **Tools** → **JD Review Router** → **Edit**.
2. Find the line that describes the `hr_note` intent (it starts with `- "hr_note":`).
3. At the end of that intent's description, add:
   ```
   If the note responds to the level overlap, start the note with "[Level] ".
   ```
4. Click **Test** with the sample: `I don't agree it's a UB2, they don't handle commercial clients`. The `note` field should start with `[Level] `.
5. Click **Save**.

### 3.6 Pass the new data to the save flow

Do this after Part 4.1 (the flow needs the new inputs first). Come back here once that's done.

1. **Topics** → **Review and Submit JD Update** → find the **Submit to HR** branch → the **Save JD Update Request** flow node.
2. The flow node doesn't pick up new inputs automatically. Click the node's **⋯** → **Refresh**. If **FinalReviewJSON** and **ManagerNotes** still don't appear, delete the node, add it again (**+** → **Add a tool** → **Flow** → **Save JD Update Request**), and re-enter **every** mapping from update guide Part 11.7 and change document guide Part 5.
3. Map the new inputs:

| Input | Value |
|---|---|
| FinalReviewJSON | The raw text of the Final Review result: the same value you wrap in `ParseJSON(...)` to create **F** (for example `Topic.Final.text`). |
| ManagerNotes | `Global.ManagerNotes` |

4. If you built Router guide Appendix C earlier, **HRSummary** should already be `Text(Topic.F.hr_summary)`. If HRSummary still appends the manager notes, change it to `Text(Topic.F.hr_summary)` now, so notes don't appear twice in the email.
5. Make sure the **Output** variable is still named `Topic.DocLink` (re-adding the node can rename it).
6. **Save** the topic.

---

## Part 4 — Save JD Update Request: store the new data

### 4.1 Add the trigger inputs

1. Open the **Save JD Update Request** flow (from your solution) → **Edit**.
2. Click the trigger **When an agent calls the flow**.
3. Click **+ Add an input** → **Text** → name `FinalReviewJSON`.
4. Click **+ Add an input** → **Text** → name `ManagerNotes` (skip if you added it in Router Appendix C).
5. For each new input: click its **⋯** → **Make the field optional**.

### 4.2 Save them in Create item

1. Click **Create item**.
2. **FinalReviewJSON** → dynamic content → **FinalReviewJSON** (trigger).
3. **ManagerNotes** → dynamic content → **ManagerNotes** (trigger).

### 4.3 Save the HR document's ID and name

1. Open the **Build Documents** scope → click **Save Doc Links** (Update item, change document guide Part 4.12).
2. **HRDocFileId** → **Expression** tab →
   ```
   outputs('Create_HR_File')?['body/Id']
   ```
   → **Add**.
3. **HRDocName** → **Expression** tab →
   ```
   outputs('Create_HR_File')?['body/Name']
   ```
   → **Add**.

> If your Create file action has a different name, use it, with spaces as underscores. To check, open a past run → **Create HR File** → **Show raw outputs** → look for `"Id"` (starts like `%252f...`) and `"Name"`.

4. **Save** the flow. Now go back and do Part 3.6.

---

## Part 5 — Child flow: create it and gather the data

### 5.1 Create the flow

1. **make.powerapps.com** → **Solutions** → your JD solution.
2. **+ New** → **Automation** → **Cloud flow** → **Instant**.
3. **Flow name:** `Send HR Review Email`.
4. Choose **Manually trigger a flow** → **Create**.
5. Click the trigger → **+ Add an input** → **Number** → name it `RequestID`.

### 5.2 Initialize variables

Variables must be set up at the top of the flow, outside any scope or loop.

1. **+ New step** (or **+** under the trigger) → **Initialize variable**.
   - **Name:** `Html` · **Type:** String · **Value:** *(empty)*
2. **+** → **Initialize variable**.
   - **Name:** `Attachments` · **Type:** Array · **Value:** `[]`

### 5.3 Settings

1. **+** → **Compose** → rename `SiteUrl` → **Inputs:** your site URL, e.g. `https://TENANT.sharepoint.com/sites/SITE` (no trailing slash).
2. **+** → **Compose** → rename `HRMailbox` → **Inputs:** click the field → **dynamic content** (lightning icon) → under **Environment variables**, pick **JD HR Review Mailbox**.

### 5.4 Get the request

1. **+** → **SharePoint** → **Get item** → rename `Get Request`.
   - **Site Address:** your site
   - **List Name:** JD Update Requests
   - **Id:** **RequestID** (trigger)
2. **+** → **Compose** → rename `FR` → **Inputs** → **Expression** tab:
   ```
   json(if(empty(body('Get_Request')?['FinalReviewJSON']), '{}', trim(replace(replace(body('Get_Request')?['FinalReviewJSON'], '```json', ''), '```', ''))))
   ```
   → **Add**.

> This turns the saved text back into an object, and strips code fences in case the prompt ever adds them. From here, read a Final Review field as `outputs('FR')?['field_name']`.

### 5.5 Get the JD record (restricted fields)

Copy this from your change document flow (Part 4.5) so the filter and internal names match.

1. **+** → **SharePoint** → **Get items** → rename `Get JD`.
   - **Site Address:** your JD site · **List Name:** your JD list
   - **Filter Query:** `JobCodeInternalName eq '` + **JobCode** (from **Get Request**) + `'`
   - **Top Count:** `1`
2. **+** → **Compose** → rename `JD` → **Expression:**
   ```
   first(body('Get_JD')?['value'])
   ```

### 5.6 Get the requester's profile

1. **+** → **Office 365 Users** → **Get user profile (V2)** → rename `Get Requester`.
   - **User (UPN):** **RequestedBy** (from **Get Request**)
2. **+** → **Compose** → rename `RequesterName` → **Expression:**
   ```
   coalesce(body('Get_Requester')?['displayName'], body('Get_Request')?['RequestedBy'])
   ```
3. On **RequesterName**: **⋯** → **Configure run after** (or **Settings** → **Run after**) → check **is successful**, **has failed**, **is skipped**, **has timed out** → **Done**.

> If RequestedBy holds a display name instead of an email, the lookup fails and this falls back to RequestedBy, so the email still sends.

4. **+** → **Compose** → rename `RequesterTitle` → **Expression:** `coalesce(body('Get_Requester')?['jobTitle'], '')`
5. **+** → **Compose** → rename `RequesterDept` → **Expression:** `coalesce(body('Get_Requester')?['department'], '')`
6. **+** → **Compose** → rename `RequesterEmail` → **Expression:** `coalesce(body('Get_Requester')?['mail'], body('Get_Request')?['RequestedBy'])`

### 5.7 Classification

One object holding the 8 restricted and indirect values as display text. The four indirect keys **must** match the field names the prompt uses, exactly.

1. **+** → **Compose** → rename `Classification`.
2. In **Inputs**, type the JSON below. Replace each `...` with the right expression for that column, using the internal names from change document guide Part 2.5. Type each `@{...}` as shown, or click into the quotes and add it from the **Expression** tab.

```json
{
  "Job Code": "@{...}",
  "Grade": "@{...}",
  "Salary Type": "@{...}",
  "Status": "@{...}",
  "People Management": "@{...}",
  "Sales/Non-Sales": "@{...}",
  "Relationship Manager": "@{...}",
  "NMLS Required": "@{...}"
}
```

**Which expression to use, by column type:**

| Column type | Expression (replace `Col` with the internal name) |
|---|---|
| Text | `outputs('JD')?['Col']` |
| Choice | `outputs('JD')?['Col']?['Value']` |
| Yes/No | `if(equals(outputs('JD')?['Col'], true), 'Yes', 'No')` |

Example: `"Grade": "@{outputs('JD')?['Grade']?['Value']}"`

> Not sure of a column's type? Open a past run of this flow → **Get JD** → **Show raw outputs**. A value like `{"Value": "07"}` is a Choice, and `true`/`false` is Yes/No.

---

## Part 6 — Child flow: build the lists, flags and values

**How to set up the actions used in this part:**
- **Filter array:** **From** takes an expression. For the condition, click **Edit in advanced mode** and paste the `@...` line.
- **Select:** **From** takes an expression. For **Map**, click the **Switch Map to text mode** icon (**T**) and paste the expression, unless the step says key/value mode.

### 6.1 Blocked requests (HardStops)

1. **+** → **Filter array** → rename `HardStop Lines`.
   - **From:**
     ```
     split(replace(coalesce(body('Get_Request')?['HardStops'], ''), decodeUriComponent('%0D'), ''), decodeUriComponent('%0A'))
     ```
   - **Advanced mode:** `@not(equals(trim(item()), ''))`
2. **+** → **Select** → rename `HardStop Clean`. This removes the leading `- ` and escapes the text.
   - **From:** `body('HardStop_Lines')`
   - **Map (text mode):**
     ```
     replace(replace(replace(if(startsWith(trim(item()), '- '), trim(substring(trim(item()), 2, sub(length(trim(item())), 2))), trim(item())), '&', '&amp;'), '<', '&lt;'), '>', '&gt;')
     ```
3. **+** → **Select** → rename `HardStop Items`.
   - **From:** `body('HardStop_Clean')`
   - **Map (text mode):**
     ```
     concat('<li style="margin:0 0 8px 0;">', replace(replace(item(), '[', '<b>['), ']', ']</b>'), '</li>')
     ```
4. **+** → **Compose** → rename `HardStopsHtml`:
   ```
   if(empty(body('HardStop_Items')), '', concat('<ul style="margin:0 0 0 20px;padding:0;">', join(body('HardStop_Items'), ''), '</ul>'))
   ```

### 6.2 Manager notes

1. **+** → **Filter array** → rename `Note Lines`.
   - **From:**
     ```
     split(replace(coalesce(body('Get_Request')?['ManagerNotes'], ''), decodeUriComponent('%0D'), ''), decodeUriComponent('%0A'))
     ```
   - **Advanced mode:** `@not(equals(trim(item()), ''))`
2. **+** → **Filter array** → rename `Level Notes`.
   - **From:** `body('Note_Lines')`
   - **Advanced mode:** `@contains(item(), '[Level]')`
3. **+** → **Filter array** → rename `Other Notes`.
   - **From:** `body('Note_Lines')`
   - **Advanced mode:** `@not(contains(item(), '[Level]'))`
4. **+** → **Compose** → rename `LevelResponse`:
   ```
   trim(replace(replace(join(body('Level_Notes'), ' '), '- [Level] ', ''), '[Level] ', ''))
   ```
5. **+** → **Select** → rename `Note Clean`.
   - **From:** `body('Other_Notes')`
   - **Map (text mode):** the same expression as **HardStop Clean** (step 6.1.2).
6. **+** → **Select** → rename `Note Items`.
   - **From:** `body('Note_Clean')`
   - **Map (text mode):** `concat('<li style="margin:0 0 8px 0;">', item(), '</li>')`
7. **+** → **Compose** → rename `NotesHtml`:
   ```
   if(empty(body('Note_Items')), '', concat('<ul style="margin:0 0 0 20px;padding:0;">', join(body('Note_Items'), ''), '</ul>'))
   ```

### 6.3 Summary of changes

1. **+** → **Filter array** → rename `CS Lines`.
   - **From:**
     ```
     split(replace(coalesce(string(outputs('FR')?['change_summary']), ''), decodeUriComponent('%0D'), ''), decodeUriComponent('%0A'))
     ```
   - **Advanced mode:** `@not(equals(trim(item()), ''))`
2. **+** → **Select** → rename `CS Clean`.
   - **From:** `body('CS_Lines')`
   - **Map (text mode):** the same expression as **HardStop Clean**.
3. **+** → **Select** → rename `CS Items`. This bolds the section name before the first colon.
   - **From:** `body('CS_Clean')`
   - **Map (text mode):**
     ```
     concat('<li style="margin:0 0 8px 0;">', if(greater(indexOf(item(), ':'), 0), concat('<b>', substring(item(), 0, add(indexOf(item(), ':'), 1)), '</b>', substring(item(), add(indexOf(item(), ':'), 1), sub(length(item()), add(indexOf(item(), ':'), 1)))), item()), '</li>')
     ```
4. **+** → **Compose** → rename `ChangeSummaryHtml`:
   ```
   if(empty(body('CS_Items')), '', concat('<ul style="margin:0 0 0 20px;padding:0;">', join(body('CS_Items'), ''), '</ul>'))
   ```

### 6.4 Reasons and sections

1. **+** → **Filter array** → rename `Reason List`.
   - **From:** `split(coalesce(body('Get_Request')?['Reasons'], ''), ',')`
   - **Advanced mode:** `@not(equals(trim(item()), ''))`
2. **+** → **Filter array** → rename `Section List`.
   - **From:** `split(coalesce(body('Get_Request')?['SectionsChanged'], ''), ',')`
   - **Advanced mode:** `@not(equals(trim(item()), ''))`

> If SectionsChanged holds internal keys like `PrincipalDuties` instead of "Principal Duties", tell me and I'll give you a mapping expression for the chips.

### 6.5 True/false switches

1. **+** → **Compose** → rename `LevelMatch`:
   ```
   equals(toLower(string(outputs('FR')?['level_match'])), 'true')
   ```
2. **+** → **Compose** → rename `TitleRequested`:
   ```
   equals(toLower(string(body('Get_Request')?['TitleReviewRequested'])), 'true')
   ```
3. **+** → **Compose** → rename `TitleSupported`:
   ```
   equals(toLower(string(outputs('FR')?['title_supported'])), 'true')
   ```

### 6.6 Indirect impact items

1. **+** → **Select** → rename `Indirect Items`.
   - **From:** `coalesce(outputs('FR')?['indirect_items'], json('[]'))`
   - **Map:** leave it in **key/value** mode. Add five rows. Each key goes on the left; each value goes on the right through the **Expression** tab:

| Key | Value (expression) |
|---|---|
| `field` | `replace(replace(replace(string(item()?['field']), '&', '&amp;'), '<', '&lt;'), '>', '&gt;')` |
| `current` | `replace(replace(replace(string(coalesce(outputs('Classification')?[string(item()?['field'])], 'Unknown')), '&', '&amp;'), '<', '&lt;'), '>', '&gt;')` |
| `evidence` | `if(empty(item()?['evidence']), 'Not noted', replace(replace(replace(string(item()?['evidence']), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'))` |
| `answer` | `if(empty(item()?['answer']), 'No answer recorded', replace(replace(replace(string(item()?['answer']), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'))` |
| `status` | `if(contains(createArray('Confirmed', 'Manager says no'), string(item()?['status'])), string(item()?['status']), 'Unclear')` |

> The values are escaped here, so the repeat step in Part 7 drops them in as they are.

### 6.7 Flags

1. **+** → **Compose** → rename `Flag Base` → **Inputs:**

```json
[
  {
    "label": "Level overlap: @{outputs('FR')?['matched_level_title']}",
    "show": "@{if(outputs('LevelMatch'), 'yes', 'no')}"
  },
  {
    "label": "Title review requested",
    "show": "@{if(outputs('TitleRequested'), 'yes', 'no')}"
  },
  {
    "label": "@{if(equals(length(body('HardStop_Lines')), 1), 'Blocked request', concat(length(body('HardStop_Lines')), ' blocked requests'))}",
    "show": "@{if(greater(length(body('HardStop_Lines')), 0), 'yes', 'no')}"
  },
  {
    "label": "Manager notes",
    "show": "@{if(greater(length(body('Note_Lines')), 0), 'yes', 'no')}"
  }
]
```

2. **+** → **Filter array** → rename `Flag Shown`.
   - **From:** `outputs('Flag_Base')`
   - **Advanced mode:** `@equals(item()?['show'], 'yes')`
3. **+** → **Select** → rename `Flag Labels`.
   - **From:** `body('Flag_Shown')` · **Map (text mode):** `item()?['label']`
4. **+** → **Filter array** → rename `Confirmed Impacts`.
   - **From:** `body('Indirect_Items')`
   - **Advanced mode:** `@equals(item()?['status'], 'Confirmed')`
5. **+** → **Select** → rename `Impact Labels`.
   - **From:** `body('Confirmed_Impacts')` · **Map (text mode):** `concat('Indirect impact: ', item()?['field'])`
6. **+** → **Compose** → rename `FlagChips`:
   ```
   union(body('Flag_Labels'), body('Impact_Labels'))
   ```

### 6.8 Dates, links, subject and preheader

1. **+** → **Compose** → rename `SubmittedDate`:
   ```
   concat(convertFromUtc(body('Get_Request')?['Created'], 'Eastern Standard Time', 'MMM d, yyyy'), ' · ', convertFromUtc(body('Get_Request')?['Created'], 'Eastern Standard Time', 'h:mm tt'), ' ET')
   ```
2. **+** → **Compose** → rename `DocDownloadUrl`:
   ```
   concat(outputs('SiteUrl'), '/_layouts/15/download.aspx?SourceUrl=', encodeUriComponent(decodeUriComponent(replace(coalesce(body('Get_Request')?['HRDocLink'], ''), '?web=1', ''))))
   ```
3. **+** → **Compose** → rename `Subject`:
   ```
   concat(if(greater(length(outputs('FlagChips')), 0), '[Flagged] ', ''), 'JD Update #', body('Get_Request')?['ID'], ' · ', body('Get_Request')?['Title'], ' · ', outputs('RequesterName'))
   ```
4. **+** → **Compose** → rename `Preheader`:
   ```
   concat(outputs('RequesterName'), ' · ', body('Get_Request')?['Title'], ' · ', if(greater(length(outputs('FlagChips')), 0), concat(length(outputs('FlagChips')), ' items flagged for review'), 'No flags raised'))
   ```

---

## Part 7 — Child flow: assemble the HTML

### 7.1 Load the template

1. **+** → **SharePoint** → **Get file content using path** → rename `Get Template`.
   - **Site Address:** the site with **JD Templates**
   - **File Path:** click the folder icon → **JD Templates** → **HR Review Email.html**
2. **+** → **Set variable** → **Name:** `Html` → **Value** → **Expression:**
   ```
   if(contains(string(body('Get_Template')), '$content'), base64ToString(body('Get_Template')?['$content']), string(body('Get_Template')))
   ```

### 7.2 Remove empty sections (blocks)

1. **+** → **Compose** → rename `Block List` → **Inputs:**

```json
[
  {"name": "RequesterTitle", "keep": "@{if(empty(outputs('RequesterTitle')), 'no', 'yes')}"},
  {"name": "RequesterDept",  "keep": "@{if(empty(outputs('RequesterDept')), 'no', 'yes')}"},
  {"name": "OtherReason",    "keep": "@{if(empty(body('Get_Request')?['OtherReason']), 'no', 'yes')}"},
  {"name": "AddedSections",  "keep": "@{if(empty(body('Get_Request')?['SectionsAddedMidUpdate']), 'no', 'yes')}"},
  {"name": "Flags",          "keep": "@{if(greater(length(outputs('FlagChips')), 0), 'yes', 'no')}"},
  {"name": "NoFlags",        "keep": "@{if(greater(length(outputs('FlagChips')), 0), 'no', 'yes')}"},
  {"name": "DocOk",          "keep": "@{if(empty(body('Get_Request')?['HRDocLink']), 'no', 'yes')}"},
  {"name": "DocMissing",     "keep": "@{if(empty(body('Get_Request')?['HRDocLink']), 'yes', 'no')}"},
  {"name": "Level",          "keep": "@{if(outputs('LevelMatch'), 'yes', 'no')}"},
  {"name": "LevelResponse",  "keep": "@{if(empty(outputs('LevelResponse')), 'no', 'yes')}"},
  {"name": "Title",          "keep": "@{if(outputs('TitleRequested'), 'yes', 'no')}"},
  {"name": "Indirect",       "keep": "@{if(greater(length(body('Indirect_Items')), 0), 'yes', 'no')}"},
  {"name": "HardStops",      "keep": "@{if(greater(length(body('HardStop_Lines')), 0), 'yes', 'no')}"},
  {"name": "ManagerNotes",   "keep": "@{if(greater(length(body('Other_Notes')), 0), 'yes', 'no')}"}
]
```

2. **+** → **Apply to each** → rename `Apply Blocks` → **Select an output from previous steps:** `outputs('Block_List')`.
3. Check the loop runs one item at a time: **Apply Blocks** → **⋯** → **Settings** → **Concurrency Control** must be **Off** → **Done**.
4. **Inside** the loop: **+** → **Compose** → rename `Block Step` → **Expression:**
   ```
   if(or(equals(item()?['keep'], 'yes'), not(contains(variables('Html'), concat('<!--BLOCK:', item()?['name'], '-->')))), variables('Html'), concat(first(split(variables('Html'), concat('<!--BLOCK:', item()?['name'], '-->'))), last(split(variables('Html'), concat('<!--/BLOCK:', item()?['name'], '-->')))))
   ```
5. **Inside** the loop, below Block Step: **+** → **Set variable** → **Html** → **Value:** `outputs('Block_Step')`.

> A flow can't set a variable using its own value in the same step. That's why each loop has a Compose followed by a Set variable.

> **The `contains()` check matters.** LevelResponse sits inside Level. If Level is removed first, LevelResponse's markers are already gone. Without the check, `split` on a missing marker returns the whole email twice.

### 7.3 Build the chips and cards (repeats)

Each repeat uses the same four steps: grab the snippet, build one copy per item, swap the copies in, and save to Html. **Every step has the same `contains()` guard**: Flags and Indirect may already have been removed in 7.2, and without the guard the email would be duplicated.

All of these go **below** the Apply Blocks loop, not inside it.

#### 7.3a Reasons

1. **+** → **Compose** → rename `Reason Snippet`:
   ```
   if(contains(variables('Html'), '<!--REPEAT:Reason-->'), first(split(last(split(variables('Html'), '<!--REPEAT:Reason-->')), '<!--/REPEAT:Reason-->')), '')
   ```
2. **+** → **Select** → rename `Reason Html`.
   - **From:** `body('Reason_List')`
   - **Map (text mode):**
     ```
     replace(outputs('Reason_Snippet'), '{{Reason}}', replace(replace(replace(trim(item()), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'))
     ```
3. **+** → **Compose** → rename `After Reasons`:
   ```
   if(contains(variables('Html'), '<!--REPEAT:Reason-->'), concat(first(split(variables('Html'), '<!--REPEAT:Reason-->')), join(body('Reason_Html'), ''), last(split(variables('Html'), '<!--/REPEAT:Reason-->'))), variables('Html'))
   ```
4. **+** → **Set variable** → **Html** → `outputs('After_Reasons')`

#### 7.3b Sections, flag chips and impact cards

Three more repeats, built exactly like 7.3a: 4 actions each, 12 in total. All of them go on the **main line**, directly below the **Set variable** that ends 7.3a, **not** inside the Apply Blocks loop. Build them in this order: Sections, Flag chips, Impact cards.

> **Entering expressions:** click into the field → click the **fx** icon (new designer) or the **Expression** tab (classic designer) → paste → **Add** (or **OK**).
> **Renaming:** click the action's title (or **⋯** → **Rename**), type the new name, press **Enter**. Rename **before** you reference an action anywhere else.

---

##### Sections (4 actions)

**Action 1: Section Snippet**
1. Below the last **Set variable** from 7.3a, click **+** → **Add an action**.
2. Search `Compose` → choose **Compose** (Data Operation).
3. Rename it `Section Snippet`.
4. Click **Inputs** → **Expression** → paste:
   ```
   if(contains(variables('Html'), '<!--REPEAT:Section-->'), first(split(last(split(variables('Html'), '<!--REPEAT:Section-->')), '<!--/REPEAT:Section-->')), '')
   ```
5. **Add**.

**Action 2: Section Html**
1. Below **Section Snippet**: **+** → **Add an action** → search `Select` → choose **Select** (Data Operation).
2. Rename it `Section Html`.
3. Click **From** → **Expression** → paste `body('Section_List')` → **Add**.
4. On **Map**, click the **Switch Map to text mode** icon (the **T** on the right of the Map rows). The two key/value boxes become one box.
5. Click that box → **Expression** → paste:
   ```
   replace(outputs('Section_Snippet'), '{{Section}}', replace(replace(replace(trim(item()), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'))
   ```
6. **Add**.

**Action 3: After Sections**
1. Below **Section Html**: **+** → **Add an action** → **Compose**.
2. Rename it `After Sections`.
3. **Inputs** → **Expression** → paste:
   ```
   if(contains(variables('Html'), '<!--REPEAT:Section-->'), concat(first(split(variables('Html'), '<!--REPEAT:Section-->')), join(body('Section_Html'), ''), last(split(variables('Html'), '<!--/REPEAT:Section-->'))), variables('Html'))
   ```
4. **Add**.

**Action 4: Set variable (Html)**
1. Below **After Sections**: **+** → **Add an action** → search `Set variable` → choose **Set variable** (Variable).
2. Rename it `Set Html After Sections` (optional, but it keeps the run history readable).
3. **Name:** pick **Html** from the dropdown.
4. **Value** → **Expression** → `outputs('After_Sections')` → **Add**.

---

##### Flag chips (4 actions)

**Action 1: Flag Snippet**
1. Below **Set Html After Sections**: **+** → **Add an action** → **Compose**.
2. Rename it `Flag Snippet`.
3. **Inputs** → **Expression** → paste:
   ```
   if(contains(variables('Html'), '<!--REPEAT:FlagChip-->'), first(split(last(split(variables('Html'), '<!--REPEAT:FlagChip-->')), '<!--/REPEAT:FlagChip-->')), '')
   ```
4. **Add**.

**Action 2: Flag Html**
1. Below **Flag Snippet**: **+** → **Add an action** → **Select**.
2. Rename it `Flag Html`.
3. **From** → **Expression** → `outputs('FlagChips')` → **Add**.
4. **Map** → **Switch Map to text mode** (**T**).
5. Click the box → **Expression** → paste:
   ```
   replace(outputs('Flag_Snippet'), '{{FlagChip}}', replace(replace(replace(string(item()), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'))
   ```
6. **Add**.

**Action 3: After Flags**
1. Below **Flag Html**: **+** → **Add an action** → **Compose**.
2. Rename it `After Flags`.
3. **Inputs** → **Expression** → paste:
   ```
   if(contains(variables('Html'), '<!--REPEAT:FlagChip-->'), concat(first(split(variables('Html'), '<!--REPEAT:FlagChip-->')), join(body('Flag_Html'), ''), last(split(variables('Html'), '<!--/REPEAT:FlagChip-->'))), variables('Html'))
   ```
4. **Add**.

**Action 4: Set variable (Html)**
1. Below **After Flags**: **+** → **Add an action** → **Set variable**.
2. Rename it `Set Html After Flags`.
3. **Name:** **Html**.
4. **Value** → **Expression** → `outputs('After_Flags')` → **Add**.

---

##### Impact cards (4 actions)

**Action 1: Impact Snippet**
1. Below **Set Html After Flags**: **+** → **Add an action** → **Compose**.
2. Rename it `Impact Snippet`.
3. **Inputs** → **Expression** → paste:
   ```
   if(contains(variables('Html'), '<!--REPEAT:Indirect-->'), first(split(last(split(variables('Html'), '<!--REPEAT:Indirect-->')), '<!--/REPEAT:Indirect-->')), '')
   ```
4. **Add**.

**Action 2: Impact Html**
1. Below **Impact Snippet**: **+** → **Add an action** → **Select**.
2. Rename it `Impact Html`.
3. **From** → **Expression** → `body('Indirect_Items')` → **Add**.
4. **Map** → **Switch Map to text mode** (**T**).
5. Click the box → **Expression** → paste (one line). The values were already escaped in 6.6, so they go in as they are:
   ```
   replace(replace(replace(replace(replace(replace(replace(outputs('Impact_Snippet'), '{{ImpactField}}', item()?['field']), '{{ImpactCurrent}}', item()?['current']), '{{ImpactEvidence}}', item()?['evidence']), '{{ImpactAnswer}}', item()?['answer']), '{{ImpactStatus}}', item()?['status']), '{{ImpactCardBg}}', if(equals(item()?['status'], 'Confirmed'), '#FFF6DB', '#FFFFFF')), '{{ImpactChipBg}}', if(equals(item()?['status'], 'Confirmed'), '#8A4B00', if(equals(item()?['status'], 'Manager says no'), '#5F6368', '#7A5200')))
   ```
6. **Add**.

**Action 3: After Impacts**
1. Below **Impact Html**: **+** → **Add an action** → **Compose**.
2. Rename it `After Impacts`.
3. **Inputs** → **Expression** → paste:
   ```
   if(contains(variables('Html'), '<!--REPEAT:Indirect-->'), concat(first(split(variables('Html'), '<!--REPEAT:Indirect-->')), join(body('Impact_Html'), ''), last(split(variables('Html'), '<!--/REPEAT:Indirect-->'))), variables('Html'))
   ```
4. **Add**.

**Action 4: Set variable (Html)**
1. Below **After Impacts**: **+** → **Add an action** → **Set variable**.
2. Rename it `Set Html After Impacts`.
3. **Name:** **Html**.
4. **Value** → **Expression** → `outputs('After_Impacts')` → **Add**.

5. **Save** the flow.

---

##### Check it

After 7.3a and 7.3b, the main line of the flow reads:

```
Reason Snippet → Reason Html → After Reasons → Set variable
Section Snippet → Section Html → After Sections → Set Html After Sections
Flag Snippet → Flag Html → After Flags → Set Html After Flags
Impact Snippet → Impact Html → After Impacts → Set Html After Impacts
```

In a test run:
- **Section Html** output is a list with one chip of HTML per section.
- For a request with **no flags**, **Flag Snippet** is empty and **Flag Html** is an empty list. That's expected: the Flags block was removed in 7.2, so the guard leaves Html alone.
- For a request with **no indirect impacts**, the same is true for **Impact Snippet** and **Impact Html**.
- If the email comes out doubled, one of the Snippet or After expressions is missing its `contains(...)` check. Compare it with the expressions above.

### 7.4 Fill the placeholders

Each entry has a placeholder name (`k`), a value (`v`) and `raw`. `raw: "yes"` means the value is already HTML or a URL and goes in as is. `raw: "no"` means the loop escapes it and turns line breaks into `<br>`.

1. **+** → **Compose** → rename `Token List` → **Inputs:** paste the JSON below. Fill in your Classification expressions where shown; they're the same object from 5.7, so `outputs('Classification')?['Job Code']` and so on work as written.

```json
[
  {"k": "Preheader",          "raw": "no",  "v": "@{outputs('Preheader')}"},
  {"k": "RequesterName",      "raw": "no",  "v": "@{outputs('RequesterName')}"},
  {"k": "RequesterTitle",     "raw": "no",  "v": "@{outputs('RequesterTitle')}"},
  {"k": "RequesterDept",      "raw": "no",  "v": "@{outputs('RequesterDept')}"},
  {"k": "RequesterEmail",     "raw": "no",  "v": "@{outputs('RequesterEmail')}"},
  {"k": "JobTitle",           "raw": "no",  "v": "@{body('Get_Request')?['Title']}"},
  {"k": "RequestID",          "raw": "no",  "v": "@{body('Get_Request')?['ID']}"},
  {"k": "SubmittedDate",      "raw": "no",  "v": "@{outputs('SubmittedDate')}"},
  {"k": "OtherReason",        "raw": "no",  "v": "@{body('Get_Request')?['OtherReason']}"},
  {"k": "AddedSections",      "raw": "no",  "v": "@{body('Get_Request')?['SectionsAddedMidUpdate']}"},
  {"k": "FlagCount",          "raw": "no",  "v": "@{length(outputs('FlagChips'))}"},
  {"k": "DocName",            "raw": "no",  "v": "@{body('Get_Request')?['HRDocName']}"},
  {"k": "DocViewUrl",         "raw": "yes", "v": "@{body('Get_Request')?['HRDocLink']}"},
  {"k": "DocDownloadUrl",     "raw": "yes", "v": "@{outputs('DocDownloadUrl')}"},
  {"k": "HRSummary",          "raw": "no",  "v": "@{body('Get_Request')?['HRSummary']}"},
  {"k": "ChangeSummary",      "raw": "yes", "v": "@{outputs('ChangeSummaryHtml')}"},
  {"k": "MatchedLevel",       "raw": "no",  "v": "@{outputs('FR')?['matched_level_title']}"},
  {"k": "LevelsCompared",     "raw": "no",  "v": "@{outputs('FR')?['levels_compared']}"},
  {"k": "LevelRationale",     "raw": "no",  "v": "@{outputs('FR')?['level_recommendation']}"},
  {"k": "LevelManagerResponse","raw": "no", "v": "@{outputs('LevelResponse')}"},
  {"k": "ProposedTitle",      "raw": "no",  "v": "@{body('Get_Request')?['ProposedTitle']}"},
  {"k": "TitleJustification", "raw": "no",  "v": "@{body('Get_Request')?['TitleJustification']}"},
  {"k": "TitleSupportLabel",  "raw": "no",  "v": "@{if(outputs('TitleSupported'), 'Supported by the changes', 'Weakly supported')}"},
  {"k": "TitleAssessment",    "raw": "no",  "v": "@{body('Get_Request')?['TitleSupportAssessment']}"},
  {"k": "HardStops",          "raw": "yes", "v": "@{outputs('HardStopsHtml')}"},
  {"k": "ManagerNotes",       "raw": "yes", "v": "@{outputs('NotesHtml')}"},
  {"k": "JobCode",            "raw": "no",  "v": "@{outputs('Classification')?['Job Code']}"},
  {"k": "Grade",              "raw": "no",  "v": "@{outputs('Classification')?['Grade']}"},
  {"k": "SalaryType",         "raw": "no",  "v": "@{outputs('Classification')?['Salary Type']}"},
  {"k": "Status",             "raw": "no",  "v": "@{outputs('Classification')?['Status']}"},
  {"k": "PeopleMgmt",         "raw": "no",  "v": "@{outputs('Classification')?['People Management']}"},
  {"k": "SalesType",          "raw": "no",  "v": "@{outputs('Classification')?['Sales/Non-Sales']}"},
  {"k": "RelationshipMgr",    "raw": "no",  "v": "@{outputs('Classification')?['Relationship Manager']}"},
  {"k": "NMLS",               "raw": "no",  "v": "@{outputs('Classification')?['NMLS Required']}"},
  {"k": "ActionUrl_Approve",  "raw": "yes", "v": "@{concat('mailto:', outputs('HRMailbox'), '?subject=', encodeUriComponent(concat('[APPROVE] JD Request #', body('Get_Request')?['ID'], ' - ', body('Get_Request')?['Title'])))}"},
  {"k": "ActionUrl_Changes",  "raw": "yes", "v": "@{concat('mailto:', outputs('HRMailbox'), '?subject=', encodeUriComponent(concat('[CHANGES] JD Request #', body('Get_Request')?['ID'], ' - ', body('Get_Request')?['Title'])))}"},
  {"k": "ActionUrl_Decline",  "raw": "yes", "v": "@{concat('mailto:', outputs('HRMailbox'), '?subject=', encodeUriComponent(concat('[DECLINE] JD Request #', body('Get_Request')?['ID'], ' - ', body('Get_Request')?['Title'])))}"},
  {"k": "ActionHelpText",     "raw": "no",  "v": "Choosing an action opens a reply email. Add any comments for the manager before sending."},
  {"k": "RequestItemUrl",     "raw": "yes", "v": "@{body('Get_Request')?['{Link}']}"}
]
```

2. **+** → **Apply to each** → rename `Apply Tokens` → **From:** `outputs('Token_List')`. Check **Concurrency Control** is **Off**.
3. **Inside** the loop: **+** → **Compose** → rename `Token Step`:
   ```
   replace(variables('Html'), concat('{{', item()?['k'], '}}'), if(equals(item()?['raw'], 'yes'), string(item()?['v']), replace(replace(replace(replace(replace(string(item()?['v']), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), decodeUriComponent('%0D'), ''), decodeUriComponent('%0A'), '<br>')))
   ```
4. **Inside** the loop: **+** → **Set variable** → **Html** → `outputs('Token_Step')`.

### 7.5 Leftover check (for testing)

1. Below the loop: **+** → **Compose** → rename `Leftover Tokens`:
   ```
   contains(variables('Html'), '{{')
   ```
2. In test runs, this should show **false**. **true** means a placeholder has no entry in Token List: search the HTML output in the run for `{{` to find which.

---

## Part 8 — Child flow: attach, send and respond

### 8.1 Attach the HR document

1. **+** → **Scope** → rename `Attach Doc`.
2. **Inside** the scope: **+** → **Condition**.
   - Left: **Expression** → `empty(body('Get_Request')?['HRDocFileId'])`
   - Operator: **is equal to** · Right: **Expression** → `false`
3. In the **True** branch: **+** → **SharePoint** → **Get file content** → rename `Get HR Doc`.
   - **Site Address:** your site
   - **File Identifier:** **Expression** → `body('Get_Request')?['HRDocFileId']`
4. Below it (still in **True**): **+** → **Append to array variable** → **Name:** `Attachments` → **Value:**
   ```json
   {
     "Name": "@{body('Get_Request')?['HRDocName']}",
     "ContentBytes": "@{body('Get_HR_Doc')?['$content']}"
   }
   ```

> If the document is missing or can't be read, the scope fails quietly and the email still goes out without the attachment. The **DocMissing** block covers the no-document case in the body.

### 8.2 Send the email

1. Below the **Attach Doc** scope: **+** → **Office 365 Outlook** → **Send an email (V2)** → rename `Send HR Email`.
2. **To:** `outputs('HRMailbox')` (dynamic content → **HRMailbox**).
3. **Subject:** dynamic content → **Subject** (Compose).
4. **Body:**
   1. Click inside the Body box. In the editor's toolbar, click the **code view** button (**</>**).
   2. Delete everything in the box (including any `<p>` or `<br>`).
   3. Insert the **Html** variable (dynamic content → Variables → **Html**). The box should contain **only** the Html token.

   > **Don't skip code view.** In the normal view, the editor wraps the token in `<p>...</p>`, which puts your whole document inside a paragraph and can break the layout.

5. **Advanced parameters** → **Attachments** → click the **Switch to input entire array** icon (**T** at the top right of Attachments) → **Expression:** `variables('Attachments')`.
6. Optional: **Advanced parameters** → **Importance** → **Enter custom value** → **Expression:**
   ```
   if(greater(length(outputs('FlagChips')), 0), 'High', 'Normal')
   ```
7. On **Send HR Email**: **⋯** → **Configure run after** → check **is successful**, **has failed**, **is skipped** → **Done**.

> **Sending from a shared HR mailbox instead of the connection's account?** Use **Send an email from a shared mailbox (V2)** with the same settings, plus **Original Mailbox Address**.

### 8.3 Respond to the parent flow

A child flow must end by responding, or the parent waits until it times out.

1. Below **Send HR Email**: **+** → **Power Apps** → **Respond to a PowerApp or flow** (it may be listed under **Built-in** as **Respond to a Power App or flow**).
2. **+ Add an output** → **Text** → **Title:** `EmailSent` → **Value:** `yes`.
3. **⋯** → **Configure run after** → check **is successful** and **has failed** → **Done**.

### 8.4 Save and set run-only connections

1. Click **Save**.
2. Go back to the flow's **details page** (the back arrow).
3. In the **Run only users** card, click **Edit**.
4. For **SharePoint**, **Office 365 Users** and **Office 365 Outlook**: change **Provided by run-only user** to **Use this connection** (your connection) → **Save**.

> Child flows called from another flow need fixed connections, or the call fails.

---

## Part 9 — Call the child flow from Save JD Update Request

1. Open **Save JD Update Request** → **Edit**.
2. Below **Respond to the agent** (the last step): **+** → **Flows** → **Run a Child Flow** → choose **Send HR Review Email**.
3. **RequestID:** **Expression** →
   ```
   outputs('Create_item')?['body/ID']
   ```
4. On **Run a Child Flow**: **⋯** → **Configure run after** → check **is successful** and **has failed** → **Done**.
5. **Save**.

> **Why after Respond:** the manager gets "Submitted!" right away, and the email builds in the background. Actions after **Respond to the agent** keep running after the agent has its answer.

> If your Create item action has a different name, use that, with spaces as underscores.

---

## Part 10 — Test

Send each test to your own address first (the DEV environment variable value).

### 10.1 Scenarios

| # | Scenario | What you should see |
|---|---|---|
| 1 | Full: KSAs + Principal Duties with portfolio/teller duties, title review, an hourly request, a level disagreement | Flags strip with 4–5 chips; Level (with the manager's response), Title, Indirect (two cards, different colors), Blocked and Manager Notes sections; attachment present |
| 2 | Minimal: one KSA edit, no flags | Green "No flags raised"; no Level, Title, Indirect, Blocked or Notes sections; no empty headings or gaps |
| 3 | Level overlap, but the manager didn't comment | Level section without the "Manager's words" box |
| 4 | No title review | No Title section, no "Title review requested" chip |
| 5 | Document failure (temporarily rename the Word template, then submit) | "Document could not be generated" card, no attachment, email still arrives. **Rename the template back after.** |
| 6 | Special characters: put `R&D <lead>` in a duty, and an `&` in the other reason | Shows literally as `R&D <lead>`. Nothing missing, no broken layout |
| 7 | Very long text: a 10-line duties change | Summary of changes wraps cleanly; email still under ~100 KB (check **Html** length in the run) |
| 8 | Requester stored as a display name (or a disabled account) | Email still sends, using RequestedBy as the name |

### 10.2 Check each email in

- **Outlook desktop (Windows):** 600px wide, not stretched; buttons the right size; the hero's three columns side by side.
- **Outlook on the web / new Outlook.**
- **Outlook mobile:** hero columns stack; nothing scrolls sideways.
- **Inbox preview:** shows the preheader ("Jordan Lee · Universal Banker 1 · 5 items flagged…"), not the header text.
- **Buttons:** Approve, Request changes and Decline each open a reply addressed to the HR mailbox with the right subject.
- **Document links:** Open In Word and Download both work for someone in the HR group.

### 10.3 Check each run

Open the child flow's run history:
- **Leftover Tokens** = **false**.
- **Apply Blocks** has 14 iterations; **Apply Tokens** has 39.
- **Attach Doc** succeeded (except scenario 5).

---

## Appendix A — Placeholder reference

| Placeholder | Source | Escaped? |
|---|---|---|
| `Preheader` | Compose Preheader | Yes |
| `RequesterName` / `RequesterTitle` / `RequesterDept` / `RequesterEmail` | Office 365 profile, falls back to RequestedBy | Yes |
| `JobTitle`, `RequestID`, `SubmittedDate` | Request item | Yes |
| `Reason` *(repeat)* | Reasons split on "," | Yes |
| `Section` *(repeat)* | SectionsChanged split on "," | Yes |
| `OtherReason`, `AddedSections` | Request item | Yes |
| `FlagCount`, `FlagChip` *(repeat)* | FlagChips | Yes |
| `DocName`, `DocViewUrl`, `DocDownloadUrl` | HRDocName, HRDocLink | URLs raw |
| `HRSummary` | HRSummary column | Yes |
| `ChangeSummary` | FR change_summary → `<ul>` | Built HTML |
| `MatchedLevel`, `LevelsCompared`, `LevelRationale` | FR | Yes |
| `LevelManagerResponse` | ManagerNotes lines tagged `[Level]` | Yes |
| `ProposedTitle`, `TitleJustification`, `TitleAssessment` | Request item | Yes |
| `TitleSupportLabel` | FR title_supported | Yes |
| `Impact*` *(repeat)* | FR indirect_items + Classification | Escaped in 6.6 |
| `HardStops`, `ManagerNotes` | Columns → `<ul>` | Built HTML |
| `JobCode`, `Grade`, `SalaryType`, `Status`, `PeopleMgmt`, `SalesType`, `RelationshipMgr`, `NMLS` | JD record via Classification | Yes |
| `ActionUrl_Approve` / `_Changes` / `_Decline` | mailto links to HRMailbox | Raw |
| `ActionHelpText` | Static text in Token List | Yes |
| `RequestItemUrl` | Request item `{Link}` | Raw |

---

## Appendix B — Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| The email shows the HTML code as text | Body wasn't set in code view, or the token got escaped | Redo 8.2 step 4: code view, only the Html token |
| The email is twice as long, with the whole layout repeated | A Snippet/After expression is missing the `contains()` guard | Compare with 7.2 and 7.3. Every step needs the guard |
| `{{Something}}` visible in the email | No Token List entry, or a name mismatch | Names are case-sensitive. Check Leftover Tokens and the name in Appendix A |
| An empty section heading shows | That block's `keep` is "yes" when the value is empty | Check the block's expression in Block List against the run's values |
| `json()` error in FR | FinalReviewJSON isn't valid JSON (rich text column, or a truncated value) | Check 2.1 step 3 (rich text off), and that Copilot passes the raw prompt text |
| `base64ToString` error in Set Html | Template returned in an unexpected format | Check **Get Template** raw outputs. If `body` is plain HTML, set the value to `string(body('Get_Template'))` |
| Attachment missing, but the document exists | HRDocFileId empty or wrong | Check 4.3. The ID should start with `%252f` |
| Desktop Outlook email stretches full width | The Outlook-only wrapper was removed | Check the sent message source for `[if mso]`. If it's missing, tell me and I'll switch the template to a fixed `width="600"` table |
| Child flow call fails with a connection error | Run-only users still on "Provided by run-only user" | Redo 8.4 |
| Indirect "Current" shows Unknown | The prompt's field name doesn't exactly match a Classification key | The prompt must return exactly "People Management", "Sales/Non-Sales", "Relationship Manager" or "NMLS Required" |
| Everything blank after the template upload | File saved with the wrong name, or in a subfolder | Get Template's path must be exactly `/JD Templates/HR Review Email.html` |

---

## Appendix C — Changing the template later

- **Small wording or color changes:** edit `HR Review Email.html` locally in a text editor, then upload it again, replacing the old file in **JD Templates** in each environment. No flow changes are needed.
- **Don't** delete or rename a `{{Placeholder}}`, `<!--BLOCK:...-->` or `<!--REPEAT:...-->` marker unless you also change the flow.
- **Adding a new value:** add `{{NewName}}` to the HTML, then add a row to **Token List** (7.4).
- **Adding a new optional section:** wrap the whole `<tr>...</tr>` in `<!--BLOCK:NewName-->` / `<!--/BLOCK:NewName-->`, then add a row to **Block List** (7.2).
- **Redesigning in Claude Design:** export the new design and send it to me. I'll convert it the same way and keep every placeholder and marker the flow uses.
- **Next phase:** a flow on the HR mailbox (**When a new email arrives**, subject contains `JD Request #`) that reads `[APPROVE]`, `[CHANGES]` or `[DECLINE]`, updates **RequestStatus**, and notifies the manager. The buttons already send replies in that format.
