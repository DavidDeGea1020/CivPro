# Start Update Acknowledgment: Build Guide

**Builds on:** the **Start JD Update** topic (JD-Update-Feature-Build-Guide)
**Goal:** when a manager agrees to start an update and says what they want ("Yes, I want to update the purpose"), the agent acknowledges it before showing the two cards and tells them exactly what to select:

> **User:** Yes I want to update the purpose
> **Agent:** Got it. To get started on that, select **Purpose** on the card below, then tell me why you're making the change on the next card.
> *[Sections card]*

If they don't name a section ("Yes"), they get a general version:

> **Agent:** Let's get started. Select the sections you want to change on the card below, then tell me why on the next one.

**What doesn't change:** both cards, their outputs, and everything after them. Users still select their sections on the card every time. The message only tells them what to pick.

**Time:** about 15 minutes.

---

## Contents

0. [How it works](#part-0--how-it-works)
1. [Check your card labels](#part-1--check-your-card-labels)
2. [Add the message nodes](#part-2--add-the-message-nodes)
3. [Stop the orchestrator adding its own message](#part-3--stop-the-orchestrator-adding-its-own-message)
4. [Test](#part-4--test)
- [Appendix A — Changing the keywords](#appendix-a--changing-the-keywords)
- [Appendix B — Troubleshooting](#appendix-b--troubleshooting)

---

## Part 0 — How it works

```
Start JD Update
  ... (existing: find the job, show the JD)
  NEW  Said         = the user's message, in lowercase
  NEW  Mentioned    = sections whose keywords appear in it
  NEW  StartMessage = "Got it. To get started on that, select **Purpose**…"
                      (or the general message if nothing matched)
  NEW  Send a message: {StartMessage}
  ... (existing: Sections card → Reasons card → …)
```

The sections are matched with keywords in Power Fx, not AI. That makes the message instant, the same every time, and free of extra AI credits.

**Keywords used:**

| Section | Matches when the message contains |
|---|---|
| Purpose | "purpose" |
| Principal Duties | "dut" (duty, duties) or "responsib" (responsibility, responsibilities) |
| Education | "educat" (education, educational) or "degree" |
| Work Experience | "work experience" or "years of experience" |
| Certifications/Licenses | "certif" (certification, certificate) or "licens" (license, licensing) |
| KSAs | "ksa", "skill", "knowledge" or "abilit" (ability, abilities) |
| Job Title | "job title", "the title" or "retitle" |

> **Why Work Experience and Job Title are narrow:** "experience" alone would match "client experience" in a Purpose edit. "title" alone would match messages that just name the job. The narrower phrases avoid those false matches.

---

## Part 1 — Check your card labels

The message tells users which option to click, so the names it uses must match the labels on your **sections card**.

1. In Copilot Studio, open the **Job Description Expert** agent → **Topics** → **Start JD Update**.
2. Click the **sections adaptive card** node → open the card editor.
3. In the card's `Input.ChoiceSet`, read the **title** of each choice (the text users see, not the `value`).
4. Fill in the right column:

| Section | Label on your card |
|---|---|
| Purpose | `__________` |
| Principal Duties | `__________` |
| Education | `__________` |
| Work Experience | `__________` |
| Certifications/Licenses | `__________` |
| KSAs | `__________` |
| Job Title | `__________` |

5. Close the card editor **without changing anything**.

If a label differs from the left column (e.g. your card says "Knowledge, Skills and Abilities" instead of "KSAs"), use your label as the **Name** in Part 2.2.

---

## Part 2 — Add the message nodes

All four nodes go in **Start JD Update**, **directly above the sections card**, below the node that shows the JD.

### 2.1 Save what the user said
1. Hover just above the sections card node → click **+** → **Variable management** → **Set a variable value**.
2. **Set variable** → **Create a new variable** → name it `Said` → usage **Topic**.
3. **To value** → **…** → **Formula** → paste:
   ```powerfx
   Lower(System.Activity.Text)
   ```
4. **Insert**.

> `System.Activity.Text` is the message that started this turn, e.g. "Yes I want to update the purpose". `Lower()` makes matching case-insensitive.

### 2.2 Find the sections they mentioned
1. Below **Said**: **+** → **Set a variable value** → **Create a new variable** → `Mentioned` → **Topic**.
2. **To value** → **Formula** → paste:
   ```powerfx
   Filter(
     Table(
       {Name: "Purpose",                 Hit: "purpose" in Topic.Said},
       {Name: "Principal Duties",        Hit: "dut" in Topic.Said || "responsib" in Topic.Said},
       {Name: "Education",               Hit: "educat" in Topic.Said || "degree" in Topic.Said},
       {Name: "Work Experience",         Hit: "work experience" in Topic.Said || "years of experience" in Topic.Said},
       {Name: "Certifications/Licenses", Hit: "certif" in Topic.Said || "licens" in Topic.Said},
       {Name: "KSAs",                    Hit: "ksa" in Topic.Said || "skill" in Topic.Said || "knowledge" in Topic.Said || "abilit" in Topic.Said},
       {Name: "Job Title",               Hit: "job title" in Topic.Said || "the title" in Topic.Said || "retitle" in Topic.Said}
     ),
     Hit
   )
   ```
3. Change any **Name** to match your card labels from Part 1.
4. **Insert**.

> The result is a small table of the sections mentioned, in card order. Nothing mentioned means an empty table.

### 2.3 Build the message
1. Below **Mentioned**: **+** → **Set a variable value** → **Create a new variable** → `StartMessage` → **Topic**.
2. **To value** → **Formula** → paste:
   ```powerfx
   With(
     {c: CountRows(Topic.Mentioned)},
     If(
       c = 0,
       "Let's get started. Select the sections you want to change on the card below, then tell me why on the next one.",
       "Got it. To get started on that, select " &
         If(
           c = 1,
           "**" & First(Topic.Mentioned).Name & "**",
           "**" & Concat(FirstN(Topic.Mentioned, c - 1), Name, "**, **") & "** and **" & Last(Topic.Mentioned).Name & "**"
         ) &
         " on the card below, then tell me why you're making the change on the next card."
     )
   )
   ```
3. **Insert**.

**How the names are joined:**

| Mentioned | Shows |
|---|---|
| 1 | **Purpose** |
| 2 | **Principal Duties** and **KSAs** |
| 3+ | **Purpose**, **Education** and **Certifications/Licenses** |

### 2.4 Send it
1. Below **StartMessage**: **+** → **Send a message**.
2. Click in the message box → **{x}** (Insert variable) → **Topic** → `StartMessage`.
3. **Save** the topic.

**Check the order:**
```
... show the JD
Set variable: Said
Set variable: Mentioned
Set variable: StartMessage
Send a message: {Topic.StartMessage}
Sections card
Reasons card
...
```

---

## Part 3 — Stop the orchestrator adding its own message

Without this, the agent may say something like "Sure! Let's update the purpose." before the topic's message, so the user reads two intros.

1. In the agent, go to **Overview** → **Instructions** → **Edit**.
2. Add this line, near your other JD update rules:
   ```
   When starting a JD update, don't add your own message before the Start JD Update topic. The topic explains the next step to the user.
   ```
3. **Save**.

> Instructions are limited to about 8,000 characters. If you're near the limit, shorten another line rather than skipping this one.

---

## Part 4 — Test

Use the test pane. For each row, find a job, agree to start the update with the message shown, and check what appears before the sections card.

| # | User says when starting | Expected message |
|---|---|---|
| 1 | `Yes` | Let's get started. Select the sections you want to change on the card below, then tell me why on the next one. |
| 2 | `Yes I want to update the purpose` | Got it. To get started on that, select **Purpose** on the card below, then tell me why you're making the change on the next card. |
| 3 | `I need to change the duties and the KSAs` | …select **Principal Duties** and **KSAs** on the card below… |
| 4 | `Update purpose, education and certifications` | …select **Purpose**, **Education** and **Certifications/Licenses** on the card below… |
| 5 | `Update the purpose to mention client experience` | …select **Purpose**… (not Work Experience) |
| 6 | `The degree requirement is outdated` | …select **Education**… |
| 7 | `Can we retitle this role?` | …select **Job Title**… |
| 8 | `Update Universal Banker 1` | The general message (naming the job matches no section) |

**Also check:**
- Only **one** intro message appears before the card (Part 3).
- The card works exactly as before, and nothing is pre-selected.
- The rest of the update (reasons card, section editing, review) is unchanged.

---

## Appendix A — Changing the keywords

To add a keyword, add `|| "word" in Topic.Said` to that section's **Hit**. For example, to also match "summary" for Purpose:

```powerfx
{Name: "Purpose", Hit: "purpose" in Topic.Said || "summary" in Topic.Said},
```

**Tips**
- Use the shortest part of a word that's still unambiguous: `"responsib"` catches responsibility and responsibilities.
- Avoid very short or common words ("work", "role", "job"), which appear in most messages.
- Lowercase only. `Topic.Said` is already lowercase.
- To change the wording of the message, edit only the text inside the quotes in 2.3. Keep the `**` around the section names so they show in bold.

---

## Appendix B — Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Always the general message, even when a section is named | `System.Activity.Text` holds a different message, e.g. the topic starts several turns after the user named the section | Check in the test pane: add a temporary **Send a message** with `{Topic.Said}` above StartMessage to see what it holds. Tell me how the conversation reaches Start JD Update |
| Wrong section named | A keyword matches unintentionally | Narrow that section's keyword (Appendix A) |
| Section name doesn't match the card | Name differs from the card label | Update the **Name** in 2.2 to the exact card label |
| Two intro messages | The orchestrator is adding its own | Part 3. If it continues, make the instruction stronger: "Never write a message before Start JD Update runs." |
| `Name isn't recognized` in StartMessage | **Mentioned** was created with a different shape | Delete the Mentioned variable, recreate it (2.2), then re-paste 2.3 |
| Message shows `**` instead of bold | The channel doesn't render markdown | Remove the `**` in 2.3 |
| Error when the topic runs after a switch-job | `System.Activity.Text` is blank on a redirect | Wrap 2.1 as `Lower(Coalesce(System.Activity.Text, ""))` |
