# Inline Paragraph Redline: Build Guide (v2: inline slots)

**Replaces** the earlier version of this guide (hidden paragraph marks). That approach showed each piece on its own line in Word for the web. This version uses ordinary inline fields, which display the same in Word desktop, Word for the web and PDF. If you followed any of the earlier version's Part 2, see [Appendix E](#appendix-e--undoing-the-earlier-version).

**Builds on:** the JD Change Document feature (Build Redline Rows child flow, Save JD Update Request flow, JD Change Template - User / - HR), including the quote and space normalization (`OriginalNorm` / `ProposedNorm`).
**Goal:** when a manager edits **Purpose**, the change document marks only what changed (added words bold yellow, removed words red strikethrough, everything else plain) in one flowing paragraph.

**Before:**
> ~~Provides service to consumer clients. Processes deposits accurately. Refers clients to specialists. Works as a team.~~ **Provides service to consumer and small business clients. Processes deposits accurately. Works as a team. Manages a portfolio of 40 clients.**

**After:**
> Provides service to consumer **and small business** clients. Processes deposits accurately. ~~Refers clients to specialists.~~ Works as a team. **Manages a portfolio of 40 clients.**

> **No changes to the HR review email.** It only reads the document's link, file ID and name. The legend stays accurate because the same two redline styles are used.

**Comes with:** `verify_purpose_slots.py`, which checks that a template has the 16 Purpose fields named, ordered and styled correctly (Part 1.6).

---

## Contents

0. [How it works](#part-0--how-it-works)
1. [Templates: replace the Purpose row with 16 inline slots](#part-1--templates-replace-the-purpose-row-with-16-inline-slots)
2. [Child flow: new input and variables](#part-2--child-flow-new-input-and-variables)
3. [Child flow: compare sentences and words](#part-3--child-flow-compare-sentences-and-words)
4. [Child flow: fill the slots](#part-4--child-flow-fill-the-slots)
5. [Child flow: return the result](#part-5--child-flow-return-the-result)
6. [Test the child flow on its own](#part-6--test-the-child-flow-on-its-own)
7. [Parent flow: wire Purpose to the slots](#part-7--parent-flow-wire-purpose-to-the-slots)
8. [End-to-end tests](#part-8--end-to-end-tests)
- [Appendix A — Other paragraph sections](#appendix-a--other-paragraph-sections)
- [Appendix B — Name reference](#appendix-b--name-reference)
- [Appendix C — Troubleshooting](#appendix-c--troubleshooting)
- [Appendix D — Spec for the template agent](#appendix-d--spec-for-the-template-agent)
- [Appendix E — Undoing the earlier version](#appendix-e--undoing-the-earlier-version)

---

## Part 0 — How it works

```
Template: Purpose is ONE paragraph of 16 inline fields
  [K1][R1][A1] [K2][R2][A2] [K3][R3][A3] [K4][R4][A4] [K5][R5][A5] [KEnd]
   K = kept text (plain)   R = removed (red strike)   A = added (bold yellow)
  Unused fields stay empty and invisible.

Build Redline Rows (child flow), Mode = "Paragraph"
  1. Flatten both versions to one line, split into sentences
  2. Sentences in both versions = anchors (unchanged)
  3. Between anchors: removed sentences / added sentences ("gaps")
  4. In each gap, trim matching words at the start and end,
     leaving only the changed words
  5. Each changed spot fills one slot: K = kept text before it, R = removed, A = added
  6. Kept text after the last change → KEnd
  7. Return {"slots": [5 × {k, r, a}], "end": "..."}
Mode blank → the line-by-line rows, exactly as today (all other sections)

Save JD Update Request
  Purpose Slots (Compose) = json(rows from Redline Purpose)
  Populate User / HR Doc: PurposeK1 … PurposeKEnd ← Purpose Slots
```

**Five slots = five separate changed spots.** Changes next to each other (or in the same sentence) share one slot. A typical Purpose edit uses one or two. If a manager makes **six or more separate edits**, the paragraph falls back to showing the old text struck through and the new text added, which is how it works today.

**What it handles:** words added, removed or changed inside a sentence; sentences added, removed or inserted anywhere; several separate edits; a brand-new Purpose; an unchanged Purpose.

**Known limits:**
- **Moved or duplicated sentences** fall back to one changed spot covering just the part that differs.
- **Two edits inside the same sentence** show as one removed/added pair spanning both.
- **Bullet sections** (Principal Duties, KSAs, Certifications) keep the line-by-line comparison.

The expressions in this guide were tested offline before writing it, with a simulation that uses only the functions shown here. All 12 test edits rebuilt both the original and the proposed text exactly, with no double spaces. The 5-edit maximum and the 6-edit fallback were tested too. A filled sample template was rendered to confirm the result reads as one paragraph.

---

## Part 1 — Templates: replace the Purpose row with 16 inline slots

Do this in **both** templates: `JD Change Template - User.docx` and `JD Change Template - HR.docx`. Build it once in the User template, then copy the finished paragraph into the HR template (1.5).

> **Prefer to have the other agent do it?** Give it [Appendix D](#appendix-d--spec-for-the-template-agent) and both templates, then run the checker (1.6) on what it returns.

### 1.1 Open and back up
1. In **JD Templates**, select `JD Change Template - User.docx` → **⋯** → **Download**. Keep an untouched copy as a backup.
2. Open the downloaded file in **Word desktop**.
3. **Home** → **¶** on (show marks). **Developer** → **Design Mode** on.

### 1.2 Remove the old Purpose row
1. Under the **Purpose** heading, find the **PurposeRows** repeating section. It contains the PurposeKept, PurposeAdded and PurposeRemoved controls.
2. Click the repeating section's outer border (the tag that says **PurposeRows**) so the whole section is selected.
3. Press **Delete**. If an empty paragraph is left, keep it: the cursor goes there next.
4. Make sure that paragraph has the same formatting as the old Purpose text (Arial 9, same spacing). If you're not sure, use **Home** → **Format Painter** from a nearby body paragraph.

### 1.3 Build slot 1 (three controls)
Put the cursor in the empty Purpose paragraph.

1. **Developer** → **Plain Text Content Control** (**Aa**). One control appears.
2. Click just to the right of it (still on the same line, outside its end tag) → **Plain Text Content Control** again. Do this once more, so you have **three controls on one line**.
3. Click the **first** control → **Developer** → **Properties**:
   - **Title:** `PurposeK1` · **Tag:** `PurposeK1`
   - **Use a style…** stays **unchecked**
   - **OK**
4. Click the **second** control → **Properties**:
   - **Title:** `PurposeR1` · **Tag:** `PurposeR1`
   - Check **Use a style to format text typed into the empty control** → **Style:** **JD Removed**
   - **OK**
5. Click the **third** control → **Properties**:
   - **Title:** `PurposeA1` · **Tag:** `PurposeA1`
   - Check **Use a style…** → **Style:** **JD Added**
   - **OK**
6. Clear the placeholder text in each of the three. Still in Design Mode, select the placeholder text inside the control, type `200B`, then press **Alt+X**. It turns into an invisible zero-width space.

> **Keep all three on the same line, with no spaces between them.** The flow adds the spaces between words itself.

### 1.4 Copy it into slots 2–5 and add the end slot
1. Select all three slot-1 controls (drag from the start tag of PurposeK1 to the end tag of PurposeA1) → **Ctrl+C**.
2. Click immediately after PurposeA1's end tag → **Ctrl+V**. Do this **three more times**, so there are 5 sets of 3 (15 controls) on the one line. The styles and cleared placeholders copy with them.
3. Rename each copy. Click it → **Properties** → set **Title** and **Tag** both to:

| Set | Kept (no style) | Removed (JD Removed) | Added (JD Added) |
|---|---|---|---|
| 1 | `PurposeK1` | `PurposeR1` | `PurposeA1` |
| 2 | `PurposeK2` | `PurposeR2` | `PurposeA2` |
| 3 | `PurposeK3` | `PurposeR3` | `PurposeA3` |
| 4 | `PurposeK4` | `PurposeR4` | `PurposeA4` |
| 5 | `PurposeK5` | `PurposeR5` | `PurposeA5` |

4. Click right after PurposeA5's end tag → **Plain Text Content Control** → **Properties**:
   - **Title:** `PurposeKEnd` · **Tag:** `PurposeKEnd`
   - No style → **OK**
   - Clear its placeholder (`200B`, **Alt+X**).
5. **Design Mode** off → **¶** off. The Purpose area should look empty: a single blank line.
6. **File** → **Save** (same name).

> **Order matters:** K1 R1 A1 K2 R2 A2 K3 R3 A3 K4 R4 A4 K5 R5 A5 KEnd, all on one line.

### 1.5 HR template
1. In the finished User template: **Design Mode** on → select from PurposeK1's start tag through PurposeKEnd's end tag → **Ctrl+C**.
2. Download and open `JD Change Template - HR.docx` (keep a backup).
3. Delete its **PurposeRows** repeating section (1.2).
4. Click in the empty Purpose paragraph → **Ctrl+V**.
5. **Save**.

### 1.6 Check both templates
**With the checker (recommended):** on a computer with Python and the `lxml` package installed (`pip install lxml`), put `verify_purpose_slots.py` in the same folder as the templates and run:
```
python verify_purpose_slots.py "JD Change Template - User.docx" "JD Change Template - HR.docx"
```
Each template should show **RESULT: PASS (16/16 slots found)**. Each **FAIL** line names the control and what to fix.

**Without Python, check by hand:**
- **Developer** → **Design Mode** on. The Purpose line shows 16 tags in the order above.
- **PurposeRows**, **PurposeKept**, **PurposeAdded** and **PurposeRemoved** are gone.
- Each R control's Properties shows **JD Removed**; each A shows **JD Added**; the K controls and KEnd have no style.
- No control shows "Click or tap here to enter text".

### 1.7 Upload
In **JD Templates**, upload both files → **Replace**. (Re-selecting them in the Populate actions happens in Part 7, after the flow is ready.)

> **From here until Part 7 is done, the document's Purpose will be blank**, because the old PurposeRows mapping no longer has a control to fill. Build Parts 2–7 in one sitting, or do the template upload last.

---

## Part 2 — Child flow: new input and variables

Open **Build Redline Rows** from your solution → **Edit**.

### 2.1 Add the Mode input
1. Click **Manually trigger a flow** → **+ Add an input** → **Text** → name it `Mode`.
2. **⋯** next to Mode → **Make the field optional**.
3. Check its key: trigger → **⋯** → **Peek code**. Under `properties`, the new input is usually `text_2`. The expressions below assume `text_2`. If yours differs, use your key.

### 2.2 Add four variables at the top
Variables must be created at the top level, before any condition or loop. Click **+** between the trigger and **NL** → **Initialize variable**, then add each one below the last:

| Name | Type | Value |
|---|---|---|
| `RowsOut` | String | *(empty)* |
| `GapList` | Array | `[]` |
| `Slots` | Array | `[]` |
| `PendingK` | String | *(empty)* |

---

## Part 3 — Child flow: compare sentences and words

Everything in Parts 3 and 4 goes **between AllRows and the Respond step**.

**How to enter the steps below**
- **Expression:** click the field → **fx** (new designer) or **Expression** tab (classic) → paste → **Add**.
- **Filter array condition:** click **Edit in advanced mode** → paste the line starting with `@`.
- **Select, text mode:** on **Map**, click **T** (**Switch Map to text mode**) → paste into the single box.
- **Select, key/value mode:** type each key on the left, and add each value on the right with **Expression**.
- **Rename every action as soon as you add it.** Expressions refer to actions by name, with spaces as underscores.

### 3.1 The condition
1. Click **+** between **AllRows** and the Respond step → **Condition** → rename it `Is Paragraph`.
2. Left → **Expression:**
   ```
   equals(toLower(trim(coalesce(triggerBody()?['text_2'], ''))), 'paragraph')
   ```
3. **is equal to** · Right → **Expression:** `true`

Steps 3.2 through 4.4 go in **Is Paragraph → True**. Step 4.5 goes in **False**.

### 3.2 Flatten both versions

1. **+** → **Compose** → rename `OrigFlat`:
   ```
   trim(replace(replace(replace(outputs('OriginalNorm'), outputs('NL'), ' '), '  ', ' '), '  ', ' '))
   ```
2. **+** → **Compose** → rename `PropFlat`:
   ```
   trim(replace(replace(replace(outputs('ProposedNorm'), outputs('NL'), ' '), '  ', ' '), '  ', ' '))
   ```

### 3.3 Split into sentences

1. **+** → **Select** → rename `OS Split`.
   - **From:**
     ```
     split(replace(replace(replace(outputs('OrigFlat'), '. ', concat('.', decodeUriComponent('%1E'))), '? ', concat('?', decodeUriComponent('%1E'))), '! ', concat('!', decodeUriComponent('%1E'))), decodeUriComponent('%1E'))
     ```
   - **Map (text mode):** `trim(item())`
2. **+** → **Filter array** → rename `OS`.
   - **From:** `body('OS_Split')` · **Advanced mode:** `@greater(length(item()), 0)`
3. **+** → **Select** → rename `PS Split`.
   - **From:**
     ```
     split(replace(replace(replace(outputs('PropFlat'), '. ', concat('.', decodeUriComponent('%1E'))), '? ', concat('?', decodeUriComponent('%1E'))), '! ', concat('!', decodeUriComponent('%1E'))), decodeUriComponent('%1E'))
     ```
   - **Map (text mode):** `trim(item())`
4. **+** → **Filter array** → rename `PS`.
   - **From:** `body('PS_Split')` · **Advanced mode:** `@greater(length(item()), 0)`

> `%1E` is an invisible separator character. It marks sentence ends without breaking on "e.g." or "1.5".

### 3.4 Find the sentences that are in both

1. **+** → **Filter array** → rename `KeptO`.
   - **From:** `take(range(0, add(length(body('OS')), 1)), length(body('OS')))`
   - **Advanced mode:** `@contains(body('PS'), body('OS')[item()])`
2. **+** → **Filter array** → rename `KeptP`.
   - **From:** `take(range(0, add(length(body('PS')), 1)), length(body('PS')))`
   - **Advanced mode:** `@contains(body('OS'), body('PS')[item()])`
3. **+** → **Select** → rename `Anchor Check`.
   - **From:**
     ```
     take(range(0, add(min(length(body('KeptO')), length(body('KeptP'))), 1)), min(length(body('KeptO')), length(body('KeptP'))))
     ```
   - **Map (text mode):**
     ```
     if(equals(body('OS')[body('KeptO')[item()]], body('PS')[body('KeptP')[item()]]), 'y', 'n')
     ```

> **Why `take(range(… + 1), …)`:** `range()` errors when asked for zero numbers, for example when the original Purpose is blank. Asking for one extra and then taking the real count avoids that.

### 3.5 Build the gaps

1. **+** → **Condition** → rename `Aligned`.
   - Left → **Expression:**
     ```
     and(equals(length(body('KeptO')), length(body('KeptP'))), not(contains(join(body('Anchor_Check'), ''), 'n')))
     ```
   - **is equal to** · Right → **Expression:** `true`

**Aligned → True:**

2. **+** → **Compose** → rename `KOB`:
   ```
   union(createArray(-1), body('KeptO'), createArray(length(body('OS'))))
   ```
3. **+** → **Compose** → rename `KPB`:
   ```
   union(createArray(-1), body('KeptP'), createArray(length(body('PS'))))
   ```
4. **+** → **Select** → rename `Gaps`.
   - **From:** `range(0, add(length(body('KeptP')), 1))`
   - **Map (key/value):**

| Key | Value (Expression) |
|---|---|
| `g` | `item()` |
| `removed` | `join(take(skip(body('OS'), add(outputs('KOB')[item()], 1)), sub(sub(outputs('KOB')[add(item(), 1)], outputs('KOB')[item()]), 1)), ' ')` |
| `added` | `join(take(skip(body('PS'), add(outputs('KPB')[item()], 1)), sub(sub(outputs('KPB')[add(item(), 1)], outputs('KPB')[item()]), 1)), ' ')` |
| `anchor` | `join(take(skip(body('PS'), outputs('KPB')[add(item(), 1)]), if(less(item(), length(body('KeptP'))), 1, 0)), '')` |

5. **+** → **Set variable** → **GapList** → **Value:** `body('Gaps')`

**Aligned → False** (moved or duplicated sentences: treat the whole paragraph as one gap):

6. **+** → **Compose** → rename `Whole Gap` → paste directly into **Inputs** (not as an expression):
   ```json
   [
     {
       "g": 0,
       "removed": "@{outputs('OrigFlat')}",
       "added": "@{outputs('PropFlat')}",
       "anchor": ""
     }
   ]
   ```
7. **+** → **Set variable** → **GapList** → **Value:** `outputs('Whole_Gap')`

> **What a gap is:** the stretch between two unchanged sentences. `removed` is the old sentences in that stretch, `added` is the new ones, and `anchor` is the unchanged sentence that ends it.

### 3.6 Trim matching words inside each gap

**Below the Aligned condition** (not in either of its branches), still in **Is Paragraph → True**:

1. **+** → **Apply to each** → rename `Each Gap` → **From:** `variables('GapList')`.
2. **⋯** → **Settings** → **Concurrency Control** **Off** → **Done**. Order matters.

**Inside Each Gap:**

3. **+** → **Compose** → rename `RW`: `split(items('Each_Gap')?['removed'], ' ')`
4. **+** → **Compose** → rename `AW`: `split(items('Each_Gap')?['added'], ' ')`
5. **+** → **Select** → rename `Prefix Flags`.
   - **From:** `range(0, min(length(outputs('RW')), length(outputs('AW'))))`
   - **Map (text mode):** `if(equals(outputs('RW')[item()], outputs('AW')[item()]), 'y', 'n')`
6. **+** → **Compose** → rename `P` (words matching at the start):
   ```
   if(or(empty(items('Each_Gap')?['removed']), empty(items('Each_Gap')?['added'])), 0, indexOf(concat(join(body('Prefix_Flags'), ''), 'n'), 'n'))
   ```
7. **+** → **Select** → rename `Suffix Flags`.
   - **From:** `range(0, max(sub(min(length(outputs('RW')), length(outputs('AW'))), outputs('P')), 1))`
   - **Map (text mode):**
     ```
     if(equals(outputs('RW')[sub(sub(length(outputs('RW')), 1), item())], outputs('AW')[sub(sub(length(outputs('AW')), 1), item())]), 'y', 'n')
     ```
8. **+** → **Compose** → rename `S` (words matching at the end):
   ```
   if(or(empty(items('Each_Gap')?['removed']), empty(items('Each_Gap')?['added'])), 0, min(indexOf(concat(join(body('Suffix_Flags'), ''), 'n'), 'n'), sub(min(length(outputs('RW')), length(outputs('AW'))), outputs('P'))))
   ```

> Inside a **Select**, `item()` means the Select's own item. The loop's current gap is read with `items('Each_Gap')`.

---

## Part 4 — Child flow: fill the slots

### 4.1 This gap's four pieces
Still **inside Each Gap**, below **S**:

1. **+** → **Compose** → rename `Lead Text` (kept words before the change):
   ```
   join(take(outputs('AW'), outputs('P')), ' ')
   ```
2. **+** → **Compose** → rename `Removed Text`:
   ```
   join(take(skip(outputs('RW'), outputs('P')), sub(length(outputs('RW')), add(outputs('P'), outputs('S')))), ' ')
   ```
3. **+** → **Compose** → rename `Added Text`:
   ```
   join(take(skip(outputs('AW'), outputs('P')), sub(length(outputs('AW')), add(outputs('P'), outputs('S')))), ' ')
   ```
4. **+** → **Compose** → rename `Tail Text` (kept words after the change, plus the unchanged sentence that ends the gap):
   ```
   trim(concat(join(skip(outputs('AW'), sub(length(outputs('AW')), outputs('S'))), ' '), ' ', items('Each_Gap')?['anchor']))
   ```

### 4.2 Changed spot, or kept text only?
1. **+** → **Condition** → rename `Gap Changed`.
   - Left → **Expression:**
     ```
     or(not(empty(outputs('Removed_Text'))), not(empty(outputs('Added_Text'))))
     ```
   - **is equal to** · Right → **Expression:** `true`

**Gap Changed → True** (this gap fills a slot):

2. **+** → **Append to array variable** → rename `Add Slot` → **Name:** `Slots` → paste directly into **Value**:
   ```json
   {
     "k": "@{trim(concat(variables('PendingK'), ' ', outputs('Lead_Text')))}",
     "r": "@{outputs('Removed_Text')}",
     "a": "@{outputs('Added_Text')}"
   }
   ```
3. **+** → **Set variable** → rename `Start Pending` → **Name:** `PendingK` → **Value:** `outputs('Tail_Text')`

**Gap Changed → False** (no change, so just carry the kept text forward):

4. **+** → **Compose** → rename `Pending Next`:
   ```
   trim(concat(trim(concat(variables('PendingK'), ' ', outputs('Lead_Text'))), ' ', outputs('Tail_Text')))
   ```
5. **+** → **Set variable** → rename `Carry Pending` → **Name:** `PendingK` → **Value:** `outputs('Pending_Next')`

> **What PendingK does:** it holds the kept text that hasn't been placed yet. When the next change comes, it becomes that slot's **K**. After the last change, it becomes **KEnd**.

> After saving, reopen **Add Slot**. Each `@{...}` should show as an expression token. If one stayed as plain text, delete it, keep the quotes, click between them and add the expression (without `@{ }`) through **Expression**.

### 4.3 After the loop: fit into 5 slots
**Below Each Gap** (outside the loop), still in **Is Paragraph → True**:

1. **+** → **Compose** → rename `Fits`:
   ```
   lessOrEquals(length(variables('Slots')), 5)
   ```
2. **+** → **Compose** → rename `Final Slots` (more than 5 changes → show the whole paragraph replaced, as today):
   ```
   if(outputs('Fits'), variables('Slots'), createArray(addProperty(addProperty(addProperty(json('{}'), 'k', ''), 'r', outputs('OrigFlat')), 'a', outputs('PropFlat'))))
   ```
3. **+** → **Compose** → rename `Final End`:
   ```
   if(outputs('Fits'), variables('PendingK'), '')
   ```
4. **+** → **Compose** → rename `Padded` (always exactly 5 slots, with empty ones at the end):
   ```
   take(union(outputs('Final_Slots'), json('[{"k":"","r":"","a":"","p":1},{"k":"","r":"","a":"","p":2},{"k":"","r":"","a":"","p":3},{"k":"","r":"","a":"","p":4},{"k":"","r":"","a":"","p":5}]')), 5)
   ```

### 4.4 Add spacing and package the result
1. **+** → **Select** → rename `Slot Text`. This adds a space after each filled piece so words don't run together.
   - **From:** `outputs('Padded')`
   - **Map (key/value):**

| Key | Value (Expression) |
|---|---|
| `k` | `if(empty(item()?['k']), '', concat(item()?['k'], ' '))` |
| `r` | `if(empty(item()?['r']), '', concat(item()?['r'], ' '))` |
| `a` | `if(empty(item()?['a']), '', concat(item()?['a'], ' '))` |

2. **+** → **Compose** → rename `Para Out`:
   ```
   addProperty(addProperty(json('{}'), 'slots', body('Slot_Text')), 'end', outputs('Final_End'))
   ```
3. **+** → **Set variable** → **Name:** `RowsOut` → **Value:** `string(outputs('Para_Out'))`

### 4.5 Is Paragraph → False (every other section)
1. **+** → **Set variable** → **Name:** `RowsOut` → **Value:** `string(outputs('AllRows'))`

> Sections without Mode = Paragraph get exactly the rows they get today.

---

## Part 5 — Child flow: return the result

1. Click **Respond to a PowerApp or flow** (below Is Paragraph, on the main line).
2. **Rows** → delete the current expression (`string(outputs('AllRows'))`) → **Expression** → `variables('RowsOut')` → **Add**.
3. **Save**.

---

## Part 6 — Test the child flow on its own

1. **Test** → **Manually** → **Test**.
2. Enter:
   - **Original:** `Provides service to consumer clients. Processes deposits accurately. Refers clients to specialists. Works as a team.`
   - **Proposed:** `Provides service to consumer and small business clients. Processes deposits accurately. Works as a team. Manages a portfolio of 40 clients.`
   - **Mode:** `Paragraph`
3. **Run flow** → **Done** → open the run → **Respond** → **Rows** should be:

```json
{"slots":[
  {"k":"Provides service to consumer ","r":"","a":"and small business "},
  {"k":"clients. Processes deposits accurately. ","r":"Refers clients to specialists. ","a":""},
  {"k":"Works as a team. ","r":"","a":"Manages a portfolio of 40 clients. "},
  {"k":"","r":"","a":""},
  {"k":"","r":"","a":""}],
 "end":""}
```

Read across, that's: Provides service to consumer **and small business** clients. Processes deposits accurately. ~~Refers clients to specialists.~~ Works as a team. **Manages a portfolio of 40 clients.**

4. More checks (Mode = `Paragraph` unless noted):

| Test | Original | Proposed | Expected |
|---|---|---|---|
| Unchanged | the Original above | *(blank)* | All 5 slots empty; `end` = the full original text |
| New Purpose | *(blank)* | `Supports branch operations.` | Slot 1: `a` = `Supports branch operations. `; `end` blank |
| Reordered | `Works hard. Helps.` | `Helps. Works hard.` | **Aligned** takes **False**; slot 1 has the old text in `r` and the new in `a` |
| Mode blank | the Original above | the Proposed above | A list of Kept/Added/Removed rows, as before this change |

---

## Part 7 — Parent flow: wire Purpose to the slots

Open **Save JD Update Request** → **Edit** → **Build Documents** scope.

### 7.1 Turn on Paragraph mode
1. Click **Redline Purpose**. The new **Mode** field should appear. If it doesn't:
   1. Close and reopen the action.
   2. Still missing: note the current **Original** and **Proposed** values, delete the action, add **Run a Child Flow** → **Build Redline Rows**, rename it `Redline Purpose`, and re-enter both.
2. **Mode:** `Paragraph`.
3. Leave **Mode** blank on every other Redline action.

### 7.2 Replace Rows Purpose
1. Click **Rows Purpose** (the Select that maps PurposeKept/Added/Removed) → **⋯** → **Delete**. Nothing in the template uses those keys any more.
2. In the same spot: **+** → **Compose** → rename `Purpose Slots` → **Expression:**
   ```
   json(body('Redline_Purpose')?['rows'])
   ```

### 7.3 Re-select the templates and map the slots
1. Click **Populate User Doc** → **File** → choose `JD Change Template - User.docx` again, even if it looks selected. This reloads the field list.
2. The **PurposeRows** field is gone and 16 new fields appear. Fill each one through **Expression**:

| Field | Expression |
|---|---|
| PurposeK1 | `outputs('Purpose_Slots')?['slots'][0]?['k']` |
| PurposeR1 | `outputs('Purpose_Slots')?['slots'][0]?['r']` |
| PurposeA1 | `outputs('Purpose_Slots')?['slots'][0]?['a']` |
| PurposeK2 | `outputs('Purpose_Slots')?['slots'][1]?['k']` |
| PurposeR2 | `outputs('Purpose_Slots')?['slots'][1]?['r']` |
| PurposeA2 | `outputs('Purpose_Slots')?['slots'][1]?['a']` |
| PurposeK3 | `outputs('Purpose_Slots')?['slots'][2]?['k']` |
| PurposeR3 | `outputs('Purpose_Slots')?['slots'][2]?['r']` |
| PurposeA3 | `outputs('Purpose_Slots')?['slots'][2]?['a']` |
| PurposeK4 | `outputs('Purpose_Slots')?['slots'][3]?['k']` |
| PurposeR4 | `outputs('Purpose_Slots')?['slots'][3]?['r']` |
| PurposeA4 | `outputs('Purpose_Slots')?['slots'][3]?['a']` |
| PurposeK5 | `outputs('Purpose_Slots')?['slots'][4]?['k']` |
| PurposeR5 | `outputs('Purpose_Slots')?['slots'][4]?['r']` |
| PurposeA5 | `outputs('Purpose_Slots')?['slots'][4]?['a']` |
| PurposeKEnd | `outputs('Purpose_Slots')?['end']` |

3. Check that every **other** mapping is still filled in (all the other repeating sections and single fields). Re-enter any that went blank.
4. Repeat steps 1–3 for **Populate HR Doc** with `JD Change Template - HR.docx`.
5. **Save**.

> **Tip:** after filling PurposeK1, copy its expression, paste it into the next field, and edit just the index (`[0]`–`[4]`) and the letter (`k`/`r`/`a`).

> The slot index always exists (0–4), because the child flow pads to exactly 5. So these expressions can't fail on a short Purpose.

---

## Part 8 — End-to-end tests

Run each through the agent. Open the user copy **and** the HR copy, in **Word for the web** and in **Word desktop**.

| # | Purpose edit | Expected |
|---|---|---|
| 1 | "consumer clients" → "consumer and small business clients" | Only **and small business** yellow, in one paragraph |
| 2 | Append a sentence | Only the new sentence yellow, at the end |
| 3 | Insert a sentence in the middle | The new sentence yellow, in place |
| 4 | Delete a sentence | That sentence red strikethrough, where it was |
| 5 | "50 clients" → "40 clients" | ~~50~~ **40** inline |
| 6 | Two edits in different sentences | Two separate marked spots |
| 7 | Rewrite the whole Purpose | Old struck through, then new highlighted |
| 8 | Purpose untouched (edit another section) | Purpose plain, complete |
| 9 | Six separate small edits | Whole paragraph shown as replaced (the fallback) |
| 10 | Principal Duties edit in the same request | Duties redline unchanged from today |

**Check also:**
- Normal spacing between words, with no double spaces or missing spaces around the marks.
- Purpose doesn't run into the next section.
- The HR review email still sends, with the document attached.

---

## Appendix A — Other paragraph sections

Each paragraph section needs its own 16 slots, with its own prefix (for example `EduK1`… for Education Details), and its own 16 mappings. The flow side is just Mode = `Paragraph` on that section's Redline action plus a `… Slots` Compose. Only do this for sections stored as **one paragraph**: Paragraph mode joins line breaks together.

| Section | Worth it? |
|---|---|
| Purpose | Yes (this guide) |
| Education / Work Experience Details | Only if your Details are one paragraph. Tell me, and I'll give you the exact names and mappings |
| Principal Duties, KSAs, Certifications | No. These are bullet lists, so keep the line comparison |
| Req/Pref, Level | No. These are short single values |

---

## Appendix B — Name reference

**New input:** `Mode` (key `text_2`), `Paragraph` or blank
**New variables:** `RowsOut` (String), `GapList` (Array), `Slots` (Array), `PendingK` (String)

**New actions in Build Redline Rows**

| Action | Type | Where |
|---|---|---|
| Is Paragraph | Condition | After AllRows |
| OrigFlat, PropFlat | Compose | Is Paragraph → True |
| OS Split, PS Split | Select | ″ |
| OS, PS, KeptO, KeptP | Filter array | ″ |
| Anchor Check | Select | ″ |
| Aligned | Condition | ″ |
| KOB, KPB, Gaps, Set GapList | Compose / Select / Set variable | Aligned → True |
| Whole Gap, Set GapList | Compose / Set variable | Aligned → False |
| Each Gap | Apply to each | Is Paragraph → True, below Aligned |
| RW, AW, P, S, Lead Text, Removed Text, Added Text, Tail Text | Compose | Inside Each Gap |
| Prefix Flags, Suffix Flags | Select | Inside Each Gap |
| Gap Changed | Condition | Inside Each Gap |
| Add Slot, Start Pending | Append to array / Set variable | Gap Changed → True |
| Pending Next, Carry Pending | Compose / Set variable | Gap Changed → False |
| Fits, Final Slots, Final End, Padded, Para Out | Compose | Is Paragraph → True, below Each Gap |
| Slot Text | Select | ″ |
| Set RowsOut | Set variable | Is Paragraph → True and → False |

**Parent flow:** Redline Purpose → Mode `Paragraph` · Rows Purpose **deleted** · Purpose Slots (Compose) **added** · 16 Purpose fields mapped in both Populate actions

**Templates:** PurposeRows (and PurposeKept / Added / Removed) **removed** · PurposeK1–K5, PurposeR1–R5, PurposeA1–A5, PurposeKEnd **added**, inline, in that order

---

## Appendix C — Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Purpose blank in the document | Populate still on the old field list, or the slots not mapped | Re-select the template file (7.3 step 1) and map all 16 |
| "Click or tap here to enter text" in Purpose | A slot's placeholder wasn't cleared | Template: Design Mode → that control → `200B`, **Alt+X** |
| Words run together ("consumerand") | Slot Text not adding spaces, or a mapping points at Padded instead | Check 4.4 step 1; the mappings read `Purpose_Slots` |
| Red where yellow should be (or the reverse) | R and A styles swapped on a control | Run the checker (1.6); fix that control's Properties → Style |
| Pieces in the wrong order | Slots out of order in the template, or Each Gap running in parallel | Checker (order); Each Gap → Concurrency **Off** |
| Purpose fully struck and re-added on a small edit | Mode not reaching the child, or **Aligned** is False | Child run: **Is Paragraph** should be True. If **KeptO**/**KeptP** are empty, check the OriginalNorm/ProposedNorm outputs |
| A small edit shows as the whole paragraph replaced | More than 5 separate changed spots (fallback) | Expected. Check **Fits** in the run |
| `json()` error in Purpose Slots | Redline Purpose returned line rows (Mode blank) | Set Mode = `Paragraph` on Redline Purpose |
| Error in `range` | Missing a `take(range(…+1)…)` or `max(…,1)` guard | Compare with 3.4 and 3.6 |
| Index out of range in Gaps | KOB/KPB wrong | KOB should look like `[-1, 0, 2, 4]`: starts at -1, ends at the sentence count |
| Other sections changed | Mode set on more than Redline Purpose | Clear Mode on the others |

---

## Appendix D — Spec for the template agent

Give this section and both templates to the agent that edited your templates before.

> **Task:** In each of `JD Change Template - User.docx` and `JD Change Template - HR.docx`, replace the Purpose redline row with 16 inline plain-text content controls.
>
> 1. Delete the block-level repeating section content control with Tag `PurposeRows`, including its child controls `PurposeKept`, `PurposeAdded`, `PurposeRemoved`. Leave one paragraph in its place, with the same paragraph and run formatting the Purpose text used (Arial 9).
> 2. In that one paragraph, insert 16 **run-level (inline)** Plain Text content controls (`w:sdt` with `w:sdtPr/w:text`), directly one after another with no text between them, in this exact order:
>    `PurposeK1 PurposeR1 PurposeA1 PurposeK2 PurposeR2 PurposeA2 PurposeK3 PurposeR3 PurposeA3 PurposeK4 PurposeR4 PurposeA4 PurposeK5 PurposeR5 PurposeA5 PurposeKEnd`
> 3. For each control, set the Title (`w:alias`) and Tag (`w:tag`) both to its name.
> 4. Styles (set via `w:sdtPr/w:rPr/w:rStyle`, which is the "Use a style to format text typed into the empty control" setting): every `PurposeR*` uses the existing character style `JDRemoved`; every `PurposeA*` uses `JDAdded`; the `PurposeK*` controls and `PurposeKEnd` use no character style.
> 5. Each control's content is a single zero-width space (U+200B), so nothing prints when it's empty. Use the same style on that run as the control.
> 6. None of the 16 controls may be inside a repeating section. The Purpose paragraph mark must not be hidden.
> 7. Change nothing else in either document. Every other control, style, table and repeating section stays exactly as it is.
> 8. Verify with `verify_purpose_slots.py`. Both files must report `RESULT: PASS (16/16 slots found)`.

---

## Appendix E — Undoing the earlier version

Only needed if you made template changes from the earlier version (hidden paragraph marks):

- **Templates:** Part 1.2 deletes the PurposeRows section along with its hidden mark, so there's nothing to undo there. If you made a hidden paragraph mark anywhere else, select the ¶ → **Ctrl+D** → uncheck **Hidden**. The checker warns if the Purpose paragraph mark is still hidden.
- **Child flow:** if you built the earlier Part 4.6 Append steps (**Add Lead**, **Add Removed**, **Add Added**, **Add Tail**) and the **Segs** variable, delete them, and **Seg Rows** / **Para Rows** too. Everything up to and including **S** is the same in both versions.
