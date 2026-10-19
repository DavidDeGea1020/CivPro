# Review Router — Build Guide

**Topic:** Review and Submit JD Update (Copilot Studio classic, generative orchestration)
**Goal:** keep the topic's structure (summary → decision → submit) but stop ignoring everything that isn't a button. Whatever the manager types at the decision point is routed: questions are answered, disagreements become notes for HR, edits go back to editing, restricted requests are logged, off-topic questions are answered from knowledge. Then the manager comes back to the same decision, phrased naturally.

> **UI labels change often.** If a label here doesn't match exactly, look for the closest equivalent. Node types and settings are the same.

---

## Contents

0. [How it works](#part-0--how-it-works)
1. [Before you start](#part-1--before-you-start)
2. [Write your process FAQ](#part-2--write-your-process-faq)
3. [Prompt tool: JD Review Router](#part-3--prompt-tool-jd-review-router)
4. [Add the Manager Notes global](#part-4--add-the-manager-notes-global)
5. [Shorten the summary and build the review context](#part-5--shorten-the-summary-and-build-the-review-context)
6. [Open up the decision question](#part-6--open-up-the-decision-question)
7. [Build the router branch](#part-7--build-the-router-branch)
8. [Build the intent branches](#part-8--build-the-intent-branches)
9. [Send manager notes to HR](#part-9--send-manager-notes-to-hr)
10. [Agent instructions](#part-10--agent-instructions)
11. [Testing](#part-11--testing)
- [Appendix A — Name reference](#appendix-a--name-reference)
- [Appendix B — Troubleshooting](#appendix-b--troubleshooting)
- [Appendix C — Optional: a ManagerNotes column](#appendix-c--optional-a-managernotes-column)

---

## Part 0 — How it works

```
Summary message (shorter, flags as one-liners)
   │
   ▼
[Question] "{Topic.Ask}"  ── buttons: Submit to HR · Make more changes · Cancel this update
   │
   ├─ Submit to HR       → existing branch (unchanged)
   ├─ Make more changes  → existing branch (unchanged)
   ├─ Cancel this update → existing branch (unchanged)
   │
   └─ All other conditions  (the manager typed something else)
        │
        ├─ loop cap reached? → "Let's wrap this up…" → back to [Question]
        │
        ▼
      JD Review Router prompt  → intent + answer + next question
        │
        ├─ answer      → send answer                    → back to [Question]
        ├─ hr_note     → save note, confirm             → back to [Question]
        ├─ submit      → save note if any, point to button → back to [Question]
        ├─ restricted  → Log Hard Stop, explain         → back to [Question]
        ├─ off_topic   → Generative answers (knowledge) → back to [Question]
        ├─ edit        → Show JD Section → end topic (editing resumes)
        ├─ cancel      → Cancel or Switch JD Update
        └─ (unclear)   → rephrased question             → back to [Question]
```

**Key ideas**
- **One prompt per message** does the classifying and the answering, so replies stay fast.
- **The question isn't repeated word for word.** Its text is a variable, `Topic.Ask`, that the router rewrites after each answer.
- **Buttons are shortcuts, not a cage.** Managers who know what they want click a button. Everyone else types.
- **Submitting always ends with a click on Submit to HR.** Free text never sends a request by itself, which keeps submission explicit and safe.
- **The router never sees restricted data.** It gets a review context you build from safe fields only, never `Global.OriginalJDText`.

**What stays the same:** the guards, the title questions, the Final Review prompt, the title-support gate, and the three existing branches.

---

## Part 1 — Before you start

### 1.1 Check what's already in the topic
Open **Review and Submit JD Update** and confirm these exist. The names come from the earlier guides.

| Item | Where |
|---|---|
| `Topic.F` = `ParseJSON(Topic.Final.text)` | After the JD Final Review prompt node |
| `Topic.ChangesText`, `Topic.SectionsChanged` | Step 11.4 |
| `Topic.SummaryText` and the message that shows it | Step 11.6 |
| Question **What would you like to do?** → `Topic.Decision`, options **Submit to HR**, **Make more changes**, **Cancel this update** | Step 11.7 |

### 1.2 Remove the earlier Q&A attempt, if you built it
If the question's **All other conditions** branch already has the **Answer Review Question** prompt and its nodes:
1. Click each node in that branch → **⋯** → **Delete**, until the branch is empty.
2. Optionally delete the **Answer Review Question** tool: **Tools** → **⋯** → **Delete**. The router replaces it.

### 1.3 Check that "Go to step" is available
1. Under any branch, click **+** → **Topic management**.
2. Confirm **Go to step** is in the list. You'll use it to loop back to the question.
3. Close the menu without adding anything.

If it's missing, see Appendix B before continuing.

---

## Part 2 — Write your process FAQ

The router answers process questions ("What happens next?") from a short FAQ that you paste into its instructions. Write it now in a text editor; you'll paste it in Part 3.

Use short question/answer pairs. Example structure. Replace every answer with your real process:

```
- What happens after I submit? → [e.g., Your HR Business Partner reviews the request.]
- Who reviews it? → [e.g., Your HRBP, then Compensation if a level or title change is involved.]
- How long does it take? → [e.g., Usually 5–10 business days.]
- Will I be notified? → [e.g., Yes, by email when the review is complete.]
- Can I change it after submitting? → [e.g., Contact your HRBP; you can't edit it in the agent.]
- Will I get a copy? → Yes, a download link appears right after you submit.
- Does this change anyone's pay or title right away? → No. Nothing changes until HR approves.
- Can I save it and finish later? → No, updates have to be finished in one session.
```

Keep it under about 20 lines. Anything the FAQ doesn't cover, the router will say it doesn't know and suggest asking HR.

---

## Part 3 — Prompt tool: JD Review Router

### 3.1 Create the prompt
1. In your agent, click **Tools** in the top nav.
2. **+ Add a tool** → **New tool** → **Prompt**.
3. Name it **JD Review Router**.

### 3.2 Add the inputs
Click **+ Add content** (or the input icon) → **Text** for each. Give each a sample value for testing.

| Input name | Sample value |
|---|---|
| `UserMessage` | How do the two overlap? |
| `ReviewContext` | *(paste a sample — see 5.2 for what it looks like)* |
| `ChangesText` | *(a few sections in ORIGINAL / PROPOSED format)* |
| `RelatedLevels` | *(JSON from your Related Levels flow)* |
| `RecentExchange` | None |

### 3.3 Paste the instructions
Insert each input chip where `{InputName}` appears. Paste your FAQ from Part 2 at `[INSERT PROCESS FAQ]`.

```
You help a manager who is reviewing a job description update request before
it is submitted to HR. The manager has just typed a message instead of
choosing an option. Decide what they want and reply.

Manager's message: {UserMessage}

Review of this request:
{ReviewContext}

Requested changes (ORIGINAL vs PROPOSED per section):
{ChangesText}

Other levels of this job (JSON):
{RelatedLevels}

Recent back-and-forth during this review:
{RecentExchange}

Process FAQ:
[INSERT PROCESS FAQ]

Choose exactly ONE intent:
- "answer": a question about this request (its changes, flags, level
  overlap, title review, what HR will see), a process question, or a
  request to see a section's proposed text. Answer it.
- "hr_note": the manager disagrees with a flag or wants HR to know
  something (e.g., "it's not really a manager role", "the overlap is
  temporary"). Put their point, in their words, in "note". In "answer",
  confirm it will be passed to HR.
- "submit": the manager clearly says to send or submit the request. If they
  also want HR told something, put it in "note".
- "edit": the manager wants to change, add or remove something in the job
  description. Put the section key in "section" if you can tell which.
- "cancel": the manager wants to cancel, discard or start over.
- "restricted": the manager asks to change salary type, exempt/non-exempt
  status, overtime eligibility, grade or job code. Put the field in
  "field". In "answer", explain in one or two sentences that this can't be
  changed through this process and that HR will see the request.
- "off_topic": an HR question unrelated to this request (policies,
  benefits, other jobs). Leave "answer" empty.
- "unclear": you can't tell what they want, or they're just acknowledging
  (e.g., "ok", "hmm").

Rules:
- If a message mixes an edit with a submit, choose "edit".
- Choose "submit" only when the manager clearly wants to send it now.
- For level overlap questions, name the other level and list the specific
  proposed duties or requirements that match it. Mention what still
  separates the two roles.
- If the FAQ and the review don't cover a process question, say you don't
  know and suggest asking their HR Business Partner.
- Never mention grade, job code, salary type, exempt/non-exempt status or
  job status, for this job or any other level, even if asked.
- Never decide for the manager whether to submit.
- Keep "answer" under 120 words. For lists, put each item on its own line
  starting with "- ", with a blank line before the list.
- "section" must be one of: Purpose, PrincipalDuties, Education,
  WorkExperience, Certifications, KSA, or empty.
- "next_question" is one short, natural line that brings the manager back
  to deciding, e.g. "Does that help? Ready to submit, or want to adjust
  anything?" Don't repeat the same wording twice in a row (check the recent
  back-and-forth). For "unclear", make it a gentle rephrase of the choice:
  submit, make changes, or cancel.

Return ONLY valid JSON in exactly this format.
```

### 3.4 Set the output
1. Set **Output** to **JSON**.
2. Paste this as the example format:

```json
{
  "intent": "answer",
  "section": "",
  "note": "",
  "field": "",
  "answer": "",
  "next_question": ""
}
```

### 3.5 Test and save
Click **Test** with each of these as `UserMessage`. Leave the other samples as they are.

| UserMessage | Expected intent |
|---|---|
| How do the two overlap? | `answer`, naming the other level and specific duties |
| What happens after I submit? | `answer`, from your FAQ |
| It's not really a manager role, they just train people | `hr_note`, with the point in `note` |
| Send it, but tell HR the overlap is temporary | `submit`, with the note |
| Actually add one more KSA | `edit`, `section` = KSA |
| Can we also make it exempt? | `restricted` |
| What's the PTO policy? | `off_topic` |
| ok | `unclear` |

Click **Save**.

---

## Part 4 — Add the Manager Notes global

Notes for HR need to survive the loop and reach the save flow, so they live in a global that's created at the start of every update and cleared on cancel.

### 4.1 Create it in Start JD Update
1. Open **Start JD Update** → find the Step 6.7 block of **Set a variable value** nodes (where `Global.HardStopLog` = `""`).
2. Below `Global.HardStopLog`, click **+** → **Variable management** → **Set a variable value**.
3. **Set variable** → **Create a new variable** → click it → **Variable properties**:
   - **Name:** `ManagerNotes`
   - **Usage:** Global (any topic can access)
4. **To value** → **Formula** → `""`
5. **Save** the topic.

### 4.2 Clear it in Cancel or Switch JD Update
1. Open **Cancel or Switch JD Update** → find the block of reset nodes (12b).
2. Below `Global.HardStopLog` = `""`, add **Set a variable value** → **Select a variable** → `Global.ManagerNotes` → Formula `""`.
3. **Save** the topic.

---

## Part 5 — Shorten the summary and build the review context

Everything in this part goes in **Review and Submit JD Update**, after the title-support gate (the condition on `Global.TitleReviewRequested && !Boolean(Topic.F.title_supported)`) and before the summary message.

### 5.1 Replace the summary formula
1. Click the **Set a variable value** node for `Topic.SummaryText`.
2. **To value** → **Formula** → replace everything with:

```powerfx
"**Job:** " & Global.OriginalJD.Title & Char(10) & Char(10) &
"**Sections changed:** " & Topic.SectionsChanged & Char(10) & Char(10) &
"**Reasons:** " & Global.UpdateReasons &
  If(IsBlank(Global.OtherReason), "", " — " & Global.OtherReason) & Char(10) & Char(10) &
If(IsBlank(Text(Topic.F.change_summary)), "",
  "**Summary of changes:**" & Char(10) & Text(Topic.F.change_summary) & Char(10) & Char(10)) &
If(
  Coalesce(Boolean(Topic.F.level_match), false) ||
  !(IsBlank(Topic.IndirectConfirmations) || Topic.IndirectConfirmations = "None") ||
  !IsBlank(Global.HardStopLog) || Global.TitleReviewRequested,
  "**Worth a look before you submit:**" & Char(10) & Char(10) &
  If(Coalesce(Boolean(Topic.F.level_match), false),
    "- Your changes overlap with **" & Text(Topic.F.matched_level_title) & "**. Ask me how." & Char(10), "") &
  If(IsBlank(Topic.IndirectConfirmations) || Topic.IndirectConfirmations = "None", "",
    "- For HR review: " & Topic.IndirectConfirmations & Char(10)) &
  If(IsBlank(Global.HardStopLog), "",
    "- Some requests can't be changed here and were noted for HR." & Char(10)) &
  If(Global.TitleReviewRequested,
    "- Title review: proposed """ & Topic.ProposedTitle & """." & Char(10), "") &
  Char(10),
  "")
```

The full level recommendation no longer goes in the summary. It's in the review context instead, so the router can explain it when asked.

### 5.2 Build the review context
1. Directly below the `Topic.SummaryText` node, click **+** → **Set a variable value**.
2. **Create a new variable** → Name: `ReviewContext` → Usage: **Topic**.
3. **To value** → **Formula**:

```powerfx
"Job: " & Global.OriginalJD.Title & Char(10) &
"Sections changed: " & Topic.SectionsChanged & Char(10) &
"Reasons: " & Global.UpdateReasons &
  If(IsBlank(Global.OtherReason), "", " (" & Global.OtherReason & ")") & Char(10) &
"Change summary:" & Char(10) & Text(Topic.F.change_summary) & Char(10) &
"Indirect impacts confirmed by the manager: " &
  If(IsBlank(Topic.IndirectConfirmations), "None", Topic.IndirectConfirmations) & Char(10) &
"Requests that can't be changed here (noted for HR): " &
  If(IsBlank(Global.HardStopLog), "None", Global.HardStopLog) & Char(10) &
"Level overlap: " &
  If(Coalesce(Boolean(Topic.F.level_match), false),
    Text(Topic.F.matched_level_title) & ". " & Text(Topic.F.level_recommendation),
    "None found") & Char(10) &
"Title review: " &
  If(Global.TitleReviewRequested,
    "Requested. Proposed title: " & Topic.ProposedTitle & ". Reason: " & Topic.TitleJustification,
    "Not requested")
```

> **Left out on purpose:** `title_support_assessment` and `hr_summary` are HR-only, and `Global.OriginalJDText` contains Salary Type. None of them go to the router.

### 5.3 Update the summary message
1. Click the message node that shows the summary.
2. Replace its text with:

> Here's your update request:
>
> {Topic.SummaryText}
>
> Ask me about anything here, or pick an option below.

Insert `Topic.SummaryText` with the **{x}** button rather than typing it.

### 5.4 Set the starting state for the loop
Directly below the summary message, before the question node, add three **Set a variable value** nodes. Create each as a new **Topic** variable.

| Name | Formula |
|---|---|
| `Ask` | `"What would you like to do?"` |
| `Turns` | `0` |
| `QALog` | `"None"` |

---

## Part 6 — Open up the decision question

### 6.1 Make its text a variable
1. Click the **What would you like to do?** question node.
2. In the message box, delete the text.
3. Click **{x}** → select `Topic.Ask`.

The options (**Submit to HR**, **Make more changes**, **Cancel this update**) and their synonyms stay as they are.

### 6.2 Let other replies through
1. On the question node, click **⋯** → **Properties**.
2. Open **Question behavior** (may be labeled **Question properties**):
   - **Skip behavior:** Ask every time
   - **Reprompt:** Don't repeat
   - **No valid entity found** → **Action if no entity found:** Set variable to empty (no value)
3. Open **Interruptions** (if present): turn **Allow switching to a new topic** off.
4. Close the panel and **Save**.

A typed reply that doesn't match an option (or a synonym) now leaves `Topic.Decision` empty and goes to **All other conditions**.

---

## Part 7 — Build the router branch

Everything in Parts 7 and 8 goes in the question's **All other conditions** branch, in order.

### 7.1 Count the turn
1. **+** → **Set a variable value** → **Select a variable** → `Topic.Turns`.
2. **Formula:** `Topic.Turns + 1`

### 7.2 Loop cap
1. **+** → **Add a condition** → formula view → `Topic.Turns > 8`
2. **True** branch:
   - **+** → **Set a variable value** → `Topic.Ask` → Formula:
     `"We've covered a lot. Let's wrap this up: submit it to HR, make more changes, or cancel?"`
   - **+** → **Topic management** → **Go to step** → click the **What would you like to do?** question node on the canvas (or pick it from the list).
3. Leave **All other conditions** of this condition empty. The next steps go **below the condition block**, on the branch's main line.

### 7.3 Capture the message
**+** → **Set a variable value** → new Topic variable `UserMsg` → Formula: `System.Activity.Text`

### 7.4 Call the router
1. **+** → **Add a tool** → **Prompt** tab → **JD Review Router**.
2. Map the inputs:

| Input | Value |
|---|---|
| UserMessage | `Topic.UserMsg` |
| ReviewContext | `Topic.ReviewContext` |
| ChangesText | `Topic.ChangesText` |
| RelatedLevels | `If(IsBlank(Global.RelatedLevels), "None. This job has no other levels.", Global.RelatedLevels)` |
| RecentExchange | `Topic.QALog` |

3. Name the output variable `Router`.

### 7.5 Read the result
Add these **Set a variable value** nodes in order, each a new **Topic** variable. Use the same text property (`.text`) that works for your other prompts.

| Name | Formula |
|---|---|
| `RT` | `ParseJSON(Topic.Router.text)` |
| `Intent` | `Lower(Trim(Text(Topic.RT.intent)))` |
| `RAnswer` | `Text(Topic.RT.answer)` |
| `RNext` | `If(IsBlank(Text(Topic.RT.next_question)), "Anything else about this request, or ready to submit?", Text(Topic.RT.next_question))` |
| `RSection` | `Text(Topic.RT.section)` |
| `RNote` | `Text(Topic.RT.note)` |
| `RField` | `Text(Topic.RT.field)` |

### 7.6 Remember the exchange
**+** → **Set a variable value** → `Topic.QALog` → Formula:

```powerfx
Right(
  If(Topic.QALog = "None", "", Topic.QALog & Char(10)) &
  "Manager: " & Topic.UserMsg & Char(10) & "Agent: " & Topic.RAnswer,
  3000
)
```

This keeps the last ~3,000 characters, so the router understands follow-ups like "What about the second one?" without the input growing forever.

---

## Part 8 — Build the intent branches

### 8.1 Create the condition
1. Below 7.6: **+** → **Add a condition**.
2. First condition: `Topic.Intent` **is equal to** `answer`.
3. Click **+ New condition** (on the same condition node) for each of the others, in this order:
   `hr_note`, `submit`, `restricted`, `off_topic`, `edit`, `cancel`.
4. **All other conditions** handles `unclear` and anything unexpected.

### 8.2 `answer`
1. **Send a message** → `{Topic.RAnswer}` (insert with **{x}**).
2. **Set a variable value** → `Topic.Ask` = `Topic.RNext`
3. **Topic management** → **Go to step** → the question node.

### 8.3 `hr_note`
1. **Set a variable value** → `Global.ManagerNotes` → Formula:
   ```powerfx
   If(IsBlank(Global.ManagerNotes), "- " & Topic.RNote, Global.ManagerNotes & Char(10) & "- " & Topic.RNote)
   ```
2. **Send a message** → `{Topic.RAnswer}`
3. **Set a variable value** → `Topic.Ask` = `Topic.RNext`
4. **Go to step** → the question node.

### 8.4 `submit`
Submission still happens through the button, so a casual phrase never sends a request by accident.

1. **Add a condition** → `!IsBlank(Topic.RNote)`
   - **True:** **Set a variable value** → `Global.ManagerNotes` → the same formula as 8.3 step 1.
2. Below the condition block: **Set a variable value** → `Topic.Ask` → Formula:
   ```powerfx
   If(IsBlank(Topic.RNote), "", "I've added your note for HR. ") & "Tap **Submit to HR** below to send it."
   ```
3. **Go to step** → the question node.

> Most "send it" phrasings already match the **Submit to HR** synonyms and never reach the router. This branch catches the unusual ones and the "submit, but tell HR…" cases.

### 8.5 `restricted`
1. **Topic management** → **Go to another topic** → **Log Hard Stop**. Map its inputs:
   - **Field:** `If(IsBlank(Topic.RField), "Restricted field", Topic.RField)`
   - **UserRequest:** `Topic.UserMsg`
2. **Send a message** → `{Topic.RAnswer}`
3. **Set a variable value** → `Topic.Ask` = `Topic.RNext`
4. **Go to step** → the question node.

Log Hard Stop adds the request to `Global.HardStopLog`, so it reaches HR with the submission.

### 8.6 `off_topic`
1. **+** → **Advanced** → **Generative answers** (may be labeled **Create generative answers**).
2. **Input:** click **{x}** → `Topic.UserMsg`.
3. **Data sources:** click **Edit** → keep your agent's knowledge sources (the JD knowledge file, job families, and any HR policy sources).
4. **Properties** → make sure **Send a message** is on, so the answer is shown.
5. **Set a variable value** → `Topic.Ask` → Formula:
   `"Back to your request: anything else about it, or ready to submit?"`
6. **Go to step** → the question node.

> If your knowledge can't answer, the node shows nothing or its fallback. Ask still brings the manager back to the decision either way.

### 8.7 `edit`
1. **Add a condition** → formula view:
   `Topic.RSection in ["Purpose","PrincipalDuties","Education","WorkExperience","Certifications","KSA"]`
2. **True:**
   - **Send a message** → `Sure, let's update that.`
   - **Topic management** → **Go to another topic** → **Show JD Section** → **SectionName:** `Topic.RSection`
3. **All other conditions:**
   - **Send a message** → `Sure. Which section would you like to change?`
4. Below the condition block: **Topic management** → **End current topic**.

The orchestrator takes over editing from here. When the manager says they're done, Review and Submit runs again with a fresh Final Review.

### 8.8 `cancel`
1. **Topic management** → **Go to another topic** → **Cancel or Switch JD Update** → **Mode:** `"Cancel"`
2. **Add a condition** → `Global.UpdateInProgress = true`
   - **True** (they chose **No, keep going**): **Set a variable value** → `Topic.Ask` = `"No problem. What would you like to do?"` → **Go to step** → the question node.
   - **All other conditions** (they discarded it): **End current topic**.

### 8.9 All other conditions (`unclear`)
1. **Add a condition** → `!IsBlank(Topic.RAnswer)`
   - **True:** **Send a message** → `{Topic.RAnswer}`
2. Below the condition block: **Set a variable value** → `Topic.Ask` = `Topic.RNext`
3. **Go to step** → the question node.

**Save** the topic.

---

## Part 9 — Send manager notes to HR

Notes go into the existing **HRSummary** field, so the flow, the SharePoint list and the template don't need to change. (For a dedicated column, see Appendix C.)

### 9.1 Update the flow mapping
1. In the **Submit to HR** branch, click the **Save JD Update Request** flow node.
2. Find the **HRSummary** input → replace its value with:

```powerfx
Text(Topic.F.hr_summary) &
If(IsBlank(Global.ManagerNotes), "",
  Char(10) & Char(10) & "Manager notes:" & Char(10) & Global.ManagerNotes)
```

### 9.2 Show notes in the confirmation (optional)
In the **Submit to HR** branch, before the **Submitted!** message, add **Set a variable value** → new Topic variable `NotesLine` → Formula:

```powerfx
If(IsBlank(Global.ManagerNotes), "", Char(10) & Char(10) & "Your notes for HR were included.")
```

Then add `{Topic.NotesLine}` at the end of the **Submitted!** message text.

**Save** the topic.

---

## Part 10 — Agent instructions

1. **Overview** → **Instructions** → **Edit**.
2. Under **FINISHING**, add:

```
- During review, Review and Submit JD Update answers the manager's questions
  itself. If it ends because the manager wants to change a section, continue
  editing as normal. When they say they're done again, call Review and
  Submit JD Update again so the review is refreshed.
```

3. **Save**, then **Publish** if you test outside the Test pane.

---

## Part 11 — Testing

Run an update through to the summary for each test. Use **Track between topics** and the **Variables** panel.

| # | At the decision, type | Expected |
|---|---|---|
| 1 | How do the two overlap? | Specific overlapping duties for the matched level, then a new question with the buttons |
| 2 | What about the second one you listed? | A follow-up that understands "the second one" (uses QALog) |
| 3 | What happens after I submit? | An answer from your FAQ |
| 4 | How long does HR take to approve these? (not in your FAQ) | Says it doesn't know and suggests the HRBP |
| 5 | It's not really a manager role, they just train people | Confirms the note. `Global.ManagerNotes` holds it |
| 6 | Send it, but tell HR the overlap is temporary | Note saved, then "Tap Submit to HR below to send it." Nothing submitted yet |
| 7 | Click **Submit to HR** after test 5 or 6 | SharePoint HRSummary ends with "Manager notes:" and the notes |
| 8 | Actually, add one more KSA | Shows the current KSAs, topic ends, editing continues. Saying "done" reruns review |
| 9 | Can we also make it exempt? | Explains it can't be changed, Log Hard Stop fires, back to the question |
| 10 | What's the PTO policy? | Generative answer from knowledge, then "Back to your request…" |
| 11 | ok | A gentle rephrase of the choice, worded differently from last time |
| 12 | What grade is the other level? | Declines; no grade, job code or salary type in the reply |
| 13 | Type "cancel", then pick **No, keep going** | Returns to the question, nothing lost |
| 14 | Ask 9 questions in a row | On the 9th: "We've covered a lot. Let's wrap this up…" |
| 15 | Click each button directly | All three work exactly as before |
| 16 | Type "send it" | Matches the Submit synonym and submits (doesn't hit the router) |

---

## Appendix A — Name reference

**New prompt:** JD Review Router. Inputs: UserMessage, ReviewContext, ChangesText, RelatedLevels, RecentExchange. Output JSON: intent, section, note, field, answer, next_question.

**New global:** `Global.ManagerNotes`. Created in Start JD Update, cleared in Cancel or Switch, added to HRSummary on submit.

**New topic variables (Review and Submit JD Update):**

| Variable | Holds |
|---|---|
| `ReviewContext` | Safe review details for the router |
| `Ask` | The decision question's current wording |
| `Turns` | Router calls this review, for the loop cap |
| `QALog` | Recent exchange, last ~3,000 characters |
| `UserMsg` | What the manager just typed |
| `Router`, `RT` | Prompt output and its parsed JSON |
| `Intent`, `RAnswer`, `RNext`, `RSection`, `RNote`, `RField` | Parsed fields |
| `NotesLine` | Optional confirmation line |

**Intents:** answer · hr_note · submit · restricted · off_topic · edit · cancel · unclear

---

## Appendix B — Troubleshooting

**Typing a question still re-asks the question**
The question node's properties aren't letting it fall through. Recheck Part 6.2: Reprompt = Don't repeat, Action if no entity found = Set variable to empty. Save and reset the Test pane.

**A typed question matches a button by mistake**
A synonym is too broad (e.g., "done" or "yes"). Open the option's synonyms and remove short, general words. Also check whether "Use generative AI to match options" (if your node has it) is matching questions to options; turn it off if so.

**Go to step isn't in the menu, or won't let you pick the question node**
Make sure you're on a current version of Copilot Studio (refresh the browser). If it's still missing, use **Go to another topic** → **Review and Submit JD Update** instead. This restarts the topic and reruns the Final Review prompt, so it's slower, but it works.

**All intents fall to "unclear"**
`Topic.RT` isn't parsing. Check `Topic.Router` in the Variables panel. If the property isn't `.text`, use the one your other prompts use. If the JSON has extra text around it, re-save the prompt with **Output = JSON**.

**Off-topic answers come back empty**
The Generative answers node has no knowledge sources selected, or none of them covers the question. Add your HR policy source, or turn on the node's fallback message in its properties.

**The router mentions salary type or grade**
Check that `ReviewContext` doesn't include `Global.OriginalJDText` or anything from it. Re-read the "Never mention…" rule in the prompt and test case 12 again.

**After an edit, the review shows old results**
The manager's "I'm done" should call Review and Submit again. Check the Part 10 instruction, and the Review and Submit trigger description ("Use when the user says they are done updating…").

---

## Appendix C — Optional: a ManagerNotes column

If HR wants notes in their own column instead of inside HRSummary:

1. **SharePoint:** JD Update Requests → **+ Add column** → **Multiple lines of text** → Name: `ManagerNotes` → **Save**.
2. **Flow:** open **Save JD Update Request** → trigger → **+ Add an input** → **Text** → `ManagerNotes` → **⋯** → **Make the field optional**. In **Create item**, map **ManagerNotes** to the new input. **Save**.
3. **Topic:** in the **Submit to HR** branch, refresh the flow node so the new input appears. You may need to delete and re-add it, then re-enter every mapping. Then map **ManagerNotes** → `Global.ManagerNotes`, and set **HRSummary** back to `Text(Topic.F.hr_summary)`.
