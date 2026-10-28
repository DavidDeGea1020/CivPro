# JD Expert v2, In Place: How to Use the v2 Build Guide on Your Current Components

**Use with:** `JD-Expert-v2-Conversational-Update-Build-Guide.md` (the "v2 guide"). It has the click-by-click steps, prompt text and formulas.
**Goal:** build v2 by **editing your existing topics, prompts and flows** instead of creating a parallel set. Follow the v2 guide part by part, with the substitutions in Part 2 of this file and the fixes in Part 3.
**Result:** no new topics, no new prompts, no new flows. Five topics, two prompts and three flows are edited; five topics are switched off. The new assets are the reference file, one list column, and globals.
**Replaces:** the earlier version of this plan, which was written before I'd seen the guide.

---

## Contents

0. [Review of the v2 guide](#part-0--review-of-the-v2-guide)
1. [Component map: edited, switched off, unchanged](#part-1--component-map-edited-switched-off-unchanged)
2. [Part-by-part substitutions](#part-2--part-by-part-substitutions)
3. [Fixes to add on top of the guide](#part-3--fixes-to-add-on-top-of-the-guide)
4. [Build order](#part-4--build-order)
5. [Decisions before you start](#part-5--decisions-before-you-start)

---

## Part 0 — Review of the v2 guide

**Overall:** the guide is solid and buildable. It reads your inventory correctly, keeps the downstream pipeline intact, and carries most of the v1 lessons forward:
- no outputs on Draft and Submit
- End all topics
- the "that's it" exclusion
- topics-only tools
- variables created above where they're used
- the code-block cleanup
- the blank-Proposed handling

Its strongest pieces:
- **line plans:** untouched lines are byte-identical, so the false redlines are gone for good
- **the JD Drafter prompt:** scope tests, severity tiers, look-alike signals, calibration examples
- **FinalReviewJSON compatibility:** the HR email keeps working

**What needs fixing or a decision** (details in Part 3):

| # | Issue | Severity |
|---|---|---|
| A | **The Submit question repeats a v1 bug.** "Submit to HR" has the synonyms `submit`, `send`, `yes` and `looks good`. "What happens after I submit?" or "yes but change the KSAs" can trigger a submit, the same substring-match bug we fixed in v1 | **High** |
| B | **No code check on line plans.** A `keep` number past the end of a section silently duplicates the last line; a repeated `keep` duplicates a line; a misspelled section name is silently ignored. The guide relies on the manager spotting it in the display | **High** |
| C | **Re-entering Submit asks the questions again.** If the manager asks a side question at "Ready to send it to HR?", the topic is left. Saying "send it" restarts Submit, and the indirect questions are asked again | Medium |
| D | **Job Code reaches the orchestrator** (Find Jobs and Fuzzy match results), with only the instructions keeping it out of chat | Decision |
| E | **Bullets for sections that start empty.** Bullet detection looks at the section's first original line. A Certifications or KSAs section that was empty gets new lines with no `• ` | Low |
| F | **Prompt size every turn.** The full request history plus the reference file (up to 15k characters) go to the drafter on every message | Low (speed) |

---

## Part 1 — Component map: edited, switched off, unchanged

### Topics

| Your topic | In-place v2 role | Action |
|---|---|---|
| Start JD Update | **Start JD Update** (v2 guide Part 6) | **Edit**: remove the cards and old nodes, add the JobCode input and Part 6 nodes |
| Save Section Change | **Draft JD Update** (Part 8) | **Edit + rename**: replace inputs, delete outputs, rebuild nodes |
| Review and Submit JD Update | **Submit JD Update** (Part 10) | **Edit + rename**: delete the inputs and router loop, rebuild nodes |
| Cancel or Switch JD Update | **Discard JD Update** (Part 11) **+ the reset helper** (Part 5) | **Edit + rename**: its existing **Mode = "Reset"** path becomes the silent reset that Start and Submit redirect to, so no separate Reset topic is needed |
| Show JD Section | **View Job Description**: the safe view of any job (replaces the guide's Get Job flow) | **Edit + rename** |
| Find/confirm job topic | Not needed: the orchestrator calls Fuzzy match directly | **Switch off** |
| Preview Section Change | Covered by Draft's Add/Remove display | **Switch off** |
| Log Hard Stop | Draft logs hard stops (keeping both would log them twice) | **Switch off** |
| Request Title Review | The drafter records title requests | **Switch off** |

### Prompts

| Your prompt | In-place v2 role | Action |
|---|---|---|
| JD Section Reviewer | **JD Drafter** (Part 7) | **Edit + rename**: new inputs, instructions and output |
| JD Final Review | **JD Final Check** role (Part 9). The name can stay | **Edit**: new inputs, instructions and output, keeping every v1 key |
| JD Review Router | Not needed (no decision loop) | **Leave unused** (delete after UAT) |

### Flows

| Your flow | In-place v2 role | Action |
|---|---|---|
| Fuzzy match | Finds one job **+ Search mode** (replaces the guide's Find Jobs flow) | **Edit**: add inputs and a Search branch |
| Get JD Details | Full record inside Start and View **+ Reference output** (replaces the guide's Get JD Reference flow) | **Edit**: topics-only, add the reference read |
| Related Levels | Unchanged role | **Check**: topics-only, no restricted fields |
| Save JD Update Request | Unchanged role | **Edit**: add the BusinessJustification input |
| Build Redline Rows · Split Req Pref · Send HR Review Email · Daily CSV | Unchanged | Daily CSV: add the duties cleanup (recommended first) |

### Not changed
Word templates and all 30 Populate mappings · HR email template · libraries · `JD HR Review Mailbox` · the Purpose inline-slot work (still independent).

### New assets (no new topics, flows or prompts)
`JD Expert Reference.txt` · `BusinessJustification` column · the guide's 24 `JD…` globals, plus 2 from fix C (`JDCheckAnswers`, `JDCheckDraft`).

> **Why keep the guide's `JD…` globals instead of reusing `Global.Changes` and friends:** a variable's type is locked when it's created. The guide's formulas expect plain text globals (`JDPropDuties` and so on), while v1's `Changes`, `OriginalJD` and `PendingChecks` are records. Reusing them would mean rewriting the guide's formulas. Globals aren't topics or flows, so this keeps the in-place approach. The v1 globals simply go unused and can be deleted after UAT.

---

## Part 2 — Part-by-part substitutions

Follow the v2 guide in order. Where this table says **"as written"**, do exactly what the guide says.

| Guide part | Do this instead (in place) |
|---|---|
| **1.1** Backup | As written. This is your rollback point, since nothing is duplicated |
| **1.2** Retire old topics | **Only switch off** Find/confirm job, Preview Section Change, Log Hard Stop and Request Title Review (rename them `zOLD - …` and turn them **Off**). **Don't** retire Start JD Update, Save Section Change, Review and Submit JD Update, Cancel or Switch JD Update or Show JD Section: they're edited in later parts. Before editing each one, write down any v1 settings the guide tells you to copy (the RequestedBy value, Get JD Details outputs, the Submitted! message) |
| **1.3–1.5** | As written |
| **2** Find Jobs flow | **Edit Fuzzy match** instead: |
| | 1. Add optional inputs `Mode`, `TitleQuery`, `ContentQuery`, `MaxResults`. **Check the input keys with Peek code**, because the guide's `text` / `text_1` / `number` assume a new flow |
| | 2. At the top, add a **Condition**: `Mode` is equal to `search` |
| | 3. **Yes branch:** guide steps 2.3–2.10, then a **Respond to the agent** with `Total`, `Shown`, `Results` |
| | 4. **No branch:** the existing match actions (drag them in), ending with the existing Respond |
| | 5. Every Respond in a flow must declare the **same outputs**. Add `Total`/`Shown`/`Results` to the existing Respond with empty values, and the match outputs to the new one with empty values |
| | 6. **Tool description:** combine the guide's Fuzzy match and Find Jobs descriptions, plus: "Set Mode to 'search' for lists, counts or content searches; leave it blank to find one job by name" |
| | **⚠ Trade-off:** one tool with a mode routes slightly less reliably than two separately described tools. If T1/T2 keep choosing the wrong path in testing, splitting Search into its own flow is the one place I'd break the no-new-flows rule |
| **3** Get Job flow | **Edit Show JD Section → "View Job Description"** instead: |
| | 1. Rename. Trigger description = the guide's Get Job description (12.2) |
| | 2. Inputs: `JobCode` (User's entire response, prompt Off) and `SectionName` (optional: "one of Purpose, Principal Duties, Education, Work Experience, Certifications/Licenses, KSAs, or blank for the whole job") |
| | 3. Delete the old nodes. Add **Get JD Details** (JobCode input) |
| | 4. Add the guard **job not found** (guide 6.7 pattern) |
| | 5. Add six **Set variable** cleanup nodes in Power Fx, one per section. Pattern: `Substitute(Substitute(Substitute(Substitute(<raw>, "<br>", Char(10)), Char(160), " "), Char(9), " "), "•", "- ")`, then trim each line with the cleanup formula from the code-block fix |
| | 6. Build `Topic.Overview` (the guide's 3.5 layout) or just the requested section |
| | 7. **Send a message** with it |
| | 8. Output `JobShown` = the same text, described as "Already displayed; don't repeat it. Use it to answer follow-up questions about this job" |
| | Guide **3.8**: as written, except Get JD Details becomes topics-only **after** View Job Description works |
| **4.1** Get JD Reference | **Edit Get JD Details** instead: |
| | 1. Before its Respond, add a **Scope** containing **Get file content using path** → `JD Expert Reference.txt` |
| | 2. Add output **Reference**, using the guide's 4.1 expression |
| | 3. Set the Respond's **Run after** to include the Scope having **failed**, so a missing file never breaks loading |
| | **Option:** add an input `IncludeReference` (Yes/No) so View Job Description skips the file read |
| **4.2–4.4** | As written. Read Get JD Details' outputs from your current Start JD Update before editing it |
| **5** Globals + Reset topic | **Edit Cancel or Switch JD Update** instead (it becomes Discard in step 11): |
| | 1. In its existing reset block (the clear-state step), **delete the v1 Set nodes**, then add the guide's 24 `JD…` globals set to `""`, plus `JDCheckAnswers` and `JDCheckDraft` (fix C) |
| | 2. Make sure the **Mode = "Reset"** path skips the confirmation and ends silently (it already does in v1) |
| | Wherever the guide says **Go to another topic → Reset JD Update**, use **Go to another topic → Discard JD Update** with **Mode = `"Reset"`** |
| **6** Start JD Update | **Edit the existing topic:** |
| | 1. Delete everything from the canvas except the trigger. That includes the cards, card variables, acknowledgment nodes, v1 resets and the old Get JD Details/Related Levels calls (you re-add them) |
| | 2. Then follow **6.2–6.13** as written, except **6.6 step 1** → redirect to **Discard JD Update** with Mode `"Reset"` |
| | 3. Trigger description: guide 12.2 |
| **7** JD Drafter | **Edit JD Section Reviewer:** |
| | 1. Rename it `JD Drafter` |
| | 2. Delete its six old inputs and add the guide's six |
| | 3. Replace the instructions with 7.3 |
| | 4. Replace the output example with 7.4 |
| | 5. Settings 7.1 (model, temperature) and 7.6 as written |
| | **Note:** fix F changes one input mapping in Part 8 |
| **8** Draft JD Update | **Edit Save Section Change:** |
| | 1. Rename it `Draft JD Update`. Trigger description: guide 12.2 |
| | 2. **Inputs:** delete `SectionName` and `ProposedText`. Add `UpdateRequest` (8.2) |
| | 3. **Outputs:** delete **all** of them (SaveStatus, HardStopMessage, Reminders, TitleReviewSuggested, PendingChecksSummary) |
| | 4. Delete every node, then follow **8.3–8.10**, with **fix B** and **fix E** added (Part 3) |
| **9** JD Final Check | **Edit JD Final Review:** |
| | 1. First, copy its current output JSON and v1 task wording (guide 9.2) |
| | 2. Delete the old inputs and add the eight from 9.1 |
| | 3. Replace the instructions with 9.3, pasting your v1 wording where it says "as in v1" |
| | 4. Output per 9.4 |
| | Keeping the name **JD Final Review** is fine. Rollback is your backup |
| **10** Submit JD Update | **Edit Review and Submit JD Update:** |
| | 1. Note its current **RequestedBy** mapping and **Submitted!** message |
| | 2. Rename it `Submit JD Update`. Trigger description: guide 12.2 |
| | 3. **Inputs:** delete all three. **Outputs:** none (as now) |
| | 4. Delete every node *except* the **Save JD Update Request** flow node, which you'll re-map (refresh it after 10.1) |
| | 5. Follow **10.1–10.15**, with **fix A** and **fix C** added. In 10.13 step 4 and anywhere else that resets, redirect to **Discard JD Update** with Mode `"Reset"` |
| | 6. **10.15:** redirect to **Discard JD Update** with Mode `"Cancel"` |
| **11** Discard JD Update | **Edit Cancel or Switch JD Update:** |
| | 1. Rename it `Discard JD Update`. Trigger description: guide 12.2 |
| | 2. Keep the **Mode** input, with the description: `"Cancel" when the user wants to discard the update. "Reset" is used internally by other topics.` (prompt user Off) |
| | 3. Remove the **Switch** path: Start JD Update's 6.5 guard handles switching now. If you added a NewJob input or SwitchStatus output, delete them |
| | 4. The **Cancel** path: the guide's 11.2 guard → 11.3 confirm → 11.4 branches. The "Yes, discard" branch runs the same reset nodes (or a **Go to step** to them) |
| | 5. The **Reset** path: reset nodes only, no message |
| **12** Instructions etc. | **12.1:** as written (back up your current instructions first). In the instructions text, replace **"Get Job"** with **"View Job Description"** and **"Find Jobs"** with **"Fuzzy match with Mode 'search'"** |
| | **12.2:** paste the descriptions onto the renamed topics and tools |
| | **12.3, 12.4:** as written |
| **13** Tests | As written, plus the fix tests in Part 3 |

---

## Part 3 — Fixes to add on top of the guide

### Fix A: the Submit decision (v2 guide 10.12) — high

**Problem:** synonyms like `submit`, `yes` and `looks good` substring-match longer messages. "What happens after I submit?" would send the request.

1. On the **Ready to send it to HR?** question:
   - **Submit to HR** keeps only these synonyms: `send it`, `send it to HR`, `submit it`, `looks good, send it`. Remove `submit`, `send`, `yes` and `looks good`.
   - **Question behavior** → **Action if no entity found** → **Set variable to empty**; **Reprompt** → **Don't repeat**.
2. Directly **below the question** and **above its condition branches**: **Set a variable value** → `Topic.Decision` → formula (the v1 guard):
   ```powerfx
   If("?" in System.Activity.Text || CountRows(Split(Trim(System.Activity.Text), " ")) > 4, Blank(), Topic.Decision)
   ```
3. In the condition's **All other conditions** branch (a typed reply that isn't a clear choice), the message goes to the drafter, which can revise or answer it:
   - **Topic management** → **Go to another topic** → **Draft JD Update** → **UpdateRequest** = `System.Activity.Text`
   - **End current topic**
4. **Test:** "What happens after I submit?" must **not** submit. "send it" must submit. "yes but drop the KSA change" must go to the drafter.

> **Checking the guard's position:** if Copilot Studio won't let you put a node between the question and its auto-generated branches, delete those branches, add the guard, then add your own **Condition** with three branches: `Topic.Decision = "Submit to HR"`, `"Keep editing"`, `"Cancel update"`, plus All other conditions.

### Fix B: validate the line plan (v2 guide Part 8) — high

**Add after 8.6 (Read the status), before 8.7:**

1. **Set a variable value** → new `Topic.Tries` → formula `0`. Put this **above** the **JD Drafter** node (8.5), so it exists before the loop back.
2. Below 8.6: **Set a variable value** → new `Topic.PlanOK` → formula:
   ```powerfx
   With(
     { d: ParseJSON(Topic.DraftOut.text) },
     CountRows(
       Filter(
         Table(d.changes),
         With(
           {
             sec: Text(ThisRecord.Value.section),
             ks: Filter(ForAll(Table(ThisRecord.Value.lines), Value(ThisRecord.Value.keep)), Value > 0)
           },
           With(
             {
               n: CountRows(Split(Switch(sec,
                    "Purpose", Global.JDOrigPurpose,
                    "Principal Duties", Global.JDOrigDuties,
                    "Education", Global.JDOrigEducation,
                    "Work Experience", Global.JDOrigExperience,
                    "Certifications/Licenses", Global.JDOrigCerts,
                    "KSAs", Global.JDOrigKSAs,
                    "~INVALID~"), "<br>"))
             },
             Not(sec in ["Purpose", "Principal Duties", "Education", "Work Experience", "Certifications/Licenses", "KSAs"]) ||
             CountRows(Filter(ks, Value > n)) > 0 ||
             CountRows(ks) <> CountRows(Distinct(ks, Value))
           )
         )
       )
     ) = 0
   )
   ```
   This flags:
   - a section name that isn't one of the six
   - a `keep` past the section's last line
   - the same `keep` used twice
3. **+** → **Add a condition** → formula: `Topic.Status = "ready" && Not(Topic.PlanOK) && Topic.Tries = 0`
   - **True:**
     - **Set** `Topic.Tries` = `1`
     - **Go to step** → the **JD Drafter** node (8.5). It drafts again with the same request.
4. **Change the 8.9 condition** to:
   ```powerfx
   Topic.Status = "ready" && Topic.PlanOK
   ```
5. In **8.10**, wrap the message so a second bad plan doesn't show a broken draft. Replace the formula's first line, `Text(d.message.intro) &`, with:
   ```powerfx
   If(Topic.Status = "ready" && Not(Topic.PlanOK),
     "I couldn't build that draft cleanly. Could you say the change again, maybe a little differently?",
     Text(d.message.intro) &
   ```
   …and add one closing `)` at the very end of the formula.

> **Why a retry:** occasional numbering slips are normal for a language model. One automatic retry fixes most of them without the manager noticing. The draft in `Global.JDDraft` is only replaced when the plan passes.

### Fix C: don't re-ask questions on re-entry (v2 guide 10.5–10.8) — medium

1. Add two globals in the Discard reset block: `JDCheckAnswers` = `""` and `JDCheckDraft` = `""`.
2. **10.5:** set `Topic.CheckAnswers` = `If(IsBlank(Global.JDCheckAnswers), "(none)", Global.JDCheckAnswers)`.
3. **10.7:** change the condition to:
   ```powerfx
   Not(IsBlank(Topic.CheckQuestions)) && (IsBlank(Global.JDCheckAnswers) || Global.JDCheckDraft <> Global.JDDraft)
   ```
4. Below the **Ask a question** node (still inside 10.7's branch):
   - **Set** `Global.JDCheckAnswers` = `Topic.CheckAnswers`
   - **Set** `Global.JDCheckDraft` = `Global.JDDraft`

The questions are asked again only if the draft changed since they were answered, because new changes can raise new indirect questions.

### Fix D: Job Code in chat — decision (Part 5, #1)

- **Option 1: keep Job Code as the key** (the guide's design). Simplest; all flows already key on it. Only acceptable if HR agrees that Job Code isn't confidential to managers, since the instructions are the only thing keeping it out of chat.
- **Option 2: an opaque key.**
  - Search results use the SharePoint item **ID**: the Select map becomes `concat(Title, ' (ref ', ID, ')')`.
  - View Job Description and Start JD Update take the ID, run **SharePoint – Get item** by ID, read the Job Code from it, and continue as now.
  - Fuzzy match also returns the ID instead of the code.
  - This costs one extra action in each of two flows/topics, and the rule then holds even if the instructions slip.

### Fix E: bullets for sections that start empty (v2 guide 8.9b) — low

In the 8.9b template, replace:
```powerfx
{ bullet: If(StartsWith(Trim(First(orig).Value), "•"), "• ", "") },
```
with:
```powerfx
{ bullet: If(StartsWith(Trim(First(orig).Value), "•") || ("SECTION_NAME" in ["Principal Duties", "KSAs", "Certifications/Licenses"] && IsBlank(Trim(First(orig).Value))), "• ", "") },
```
(Swap `SECTION_NAME` as in the table.) A bulleted section that was empty then gets `• ` on its new lines. If your KSAs or Certifications aren't stored as bullets (A3 check), leave them out of the list.

### Fix F: keep the drafter's input small (v2 guide 8.5) — low

- **RequestHistory** → `Right(Global.JDRequestLog, 3000)`. The draft JSON already carries what's been agreed; the history is only for context.
- Keep `JD Expert Reference.txt` well under the guide's 15,000-character cap. Over time, consider one file section per job family and pass only the job's family.

---

## Part 4 — Build order

Each step leaves a working agent. Steps 1–3 don't touch the update flow, so v1 keeps working while you build them.

| Step | Guide parts | Agent afterwards |
|---|---|---|
| **1. Foundations** | Daily CSV duties cleanup · 1.1 backup · 1.3–1.5 · A1–A8 lookups | v1 |
| **2. Search + viewing** | 2 (Fuzzy match Search mode) · 3 (View Job Description) · 4.1 (Get JD Details + Reference) · 4.2–4.4 | v1 updates **plus** search and safe viewing |
| **3. Drafter, offline** | 7 (edit JD Section Reviewer → JD Drafter). Test in the prompt editor with 10+ real JDs and requests, including revisions and hard stops | v1 still works. Save Section Change's node now shows mapping errors, so don't use updates in this window, or do step 3 just before step 4 |
| **4. Switch over** | 1.2 (switch off 4 topics) · 5 (reset globals in Cancel or Switch) · 6 (Start) · 8 (Draft) + fixes B, E, F · 11 (Discard) | Conversational drafting |
| **5. Submit** | 9 (JD Final Review edits) · 10 (Submit) + fixes A, C | Full v2 |
| **6. Polish** | 12 · 13 · fix tests | Ready for UAT |

**Work in progress:**
- **Purpose inline slots:** carry on. The proposed Purpose still arrives as one full paragraph.
- **Readiness follow-ups:** stop. They live in Review and Submit, which step 5 rebuilds anyway.
- **Start acknowledgment guide:** no longer needed (no cards).

---

## Part 5 — Decisions before you start

1. **Job Code:** is it acceptable for managers to see? (Fix D: option 1 or 2.)
2. **The v2 rule changes** (guide 0.7): justification required · title review requested in conversation (this reverses the October 12 cards-only rule; the safeguards stay) · level drift flagged during drafting · reasons inferred · follow-ups replaced.
3. **Reason categories** for JD Final Check: use your v1 card labels exactly, so the HR email chips and your reporting stay consistent: `Adding/Removing responsibilities`, `Changing reporting relationship/people leadership`, `Editing Qualifications`, `Aligning KSAs`, `Upscales`, `Title`, `Other`. Confirm the full list.
4. **Fuzzy match Search mode vs a separate Find Jobs flow:** the in-place default, and the trade-off in Part 2.
5. **Multi-job requests** ("add this to all UB levels"): out of scope for now?
