# Required/Preferred Split — Build Guide

**Builds on:** the JD Change Document feature (Save JD Update Request flow, Build Redline Rows child flow, and the new **JD Change Template.docx**)
**Goal:** Education Requirements and Work Experience Requirements each end by saying whether the requirement is Required and/or Preferred. Pull that ending out into the template's **Req/Pref** column as a label (`Required`, `Preferred`, or `Required/Preferred`), and put the rest of the text in the **Details** column. Both columns show redline changes.

The two sections are stored differently, so the flow has two modes:

| Section | How the ending is stored | Mode |
|---|---|---|
| Education Requirements | The last two words, e.g. `... or equivalent Preferred Or`, **not** a separate sentence | `Education` |
| Work Experience Requirements | A separate last sentence, e.g. `... experience. Required.` | *(blank)* |

> **Note on UI labels:** Power Automate renames things often. If a label doesn't match exactly, look for the closest equivalent.

---

## Contents

0. [How it works](#part-0--how-it-works)
1. [Child flow: Split Req Pref](#part-1--child-flow-split-req-pref)
2. [Test the child flow](#part-2--test-the-child-flow)
3. [Add the split steps to Save JD Update Request](#part-3--add-the-split-steps-to-save-jd-update-request)
4. [Swap in the new template](#part-4--swap-in-the-new-template)
5. [Testing](#part-5--testing)
- [Appendix A — Name reference](#appendix-a--name-reference)
- [Appendix B — Troubleshooting](#appendix-b--troubleshooting)

---

## Part 0 — How it works

```
Education text from JD list ──► Split Req Pref ──► Details ──┐
Proposed Education (agent)  ──► Split Req Pref ──► Details ──┴─► Build Redline Rows ─► EducationRows
                                              └──► ReqPref ──┐
                                              └──► ReqPref ──┴─► Build Redline Rows ─► EduReqRows
(Work Experience works the same way → ExperienceRows and ExpReqRows)
```

**What Split Req Pref does with one block of text:**

1. Cleans it: turns `<br>` into line breaks and fixes `&nbsp;` and `&amp;`.
2. Finds the ending:
   - **Education mode:** drops a trailing `Or`, then takes the **last word**.
   - **Default mode (Work Experience):** takes the **last sentence**, meaning the text after the last `. ` or line break.
3. Checks whether that ending contains "required" and/or "preferred" (not case-sensitive) and builds the label from the keyword. The exact words, including any "Or", are never copied.
4. Returns two values:

| Situation | Details | ReqPref |
|---|---|---|
| Ending mentions required/preferred | Everything before the ending | The label |
| Default mode, only one sentence that mentions required/preferred | The whole text | The label |
| Ending doesn't mention either | The whole text | *(blank)* |
| Blank input (section unchanged) | *(blank)* | *(blank)* |

A blank result is handled downstream. Build Redline Rows treats a blank **Proposed** as "unchanged" and shows the original as Kept, so unchanged sections still display correctly.

**Examples — Education mode:**

| Input | Details | ReqPref |
|---|---|---|
| `High school diploma or equivalent Required Or` | `High school diploma or equivalent` | `Required` |
| `Bachelor's degree in Finance or related field Preferred Or` | `Bachelor's degree in Finance or related field` | `Preferred` |
| `Bachelor's degree in Finance. Preferred Or` | `Bachelor's degree in Finance.` | `Preferred` |
| `Bachelor's degree preferred.` *(agent dropped the "Or")* | `Bachelor's degree` | `Preferred` |

**Examples — default mode (Work Experience):**

| Input | Details | ReqPref |
|---|---|---|
| `1-2 years of banking experience. Required.` | `1-2 years of banking experience.` | `Required` |
| `3+ years in a sales role. Required/Preferred.` | `3+ years in a sales role.` | `Required/Preferred` |
| `2 years of experience preferred.` | `2 years of experience preferred.` | `Preferred` |

---

## Part 1 — Child flow: Split Req Pref

Build this in the **same solution** as Save JD Update Request and Build Redline Rows. Child flows only work inside a solution.

### 1.1 Create the flow
1. Go to **make.powerapps.com** → **Solutions** → open your JD solution.
2. **+ New** → **Automation** → **Cloud flow** → **Instant**.
3. **Flow name:** `Split Req Pref`
4. **Trigger:** **Manually trigger a flow** → **Create**.

### 1.2 Add the inputs
1. Click the **Manually trigger a flow** trigger → **+ Add an input** → **Text**.
2. Rename the input from `Input` to `Text`.
3. Click the **⋯** next to it → **Make the field optional**.
4. **+ Add an input** → **Text** → rename it to `Mode` → **⋯** → **Make the field optional**.

> **Check the input keys:** click the trigger → **⋯** → **Peek code**. Under `properties`, the keys are usually `text` (Text) and `text_1` (Mode). The expressions below use `triggerBody()?['text']` and `triggerBody()?['text_1']`. If yours are different, swap them in.

### 1.3 Add the Compose actions

Add twelve **Compose** actions in this order. For each one:
1. Click **+ New step** (or the **+** below the previous action) → search **Compose** → select **Compose** (Data Operation).
2. Click the **⋯** on the action → **Rename** → enter the name.
3. Click in **Inputs** → **Expression** tab → paste the expression → **OK** (or **Add**).

**① `NL`**: a line-break character, used by the other steps.
```
decodeUriComponent('%0A')
```

**② `IsEdu`**: `true` when Mode is `Education` (not case-sensitive).
```
equals(toLower(trim(coalesce(triggerBody()?['text_1'],''))),'education')
```

**③ `Clean`**: the text with `<br>` turned into line breaks and HTML leftovers removed.
```
trim(replace(replace(replace(replace(replace(replace(coalesce(triggerBody()?['text'],''),'<br />',outputs('NL')),'<br/>',outputs('NL')),'<br>',outputs('NL')),decodeUriComponent('%0D'),''),'&nbsp;',' '),'&amp;','&'))
```

**④ `Body`**: the text without its final period, so the searches below don't find the period at the very end.
```
if(endsWith(outputs('Clean'),'.'), substring(outputs('Clean'),0,sub(length(outputs('Clean')),1)), outputs('Clean'))
```

*Steps ⑤–⑥ find the last sentence (used by default mode).*

**⑤ `Cut`**: the position where the last sentence starts. It's the later of the last `. ` and the last line break, or `-1` if there's only one sentence.
```
max(lastIndexOf(outputs('Body'),'. '), lastIndexOf(outputs('Body'),outputs('NL')))
```

**⑥ `LastSentence`**: the text after the cut point.
```
if(equals(outputs('Cut'),-1), outputs('Clean'), trim(substring(outputs('Clean'), add(outputs('Cut'),1), sub(length(outputs('Clean')), add(outputs('Cut'),1)))))
```

*Steps ⑦–⑨ find the last word (used by Education mode).*

**⑦ `NoOr`**: the text with a trailing ` Or` removed (not case-sensitive).
```
if(endsWith(toLower(outputs('Body')),' or'), trim(substring(outputs('Body'),0,sub(length(outputs('Body')),3))), outputs('Body'))
```

**⑧ `WordCut`**: the position where the last word starts: the later of the last space and the last line break, or `-1` if there's only one word.
```
max(lastIndexOf(outputs('NoOr'),' '), lastIndexOf(outputs('NoOr'),outputs('NL')))
```

**⑨ `LastWord`**: the word after that position.
```
if(equals(outputs('WordCut'),-1), outputs('NoOr'), substring(outputs('NoOr'), add(outputs('WordCut'),1), sub(length(outputs('NoOr')), add(outputs('WordCut'),1))))
```

*Steps ⑩–⑫ build the outputs.*

**⑩ `Tail`**: the ending to check: the last word in Education mode, the last sentence otherwise.
```
if(outputs('IsEdu'), outputs('LastWord'), outputs('LastSentence'))
```

**⑪ `Label`**: the Req/Pref label, or blank if the ending mentions neither.
```
if(and(contains(toLower(outputs('Tail')),'required'), contains(toLower(outputs('Tail')),'preferred')), 'Required/Preferred', if(contains(toLower(outputs('Tail')),'required'), 'Required', if(contains(toLower(outputs('Tail')),'preferred'), 'Preferred', '')))
```

**⑫ `Details`**: the text without the Req/Pref ending.
```
if(empty(outputs('Label')), outputs('Clean'), if(outputs('IsEdu'), if(equals(outputs('WordCut'),-1), '', trim(substring(outputs('NoOr'), 0, outputs('WordCut')))), if(equals(outputs('Cut'),-1), outputs('Clean'), trim(substring(outputs('Clean'), 0, add(outputs('Cut'),1))))))
```

In plain terms, ⑫ does this:
- **No label found:** keep the whole text.
- **Education mode:** keep everything before the last word.
- **Default mode, one sentence:** keep the whole text.
- **Default mode, several sentences:** keep everything before the last sentence.

### 1.4 Return the results
1. **+ New step** → search **Respond to a PowerApp or flow** → select it.
2. **+ Add an output** → **Text**:
   - **Title:** `Details`
   - **Value** → **Expression** tab → `outputs('Details')`
3. **+ Add an output** → **Text**:
   - **Title:** `ReqPref`
   - **Value** → **Expression** tab → `outputs('Label')`
4. Click **Save**.

### 1.5 Allow it to be called as a child flow
1. Go back to the flow's **details page** (click the flow name, or use **←** to leave the editor).
2. Find the **Run only users** panel → **Edit**.
3. For each connection listed, choose **Use this connection** instead of "Provided by run-only user." This flow has no connectors, so the list may be empty. If so, skip this step.
4. **Save**.

---

## Part 2 — Test the child flow

Test it alone before wiring it in. That's the fastest way to catch problems with your real data.

1. Open **Split Req Pref** → **Test** (top right) → **Manually** → **Test**.
2. Paste a **real Education Requirements value** from your JD list (exactly as stored, `<br>` included) into **Text**, and type `Education` into **Mode** → **Run flow** → **Done**.
3. Open the run and click **Respond to a PowerApp or flow** to expand it. Check:
   - **Details:** the education text without the final "Required Or" / "Preferred Or"
   - **ReqPref:** `Required`, `Preferred`, or `Required/Preferred`
4. Repeat with these values:

| Text | Mode | Expected Details | Expected ReqPref |
|---|---|---|---|
| A real Education value | `Education` | Text minus the last two words | The label |
| `High school diploma or equivalent Required Or` | `Education` | `High school diploma or equivalent` | `Required` |
| `Bachelor's degree preferred.` | `Education` | `Bachelor's degree` | `Preferred` |
| A real Work Experience value | *(blank)* | Text minus the last sentence | The label |
| `1-2 years of banking experience. Required.` | *(blank)* | `1-2 years of banking experience.` | `Required` |
| `Some text with no label.` | *(either)* | `Some text with no label.` | *(blank)* |
| *(blank)* | *(either)* | *(blank)* | *(blank)* |

> **Check this before moving on:** for Work Experience, if some of your real last sentences contain detail as well as the label, such as `"A bachelor's degree in finance is preferred."` after an earlier sentence, that detail will move out of Details. Note any examples and see Appendix B.

---

## Part 3 — Add the split steps to Save JD Update Request

Open **Save JD Update Request** from your solution → **Edit**. Everything in this part goes inside the **Build Documents** Scope.

### 3.1 Split the original and proposed Education and Work Experience
1. Find **Redline Education** inside the Scope.
2. Click the **+** directly **above** it → **Add an action** → search **Run a Child Flow** (Flows connector) → select it.
3. **Child Flow:** `Split Req Pref`
4. **⋯** → **Rename** → `Split Edu Original`
5. **Text** → **Expression** tab:
   ```
   outputs('JD')?['YourEducationInternalName']
   ```
   Use your Education Requirements internal name, the same one Redline Education used before.
6. **Mode:** type `Education`
7. Repeat steps 2–6 three more times, adding each one below the last:

| Rename to | Text | Mode |
|---|---|---|
| `Split Edu Proposed` | **ProposedEducation** (Dynamic content from the trigger) | `Education` |
| `Split Exp Original` | Expression: `outputs('JD')?['YourExperienceInternalName']` | *(leave blank)* |
| `Split Exp Proposed` | **ProposedExperience** (Dynamic content from the trigger) | *(leave blank)* |

> **Both Education splits need Mode = `Education`.** If only one has it, the original and proposed text get split differently and every Education line shows as changed.

> **Tip:** build the first one, then use **⋯** → **Copy to my clipboard** and paste it three times, renaming and editing each copy.

### 3.2 Point the existing redlines at Details
1. Open **Redline Education**. Clear both inputs and set them with the **Expression** tab:
   - **Original:** `body('Split_Edu_Original')?['details']`
   - **Proposed:** `body('Split_Edu_Proposed')?['details']`
2. Open **Redline Experience** and do the same:
   - **Original:** `body('Split_Exp_Original')?['details']`
   - **Proposed:** `body('Split_Exp_Proposed')?['details']`

> Child flow outputs are read with **lowercase** keys (`details`, `reqpref`). If yours differ, check the run output of a Split action (Appendix B).

### 3.3 Add redlines for Req/Pref
1. Below **Redline Experience**: **+** → **Run a Child Flow** → **Child Flow:** `Build Redline Rows`.
2. **Rename** → `Redline EduReq`
   - **Original:** `body('Split_Edu_Original')?['reqpref']`
   - **Proposed:** `body('Split_Edu_Proposed')?['reqpref']`
3. Below it: **+** → **Run a Child Flow** → `Build Redline Rows` → **Rename** → `Redline ExpReq`
   - **Original:** `body('Split_Exp_Original')?['reqpref']`
   - **Proposed:** `body('Split_Exp_Proposed')?['reqpref']`

### 3.4 Add the row Selects
Place these next to your existing **Rows …** Selects (after **Rows Experience** is a good spot).

**Rows EduReq**
1. **+** → **Data Operation** → **Select** → **Rename** → `Rows EduReq`
2. **From** → **Expression** tab:
   ```
   if(empty(json(body('Redline_EduReq')?['rows'])), json('[{"Kept":"","Added":"","Removed":""}]'), json(body('Redline_EduReq')?['rows']))
   ```
3. **Map** (key/value mode). Add three rows, each value from the **Expression** tab:

| Key | Value |
|---|---|
| `EduReqKept` | `item()?['Kept']` |
| `EduReqAdded` | `item()?['Added']` |
| `EduReqRemoved` | `item()?['Removed']` |

**Rows ExpReq**
1. **+** → **Select** → **Rename** → `Rows ExpReq`
2. **From:**
   ```
   if(empty(json(body('Redline_ExpReq')?['rows'])), json('[{"Kept":"","Added":"","Removed":""}]'), json(body('Redline_ExpReq')?['rows']))
   ```
3. **Map:**

| Key | Value |
|---|---|
| `ExpReqKept` | `item()?['Kept']` |
| `ExpReqAdded` | `item()?['Added']` |
| `ExpReqRemoved` | `item()?['Removed']` |

4. **Save** the flow. It will show errors on Populate User Doc until Part 4 is done, which is expected.

### 3.5 Check the order inside the Scope
```
Build Documents (Scope)
 ├─ Get JD → JD (Compose)
 ├─ Split Edu Original, Split Edu Proposed, Split Exp Original, Split Exp Proposed
 ├─ Redline Purpose, Redline Duties, Redline Education, Redline Experience,
 │  Redline Certs, Redline KSA, Redline EduReq, Redline ExpReq
 ├─ Rows Purpose … Rows KSA, Rows EduReq, Rows ExpReq
 ├─ RequestDate
 ├─ Populate User Doc
 ├─ Create User File → Share With Requester → User File Props → Set DocLink
 └─ Save Doc Links
```
The only firm rule is that each action must come **after** the actions it reads from.

---

## Part 4 — Swap in the new template

### 4.1 Prepare the template
1. Open **JD Change Template.docx** in Word desktop.
2. Replace the **[Paste City National Bank logo here]** line with your logo: delete the text → **Insert** → **Pictures** → select the logo file.
3. **Save**. Don't change, rename, or delete any content controls.

### 4.2 Upload it
1. Go to the **JD Templates** library → **Upload** → **Files** → choose **JD Change Template.docx**.
2. Move your old template to an **Archive** folder, or delete it, so it can't be selected by mistake.

### 4.3 Re-select the template in the flow
1. In **Save JD Update Request**, open **Populate User Doc**.
2. **File** → click the folder icon → choose **JD Change Template.docx**. If it already shows that name from an earlier upload, select a different file first, then re-select this one so the fields reload.
3. Fill in the fields:

| Field | Value |
|---|---|
| JobTitle | **JobTitle** (trigger) |
| RelationshipManager | `coalesce(outputs('JD')?['YourRMInternalName'], '')` |
| NMLS | `coalesce(outputs('JD')?['YourNMLSInternalName'], '')` |
| SalesNonSales | `coalesce(outputs('JD')?['YourSalesInternalName'], '')` |
| PeopleManagement | `coalesce(outputs('JD')?['YourPeopleMgmtInternalName'], '')` |
| EducationLevel | *(leave blank)* |
| ExperienceLevel | *(leave blank)* |

Add `?['Value']` before the closing parenthesis for any **Choice** column, e.g. `coalesce(outputs('JD')?['Sales']?['Value'], '')`.

4. For each **repeating section**, click **Switch to input entire array** (the **T** icon), then enter the Expression:

| Field | Expression |
|---|---|
| PurposeRows | `body('Rows_Purpose')` |
| DutiesRows | `body('Rows_Duties')` |
| EducationRows | `body('Rows_Education')` |
| EduReqRows | `body('Rows_EduReq')` |
| ExperienceRows | `body('Rows_Experience')` |
| ExpReqRows | `body('Rows_ExpReq')` |
| KSARows | `body('Rows_KSA')` |
| CertsRows | `body('Rows_Certs')` |

5. **Save** the flow.

> The six request-detail fields (RequestID, RequestedBy, RequestDate, Reasons, ProposedTitle, TitleJustification) are no longer in the template, so they won't appear in the action. That data is still saved on the **JD Update Requests** item. If the **RequestDate** Compose is now unused, you can delete it.

> **Every time you edit the template**, re-upload it and re-select it in Populate User Doc (step 4.3.2). Otherwise the action uses an outdated copy of the template's layout, which can blank out sections or corrupt the file.

---

## Part 5 — Testing

### 5.1 Flow-only test
1. **Save JD Update Request** → **Test** → **Manually**.
2. Enter a real Job Code, your email in RequestedBy, and in **ProposedEducation** paste the job's current Education text with only the last sentence changed (e.g., `Preferred.` → `Required.`).
3. Run it, then open the file from **JD Change Documents**.

### 5.2 What to check

| # | Test | Expected in the document |
|---|---|---|
| 1 | Change only Req/Pref (Preferred → Required) | Education Details plain; Req/Pref shows ~~Preferred~~ and **Required** highlighted |
| 2 | Change Education details, keep the same last sentence | Details redlined; Req/Pref plain |
| 3 | Don't change Education or Work Experience | Both show the original details and label in plain text |
| 4 | Change Work Experience details and label | Both Experience columns redlined |
| 5 | A job whose Education has no Req/Pref sentence | Full text in Details; Req/Pref empty |
| 6 | Any test | File opens in Word and in Word for the web without errors |
| 7 | Any test | No `<br>`, `&amp;`, or `&nbsp;` visible |

### 5.3 End-to-end test through the agent
1. Start an update in the agent's Test pane → pick **Education** → change "preferred" to "required" in conversation → submit.
2. Open the link from the "Submitted!" message and check the result matches test 1.

---

## Appendix A — Name reference

**Child flow:** `Split Req Pref`
- Inputs: `Text`, `Mode` (`Education` for Education Requirements; blank for Work Experience)
- Outputs: `Details`, `ReqPref` (read as `?['details']`, `?['reqpref']`)

**New actions in Save JD Update Request:**

| Action | Type | Reads from |
|---|---|---|
| Split Edu Original | Run a Child Flow (Split Req Pref), Mode `Education` | JD list Education |
| Split Edu Proposed | Run a Child Flow (Split Req Pref), Mode `Education` | ProposedEducation |
| Split Exp Original | Run a Child Flow (Split Req Pref) | JD list Work Experience |
| Split Exp Proposed | Run a Child Flow (Split Req Pref) | ProposedExperience |
| Redline EduReq | Run a Child Flow (Build Redline Rows) | Split Edu … reqpref |
| Redline ExpReq | Run a Child Flow (Build Redline Rows) | Split Exp … reqpref |
| Rows EduReq | Select | Redline EduReq |
| Rows ExpReq | Select | Redline ExpReq |

**Changed actions:** Redline Education and Redline Experience now read `?['details']` from the Split actions.

**Template controls (JD Change Template.docx):**

| Section | Repeating | Kept | Added | Removed |
|---|---|---|---|---|
| Purpose | PurposeRows | PurposeKept | PurposeAdded | PurposeRemoved |
| Duties | DutiesRows | DutiesKept | DutiesAdded | DutiesRemoved |
| Education details | EducationRows | EducationKept | EducationAdded | EducationRemoved |
| Education Req/Pref | EduReqRows | EduReqKept | EduReqAdded | EduReqRemoved |
| Experience details | ExperienceRows | ExperienceKept | ExperienceAdded | ExperienceRemoved |
| Experience Req/Pref | ExpReqRows | ExpReqKept | ExpReqAdded | ExpReqRemoved |
| KSAs | KSARows | KSAKept | KSAAdded | KSARemoved |
| Certifications | CertsRows | CertsKept | CertsAdded | CertsRemoved |

**Single fields:** JobTitle, RelationshipManager, NMLS, SalesNonSales, PeopleManagement, EducationLevel, ExperienceLevel

---

## Appendix B — Troubleshooting

**Details and ReqPref come back empty from a Split action**
Open the run → click the Split action → **Show raw outputs**. Check the key names under `body`. If they're not `details` and `reqpref`, use the names you see in the expressions. If the input itself was empty, the internal column name in the Original expression is wrong. Compose `outputs('JD')` to see the real names.

**The label is found but Details still includes the last sentence**
The last sentence probably comes after a character the flow doesn't recognize as a break, such as `;` or a `<div>` tag. Look at the `Clean` output in the child flow run. Add another `replace(...)` to the `Clean` expression for that character, turning it into `outputs('NL')`.

**Real last sentences contain detail, not just the label**
E.g., `"High school diploma required. Bachelor's degree preferred."` In that case, keep the full text in Details and only add the label. Change the **⑦ Details** expression to:
```
outputs('Clean')
```
Req/Pref still shows the label, and Details keeps every sentence.

**Education Details still ends with "Required" or "Preferred"**
Mode wasn't passed to that Split action. Check that both **Split Edu Original** and **Split Edu Proposed** have Mode = `Education`. In the run, the `IsEdu` Compose should show `true`.

**Education Details loses a word**
In Education mode, the label must be the **last word** (after any trailing "Or"). If an entry ends like `... Preferred Or Required`, or has extra words after the label, the wrong word gets cut. Look at that entry's `LastWord` in the child flow run and send me the example.

**Req/Pref shows as removed and re-added when nothing changed**
The proposed text's last sentence uses different wording that produces a different label (e.g., the agent rewrote "Required." as "This is preferred but not required."). That reads as a real change. Check `ReqPref` on both Split actions in the run.

**"Run a Child Flow" can't find Split Req Pref**
The child flow must be in the **same solution**, use the **Manually trigger a flow** trigger, and end with **Respond to a PowerApp or flow**. Save it, then refresh the parent flow editor.

**The document won't open after the template swap**
Re-select the template file in Populate User Doc (Part 4.3, step 2) and re-map the fields. Check that every Rows Select uses the empty-array fallback in **From**.
