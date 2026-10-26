# Populate a Microsoft Word Template: Field Mappings

**Action:** Populate User Doc (and Populate HR Doc, if you have a separate HR template) in **Save JD Update Request** → **Build Documents** scope
**Template:** the JD Change Template with the inline Purpose slots (*JD-Inline-Paragraph-Redline-Guide v2*)
**Fields:** 30 in total: 5 single fields, 16 Purpose slots, 9 repeating sections

> Re-selecting the template file clears **every** mapping in the action. Use this sheet to fill all 30 again whenever you re-select it.

---

## Contents

1. [Before you start](#1-before-you-start)
2. [Single fields (1–5)](#2-single-fields-15)
3. [Purpose slots (6–21)](#3-purpose-slots-621)
4. [Repeating sections (22–30)](#4-repeating-sections-2230)
5. [Check and save](#5-check-and-save)
6. [All 30 at a glance](#6-all-30-at-a-glance)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Before you start

**These actions must be above the Populate action** (inside Build Documents):

| Needed by | Action |
|---|---|
| Fields 2–5 | **JD** (Compose: `first(body('Get_JD')?['value'])`) |
| Fields 6–21 | **Purpose Slots** (Compose: `json(body('Redline_Purpose')?['rows'])`) |
| Fields 22–30 | **Rows Duties**, **Rows EduLevel**, **Rows Education**, **Rows EduReq**, **Rows ExpLevel**, **Rows Experience**, **Rows ExpReq**, **Rows KSA**, **Rows Certs** (Selects) |

**How to enter an Expression:** click the field → **fx** (new designer) or the **Expression** tab (classic) → paste → **Add** (or **OK**).

**Action names in expressions** use underscores for spaces: `Rows Duties` → `Rows_Duties`. If you named an action differently, change the expression to match.

**Fill in your internal names (fields 2–5).** These are the same internal column names you used before, and in the email flow's **Classification** Compose:

| Field | Your JD list column | Internal name | Type (Text / Choice / Yes/No) |
|---|---|---|---|
| RelationshipManager | Relationship Manager | `________` | `______` |
| NMLS | NMLS Required | `________` | `______` |
| SalesNonSales | Sales/Non-Sales | `________` | `______` |
| PeopleManagement | People Management | `________` | `______` |

---

## 2. Single fields (1–5)

### Field 1 — JobTitle
1. Click **JobTitle**.
2. Click the **lightning** icon (dynamic content).
3. Under the trigger (**When an agent calls the flow**), pick **JobTitle**.

### Field 2 — RelationshipManager
1. Click **RelationshipManager** → **Expression**:
   ```
   coalesce(outputs('JD')?['YourRMInternalName'], '')
   ```
2. Replace `YourRMInternalName` with your internal name → **Add**.

### Field 3 — NMLS
1. Click **NMLS** → **Expression**:
   ```
   coalesce(outputs('JD')?['YourNMLSInternalName'], '')
   ```
2. Replace `YourNMLSInternalName` → **Add**.

### Field 4 — SalesNonSales
1. Click **SalesNonSales** → **Expression**:
   ```
   coalesce(outputs('JD')?['YourSalesInternalName'], '')
   ```
2. Replace `YourSalesInternalName` → **Add**.

### Field 5 — PeopleManagement
1. Click **PeopleManagement** → **Expression**:
   ```
   coalesce(outputs('JD')?['YourPeopleMgmtInternalName'], '')
   ```
2. Replace `YourPeopleMgmtInternalName` → **Add**.

**Adjust fields 2–5 by column type:**

| Column type | Pattern |
|---|---|
| Text | `coalesce(outputs('JD')?['Col'], '')` |
| Choice | `coalesce(outputs('JD')?['Col']?['Value'], '')` |
| Yes/No | `if(equals(outputs('JD')?['Col'], true), 'Yes', 'No')` |

> Not sure of a type? Open a past run → **JD** → **Show raw outputs**. `{"Value": "…"}` means Choice, and `true` / `false` means Yes/No.

---

## 3. Purpose slots (6–21)

Each slot is a plain field. Click it → **Expression** → paste → **Add**.

**Pattern:** `outputs('Purpose_Slots')?['slots'][N]?['L']`
- `N` = slot number minus 1 (slot 1 → `0`, slot 5 → `4`)
- `L` = `k` for the K fields, `r` for the R fields, `a` for the A fields

> **Shortcut:** after field 6, copy its expression. For each next field, paste it and change only the number and the letter.

### Slot 1

**Field 6 — PurposeK1**
```
outputs('Purpose_Slots')?['slots'][0]?['k']
```

**Field 7 — PurposeR1**
```
outputs('Purpose_Slots')?['slots'][0]?['r']
```

**Field 8 — PurposeA1**
```
outputs('Purpose_Slots')?['slots'][0]?['a']
```

### Slot 2

**Field 9 — PurposeK2**
```
outputs('Purpose_Slots')?['slots'][1]?['k']
```

**Field 10 — PurposeR2**
```
outputs('Purpose_Slots')?['slots'][1]?['r']
```

**Field 11 — PurposeA2**
```
outputs('Purpose_Slots')?['slots'][1]?['a']
```

### Slot 3

**Field 12 — PurposeK3**
```
outputs('Purpose_Slots')?['slots'][2]?['k']
```

**Field 13 — PurposeR3**
```
outputs('Purpose_Slots')?['slots'][2]?['r']
```

**Field 14 — PurposeA3**
```
outputs('Purpose_Slots')?['slots'][2]?['a']
```

### Slot 4

**Field 15 — PurposeK4**
```
outputs('Purpose_Slots')?['slots'][3]?['k']
```

**Field 16 — PurposeR4**
```
outputs('Purpose_Slots')?['slots'][3]?['r']
```

**Field 17 — PurposeA4**
```
outputs('Purpose_Slots')?['slots'][3]?['a']
```

### Slot 5

**Field 18 — PurposeK5**
```
outputs('Purpose_Slots')?['slots'][4]?['k']
```

**Field 19 — PurposeR5**
```
outputs('Purpose_Slots')?['slots'][4]?['r']
```

**Field 20 — PurposeA5**
```
outputs('Purpose_Slots')?['slots'][4]?['a']
```

### End

**Field 21 — PurposeKEnd**
```
outputs('Purpose_Slots')?['end']
```

---

## 4. Repeating sections (22–30)

Do this for **each** of these fields:
1. Find the field (it may show as a group with sub-fields like DutiesKept, DutiesAdded, DutiesRemoved).
2. Click **Switch to input entire array**: the **T** icon at the top right of that field. The sub-fields collapse into one box.
3. Click the box → **Expression** → paste → **Add**.

> Skip step 2 and the action fills only one row with the wrong data, so the section comes out blank or broken.

**Field 22 — DutiesRows**
```
body('Rows_Duties')
```

**Field 23 — EduLevelRows**
```
body('Rows_EduLevel')
```

**Field 24 — EducationRows**
```
body('Rows_Education')
```

**Field 25 — EduReqRows**
```
body('Rows_EduReq')
```

**Field 26 — ExpLevelRows**
```
body('Rows_ExpLevel')
```

**Field 27 — ExperienceRows**
```
body('Rows_Experience')
```

**Field 28 — ExpReqRows**
```
body('Rows_ExpReq')
```

**Field 29 — KSARows**
```
body('Rows_KSA')
```

**Field 30 — CertsRows**
```
body('Rows_Certs')
```

---

## 5. Check and save

1. Scroll through the action. All 30 fields should be filled. The 9 repeating sections should each show a single expression box, not separate sub-fields.
2. **Not in the action, and that's correct:** **PurposeRows** (replaced by the slots), and **EducationLevel** / **ExperienceLevel** (replaced by EduLevelRows / ExpLevelRows).
3. **A field you don't see on this sheet:** it's a control from your own template version. Note its name and ask me.
4. **Save** the flow.
5. **Separate HR template?** Open **Populate HR Doc**, re-select `JD Change Template - HR.docx`, and fill the same 30, plus its HR-only fields (Grade, JobCode, SalaryType, Status, and any notes fields it shows).
6. Run one test request. Open the document and check every section: Job Description table, Purpose, Duties, Education (Level / Details / Req/Pref), Work Experience (Experience / Details / Req/Pref), KSAs, Certifications.

---

## 6. All 30 at a glance

| # | Field | Value |
|---|---|---|
| 1 | JobTitle | **JobTitle** (trigger, dynamic content) |
| 2 | RelationshipManager | `coalesce(outputs('JD')?['YourRMInternalName'], '')` |
| 3 | NMLS | `coalesce(outputs('JD')?['YourNMLSInternalName'], '')` |
| 4 | SalesNonSales | `coalesce(outputs('JD')?['YourSalesInternalName'], '')` |
| 5 | PeopleManagement | `coalesce(outputs('JD')?['YourPeopleMgmtInternalName'], '')` |
| 6 | PurposeK1 | `outputs('Purpose_Slots')?['slots'][0]?['k']` |
| 7 | PurposeR1 | `outputs('Purpose_Slots')?['slots'][0]?['r']` |
| 8 | PurposeA1 | `outputs('Purpose_Slots')?['slots'][0]?['a']` |
| 9 | PurposeK2 | `outputs('Purpose_Slots')?['slots'][1]?['k']` |
| 10 | PurposeR2 | `outputs('Purpose_Slots')?['slots'][1]?['r']` |
| 11 | PurposeA2 | `outputs('Purpose_Slots')?['slots'][1]?['a']` |
| 12 | PurposeK3 | `outputs('Purpose_Slots')?['slots'][2]?['k']` |
| 13 | PurposeR3 | `outputs('Purpose_Slots')?['slots'][2]?['r']` |
| 14 | PurposeA3 | `outputs('Purpose_Slots')?['slots'][2]?['a']` |
| 15 | PurposeK4 | `outputs('Purpose_Slots')?['slots'][3]?['k']` |
| 16 | PurposeR4 | `outputs('Purpose_Slots')?['slots'][3]?['r']` |
| 17 | PurposeA4 | `outputs('Purpose_Slots')?['slots'][3]?['a']` |
| 18 | PurposeK5 | `outputs('Purpose_Slots')?['slots'][4]?['k']` |
| 19 | PurposeR5 | `outputs('Purpose_Slots')?['slots'][4]?['r']` |
| 20 | PurposeA5 | `outputs('Purpose_Slots')?['slots'][4]?['a']` |
| 21 | PurposeKEnd | `outputs('Purpose_Slots')?['end']` |
| 22 | DutiesRows | `body('Rows_Duties')` (entire array) |
| 23 | EduLevelRows | `body('Rows_EduLevel')` (entire array) |
| 24 | EducationRows | `body('Rows_Education')` (entire array) |
| 25 | EduReqRows | `body('Rows_EduReq')` (entire array) |
| 26 | ExpLevelRows | `body('Rows_ExpLevel')` (entire array) |
| 27 | ExperienceRows | `body('Rows_Experience')` (entire array) |
| 28 | ExpReqRows | `body('Rows_ExpReq')` (entire array) |
| 29 | KSARows | `body('Rows_KSA')` (entire array) |
| 30 | CertsRows | `body('Rows_Certs')` (entire array) |

---

## 7. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| "Invalid reference" when adding an expression | The action name in it doesn't exist, or is below the Populate action | Check the spelling (underscores for spaces) and that the action sits above Populate |
| Field 2–5 shows `{"Value": "…"}` in the document | Choice column | Add `?['Value']` (section 2 table) |
| Field 2–5 shows `true` / `false` | Yes/No column | Use the Yes/No pattern |
| Purpose blank | Purpose Slots missing, or Redline Purpose's Mode not set to `Paragraph` | Inline Paragraph guide 7.1–7.2. Check the Purpose Slots output in a run |
| A repeating section blank, or only one row | **T** (entire array) not switched on | Section 4, step 2 |
| Error on a Rows Select when a section is empty | A Rows Select's **From** lacks the empty-array fallback | Use `if(empty(json(body('Redline_X')?['rows'])), json('[{"Kept":"","Added":"","Removed":""}]'), json(body('Redline_X')?['rows']))`, with that section's Select keys |
| Document corrupt or sections blank after a template change | Action still using the old layout | Re-select the file (pick a different file first, then this one) and refill all 30 |
