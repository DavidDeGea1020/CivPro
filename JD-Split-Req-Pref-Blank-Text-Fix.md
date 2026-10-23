# Split Req Pref: Blank Text Fix

**Fixes:** `YearRest` failing with *"The template language function 'substring' parameter is out of range: start index must be a non negative integers and should be less than the length of the string"*, and the **Save JD Update Request** timeout it causes.
**Builds on:** *JD-Education-Experience-Level-Guide* (the `DetailsFlat` → `YearPos` → `YearRest` → `YearEnd` → `Level` → `DetailsRest` steps in **Split Req Pref**).
**Time:** about 10 minutes.

---

## Contents

0. [What's wrong](#part-0--whats-wrong)
1. [Replace three expressions in Split Req Pref](#part-1--replace-three-expressions-in-split-req-pref)
2. [Test Split Req Pref on its own](#part-2--test-split-req-pref-on-its-own)
3. [Stop the parent from waiting on the email flow](#part-3--stop-the-parent-from-waiting-on-the-email-flow)
4. [End-to-end test](#part-4--end-to-end-test)
- [Appendix — Troubleshooting](#appendix--troubleshooting)

---

## Part 0 — What's wrong

```
Manager edits Purpose only (Education unchanged)
  └─ Agent sends ProposedEducation = ""   (blank means unchanged)
       └─ Save JD Update Request → Split Edu Proposed (Text = "")
            └─ DetailsFlat = ""
                 └─ YearRest = substring("", 0, 0)   ← fails: no position 0 in an empty string
                      └─ Split Req Pref never reaches Respond
                           └─ Save JD Update Request keeps waiting → times out
```

**Three expressions use `substring()` on `DetailsFlat`:**

| Action | Fails when |
|---|---|
| `YearRest` | The text is blank: every request where Education or Work Experience wasn't changed |
| `Level` | The text is blank |
| `DetailsRest` | The text is blank, **or** it ends right at "years" (e.g. just `5 years`) |

**The fix:** inside each `substring()`, add one space to the end of the text, as `concat(outputs('DetailsFlat'), ' ')`. The start position is then always inside the string, even when the text is blank.

**Why the results don't change:**
- `Level` and `DetailsRest` already `trim()` their result, so the extra space is removed.
- `YearEnd` looks for the first space after "year". The extra space sits exactly where the text used to end, so `YearEnd` finds the same position it did before.

> **Why the `if()` guards didn't prevent it:** Power Automate works out every part of an expression, including the side of an `if()` that isn't used. A `substring()` that would fail still fails, even when the `if()` would have skipped it. That's why the fix makes every `substring()` safe, rather than adding more `if()`s.

---

## Part 1 — Replace three expressions in Split Req Pref

1. Go to **make.powerapps.com** → **Solutions** → your JD solution → open **Split Req Pref** → **Edit**.
2. For each action below:
   1. Click the action.
   2. Click the expression token in **Inputs** to open the expression editor.
   3. Select everything in the editor (**Ctrl+A**) → **Delete**.
   4. Paste the new expression.
   5. Click **Update** (or **OK**).

### 1.1 YearRest
```
substring(concat(outputs('DetailsFlat'), ' '), max(outputs('YearPos'), 0), sub(length(concat(outputs('DetailsFlat'), ' ')), max(outputs('YearPos'), 0)))
```

### 1.2 Level
```
if(outputs('IsEdu'), join(take(body('WordList'), 2), ' '), if(greater(outputs('YearEnd'), 0), trim(substring(concat(outputs('DetailsFlat'), ' '), 0, max(outputs('YearEnd'), 0))), join(take(body('WordList'), outputs('LevelCount')), ' ')))
```

### 1.3 DetailsRest
```
if(outputs('IsEdu'), join(skip(body('WordList'), 2), ' '), if(greater(outputs('YearEnd'), 0), trim(substring(concat(outputs('DetailsFlat'), ' '), max(outputs('YearEnd'), 0), sub(length(concat(outputs('DetailsFlat'), ' ')), max(outputs('YearEnd'), 0)))), join(skip(body('WordList'), outputs('LevelCount')), ' ')))
```

### 1.4 Leave these unchanged
`DetailsFlat`, `WordList`, `LevelCount`, `YearPos`, `YearEnd`, and the **Respond** step.

3. Click **Save**.

> **Different action names?** These expressions use the names from the Level guide. If yours differ, match them, with spaces as underscores (e.g. `Year Pos` → `outputs('Year_Pos')`).

---

## Part 2 — Test Split Req Pref on its own

1. **Test** → **Manually** → **Test**.
2. Enter **Text** and **Mode** from the first row below → **Run flow** → **Done**.
3. Open the run → click **Respond** → check **Level** and **Details** (the Details output is fed by DetailsRest).
4. Repeat for each row.

| # | Text | Mode | Expected Level | Expected Details |
|---|---|---|---|---|
| 1 | *(blank)* | *(blank)* | *(blank)* | *(blank)*, no error |
| 2 | *(blank)* | `Education` | *(blank)* | *(blank)*, no error |
| 3 | `5 years` | *(blank)* | `5 years` | *(blank)* |
| 4 | `Minimum 2 years of banking experience` | *(blank)* | `Minimum 2 years` | `of banking experience` |
| 5 | `5-7 years experience in retail banking` | *(blank)* | `5-7 years` | `experience in retail banking` |
| 6 | `Bachelor's degree in Finance` | `Education` | `Bachelor's degree` | `in Finance` |
| 7 | `High school diploma or equivalent` | *(blank)* | `High school diploma or` | `equivalent` |

Rows 1–3 failed before this fix. Rows 4–7 should give the same results as before.

> Row 7 has no "year" in it, so the 4-word fallback applies. That's the expected behavior from the Level guide.

> **Testing with ReqPref text:** if you paste a full stored value (with "Required Or" / "Preferred Or" or the last sentence), Details shows the text without that ending, and **ReqPref** shows the ending. That's the same as before.

---

## Part 3 — Stop the parent from waiting on the email flow

This isn't what caused this error, but it prevents the same kind of timeout later. **Run a Child Flow** waits until the child reaches its **Respond** step. **Send HR Review Email** responds at the very end, so Save JD Update Request waits for the whole email build. Respond first instead, and the email builds in the background.

1. Open **Send HR Review Email** → **Edit**.
2. Find **Respond to a PowerApp or flow** at the bottom.
3. Drag it to directly **under the trigger** (**Manually trigger a flow**), above **Initialize variable** (Html).
   - **If it won't drag:** delete it. Click **+** under the trigger → **Add an action** → search `Respond to a PowerApp or flow` → add it → **+ Add an output** → **Text** → **Title:** `EmailSent` → **Value:** `queued`.
4. On the Respond step: **⋯** → **Configure run after** (or **Settings** → **Run after**) → only **is successful** checked → **Done**.
5. **Save**.

> **Express mode check:** open **Save JD Update Request** and click the **When an agent calls the flow** trigger card. If an **Express mode** toggle is there and on, the flow has a 2-minute and roughly 100-action limit, and Microsoft's docs don't say whether that includes the steps after Respond. With this part done the parent finishes faster, so you can usually leave it on. If you still get timeouts, turn it off, then confirm the agent's "Submitted!" message still arrives promptly (the agent needs its answer within 100 seconds).

> Don't turn on express mode for **Send HR Review Email**. Express mode limits variables to 1,024 characters, and the Html variable is about 48 KB.

---

## Part 4 — End-to-end test

Run these through the agent:

| # | What the manager changes | Expected |
|---|---|---|
| 1 | Purpose only | Flow succeeds. Education and Work Experience show as unchanged in the document. HR email arrives |
| 2 | Work Experience only, e.g. "Minimum 2 years…" → "Minimum 3 years…" | The Level row shows ~~Minimum 2 years~~ **Minimum 3 years**, and Details is unchanged |
| 3 | Education only | Education redline correct. Work Experience unchanged |
| 4 | Nothing in Education or Experience, plus a title review | Flow succeeds, no timeout |

**In the Save JD Update Request run history:**
- All four **Split** actions show **Succeeded**.
- **Run a Child Flow (Send HR Review Email)** finishes in a few seconds.
- The total run time is well under 2 minutes.

**In the Send HR Review Email run history:** a separate run for each request, ending with **Send HR Email** succeeded.

---

## Appendix — Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Same `substring` error, now in **Level** or **DetailsRest** | That expression wasn't replaced, or was pasted into the wrong action | Redo 1.2 / 1.3. Check the action name at the top of the error |
| `substring` error in a different action (e.g. **Tail** or **Cut**) | Another step uses `substring()` on text that can be blank | Send me the action name and its expression. The same padding fix applies |
| Level now includes the word after "years" (e.g. `5 years experience`) | `YearEnd` reads something other than `YearRest` | Check that YearEnd is unchanged from the Level guide and still references `outputs('YearRest')` |
| Run a Child Flow (email) still slow | Respond wasn't moved, or its run-after waits for other steps | Redo Part 3. Respond must sit directly under the trigger |
| Agent says something went wrong, but the request saved | The agent's 100-second limit was hit before **Respond to the agent** | Make sure **Run a Child Flow (Send HR Review Email)** sits **below** Respond to the agent. Check how long the Build Documents scope takes in the run |
| The email never arrives, and the parent run is fine | The email flow now runs on its own, so failures show only there | Open **Send HR Review Email** → run history → the failed run |
