# Education Level and Experience Split — Build Guide

**Builds on:** the Required/Preferred split (Split Req Pref child flow), the Build Redline Rows child flow, the Save JD Update Request flow, and your JD Change Template.
**Goal:** pull the opening words of Education Requirements and Work Experience Requirements into their own template columns, **Education Level** and **Experience**, take them out of the Details column, and redline them like every other part of the document.

| Section | Level column gets | Example text | Level | Details |
|---|---|---|---|---|
| Education | The first **2 words** | High school diploma or equivalent Required Or | High school | diploma or equivalent |
| Work Experience | Everything **up to and including "year/years"** | 5-7 years of retail banking experience. Required. | 5-7 years | of retail banking experience. |
| Work Experience starting with "Minimum" | Same rule | Minimum 2 years of sales experience. Preferred. | Minimum 2 years | of sales experience. |
| Work Experience with no "year" near the start | **Fallback:** first 3 words if it starts with "Minimum", otherwise first 4 | Prior banking experience in a branch setting. | Prior banking experience in | a branch setting. |

> **UI labels change often.** If a label here doesn't match exactly, look for the closest equivalent.

---

## Contents

0. [How it works](#part-0--how-it-works)
1. [Before you start](#part-1--before-you-start)
2. [Split Req Pref: add the Level](#part-2--split-req-pref-add-the-level)
3. [Test the child flow](#part-3--test-the-child-flow)
4. [Template: turn the Level fields into redline rows](#part-4--template-turn-the-level-fields-into-redline-rows)
5. [Save JD Update Request: redline and map the Level](#part-5--save-jd-update-request-redline-and-map-the-level)
6. [Testing](#part-6--testing)
- [Appendix A — Name reference](#appendix-a--name-reference)
- [Appendix B — Troubleshooting](#appendix-b--troubleshooting)
- [Appendix C — Update the template verification script](#appendix-c--update-the-template-verification-script)

---

## Part 0 — How it works

```
Education / Work Experience text
        │
        ▼
Split Req Pref (child flow)
  ① … ⑫  existing steps → ReqPref label + Details (text without the label)
  NEW    DetailsFlat → WordList → Level + DetailsRest
        │
        ├─ Level       → Build Redline Rows → EduLevelRows / ExpLevelRows   (new)
        ├─ DetailsRest → returned as "Details" → Build Redline Rows → EducationRows / ExperienceRows
        └─ ReqPref     → Build Redline Rows → EduReqRows / ExpReqRows        (unchanged)
```

- The flow already runs Split Req Pref four times: original and proposed, for Education and for Experience. Each run now also returns a **Level**.
- The **Details** output no longer includes the level, so the Details column won't repeat "High school" or "5-7 years".
- The Level goes through the same **redline** as everything else, so "High school" → "Bachelors Degree" shows as struck through and highlighted.
- A blank input (an unchanged section) gives a blank Level, Details and ReqPref, just as before, so unchanged sections show their original text.

---

## Part 1 — Before you start

Confirm these exist from the earlier builds:

| Item | Where |
|---|---|
| **Split Req Pref** child flow with inputs `Text` and `Mode`, and Compose steps ① `NL` through ⑫ `Details` (including ② `IsEdu`) | Your JD solution |
| **Split Edu Original**, **Split Edu Proposed** (Mode = `Education`), **Split Exp Original**, **Split Exp Proposed** (Mode blank) | Save JD Update Request → Build Documents scope |
| **Redline EduReq**, **Redline ExpReq**, **Rows EduReq**, **Rows ExpReq** | Same scope |
| Template controls `EducationLevel` and `ExperienceLevel` (single plain-text controls) | JD Change Template |
| Quote and space normalization (`OriginalNorm` and `ProposedNorm`) | Build Redline Rows |

The normalization step matters here. The Level is compared through Build Redline Rows, so curly quotes or double spaces would otherwise make an unchanged level look changed.

---

> **Order matters:** build Part 2 and run the Part 3 tests before you touch the template or the parent flow. If the split is wrong, everything after it will be too.

---

## Part 2 — Split Req Pref: add the Level

1. Go to **make.powerapps.com** → **Solutions** → your JD solution → open **Split Req Pref** → **Edit**.
2. Find **⑫ Details**. Every new step goes **below it** and **above** **Respond to a PowerApp or flow**.

For each **Compose** step: click **+** → search **Compose** → **Compose** (Data Operation) → **⋯** → **Rename** → enter the name → click **Inputs** → **Expression** tab → paste → **OK**.

### 2.1 `DetailsFlat`: put the details on one line
**Compose** → rename `DetailsFlat`:
```
trim(replace(outputs('Details'), outputs('NL'), ' '))
```

### 2.2 `WordList`: split into words
1. **+** → **Data Operation** → **Filter array** → rename `WordList`.
2. **From** → **Expression**:
   ```
   split(outputs('DetailsFlat'), ' ')
   ```
3. Click **Edit in advanced mode** and enter:
   ```
   @not(equals(trim(item()), ''))
   ```
   This drops empty entries left by double spaces.

### 2.3 `LevelCount`: the word-count fallback
**Compose** → rename `LevelCount`:
```
if(outputs('IsEdu'), 2, if(equals(toLower(coalesce(first(body('WordList')), '')), 'minimum'), 3, 4))
```
This gives 2 for Education, 3 for Experience starting with "Minimum", and 4 for other Experience text. Experience only uses it when "year" isn't found.

### 2.4 `YearPos`: where "year" starts
**Compose** → rename `YearPos`:
```
if(and(greaterOrEquals(indexOf(toLower(outputs('DetailsFlat')), 'year'), 0), lessOrEquals(indexOf(toLower(outputs('DetailsFlat')), 'year'), 20)), indexOf(toLower(outputs('DetailsFlat')), 'year'), -1)
```
This returns the position of "year" if it appears in roughly the first 20 characters, otherwise -1. The limit stops a phrase like "…for several years" late in the text from being treated as the level.

### 2.5 `YearRest`: the text from "year" onward
**Compose** → rename `YearRest`:
```
substring(outputs('DetailsFlat'), max(outputs('YearPos'), 0), sub(length(outputs('DetailsFlat')), max(outputs('YearPos'), 0)))
```

### 2.6 `YearEnd`: where the "year/years" word ends
**Compose** → rename `YearEnd`:
```
if(less(outputs('YearPos'), 0), -1, add(outputs('YearPos'), if(equals(indexOf(outputs('YearRest'), ' '), -1), length(outputs('YearRest')), indexOf(outputs('YearRest'), ' '))))
```

### 2.7 `Level`: the text for the Level column
**Compose** → rename `Level`:
```
if(outputs('IsEdu'), join(take(body('WordList'), 2), ' '), if(greater(outputs('YearEnd'), 0), trim(substring(outputs('DetailsFlat'), 0, max(outputs('YearEnd'), 0))), join(take(body('WordList'), outputs('LevelCount')), ' ')))
```

### 2.8 `DetailsRest`: the details without the level
**Compose** → rename `DetailsRest`:
```
if(outputs('IsEdu'), join(skip(body('WordList'), 2), ' '), if(greater(outputs('YearEnd'), 0), trim(substring(outputs('DetailsFlat'), max(outputs('YearEnd'), 0), sub(length(outputs('DetailsFlat')), max(outputs('YearEnd'), 0)))), join(skip(body('WordList'), outputs('LevelCount')), ' ')))
```

> **Why all the `max(…, 0)`:** Power Automate can evaluate both sides of an `if`. Without the wrappers, a `substring` with -1 would error even when that branch isn't used.

### 2.9 Update the response
1. Click **Respond to a PowerApp or flow**.
2. **Details** output → clear the value → **Expression** → `outputs('DetailsRest')`.
3. **+ Add an output** → **Text** → Title `Level` → Value → **Expression** → `outputs('Level')`.
4. Leave **ReqPref** as it is.
5. **Save**.

**Check the order** inside the flow when you're done:
```
… ⑪ Label → ⑫ Details → DetailsFlat → WordList → LevelCount → YearPos → YearRest → YearEnd → Level → DetailsRest → Respond
```

---

## Part 3 — Test the child flow

1. In **Split Req Pref**: **Test** → **Manually** → **Test**.
2. Run it once for each row below. Open the run and expand **Respond to a PowerApp or flow** to check the outputs.

| Text | Mode | Details | Level | ReqPref |
|---|---|---|---|---|
| `High school diploma or equivalent Required Or` | Education | diploma or equivalent | High school | Required |
| `Bachelors Degree in Finance or related field Preferred Or` | Education | in Finance or related field | Bachelors Degree | Preferred |
| `5-7 years of retail banking experience. Required.` | *(blank)* | of retail banking experience. | 5-7 years | Required |
| `5 - 7 years of retail banking experience. Required.` | *(blank)* | of retail banking experience. | 5 - 7 years | Required |
| `Minimum 2 years of sales experience. Preferred.` | *(blank)* | of sales experience. | Minimum 2 years | Preferred |
| `3+ years of lending experience. Preferred.` | *(blank)* | of lending experience. | 3+ years | Preferred |
| `Prior banking experience in a branch setting. Preferred.` | *(blank)* | a branch setting. | Prior banking experience in | Preferred |
| *(blank)* | either | *(blank)* | *(blank)* | *(blank)* |

3. Then test **two or three real values** from your JD list, exactly as stored (with `<br>`), for both Education and Work Experience.

Don't continue until these look right. If a real value splits oddly, see Appendix B.

---

## Part 4 — Template: turn the Level fields into redline rows

`EducationLevel` and `ExperienceLevel` are single plain-text controls, so they can't show struck-through and highlighted text. Replace each with a repeating section, built the same way as Req/Pref.

You need Word **desktop** for this.

### 4.1 Education Level
1. Open your **JD Change Template** in Word desktop.
2. **Developer** → **Design Mode** (on).
3. In the Education table's data row, click the **Education Level** cell, select the `EducationLevel` control and delete it. Leave the cell empty.
4. In the **Req/Pref** cell of the same row, click the **outer border** of the `EduReqRows` repeating section so the whole section is selected → **Ctrl+C**.
5. Click into the empty **Education Level** cell → **Ctrl+V**.
6. Click the pasted repeating section's **outer border** → **Developer** → **Properties**:
   - **Title:** `EduLevelRows` · **Tag:** `EduLevelRows` → **OK**
7. Click each of the three controls **inside** it → **Properties** → rename the **Title** and **Tag**:

| Was | Rename to |
|---|---|
| EduReqKept | `EduLevelKept` |
| EduReqAdded | `EduLevelAdded` |
| EduReqRemoved | `EduLevelRemoved` |

Check that **Added** still uses the **JD Added** style and **Removed** uses **JD Removed**. Copying keeps them.

### 4.2 Experience
1. In the Work Experience table's data row, delete the `ExperienceLevel` control in the **Experience** cell.
2. Copy the `ExpReqRows` repeating section from the **Req/Pref** cell next to it.
3. Paste it into the empty **Experience** cell.
4. Rename the repeating section to `ExpLevelRows` (Title and Tag).
5. Rename the inner controls:

| Was | Rename to |
|---|---|
| ExpReqKept | `ExpLevelKept` |
| ExpReqAdded | `ExpLevelAdded` |
| ExpReqRemoved | `ExpLevelRemoved` |

### 4.3 Save and upload
1. **Design Mode** (off).
2. **Save**.
3. Upload it to the **JD Templates** library, replacing the current file (or upload it as a new file and archive the old one).

> **Most important check:** every pasted control's **Title and Tag** must be renamed. A leftover duplicate such as a second `EduReqKept` produces a document Word can't open. Appendix C has the script that catches this.

---

## Part 5 — Save JD Update Request: redline and map the Level

Open **Save JD Update Request** from your solution → **Edit**. Everything goes inside the **Build Documents** scope.

### 5.1 Add two redlines
1. Below **Redline ExpReq**: **+** → **Add an action** → **Run a Child Flow** → **Child Flow:** `Build Redline Rows`.
2. **⋯** → **Rename** → `Redline EduLevel`.
3. Inputs (**Expression** tab):
   - **Original:** `body('Split_Edu_Original')?['level']`
   - **Proposed:** `body('Split_Edu_Proposed')?['level']`
4. Below it, add another **Run a Child Flow** → `Build Redline Rows` → rename `Redline ExpLevel`:
   - **Original:** `body('Split_Exp_Original')?['level']`
   - **Proposed:** `body('Split_Exp_Proposed')?['level']`

> Child flow outputs are read with **lowercase** keys. If `?['level']` comes back empty, open a Split action in a run → **Show raw outputs** and use the key you see there.

### 5.2 Add two Selects
Place these next to **Rows EduReq** and **Rows ExpReq**.

**Rows EduLevel**
1. **+** → **Data Operation** → **Select** → rename `Rows EduLevel`.
2. **From** → **Expression**:
   ```
   if(empty(json(body('Redline_EduLevel')?['rows'])), json('[{"Kept":"","Added":"","Removed":""}]'), json(body('Redline_EduLevel')?['rows']))
   ```
3. **Map** (key/value mode), each value from the **Expression** tab:

| Key | Value |
|---|---|
| `EduLevelKept` | `item()?['Kept']` |
| `EduLevelAdded` | `item()?['Added']` |
| `EduLevelRemoved` | `item()?['Removed']` |

**Rows ExpLevel**
1. **+** → **Select** → rename `Rows ExpLevel`.
2. **From**:
   ```
   if(empty(json(body('Redline_ExpLevel')?['rows'])), json('[{"Kept":"","Added":"","Removed":""}]'), json(body('Redline_ExpLevel')?['rows']))
   ```
3. **Map:**

| Key | Value |
|---|---|
| `ExpLevelKept` | `item()?['Kept']` |
| `ExpLevelAdded` | `item()?['Added']` |
| `ExpLevelRemoved` | `item()?['Removed']` |

### 5.3 Re-select the template and map the new fields
1. Open **Populate User Doc**.
2. **File** → pick a **different** file first, then pick your updated template again. This reloads the template's fields.
3. Re-enter every existing mapping (single fields and every repeating section in **entire array** mode).
4. Map the two new repeating sections. Click **Switch to input entire array** (the **T** icon) on each, then use **Expression**:

| Field | Expression |
|---|---|
| EduLevelRows | `body('Rows_EduLevel')` |
| ExpLevelRows | `body('Rows_ExpLevel')` |

`EducationLevel` and `ExperienceLevel` no longer appear, because those controls were replaced, so there's nothing to map for them.

5. **Save**.

### 5.4 Check the order inside the scope
```
Build Documents (Scope)
 ├─ Get JD → JD
 ├─ Split Edu Original · Split Edu Proposed · Split Exp Original · Split Exp Proposed
 ├─ Redline Purpose … Redline KSA · Redline EduReq · Redline ExpReq · Redline EduLevel · Redline ExpLevel
 ├─ Rows Purpose … Rows KSA · Rows EduReq · Rows ExpReq · Rows EduLevel · Rows ExpLevel
 ├─ Populate User Doc
 ├─ Create User File → Share With Requester → User File Props → Set DocLink
 └─ Save Doc Links
```
No changes are needed to **Redline Education** and **Redline Experience**. They still read `?['details']`, which now leaves the level out.

---

## Part 6 — Testing

### 6.1 Flow-only test
1. **Save JD Update Request** → **Test** → **Manually**.
2. Enter a real Job Code and your email. In **ProposedEducation**, paste the job's current Education text with the level changed (e.g., "High school" → "Bachelors Degree"). Leave everything else blank.
3. Run it and open the document.

### 6.2 What to check

| # | Test | Expected in the document |
|---|---|---|
| 1 | Change nothing in Education or Work Experience | Level, Details and Req/Pref show the original text, all plain |
| 2 | Change the Education level ("High school" → "Bachelors Degree") | **Education Level:** "High school" struck through, "Bachelors Degree" highlighted. Details is plain if the rest is unchanged |
| 3 | Change "Minimum 2 years" to "Minimum 3 years" | **Experience:** the old value struck through, the new one highlighted |
| 4 | A job whose Work Experience starts "5-7 years" | Experience = "5-7 years", and Details starts "of …" with no hanging "of" in the Experience column |
| 5 | Change only the Experience details (keep "5-7 years") | Experience plain, Details redlined |
| 6 | Change Education from Preferred to Required | Only Req/Pref is redlined (from the earlier guide) |
| 7 | A job with a blank Education or Work Experience | That table is blank, the flow succeeds and the file opens |
| 8 | Any test | The file opens in Word desktop and Word for the web |

### 6.3 End-to-end
In the agent's Test pane, update Work Experience on a real job ("bump it to 3-5 years"), submit, and open the link. The Experience column should show the redlined years, with the rest in Details.

---

## Appendix A — Name reference

**Split Req Pref — new steps:** `DetailsFlat` · `WordList` (Filter array) · `LevelCount` · `YearPos` · `YearRest` · `YearEnd` · `Level` · `DetailsRest`
**Split Req Pref — outputs:** `Details` (now = DetailsRest) · `ReqPref` · `Level` (new). Read in the parent flow as `?['details']`, `?['reqpref']`, `?['level']`.

**Save JD Update Request — new actions:**

| Action | Type | Reads |
|---|---|---|
| Redline EduLevel | Run a Child Flow (Build Redline Rows) | Split Edu Original / Proposed → `level` |
| Redline ExpLevel | Run a Child Flow (Build Redline Rows) | Split Exp Original / Proposed → `level` |
| Rows EduLevel | Select | Redline EduLevel |
| Rows ExpLevel | Select | Redline ExpLevel |

**Template — new controls:**

| Column | Repeating | Kept | Added | Removed |
|---|---|---|---|---|
| Education Level | EduLevelRows | EduLevelKept | EduLevelAdded | EduLevelRemoved |
| Experience | ExpLevelRows | ExpLevelKept | ExpLevelAdded | ExpLevelRemoved |

**Template — removed controls:** `EducationLevel`, `ExperienceLevel`

---

## Appendix B — Troubleshooting

**The Experience level includes "of"**
"year" wasn't found within the first 20 characters, so the 4-word fallback ran. Check how "years" is spelled in that entry (e.g., "yrs"). To allow abbreviations, add a second search in **YearPos**, or change both `20`s to a larger number if "years" sits further in.

**The Experience level is too long, e.g. "Experience in retail banking for several years"**
That shouldn't happen with the 20-character limit. If it does, lower both `20`s in **YearPos**.

**The Education level should be one word, or three**
Change both `2`s in **Level** and **DetailsRest** (the `take(..., 2)` and `skip(..., 2)` parts), and the `2` in **LevelCount**.

**Level comes back empty in the parent flow**
Check the output key: open the Split action in a run → **Show raw outputs** → use the exact key (usually `level`). Also confirm the **Level** output was added to **Respond to a PowerApp or flow** and the child flow was saved.

**Details now shows text without line breaks**
Expected. **DetailsFlat** puts Education and Work Experience on one line to find the words. These sections are normally a sentence or two, so nothing visible is lost.

**An unchanged level shows as changed**
The original and the agent's version differ invisibly, as with the quotes and spaces before. Build Redline Rows' normalization should handle it. If it doesn't, compare the two `level` values in the run using `uriComponent(...)` in a temporary Compose.

**The document won't open after the template change**
A pasted control kept its old name, so a name is duplicated. Run the script in Appendix C, fix any duplicates in Word, re-upload, and re-select the file in **Populate User Doc**.

---

## Appendix C — Update the template verification script

If you use `verify_jd_template.py` from the agent spec, update its lists so it expects the new controls:

```python
SINGLE = ["JobTitle", "RelationshipManager", "NMLS", "SalesNonSales", "PeopleManagement"]
REPEATING = {
    "PurposeRows": "Purpose", "DutiesRows": "Duties",
    "EducationRows": "Education", "EduReqRows": "EduReq", "EduLevelRows": "EduLevel",
    "ExperienceRows": "Experience", "ExpReqRows": "ExpReq", "ExpLevelRows": "ExpLevel",
    "KSARows": "KSA", "CertsRows": "Certs",
}
```

Run `python3 verify_jd_template.py "JD Change Template.docx"`. It should report 45 controls and `RESULT: PASS`. A duplicate name (a pasted control you forgot to rename) shows as `Duplicate tags: [...]`.
