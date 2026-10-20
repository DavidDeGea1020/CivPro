# Preview Section Change — Build Guide

**Agent:** JD Expert agent (Copilot Studio classic, generative orchestration)
**Problem:** when a manager edits **Principal Duties**, the agent redisplays the whole section as one block of text, ignoring the formatting instructions. Principal Duties is by far the longest section, so this is where it hurts.
**Fix:** for Principal Duties only, the agent still writes the draft, but instead of displaying it, it passes the draft to a small topic. The topic compares the draft line by line with the original and shows **only** what's new (bold) and what's removed, one per line. Because a formula builds the message, it looks the same every time.

**Every other section** (Purpose, Education, Work Experience, Certifications, KSAs) keeps working exactly as it does now: the agent drafts and shows it itself.

> **UI labels change often.** If a label here doesn't match exactly, look for the closest equivalent.

---

## Contents

0. [How it works](#part-0--how-it-works)
1. [Quick checks first](#part-1--quick-checks-first)
2. [Create the Preview Section Change topic](#part-2--create-the-preview-section-change-topic)
3. [Build the comparison](#part-3--build-the-comparison)
4. [Build and send the message](#part-4--build-and-send-the-message)
5. [Fix what Show JD Section hands the agent](#part-5--fix-what-show-jd-section-hands-the-agent)
6. [Update the agent instructions](#part-6--update-the-agent-instructions)
7. [Testing](#part-7--testing)
- [Appendix A — Name reference](#appendix-a--name-reference)
- [Appendix B — Troubleshooting](#appendix-b--troubleshooting)

---

## Part 0 — How it works

```
Manager describes a change to Principal Duties
        │                       (other sections: agent drafts and shows it as today)
        ▼
Agent writes the full draft (not shown)
        │
        ▼
[Preview Section Change]   ← compares draft vs Global.OriginalJD, line by line
        │  sends: new lines in bold · "Removed:" lines · "The other N stay as they are."
        ▼
Agent: "Does that look right?"
        │  manager confirms
        ▼
[Save Section Change]      ← same full text as the preview (unchanged)
```

**What changes:** a new topic used only for Principal Duties, one output on Show JD Section (this helps every section), and a few lines of agent instructions.
**What doesn't change:** Save Section Change, the reviewer prompt, the redline flow, and the document. They still receive the full section.

**How lines are compared:** line by line, after stripping bullet characters (`•`, `-`, `*`, `·`), bold markers and spaces at either end. A reworded duty therefore shows as the new line in bold plus the old line under **Removed**, exactly like the redline document.

---

## Part 1 — Quick checks first

These can override the formatting rules on their own, so fix them whether or not you build the topic.

### 1.1 Remove the conflicting instruction
1. Open the agent → **Overview** → **Instructions** → **Edit**.
2. Search the text (Ctrl+F) for **FULL updated section**.
3. If that bullet is still there, delete it or limit it to the other sections (e.g., start it with "For sections other than Principal Duties,"). It came from the earlier bold-changes fix and contradicts the Principal Duties preview.
4. **Save**.

### 1.2 Check the instruction length
1. Copy all of the instructions into a word processor or an online character counter.
2. If they're **over about 8,000 characters**, text near the end can be ignored. Shorten them by:
   - moving **DRAFTING STANDARDS → Section rules** and **Language to avoid** into your JD knowledge markdown file, and
   - leaving one line in the instructions: `Follow the JD drafting standards in the knowledge file when drafting.`
3. **Save**.

---

## Part 2 — Create the Preview Section Change topic

### 2.1 Create it
1. **Topics** → **+ Add a topic** → **From blank**.
2. Click the topic name at the top → rename it to **Preview Section Change**.
3. Click the **Trigger** node → in **Describe what the topic does**, enter:

   > Shows the user only what changed in a drafted Principal Duties and Responsibilities section compared with the current job description. Use ONLY for the Principal Duties section: call it every time you have a Principal Duties draft, BEFORE asking the user to confirm it, and don't display that draft yourself. Never use it for Purpose, Education, Work Experience, Certifications or KSAs.

### 2.2 Add the inputs
1. Toolbar → **Details** → **Input** tab → **Create a new variable**.
2. First input:
   - **Name:** `SectionName`
   - **Identify as:** User's entire response
   - **Description:** `Always PrincipalDuties. This topic is only for the Principal Duties section.`
   - **Should prompt user:** Off
3. **Create a new variable** again:
   - **Name:** `ProposedText`
   - **Identify as:** User's entire response
   - **Description:** `The COMPLETE drafted section: every unchanged line copied exactly from the original, plus the new or changed lines, each on its own line starting with "- ". Never only the changed lines.`
   - **Should prompt user:** Off

### 2.3 Add the output
1. **Output** tab → **Create a new variable**:
   - **Name:** `PreviewStatus`
   - **Type:** String
   - **Description:** `"Shown" means the changes were already displayed to the user. Do not show the section or the changes again. Just ask in one short line whether they look right. "Not used for this section" means this topic only handles Principal Duties: show the draft yourself as usual.`
2. Close **Details**.

---

## Part 3 — Build the comparison

All nodes go on the main line below the trigger, in this order.

### 3.1 Guard: Principal Duties only
If the agent calls this topic for any other section, it returns straight away and the agent shows that draft itself, as it does today.

1. **+** → **Add a condition** → formula view:
   ```powerfx
   Topic.SectionName <> "PrincipalDuties"
   ```
2. **True** branch:
   - **+** → **Set a variable value** → **Select a variable** → `Topic.PreviewStatus` → Formula `"Not used for this section"`
   - **+** → **Topic management** → **End current topic**
3. Leave **All other conditions** empty. Everything below goes on the main line **after** the condition block.

### 3.2 Get the original text
1. **+** → **Variable management** → **Set a variable value** → **Create a new variable** → Name `Orig` (Usage: Topic).
2. **To value** → **Formula**:
```powerfx
Switch(Topic.SectionName,
  "Purpose", Global.OriginalJD.Purpose,
  "PrincipalDuties", Global.OriginalJD.PrincipalDuties,
  "Education", Global.OriginalJD.Education,
  "WorkExperience", Global.OriginalJD.WorkExperience,
  "Certifications", Global.OriginalJD.Certifications,
  "KSA", Global.OriginalJD.KSA,
  "")
```

### 3.3 Split the original into clean lines
1. **+** → **Set a variable value** → **Create a new variable** → Name `OrigLines` (Usage: Topic).
2. **Formula**:
```powerfx
Filter(
  ForAll(
    Split(Substitute(Substitute(Substitute(Topic.Orig, "<br />", Char(10)), "<br/>", Char(10)), "<br>", Char(10)), Char(10)),
    With({t: Trim(Substitute(ThisRecord.Value, "**", ""))},
      If(Left(t, 1) in ["•", "-", "*", "·"], Trim(Mid(t, 2)), t))
  ),
  !IsBlank(Value)
)
```

This turns `<br>` into line breaks, splits into lines, removes bold markers and the leading bullet, trims spaces, and drops empty lines. The result is a table with one column, `Value`.

### 3.4 Split the draft into clean lines
1. **+** → **Set a variable value** → **Create a new variable** → Name `PropLines` (Usage: Topic).
2. **Formula**: the same as 3.3, with `Topic.Orig` replaced by `Topic.ProposedText`:
```powerfx
Filter(
  ForAll(
    Split(Substitute(Substitute(Substitute(Topic.ProposedText, "<br />", Char(10)), "<br/>", Char(10)), "<br>", Char(10)), Char(10)),
    With({t: Trim(Substitute(ThisRecord.Value, "**", ""))},
      If(Left(t, 1) in ["•", "-", "*", "·"], Trim(Mid(t, 2)), t))
  ),
  !IsBlank(Value)
)
```

### 3.5 Find new lines
**+** → **Set a variable value** → new Topic variable `AddedText` → **Formula**:
```powerfx
Concat(Filter(Topic.PropLines, !(Value in Topic.OrigLines)), "- **" & Value & "**", Char(10))
```

### 3.6 Find removed lines
**+** → **Set a variable value** → new Topic variable `RemovedText` → **Formula**:
```powerfx
Concat(Filter(Topic.OrigLines, !(Value in Topic.PropLines)), "- " & Value, Char(10))
```

### 3.7 Count unchanged lines
**+** → **Set a variable value** → new Topic variable `KeptCount` → **Formula**:
```powerfx
CountRows(Filter(Topic.PropLines, Value in Topic.OrigLines))
```

---

## Part 4 — Build and send the message

### 4.1 Section display name
**+** → **Set a variable value** → new Topic variable `DisplayName` → **Formula**:
```powerfx
Switch(Topic.SectionName,
  "Purpose", "Purpose",
  "PrincipalDuties", "Principal Duties and Responsibilities",
  "Education", "Education Requirements",
  "WorkExperience", "Work Experience Requirements",
  "Certifications", "Certifications and Licenses",
  "KSA", "Knowledge, Skills and Abilities",
  "")
```

### 4.2 The message text
**+** → **Set a variable value** → new Topic variable `PreviewMsg` → **Formula**:
```powerfx
If(
  IsBlank(Topic.AddedText) && IsBlank(Topic.RemovedText),
  "This draft is the same as the current " & Topic.DisplayName & ". What would you like to change?",
  "Here are the changes to " & Topic.DisplayName & ":" & Char(10) & Char(10) &
  If(IsBlank(Topic.AddedText), "", Topic.AddedText & Char(10) & Char(10)) &
  If(IsBlank(Topic.RemovedText), "", "Removed:" & Char(10) & Char(10) & Topic.RemovedText & Char(10) & Char(10)) &
  If(Topic.KeptCount > 0, "The other " & Topic.KeptCount & " stay as they are.", "")
)
```

The blank line (`Char(10) & Char(10)`) before each list is required. Without it, the chat won't render the lines as a list.

### 4.3 Send it
1. **+** → **Send a message**.
2. Click **{x}** → select `Topic.PreviewMsg`. Don't add any other text.

### 4.4 Set the output
1. **+** → **Set a variable value** → **Select a variable** → `Topic.PreviewStatus` → Formula `"Shown"`.
2. **Save** the topic.

---

## Part 5 — Fix what Show JD Section hands the agent

Show JD Section currently returns the raw stored text (`•` and `<br>`) in its **SectionShown** output. The agent copies that format into its drafts. Return the formatted version instead.

### 5.1 If you already have `Topic.SectionDisplay`
(From the earlier line-break fix.)
1. Open **Show JD Section**.
2. Below the node that sets `Topic.SectionDisplay`, add **Set a variable value** → **Select a variable** → `Topic.SectionShown` → Formula: `Topic.SectionDisplay`
3. **Save**.

### 5.2 If you don't
1. Open **Show JD Section**.
2. After the node that sets `Topic.SectionShown`, and before the message, add **Set a variable value** → new Topic variable `SectionDisplay` → **Formula**:
```powerfx
Substitute(
  Substitute(Substitute(Substitute(Topic.SectionShown, "<br />", Char(10)), "<br/>", Char(10)), "<br>", Char(10)),
  "•", "- "
)
```
3. Add **Set a variable value** → `Topic.SectionShown` = `Topic.SectionDisplay`.
4. In the message node, replace the section text with `{Topic.SectionDisplay}`, and keep a blank line between "Here's the current…" and the text.
5. **Save**.

---

## Part 6 — Update the agent instructions

1. **Overview** → **Instructions** → **Edit**.
2. Under **WORKING ON SECTIONS**, keep your existing bullets for drafting and showing sections. They still apply to every section except Principal Duties. Add these bullets directly after them:

```
- PRINCIPAL DUTIES ONLY: when you have a draft for Principal Duties, call
  Preview Section Change with SectionName "PrincipalDuties" and the COMPLETE
  drafted section: every unchanged duty copied exactly from the original,
  plus the new or changed duties, each on its own line starting with "- ".
  Do NOT display the Principal Duties draft yourself.
- After the preview, ask in one short line whether it looks right. If the
  user asks for changes, revise the draft and call Preview Section Change
  again.
- When the user confirms Principal Duties, call Save Section Change with
  exactly the same text you last sent to Preview Section Change.
- For all other sections, draft and show them yourself as described above.
```

3. **Save**, then **Publish** if you test outside the Test pane.

---

## Part 7 — Testing

Use **Track between topics** so you can see Preview Section Change and Save Section Change fire.

| # | Do | Expected |
|---|---|---|
| 1 | Add one duty | Preview shows the new duty in bold and "The other N stay as they are." No full section |
| 2 | Remove one duty | Preview shows it under **Removed:**, one line |
| 3 | Reword one duty | New wording in bold plus the old line under Removed |
| 4 | Add one and remove another in one message | Both appear, in their own lists |
| 5 | Say "no, make it 40 clients" after the preview | Preview runs again with the revised line |
| 6 | Confirm | Save Section Change runs. `Global.Changes.PrincipalDuties` holds the **full** section |
| 7 | Edit Purpose, KSAs or another section | Preview Section Change does **not** run (or returns "Not used for this section"). The agent shows the draft itself, as before |
| 8 | Ask to change nothing ("leave it as is") | "This draft is the same as the current…" |
| 9 | Check the "other N" count | Matches the number of duties you didn't touch. A lower count means the agent changed lines it shouldn't have |
| 10 | Submit and open the document | The redline matches what the preview showed |

---

## Appendix A — Name reference

**New topic:** Preview Section Change (Principal Duties only)
- Inputs: `SectionName` (always `PrincipalDuties`), `ProposedText`
- Output: `PreviewStatus` ("Shown" or "Not used for this section")
- Topic variables: `Orig`, `OrigLines`, `PropLines`, `AddedText`, `RemovedText`, `KeptCount`, `DisplayName`, `PreviewMsg`

**Changed:** Show JD Section's `SectionShown` output now returns the formatted text (`- ` lines).

**Instructions:** Principal Duties drafts go through Preview Section Change, and the same text goes to Save Section Change. Every other section is drafted and shown by the agent, unchanged.

---

## Appendix B — Troubleshooting

**The agent still displays the draft itself, before or after the preview**
- Check that Part 1.1's conflicting line is gone and the instructions are under the length limit.
- Make the trigger description stronger: add "The agent must never display a Principal Duties draft directly."
- Check the PreviewStatus output description says not to show the changes again.

**Every line shows as new, and every original line as removed**
The draft lines don't match the original exactly. Usual causes:
- The agent reworded lines it shouldn't have. Check the drafting standards rule "copy every other line exactly".
- The original uses a different bullet character or an HTML entity (`&#8226;`, `&amp;`). Open `Topic.OrigLines` in the **Variables** panel. If you see leftovers, add another `Substitute(...)` for that character in Part 3.3 and 3.4, e.g. `Substitute(x, "&amp;", "&")`.

**"Name isn't valid" or a type error in the `in` formulas**
`Topic.OrigLines` and `Topic.PropLines` must be **tables** (they show as a table in the Variables panel). If one shows as text, its formula is missing the `Filter(ForAll(...))` wrapper. Re-paste it from Part 3.3 or 3.4.

**The preview shows as one paragraph**
The blank lines in the PreviewMsg formula are missing. Check the `Char(10) & Char(10)` before each list, and that the message node contains only `{Topic.PreviewMsg}`.

**The count says "The other 1 stay…" for a single line**
That's expected wording. Change the last line of the PreviewMsg formula to `"The other " & Topic.KeptCount & If(Topic.KeptCount = 1, " stays", " stay") & " as they are."` if you'd like it to read better.

**The saved section is missing unchanged duties**
The agent passed only the changed lines to Save Section Change. Strengthen the ProposedText description on both topics ("COMPLETE drafted section… Never only the changed lines"). Test 6 catches this.
