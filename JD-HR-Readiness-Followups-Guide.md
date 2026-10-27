# HR Readiness Follow-ups: Build Guide

**Builds on:** *JD-Update-Feature-Build-Guide* (Review and Submit JD Update, JD Final Review) and *JD-Review-Router-Build-Guide* (the decision question loop, JD Review Router, `Global.ManagerNotes`).
**Goal:** when the manager says they're done, the **Final Review** looks at the whole request and decides whether HR has what it needs. If something important is missing (a business reason, the scale of a change, sections that no longer fit together, an unexplained level overlap), the agent asks up to **three** short follow-up questions **before** showing the summary. The answers go to HR, and the summary is rebuilt with them included.

**Example**
> **Manager:** I'm done
> **Agent:** Before I put this together for HR, a couple of quick questions so they have what they need.
>
> What changed in the business that led to these new client responsibilities?
>
> **Manager:** Our branch became a small business hub in September.
> **Agent:** Thanks. Roughly how many business clients will this role manage?
> **Manager:** About 40.
> **Agent:** Thanks, that gives HR what they need. Updating your summary…
> *(summary, with "Worth a look" items, then Submit · Make more changes · Cancel)*

**What stays the same:** the cards, section editing, the title-support gate, the summary, the three buttons, and the save flow. Follow-ups run **once per update at most**.

---

## Contents

0. [How it works](#part-0--how-it-works)
1. [New global: FollowupsDone](#part-1--new-global-followupsdone)
2. [JD Final Review: add the readiness check](#part-2--jd-final-review-add-the-readiness-check)
3. [Review and Submit: pass the new inputs](#part-3--review-and-submit-pass-the-new-inputs)
4. [Review and Submit: start the follow-ups](#part-4--review-and-submit-start-the-follow-ups)
5. [JD Review Router: understand follow-up answers](#part-5--jd-review-router-understand-follow-up-answers)
6. [Router branch: save answers and move to the next question](#part-6--router-branch-save-answers-and-move-to-the-next-question)
7. [Test](#part-7--test)
- [Appendix A — Tuning how often it asks](#appendix-a--tuning-how-often-it-asks)
- [Appendix B — Name reference](#appendix-b--name-reference)
- [Appendix C — Troubleshooting](#appendix-c--troubleshooting)

---

## Part 0 — How it works

```
Review and Submit JD Update
  JD Final Review  (+ NEW: readiness, followups)
  Title-support gate                         (unchanged)
  SummaryText, ReviewContext                 (unchanged)
  NEW  Read follow-ups → Followups table, NeedsInfo
  NEW  Condition: NeedsInfo?
        ├─ Yes (first time only)
        │    FollowupsDone = true, InFollowups = true, FUIndex = 1
        │    "Before I put this together for HR, a couple of quick questions…"
        │    Ask = follow-up #1 → Go to step → [Question]
        └─ No → summary message → [Question]   (as today)

  [Question] "{Topic.Ask}"   Submit · Make more changes · Cancel
     └─ typed reply → JD Review Router (+ NEW input: PendingQuestion)
          ├─ hr_note (the answer)
          │    NEW: if InFollowups → save "question Answer: …" to ManagerNotes
          │                          → next follow-up, or, after the last one:
          │                            "Thanks…" → Go to step → JD Final Review
          │                            (re-runs with the answers; FollowupsDone = true,
          │                             so it goes straight to the summary)
          ├─ answer ("why do you need this?") → explains, re-asks the same question
          ├─ edit ("yes, add that to the KSAs") → editing resumes (as today)
          └─ everything else as today
```

**Why it works this way**
- **One prompt sees the whole request.** The Section Reviewer only ever sees one section, so gaps across sections and business-reason gaps can only be caught here.
- **No new topics, no topic outputs.** It reuses the decision loop, so the "no outputs on Review and Submit" fix for duplicate messages stays in place.
- **The manager stays in control.** The buttons still work during follow-ups: they can submit straight away, go back to editing, or cancel.
- **It can't loop.** `Global.FollowupsDone` makes sure the follow-ups run once per update.

**What the Final Review asks about (at most 3, most important first)**

| Type | Gap | Example question |
|---|---|---|
| `justification` | A significant change with no clear business reason | "What changed in the business that led to these new responsibilities?" |
| `specifics` | A significant change with no scale | "Roughly how many business clients will this role manage?" |
| `section_gap` | Sections that no longer fit together | "The new duties include business lending. Should the KSAs reflect lending knowledge too?" |
| `clarify` | Answers that contradict the changes, a level overlap, or a title request that needs the manager's view | "These changes overlap with Universal Banker 2. Has the role grown into that level, or is it the same level with new tasks?" |

Small, routine updates get **no** follow-ups.

---

## Part 1 — New global: FollowupsDone

### 1.1 Create it in Start JD Update
1. **Topics** → **Start JD Update** → find the block that resets globals (where `Global.HardStopLog` and `Global.ManagerNotes` are set to `""`).
2. Below `Global.ManagerNotes`: **+** → **Variable management** → **Set a variable value**.
3. **Set variable** → **Create a new variable** → click it → **Variable properties**:
   - **Name:** `FollowupsDone`
   - **Usage:** **Global (any topic can access)**
4. **To value** → **Formula** → `false`
5. **Save**.

### 1.2 Reset it in Cancel or Switch JD Update
1. **Topics** → **Cancel or Switch JD Update** → the reset block (update guide 12b).
2. Below `Global.ManagerNotes` = `""`: **+** → **Set a variable value** → **Select a variable** → `Global.FollowupsDone` → **Formula** `false`.
3. **Save**.

### 1.3 Reset it after submit
1. **Topics** → **Review and Submit JD Update** → **Submit to HR** branch → the inline reset nodes (the ones that clear the globals before **End all topics**).
2. Add **Set a variable value** → `Global.FollowupsDone` → `false`, alongside the others.
3. **Save**.

---

## Part 2 — JD Final Review: add the readiness check

### 2.1 Add two inputs
1. **Tools** → **JD Final Review** → **Edit**.
2. **+ Add content** → **Text** input → **+ New input** for each:

| Input name | Sample value |
|---|---|
| `ManagerNotes` | `None` |
| `FollowupsDone` | `false` |

### 2.2 Show them to the prompt
1. In the instructions, find the line `Manager's answers about indirect impacts: {IndirectConfirmations}`.
2. Below it, add these two lines, inserting each chip where shown:
   ```
   Manager's notes and follow-up answers for HR: {ManagerNotes}
   Follow-up questions already asked this update: {FollowupsDone}
   ```

### 2.3 Add the readiness task
1. Put the cursor on the empty line **above** `RULES`.
2. Paste:

```
HR READINESS
Decide whether HR has what it needs to review this request without going
back to the manager. Look at the whole request together. List up to 3
follow-up questions, most important first, only for gaps that matter:
- "justification": a significant change (new responsibilities, people
  leadership, a level overlap, a title review) has no clear business reason
  in the reasons, notes or answers.
- "specifics": a significant change has no scale (how many people, clients,
  accounts or loans; how often).
- "section_gap": sections no longer fit together (e.g. new lending duties
  but no matching KSAs or experience; Purpose doesn't reflect new duties).
- "clarify": the manager's answers contradict the changes, or a level
  overlap or title request needs the manager's view on whether the role has
  grown.
Each follow-up has: "question" (one short, friendly question to the
manager), "why" (a short phrase on why HR needs it) and "type".
Never ask about anything already answered in the reasons, notes, indirect
answers or title justification. Never ask about grade, pay, job code, salary
type or status. Small or routine updates need no follow-ups.
Set readiness to "needs_info" if you listed any follow-ups, otherwise
"ready". If follow-up questions were already asked this update ("true"),
always return readiness "ready" and an empty followups list.
In hr_summary, include what the manager explained in their notes and
follow-up answers.
```

### 2.4 Update the JSON format
1. Open the **Output** (JSON) format.
2. Add these two fields to the existing ones. Keep everything already there:

```json
  "readiness": "ready",
  "followups": [
    {
      "question": "",
      "why": "",
      "type": ""
    }
  ]
```

### 2.5 Test
1. **Test** with a big change and no reason. For example, set `ChangesText` to Duties that add "manages a portfolio of business clients" and "supervises two tellers", set `UpdateReasons` to `Other`, and leave `ManagerNotes` as `None`.
   - Expect `readiness: "needs_info"` and 1–3 follow-ups (a justification, plus specifics like the client count).
2. Test again with `FollowupsDone` = `true`.
   - Expect `readiness: "ready"` and `followups: []`.
3. Test with a one-word KSA tweak.
   - Expect `ready`.
4. **Save**.

---

## Part 3 — Review and Submit: pass the new inputs

1. **Topics** → **Review and Submit JD Update** → click the **JD Final Review** tool node.
2. The two new inputs appear. If they don't, **⋯** → **Refresh**, or delete and re-add the node, then re-enter all its mappings.
3. Map:

| Input | Value (Formula) |
|---|---|
| ManagerNotes | `If(IsBlank(Global.ManagerNotes), "None", Global.ManagerNotes)` |
| FollowupsDone | `If(Global.FollowupsDone, "true", "false")` |

4. Check the output variable is still `Topic.Final`, and the node after it still sets `Topic.F` = `ParseJSON(Topic.Final.text)`.
5. **Save**.

---

## Part 4 — Review and Submit: start the follow-ups

All of this goes **after** the `Topic.ReviewContext` node (router guide 5.2) and **before** the summary message node (router guide 5.3).

### 4.1 Read the follow-ups
1. Below **ReviewContext**: **+** → **Set a variable value** → **Create a new variable** → `Followups` (Topic) → **Formula**:
   ```powerfx
   ForAll(
     Table(Topic.F.followups),
     {
       Q: Text(ThisRecord.Value.question),
       Why: Text(ThisRecord.Value.why),
       Type: Text(ThisRecord.Value.type)
     }
   )
   ```
2. **+** → **Set a variable value** → new variable `NeedsInfo` (Topic) → **Formula**:
   ```powerfx
   Lower(Text(Topic.F.readiness)) = "needs_info" &&
   CountRows(Filter(Topic.Followups, !IsBlank(Q))) > 0 &&
   Global.FollowupsDone <> true
   ```
3. **+** → **Set a variable value** → new variable `InFollowups` (Topic) → **Formula**: `false`

> If `Topic.F.followups` is missing, `Table()` gives an empty table and `NeedsInfo` comes out false, so the topic carries on to the summary as before.

### 4.2 The condition
1. **+** → **Add a condition** → **…** → **Edit formula** → `Topic.NeedsInfo = true`

**True branch** (first time only, in order):
2. **Set a variable value** → `Global.FollowupsDone` → `true`
3. **Set a variable value** → `Topic.InFollowups` → `true`
4. **Set a variable value** → new variable `FUIndex` (Topic) → `1`
5. **Send a message:**
   > Before I put this together for HR, a couple of quick questions so they have what they need.
6. **Set a variable value** → `Topic.Ask` → **Formula**: `First(Topic.Followups).Q`
7. **Set a variable value** → `Topic.Turns` → `0`
8. **Set a variable value** → `Topic.QALog` → `"None"`
9. **Topic management** → **Go to step** → click the **What would you like to do?** question node (the one showing `{Topic.Ask}`).

**All other conditions:** leave it empty. The topic continues to the summary message, exactly as today.

> **Turns and QALog** are normally set just below the summary (router guide 5.4). The follow-up path skips the summary, so it sets them itself. If those two variables don't exist yet in your topic, finish router guide Part 5.4 first.

### 4.3 Check the order
```
JD Final Review → Topic.F → title gate → SummaryText → ReviewContext
→ Followups → NeedsInfo → InFollowups = false
→ Condition NeedsInfo
     True:  FollowupsDone, InFollowups, FUIndex, intro message, Ask, Turns, QALog, Go to step → Question
     Else:  (empty)
→ Summary message → Ask / Turns / QALog → Question
```

**Save** the topic.

---

## Part 5 — JD Review Router: understand follow-up answers

### 5.1 Add an input
1. **Tools** → **JD Review Router** → **Edit**.
2. **+ Add content** → **Text** → **+ New input** → `PendingQuestion` → sample value `None`.

### 5.2 Show it to the prompt
Below the `Recent back-and-forth during this review:` / `{RecentExchange}` lines, add:
```
Follow-up question HR needs answered (or "None"):
{PendingQuestion}
```

### 5.3 Add the rules
In the **Rules:** list, add these as the **first** bullets:
```
- If the follow-up question is not "None", the manager was just asked it
  for HR:
  - If their message answers it, even partly, choose "hr_note". Write "note"
    as a short, self-contained answer HR can read on its own (e.g. "Branch
    became a small business hub in September; about 40 clients.").
    In "answer", thank them in a few words.
  - If they don't know or prefer not to answer, choose "hr_note" with note
    "Not answered".
  - If the answer means a section should change (e.g. "yes, add that to
    the KSAs"), choose "edit".
  - If they ask why it's needed, choose "answer", explain using the reason
    given, and make next_question re-ask the same question in new words.
```

### 5.4 Test
**Test** with `PendingQuestion` = `Roughly how many business clients will this role manage? (Why HR needs this: scope of the new portfolio)`:

| UserMessage | Expected |
|---|---|
| About 40 | `hr_note`, note about 40 clients |
| Not sure yet | `hr_note`, note `Not answered` |
| Why does HR need that? | `answer` explaining scope, with next_question re-asking |
| Good point, add portfolio management to the KSAs | `edit`, section `KSA` |

**Save**.

---

## Part 6 — Router branch: save answers and move to the next question

### 6.1 Pass PendingQuestion to the router
1. In **Review and Submit JD Update**, go to the question's **All other conditions** branch → the **JD Review Router** tool node (router guide 7.4).
2. Refresh the node so **PendingQuestion** appears (**⋯** → **Refresh**, or delete and re-add it and re-enter its mappings).
3. **PendingQuestion** → **Formula**:
   ```powerfx
   If(
     Topic.InFollowups,
     Index(Topic.Followups, Topic.FUIndex).Q & " (Why HR needs this: " & Index(Topic.Followups, Topic.FUIndex).Why & ")",
     "None"
   )
   ```

### 6.2 Change the hr_note branch
Open the **hr_note** branch (router guide 8.3). It currently saves the note, sends the answer, sets Ask and goes back to the question.

1. At the **top** of the branch, above the existing nodes: **+** → **Add a condition** → **Edit formula** → `Topic.InFollowups = true`
2. Drag the existing hr_note nodes (save note, send answer, set Ask, Go to step) into the condition's **All other conditions** branch. Outside follow-ups, notes work exactly as before.

**True branch** (answering a follow-up), in order:

3. **Set a variable value** → `Global.ManagerNotes` → **Formula**:
   ```powerfx
   If(IsBlank(Global.ManagerNotes), "", Global.ManagerNotes & Char(10)) &
   "- " & Index(Topic.Followups, Topic.FUIndex).Q & " Answer: " & Topic.RNote
   ```
4. **Set a variable value** → `Topic.FUIndex` → `Topic.FUIndex + 1`
5. **+** → **Add a condition** → **Edit formula** →
   ```powerfx
   Topic.FUIndex <= CountRows(Filter(Topic.Followups, !IsBlank(Q)))
   ```
   **True** (more questions):
   - **Set a variable value** → `Topic.Ask` → **Formula**:
     ```powerfx
     "Thanks. " & Index(Topic.Followups, Topic.FUIndex).Q
     ```
   - **Go to step** → the question node.

   **All other conditions** (that was the last one):
   - **Set a variable value** → `Topic.InFollowups` → `false`
   - **Send a message:** `Thanks, that gives HR what they need. Updating your summary…`
   - **Go to step** → click the **JD Final Review** tool node at the top of the review. It re-runs with the answers. FollowupsDone is now true, so it goes straight to the summary.

6. **Save** the topic.

> **Why re-run the Final Review:** so the HR summary, change summary and "Worth a look" items reflect the answers. It adds a few seconds once.

### 6.3 Nothing else changes
- **answer / unclear:** the router re-asks the pending question in `next_question`, and the existing branch sets `Ask` from it.
- **edit:** goes to editing as today. The follow-ups are already marked done, so after editing, the next review goes straight to the summary.
- **The buttons:** Submit, Make more changes and Cancel work during follow-ups as they always have. Anything already answered is in ManagerNotes.

---

## Part 7 — Test

Use a new conversation for each row.

| # | Update | Say at follow-ups | Expected |
|---|---|---|---|
| 1 | One small KSA wording change | n/a | No follow-ups, straight to the summary |
| 2 | Duties: add "manages ~40 business clients", reason **Other** with no text | Answer each question | 1–3 questions, each answer saved, "Thanks…", then the summary. The HR summary mentions the answers |
| 3 | Same as 2 | "Not sure" to the first | Next question. ManagerNotes has "… Answer: Not answered" |
| 4 | Same as 2 | "Why do you need that?" | A short explanation, then the same question in new words |
| 5 | Same as 2 | "Good point, add that to the KSAs" | Goes to KSA editing. When done, the review shows the summary with **no** second round |
| 6 | Same as 2 | Click **Submit to HR** at the first question | Submits. Any earlier answers are in ManagerNotes |
| 7 | Changes overlapping the next level up | Answer the overlap question | The overlap explanation shows in the HR summary and the HR email |
| 8 | Discard during follow-ups, then start a new update | n/a | The new update can get follow-ups again (FollowupsDone was reset) |

**Also check:**
- ManagerNotes in the SharePoint request item shows the `question Answer: …` lines.
- The HR email's **Manager Notes** section lists them (Level-tagged notes still go to the Level section).
- No duplicate messages after submit.

---

## Appendix A — Tuning how often it asks

| If it… | Change in the HR READINESS task |
|---|---|
| Asks on small updates | Add: `Only ask when HR would otherwise have to contact the manager.` |
| Asks too many | Change `up to 3` to `up to 2` |
| Misses business reasons | Add: `Treat "Other" with no explanation, or a reason that just restates the change, as no business reason.` |
| Repeats something already answered | Add the example to the "Never ask about anything already answered" rule |
| Asks about level when there's no overlap | Add: `Only ask about level when level_match is true.` |

---

## Appendix B — Name reference

**New global:** `Global.FollowupsDone` (Boolean): false at start, after cancel and after submit; true once follow-ups have started.

**JD Final Review:** new inputs `ManagerNotes`, `FollowupsDone` · new task **HR READINESS** · new outputs `readiness`, `followups[] {question, why, type}`

**JD Review Router:** new input `PendingQuestion` · new rules for follow-up answers

**Review and Submit JD Update:**

| Item | Type | Where |
|---|---|---|
| Followups, NeedsInfo, InFollowups | Set variable (Topic) | After ReviewContext |
| NeedsInfo condition | Condition | Before the summary message |
| FUIndex | Set variable (Topic) | NeedsInfo → True |
| PendingQuestion mapping | Router input | Router node in All other conditions |
| InFollowups condition | Condition | Top of the hr_note branch |

---

## Appendix C — Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Never asks follow-ups | `readiness` always "ready", or NeedsInfo false | Test the prompt alone (2.5). In the topic, check FollowupsDone is false at the start (Part 1.1) |
| Asks again after the answers | FollowupsDone not set to true, or not passed to the prompt | 4.2 step 2, and the Part 3 mapping |
| Same question repeated after an answer | The router chose "answer" or "unclear" instead of "hr_note" | Check the PendingQuestion mapping (6.1), and that the 5.3 rules are at the top of the Rules list |
| Error "Name isn't valid: Q" | Followups was created with a different shape | Delete the Followups variable and recreate it with the 4.1 formula before anything else uses it |
| `Index` error | FUIndex past the end of the list | Check the 6.2 step 5 condition runs before Ask is set |
| Answers missing from the HR email | ManagerNotes not passed to the save flow | HR email guide 3.6 (ManagerNotes = `Global.ManagerNotes`) |
| Summary appears before the follow-ups | The NeedsInfo condition is below the summary message | Move it above (4.3) |
| Duplicate messages after submit | Outputs added to Review and Submit | This guide adds no outputs. Remove any that were added |
