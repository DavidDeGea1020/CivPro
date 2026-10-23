# Inline Paragraph Redline: Build Guide

**Builds on:** the JD Change Document feature (Build Redline Rows child flow, Save JD Update Request flow, JD Change Template - User / - HR), including the quote and space normalization (`OriginalNorm` / `ProposedNorm`).
**Goal:** when a manager edits a paragraph section like **Purpose**, the change document marks only what changed: added words in bold yellow, removed words in red strikethrough, everything else plain. It stays one flowing paragraph instead of striking out the whole old paragraph and adding the whole new one.

**Before:**
> ~~Provides service to consumer clients. Processes deposits accurately. Refers clients to specialists. Works as a team.~~ **Provides service to consumer and small business clients. Processes deposits accurately. Works as a team. Manages a portfolio of 40 clients.**

**After:**
> Provides service to consumer **and small business** clients. Processes deposits accurately. ~~Refers clients to specialists.~~ Works as a team. **Manages a portfolio of 40 clients.**

> **No changes to the HR review email.** The email only reads the document's link, file ID and name. The redline legend in the email stays accurate because the same three styles are used.

---

## Contents

0. [How it works](#part-0--how-it-works)
1. [Check that Word for the web shows it correctly (5 minutes)](#part-1--check-that-word-for-the-web-shows-it-correctly)
2. [Templates: make the Purpose row flow inline](#part-2--templates-make-the-purpose-row-flow-inline)
3. [Child flow: new input and variables](#part-3--child-flow-new-input-and-variables)
4. [Child flow: the Paragraph branch](#part-4--child-flow-the-paragraph-branch)
5. [Child flow: return the right rows](#part-5--child-flow-return-the-right-rows)
6. [Test the child flow on its own](#part-6--test-the-child-flow-on-its-own)
7. [Parent flow: turn on Paragraph mode for Purpose](#part-7--parent-flow-turn-on-paragraph-mode-for-purpose)
8. [End-to-end tests](#part-8--end-to-end-tests)
- [Appendix A — Using it on other sections](#appendix-a--using-it-on-other-sections)
- [Appendix B — Name reference](#appendix-b--name-reference)
- [Appendix C — Troubleshooting](#appendix-c--troubleshooting)

---

## Part 0 — How it works

```
Build Redline Rows (child flow)
  Inputs: Original, Proposed, Mode (NEW, optional)
  ├─ existing line-by-line comparison → AllRows               (unchanged)
  └─ Condition: Mode = "Paragraph"?
       ├─ Yes: 1. Flatten each version into one line
       │       2. Split into sentences
       │       3. Find sentences that are in both (anchors)
       │       4. Between anchors: removed sentences / added sentences ("gaps")
       │       5. Inside each gap: trim the words that match at the start
       │          and end, so only the changed words are marked
       │       6. Output rows in reading order: Kept / Removed / Added / Kept…
       └─ No:  use AllRows, exactly as today
  Respond: Rows

Template: the Purpose row's paragraph mark is formatted as Hidden,
so the rows Word repeats run together as one paragraph.
```

**Why the template change is needed:** each row Word repeats is its own paragraph. Today Purpose fits in one row, so that doesn't matter. With word-level changes, Purpose becomes several rows (kept, added, kept, removed…). Hiding the row's paragraph mark makes Word run those rows together on one line. It's the same trick Word uses for its built-in "style separator".

**Why the output rows don't change shape:** Paragraph mode returns the same `Kept` / `Added` / `Removed` rows as today, just more of them. **Rows Purpose**, the Populate mappings and everything downstream stay the same.

**What it handles**
- Words added, removed or changed inside a sentence
- Sentences added, removed or inserted anywhere
- Several separate edits in different sentences
- A brand-new Purpose (all added) and an unchanged Purpose (all plain)

**What it doesn't do**
- **Moved or duplicated sentences:** if sentences are reordered, or the same sentence appears twice, it falls back to one changed block covering just the part that differs. The words that match at the start and end are still trimmed.
- **Two edits inside the same sentence** (e.g. a word changed at the start and another at the end): everything between them is shown as one removed/added pair.
- **Bullet sections** (Principal Duties, KSAs) keep the line-by-line comparison. Leave Mode blank for them.

All of this was checked against 12 test edits with a simulation that uses only the expressions below. Every result rebuilt both the original and the proposed text exactly.

---

## Part 1 — Check that Word for the web shows it correctly

Do this quick check before building anything. It confirms that the hidden paragraph mark trick displays correctly in Word for the web, which is where HR's **Open in Word** button goes.

1. Open **Word desktop** → **Blank document**.
2. Type `First part. ` (with a space at the end) → press **Enter** → type `Second part.` → press **Enter**.
3. **Home** → click **¶** (**Show/Hide**, or **Ctrl+Shift+8**) so paragraph marks show.
4. Select **only** the **¶** at the end of the first line (drag over just that symbol).
5. Press **Ctrl+D** (Font dialog) → under **Effects**, check **Hidden** → **OK**. The ¶ gets a dotted underline.
6. Click **¶** again to hide marks. The document should now read `First part. Second part.` on **one line**.
7. **File** → **Save As** → save it to the **JD Templates** library as `Inline Test.docx`.
8. Open `Inline Test.docx` from SharePoint in the browser (**Word for the web**).

**Result**
- **One line** in the browser: continue to Part 2.
- **Two lines** in the browser: stop and tell me. Desktop Word and downloads will still show one line, but I'd switch you to a version that doesn't rely on hidden marks.

9. Delete `Inline Test.docx` from the library.

---

## Part 2 — Templates: make the Purpose row flow inline

Do this in **both** templates: `JD Change Template - User.docx` and `JD Change Template - HR.docx`.

### 2.1 Open the template
1. In **JD Templates**, select the template → **⋯** → **Download** (keep a copy as a backup).
2. Open it in **Word desktop**.

### 2.2 Hide the Purpose row's paragraph mark
1. **Home** → click **¶** to show paragraph marks.
2. **Developer** → **Design Mode** on. The content controls now show their tags.
3. Find the **PurposeRows** repeating section. Inside it you'll see the tags for **PurposeKept**, **PurposeAdded** and **PurposeRemoved**, followed by a **¶**, then the end tag of the repeating section.
4. Select **only** that **¶** (the one inside the repeating section, just before its end tag).
5. **Ctrl+D** → **Effects** → check **Hidden** → **OK**. The ¶ now has a dotted underline.

> Select only the ¶, not the controls. If a control gets hidden, its text disappears from the document.

### 2.3 Make sure a visible paragraph follows the section
With paragraph marks still showing, look directly **after** the PurposeRows repeating section's end tag.

- **There's a ¶ on its own before the next section bar:** good. Click into that empty paragraph and check (in the **Home** → **Styles** pane, or by its font) that it has the same style as the Purpose text (Arial 9). If it doesn't, apply the same style.
- **The next thing is directly the next section bar:** click immediately to the right of the repeating section's end tag (outside it) and press **Enter** to create an empty paragraph. Give it the same style as the Purpose text.

> The hidden mark on the last row joins the Purpose text onto this empty paragraph, which then ends the line. Without it, Purpose could run into the next section.

### 2.4 Check and save
1. **Developer** → **Design Mode** off → **Home** → **¶** off.
2. The Purpose area should look the same as before.
3. **File** → **Save**. Keep the same file name.
4. Repeat 2.1–2.4 for the other template.

### 2.5 Upload and re-select
1. In **JD Templates**, upload both files and choose **Replace** when asked.
2. Open **Save JD Update Request** → **Edit** → **Build Documents** scope.
3. Click **Populate User Doc** (your Populate a Microsoft Word template action for the user copy) → **File** → choose `JD Change Template - User.docx` again, even though it looks selected.
4. Check that every mapping is still filled in, especially the repeating sections (**PurposeRows**, **DutiesRows**, **EducationRows**, **EduReqRows**, **EduLevelRows**, …). Re-enter any that went blank.
5. Do the same for **Populate HR Doc** with `JD Change Template - HR.docx`.
6. **Save**.

> Re-select the file after **any** template change. Skipping this caused the blank and corrupted documents earlier.

---

## Part 3 — Child flow: new input and variables

Open **Build Redline Rows** from your solution → **Edit**.

### 3.1 Add the Mode input
1. Click the trigger **Manually trigger a flow**.
2. **+ Add an input** → **Text** → name it `Mode`.
3. **⋯** next to Mode → **Make the field optional**.
4. Check its key: trigger → **⋯** → **Peek code**. Under `properties`, the new input is usually `text_2`. The expressions below assume `text_2`. If yours differs, use your key.

### 3.2 Add three variables at the top
Variables must be created at the top level of the flow, before any condition or loop.

1. Click **+** between the trigger and **NL** → **Add an action** → **Initialize variable**.
   - **Name:** `RowsOut` · **Type:** String · **Value:** *(empty)*
2. **+** below it → **Initialize variable**.
   - **Name:** `GapList` · **Type:** Array · **Value:** `[]`
3. **+** below it → **Initialize variable**.
   - **Name:** `Segs` · **Type:** Array · **Value:** `[]`

---

## Part 4 — Child flow: the Paragraph branch

Everything in this part goes **between AllRows and the Respond step**.

**How to enter the steps below**
- **Expression:** click the field → **fx** (new designer) or **Expression** tab (classic) → paste → **Add**.
- **Filter array condition:** click **Edit in advanced mode** → paste the line starting with `@`.
- **Select, text mode:** on **Map**, click the **T** icon (**Switch Map to text mode**) → paste the expression into the single box.
- **Select, key/value mode:** type each key on the left, and add each value on the right with **Expression**.
- **Rename every action as soon as you add it.** Expressions refer to actions by name, with spaces as underscores.

### 4.1 Add the condition
1. Click **+** between **AllRows** and the Respond step → **Condition** → rename it `Is Paragraph`.
2. Left box → **Expression:**
   ```
   equals(toLower(trim(coalesce(triggerBody()?['text_2'], ''))), 'paragraph')
   ```
3. Operator: **is equal to** · Right box → **Expression:** `true`

Steps 4.2–4.7 all go in the **True** branch. 4.8 goes in **False**.

### 4.2 Flatten both versions into one line

**True** branch:

1. **+** → **Compose** → rename `OrigFlat` → **Expression:**
   ```
   trim(replace(replace(replace(outputs('OriginalNorm'), outputs('NL'), ' '), '  ', ' '), '  ', ' '))
   ```
2. **+** → **Compose** → rename `PropFlat` → **Expression:**
   ```
   trim(replace(replace(replace(outputs('ProposedNorm'), outputs('NL'), ' '), '  ', ' '), '  ', ' '))
   ```

### 4.3 Split into sentences

1. **+** → **Select** → rename `OS Split`.
   - **From** → **Expression:**
     ```
     split(replace(replace(replace(outputs('OrigFlat'), '. ', concat('.', decodeUriComponent('%1E'))), '? ', concat('?', decodeUriComponent('%1E'))), '! ', concat('!', decodeUriComponent('%1E'))), decodeUriComponent('%1E'))
     ```
   - **Map (text mode):** `trim(item())`
2. **+** → **Filter array** → rename `OS`.
   - **From:** `body('OS_Split')`
   - **Advanced mode:** `@greater(length(item()), 0)`
3. **+** → **Select** → rename `PS Split`.
   - **From** → **Expression:**
     ```
     split(replace(replace(replace(outputs('PropFlat'), '. ', concat('.', decodeUriComponent('%1E'))), '? ', concat('?', decodeUriComponent('%1E'))), '! ', concat('!', decodeUriComponent('%1E'))), decodeUriComponent('%1E'))
     ```
   - **Map (text mode):** `trim(item())`
4. **+** → **Filter array** → rename `PS`.
   - **From:** `body('PS_Split')`
   - **Advanced mode:** `@greater(length(item()), 0)`

> `%1E` is an invisible separator character. It marks sentence ends without breaking on periods inside words, like "e.g." or "1.5".

### 4.4 Find the sentences that are in both

1. **+** → **Filter array** → rename `KeptO`. These are the positions of original sentences that still exist.
   - **From** → **Expression:**
     ```
     take(range(0, add(length(body('OS')), 1)), length(body('OS')))
     ```
   - **Advanced mode:** `@contains(body('PS'), body('OS')[item()])`
2. **+** → **Filter array** → rename `KeptP`. These are the positions of proposed sentences that existed before.
   - **From** → **Expression:**
     ```
     take(range(0, add(length(body('PS')), 1)), length(body('PS')))
     ```
   - **Advanced mode:** `@contains(body('OS'), body('PS')[item()])`
3. **+** → **Select** → rename `Anchor Check`. This confirms the kept sentences are in the same order in both versions.
   - **From** → **Expression:**
     ```
     take(range(0, add(min(length(body('KeptO')), length(body('KeptP'))), 1)), min(length(body('KeptO')), length(body('KeptP'))))
     ```
   - **Map (text mode):**
     ```
     if(equals(body('OS')[body('KeptO')[item()]], body('PS')[body('KeptP')[item()]]), 'y', 'n')
     ```

> **Why `take(range(...+1), ...)`?** `range()` errors when asked for zero numbers, for example when the original Purpose was blank. Asking for one extra and then taking the real count avoids that.

### 4.5 Build the gaps

1. **+** → **Condition** → rename `Aligned`.
   - Left → **Expression:**
     ```
     and(equals(length(body('KeptO')), length(body('KeptP'))), not(contains(join(body('Anchor_Check'), ''), 'n')))
     ```
   - **is equal to** · Right → **Expression:** `true`

**Aligned → True branch:**

2. **+** → **Compose** → rename `KOB` → **Expression:**
   ```
   union(createArray(-1), body('KeptO'), createArray(length(body('OS'))))
   ```
3. **+** → **Compose** → rename `KPB` → **Expression:**
   ```
   union(createArray(-1), body('KeptP'), createArray(length(body('PS'))))
   ```
4. **+** → **Select** → rename `Gaps`.
   - **From** → **Expression:**
     ```
     range(0, add(length(body('KeptP')), 1))
     ```
   - **Map (key/value mode).** Add four rows:

| Key | Value (Expression) |
|---|---|
| `g` | `item()` |
| `removed` | `join(take(skip(body('OS'), add(outputs('KOB')[item()], 1)), sub(sub(outputs('KOB')[add(item(), 1)], outputs('KOB')[item()]), 1)), ' ')` |
| `added` | `join(take(skip(body('PS'), add(outputs('KPB')[item()], 1)), sub(sub(outputs('KPB')[add(item(), 1)], outputs('KPB')[item()]), 1)), ' ')` |
| `anchor` | `join(take(skip(body('PS'), outputs('KPB')[add(item(), 1)]), if(less(item(), length(body('KeptP'))), 1, 0)), '')` |

5. **+** → **Set variable** → **Name:** `GapList` → **Value** → **Expression:** `body('Gaps')`

**Aligned → False branch** (moved or duplicated sentences: treat the whole paragraph as one gap):

6. **+** → **Compose** → rename `Whole Gap` → **Inputs:** type or paste this directly into the box, not as an expression:
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
7. **+** → **Set variable** → **Name:** `GapList` → **Value** → **Expression:** `outputs('Whole_Gap')`

> **What a gap is:** the stretch between two sentences that didn't change. `removed` is the old sentences in that stretch, `added` is the new ones, and `anchor` is the unchanged sentence that ends it.

### 4.6 Mark only the changed words in each gap

All of this goes **below the Aligned condition** (not inside either of its branches), still inside **Is Paragraph → True**.

1. **+** → **Apply to each** → rename `Each Gap` → **Select an output from previous steps:** **Expression** → `variables('GapList')`.
2. **⋯** → **Settings** → **Concurrency Control** must be **Off** → **Done**. Order matters here.

**Inside Each Gap:**

3. **+** → **Compose** → rename `RW` (removed words) → **Expression:**
   ```
   split(items('Each_Gap')?['removed'], ' ')
   ```
4. **+** → **Compose** → rename `AW` (added words) → **Expression:**
   ```
   split(items('Each_Gap')?['added'], ' ')
   ```
5. **+** → **Select** → rename `Prefix Flags`.
   - **From** → **Expression:**
     ```
     range(0, min(length(outputs('RW')), length(outputs('AW'))))
     ```
   - **Map (text mode):**
     ```
     if(equals(outputs('RW')[item()], outputs('AW')[item()]), 'y', 'n')
     ```
6. **+** → **Compose** → rename `P` (how many words match at the start) → **Expression:**
   ```
   if(or(empty(items('Each_Gap')?['removed']), empty(items('Each_Gap')?['added'])), 0, indexOf(concat(join(body('Prefix_Flags'), ''), 'n'), 'n'))
   ```
7. **+** → **Select** → rename `Suffix Flags`.
   - **From** → **Expression:**
     ```
     range(0, max(sub(min(length(outputs('RW')), length(outputs('AW'))), outputs('P')), 1))
     ```
   - **Map (text mode):**
     ```
     if(equals(outputs('RW')[sub(sub(length(outputs('RW')), 1), item())], outputs('AW')[sub(sub(length(outputs('AW')), 1), item())]), 'y', 'n')
     ```
8. **+** → **Compose** → rename `S` (how many words match at the end) → **Expression:**
   ```
   if(or(empty(items('Each_Gap')?['removed']), empty(items('Each_Gap')?['added'])), 0, min(indexOf(concat(join(body('Suffix_Flags'), ''), 'n'), 'n'), sub(min(length(outputs('RW')), length(outputs('AW'))), outputs('P'))))
   ```

> Inside a **Select**, `item()` means the Select's own item. That's why the loop's current gap is read with `items('Each_Gap')`.

Now add the four pieces of this gap, in reading order. Each one is an **Append to array variable** with **Name:** `Segs`. Paste the **Value** directly into the box, not as an expression.

9. **+** → **Append to array variable** → rename `Add Lead` → **Name:** `Segs` → **Value:**
   ```json
   {
     "Kept": "@{join(take(outputs('AW'), outputs('P')), ' ')}",
     "Added": "",
     "Removed": ""
   }
   ```
10. **+** → **Append to array variable** → rename `Add Removed` → **Name:** `Segs` → **Value:**
    ```json
    {
      "Kept": "",
      "Added": "",
      "Removed": "@{join(take(skip(outputs('RW'), outputs('P')), sub(length(outputs('RW')), add(outputs('P'), outputs('S')))), ' ')}"
    }
    ```
11. **+** → **Append to array variable** → rename `Add Added` → **Name:** `Segs` → **Value:**
    ```json
    {
      "Kept": "",
      "Added": "@{join(take(skip(outputs('AW'), outputs('P')), sub(length(outputs('AW')), add(outputs('P'), outputs('S')))), ' ')}",
      "Removed": ""
    }
    ```
12. **+** → **Append to array variable** → rename `Add Tail` → **Name:** `Segs` → **Value:**
    ```json
    {
      "Kept": "@{trim(concat(join(skip(outputs('AW'), sub(length(outputs('AW')), outputs('S'))), ' '), ' ', items('Each_Gap')?['anchor']))}",
      "Added": "",
      "Removed": ""
    }
    ```

> After saving, reopen each Append step. Each `@{...}` should show as an expression token. If one stayed as plain text, delete it, keep the quotes, click between them and add the expression (without `@{ }`) through **Expression**.

### 4.7 Finish the rows

**Below the Each Gap loop**, still in **Is Paragraph → True**:

1. **+** → **Filter array** → rename `Seg Rows`. This drops empty pieces.
   - **From** → **Expression:** `variables('Segs')`
   - **Advanced mode:**
     ```
     @not(empty(concat(item()?['Kept'], item()?['Added'], item()?['Removed'])))
     ```
2. **+** → **Select** → rename `Para Rows`. This adds a space after each piece so the words don't run together.
   - **From** → **Expression:** `body('Seg_Rows')`
   - **Map (key/value mode):**

| Key | Value (Expression) |
|---|---|
| `Kept` | `if(empty(item()?['Kept']), '', concat(item()?['Kept'], ' '))` |
| `Added` | `if(empty(item()?['Added']), '', concat(item()?['Added'], ' '))` |
| `Removed` | `if(empty(item()?['Removed']), '', concat(item()?['Removed'], ' '))` |

3. **+** → **Set variable** → **Name:** `RowsOut` → **Value** → **Expression:**
   ```
   string(body('Para_Rows'))
   ```

### 4.8 The False branch (every other section)

In **Is Paragraph → False**:

1. **+** → **Set variable** → **Name:** `RowsOut` → **Value** → **Expression:**
   ```
   string(outputs('AllRows'))
   ```

> Sections without Mode = Paragraph get exactly the rows they get today.

---

## Part 5 — Child flow: return the right rows

1. Click the **Respond to a PowerApp or flow** step (below the Is Paragraph condition).
2. Click the **Rows** output value → delete the current expression (`string(outputs('AllRows'))`).
3. **Expression** → `variables('RowsOut')` → **Add**.
4. Make sure the Respond step is **below** the condition on the main line, not inside a branch.
5. **Save**.

---

## Part 6 — Test the child flow on its own

1. **Test** → **Manually** → **Test**.
2. Enter:
   - **Original:** `Provides service to consumer clients. Processes deposits accurately. Refers clients to specialists. Works as a team.`
   - **Proposed:** `Provides service to consumer and small business clients. Processes deposits accurately. Works as a team. Manages a portfolio of 40 clients.`
   - **Mode:** `Paragraph`
3. **Run flow** → **Done** → open the run.
4. **Aligned** should take the **True** branch. Open **Respond** → the **Rows** output should be:

```json
[
  {"Kept": "Provides service to consumer ", "Added": "", "Removed": ""},
  {"Kept": "", "Added": "and small business ", "Removed": ""},
  {"Kept": "clients. Processes deposits accurately. ", "Added": "", "Removed": ""},
  {"Kept": "", "Added": "", "Removed": "Refers clients to specialists. "},
  {"Kept": "Works as a team. ", "Added": "", "Removed": ""},
  {"Kept": "", "Added": "Manages a portfolio of 40 clients. ", "Removed": ""}
]
```

That reads: Provides service to consumer **and small business** clients. Processes deposits accurately. ~~Refers clients to specialists.~~ Works as a team. **Manages a portfolio of 40 clients.**

5. More quick checks, all with **Mode** = `Paragraph`:

| Test | Original | Proposed | Expected Rows |
|---|---|---|---|
| Unchanged | the same Original as above | *(blank)* | 4 rows, all Kept, one sentence each |
| New Purpose | *(blank)* | `Supports branch operations.` | 1 row: Added |
| Reordered (fallback) | `Works hard. Helps.` | `Helps. Works hard.` | **Aligned** takes **False**. The rows mark the differing span as Removed then Added |
| Mode blank | the same Original as above | the same Proposed as above | The same rows as before this change (whole sentences Kept/Added/Removed, removed ones at the end) |

---

## Part 7 — Parent flow: turn on Paragraph mode for Purpose

1. Open **Save JD Update Request** → **Edit** → **Build Documents** scope.
2. Click **Redline Purpose** (Run a Child Flow → Build Redline Rows).
3. The new **Mode** field should now appear on the action. If it doesn't:
   1. Click away, then reopen the action.
   2. Still missing: note the current **Original** and **Proposed** values, delete the action, add **Run a Child Flow** → **Build Redline Rows** again, rename it `Redline Purpose`, and re-enter both values.
4. **Mode:** type `Paragraph`.
5. Leave every other Redline action (Duties, Education, Experience, Certs, KSA, EduReq, ExpReq, EduLevel, ExpLevel) with **Mode** blank.
6. **Save**.

> **Rows Purpose** and the Populate mappings don't change. They already read `Kept`, `Added` and `Removed` from each row.

---

## Part 8 — End-to-end tests

Run each through the agent and open both the user copy and the HR copy, in **Word for the web** and in **Word desktop** (download).

| # | Edit the manager makes to Purpose | Expected in the document |
|---|---|---|
| 1 | Add a word: "consumer clients" → "consumer and small business clients" | Only **and small business** is yellow. The rest is plain, in one paragraph |
| 2 | Append a sentence at the end | Only the new sentence is yellow |
| 3 | Insert a sentence in the middle | The new sentence is yellow, in place |
| 4 | Delete a sentence | That sentence is red strikethrough, where it was |
| 5 | Change a number: "50 clients" → "40 clients" | ~~50~~ **40** inline |
| 6 | Two edits in different sentences | Two separate marked spots; the sentences between them are plain |
| 7 | Rewrite the whole Purpose | The old text struck through, then the new text highlighted (the same as today) |
| 8 | Don't touch Purpose (edit another section) | Purpose plain, one paragraph |
| 9 | Principal Duties edit in the same request | Duties redline unchanged from today (bullet lines) |

**Check also:**
- Purpose is **one paragraph**: no line breaks between pieces, and it doesn't run into the next section bar.
- Spacing between words is normal, with no double spaces or missing spaces around the marked words.
- The **HR review email** still sends, with the document attached.

---

## Appendix A — Using it on other sections

Paragraph mode works on any section stored as **one paragraph**. To turn it on for another section:

1. **Template (both copies):** hide that section's row paragraph mark (Part 2.2) and make sure a visible paragraph follows it (Part 2.3). Then upload and re-select (Part 2.5).
2. **Parent flow:** set **Mode** = `Paragraph` on that section's Redline action.

| Section | Use Paragraph mode? |
|---|---|
| Purpose | Yes |
| Education details (**Redline Education**) | Only if your Education Details are a single paragraph, not several lines |
| Work Experience details (**Redline Experience**) | Same as Education |
| Principal Duties, KSAs, Certifications | No. These are bullet lists, so keep the line comparison |
| Req/Pref and Level rows | No. These are short single values |

> Paragraph mode joins line breaks into one paragraph. Don't use it on a section whose lines should stay separate.

---

## Appendix B — Name reference

**New input:** `Mode` (key `text_2`), optional, `Paragraph` or blank

**New variables:** `RowsOut` (String), `GapList` (Array), `Segs` (Array)

**New actions in Build Redline Rows**

| Action | Type | Where |
|---|---|---|
| Is Paragraph | Condition | After AllRows |
| OrigFlat, PropFlat | Compose | Is Paragraph → True |
| OS Split, PS Split | Select | Is Paragraph → True |
| OS, PS | Filter array | Is Paragraph → True |
| KeptO, KeptP | Filter array | Is Paragraph → True |
| Anchor Check | Select | Is Paragraph → True |
| Aligned | Condition | Is Paragraph → True |
| KOB, KPB | Compose | Aligned → True |
| Gaps | Select | Aligned → True |
| Set GapList | Set variable | Aligned → True |
| Whole Gap | Compose | Aligned → False |
| Set GapList | Set variable | Aligned → False |
| Each Gap | Apply to each | Is Paragraph → True, below Aligned |
| RW, AW, P, S | Compose | Inside Each Gap |
| Prefix Flags, Suffix Flags | Select | Inside Each Gap |
| Add Lead, Add Removed, Add Added, Add Tail | Append to array variable | Inside Each Gap |
| Seg Rows | Filter array | Is Paragraph → True, below Each Gap |
| Para Rows | Select | Is Paragraph → True |
| Set RowsOut | Set variable | Is Paragraph → True |
| Set RowsOut | Set variable | Is Paragraph → False |

**Changed:** Respond → Rows = `variables('RowsOut')` · Redline Purpose → Mode = `Paragraph` · both templates: PurposeRows paragraph mark hidden

---

## Appendix C — Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Purpose pieces each on their own line | The row's paragraph mark isn't hidden, or the Populate action is using the old template | Redo Part 2.2, then re-select the file (2.5) |
| Purpose runs into the next section | No visible paragraph after the repeating section | Part 2.3 |
| Some Purpose text missing | A control got the Hidden format along with the ¶ | Open the template, select the control, **Ctrl+D**, uncheck **Hidden**, then redo 2.2 selecting only the ¶ |
| Purpose still fully struck and re-added | Mode isn't reaching the child flow | Check **Redline Purpose** → Mode = `Paragraph`. In the child run, **Is Paragraph** should take **True**. Check the key is `text_2` (3.1 step 4) |
| Every Purpose edit shows as a full rewrite | **Aligned** is always False | Open the run → **KeptO** / **KeptP**. If they're empty, the sentences differ in quotes or spacing; check OriginalNorm/ProposedNorm run first. If counts differ, a sentence is duplicated |
| Error in `range` | A `range()` got zero | Compare with 4.4 and 4.6. Those use the `take(range(…+1)…)` or `max(…,1)` guards |
| Error "index out of range" in Gaps | KOB/KPB built wrong | Check KOB starts with `-1` and ends with the sentence count, e.g. `[-1, 0, 2, 4]` |
| Words run together ("consumerand small") | Para Rows isn't adding spaces, or Respond still points at AllRows | Check 4.7 step 2, and Part 5 |
| Pieces in the wrong order | Each Gap running in parallel | Each Gap → Settings → Concurrency Control **Off** |
| Other sections changed too | Mode set on more than Redline Purpose | Clear Mode on the other Redline actions |
