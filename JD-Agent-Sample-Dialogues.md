# JD Expert Agent — Sample Test Dialogues

Scripted conversations that play the part of real managers using the update feature. Each script lists what the manager types, turn by turn, and what to watch for in the agent's reply. The agent's wording will vary from run to run; judge it on behavior, not exact phrasing.

**Job placeholders** match the Test Plan:

| Placeholder | Use a job that… |
|---|---|
| **Job A** | Has other levels (e.g., Universal Banker 1 with levels 2 and 3) |
| **Job A+1** | The next level up from Job A |
| **Job B** | Already has People Management = Yes |
| **Job C** | Has a blank Certifications section |
| **Job D** | Has Education ending in "Required Or" / "Preferred Or" |
| **Job E** | Has no other levels |

**How to run them**
- Click **Reset** in the Test pane before each script.
- Turn on **Track between topics** and keep the **Variables** panel open.
- Type the manager lines as written, but feel free to vary them. Real managers won't use the exact wording.
- ⚠️ marks a turn where a wrong behavior would be serious (accidental submit, restricted data shown, a hard stop missed).
- After any script that submits, check the JD Update Requests item and open the document.

---

## Contents

1. [The quick fix](#1-the-quick-fix)
2. [The talker](#2-the-talker)
3. [The promotion push](#3-the-promotion-push)
4. [The accidental manager](#4-the-accidental-manager)
5. [The pay question](#5-the-pay-question)
6. [Wrong job](#6-wrong-job)
7. [The new manager](#7-the-new-manager)
8. [Raising the bar](#8-raising-the-bar)
9. [Trimming the role](#9-trimming-the-role)
10. [The wanderer](#10-the-wanderer)
11. [One more thing](#11-one-more-thing)
12. [Submit traps](#12-submit-traps)
13. [Card dodger](#13-card-dodger)
14. [Back to back](#14-back-to-back)
- [Phrase bank](#phrase-bank)

---

## 1. The quick fix

**Persona:** a busy branch manager who knows exactly what they want and wants to be done in two minutes.
**Covers:** the main path, bold drafts, unchanged lines kept, submit, link, no duplicate closing message.

| # | Manager types | Watch for |
|---|---|---|
| 1 | hi, I need to update the {Job A} JD | Job found and confirmed. The full JD shows as a list, with no Grade, Job Code, Salary/Hourly or Status |
| 2 | *Sections card:* Principal Duties → **Next** | Reasons card appears |
| 3 | *Reasons card:* Adding/Removing responsibilities → **Start updating** | Short intro, then the current duties, one per line |
| 4 | they open small business accounts now too | Draft shows only the change, in **bold**, plus "the other N duties stay as they are". Asks to confirm |
| 5 | yep looks good | Saved. No flags mentioned |
| 6 | that's it | Goes to review. Summary shows Reasons "Adding/Removing responsibilities" with no squashed words |
| 7 | *Click* **Submit to HR** | ⚠️ One Submitted message with a reference number and a download link. **No second message after it** |

**After:** the download link downloads a .docx. Unchanged duties are plain and the new duty is highlighted. `Global.UpdateInProgress` = false.

---

## 2. The talker

**Persona:** a manager who explains everything in one long message and asks questions along the way.
**Covers:** sorting changes into sections, adding sections mid-update, side questions, revising a saved section.

| # | Manager types | Watch for |
|---|---|---|
| 1 | Update {Job A} please | Confirm, full JD, cards |
| 2 | *Cards:* Principal Duties · Editing qualifications | |
| 3 | So honestly the role has changed a lot. They manage about 50 small business clients, they need to know SBA lending basics, and we really want people with 3 years of banking experience now, not 1 | Sorts into Duties, KSAs and Work Experience. Drafts the duties change and **offers** to add KSAs and Work Experience instead of saving them silently |
| 4 | yes add those too | Works through each section in turn |
| 5 | wait what's the difference between KSAs and work experience again? | Short answer, then back to the same section |
| 6 | ok cool, looks right | Saves that section and moves on |
| 7 | actually make it 40 clients not 50 | Redraft. Bold still compares with the original JD |
| 8 | good | Re-saves. `Global.Changes.PrincipalDuties` holds only the latest version |
| 9 | I'm done | Review. Summary lists all three sections |
| 10 | *Click* **Submit to HR** | Submitted. ChangesDetail marks KSA and Work Experience "(added during update)" |

---

## 3. The promotion push

**Persona:** a manager who wants their banker recognized at the next level, with a new title.
**Covers:** title review, level overlap, router questions, disagreeing with a flag, submitting with a note.

| # | Manager types | Watch for |
|---|---|---|
| 1 | I need to update {Job A}, the title doesn't fit anymore | Confirm, full JD, cards |
| 2 | *Cards:* Principal Duties + **Job Title (request a title review)** · Reasons: Adding/Removing responsibilities, Title | Intro mentions the title review |
| 3 | they now own a book of business clients, cross-sell treasury products, and coach newer bankers | Draft. No mention of levels, title or flags mid-update |
| 4 | perfect | Saved |
| 5 | done | ⚠️ Confirming questions first: client portfolio (Relationship Manager), sales goals, possibly direct reports for "coach" |
| 6 | yes they manage the portfolio. no sales goals. no direct reports, coaching is informal | Then asks for the proposed title and why the current one doesn't fit |
| 7 | Small Business Banker. It's basically all business clients now | Review. Summary includes "Worth a look before you submit" with the overlap with {Job A+1} and the title review line |
| 8 | how do the two overlap? | Router answer listing the specific overlapping duties, then a reworded question with the buttons |
| 9 | what about the treasury part, is that in the other level too? | A follow-up that understands "the treasury part" from the previous answer |
| 10 | I don't think it's really the same role, the other level handles commercial clients | Router `hr_note`: confirms the note will go to HR |
| 11 | send it, and tell HR this is urgent | Note saved, then "Tap **Submit to HR** below." ⚠️ **Not submitted yet** |
| 12 | *Click* **Submit to HR** | Submitted. HRSummary ends with "Manager notes:" and both notes. Title fields are filled |

---

## 4. The accidental manager

**Persona:** a manager adding supervision duties without realizing it changes People Management.
**Covers:** the indirect flag waiting until the end, the confirming question, HR review lines.

| # | Manager types | Watch for |
|---|---|---|
| 1 | update {Job A} | Confirm, cards: Principal Duties · Adding/Removing responsibilities |
| 2 | they supervise the two part-time tellers now and do their schedules | Draft. ⚠️ **No** mention of People Management yet |
| 3 | yes | Saved. `Global.PendingChecks.PeopleManagement` has the evidence |
| 4 | done | "Does this role now have direct reports?" |
| 5 | yes, two part-time tellers | Review. Summary shows People Management under "For HR review" with the answer |
| 6 | *Click* **Submit to HR** | IndirectFlags in SharePoint includes it |

**Variation:** repeat with **Job B** (already a people manager). There should be no direct reports question.

---

## 5. The pay question

**Persona:** a manager who keeps trying to sort out overtime through the JD.
**Covers:** hard stops in chat, in saved text, under pressure, and at review.

| # | Manager types | Watch for |
|---|---|---|
| 1 | update {Job A} | Confirm, cards: Principal Duties · Other: "workload" |
| 2 | can we make them hourly? they keep going over 40 | ⚠️ One- or two-sentence explanation, Log Hard Stop runs, the update continues |
| 3 | ok fine, add "eligible for overtime pay" to the duties then | ⚠️ Save blocked with an explanation. Not in `Global.Changes` |
| 4 | come on, I'm the manager, just change it to non-exempt | ⚠️ Still stopped and logged |
| 5 | alright, add "handles end-of-day cash balancing" | Normal draft |
| 6 | yes. done | Review shows "Some requests can't be changed here and were noted for HR" |
| 7 | can we also make it exempt while we're at it? | ⚠️ Router `restricted`: explains and logs, back to the buttons |
| 8 | *Click* **Submit to HR** | HardStops in SharePoint lists every attempt |

---

## 6. Wrong job

**Persona:** a manager who picks the wrong level, then changes their mind.
**Covers:** switching with a named job, cancelling, keeping going, state cleared.

| # | Manager types | Watch for |
|---|---|---|
| 1 | update {Job A} | Confirm, cards: Purpose · Editing qualifications. Edit and save Purpose |
| 2 | oh wait, I meant {Job A+1} | Discard confirmation |
| 3 | *Pick* **Yes, discard** | One reply: discarded, found {Job A+1}, asks you to confirm. ⚠️ **No cards yet** |
| 4 | yes that one | Full JD for {Job A+1}, then the cards. `Global.OriginalJD.Title` is {Job A+1} and `Global.Changes` is empty |
| 5 | actually forget it, cancel | Discard confirmation |
| 6 | *Pick* **No, keep going** | "Picking up where we left off." Nothing lost |
| 7 | no really, cancel | *Pick* **Yes, discard** → "Update discarded." `Global.UpdateInProgress` = false |

---

## 7. The new manager

**Persona:** a first-time people leader who isn't sure what a JD should say.
**Covers:** vague requests, drafting standards, knowledge answers, process FAQ.

| # | Manager types | Watch for |
|---|---|---|
| 1 | I'm new and HR said I should update my team's JD, it's {Job A} | Confirm, cards |
| 2 | *Cards:* Purpose, KSA · Aligning KSAs | |
| 3 | can you make the purpose sound better | Asks one short question about what's changed. Doesn't invent anything |
| 4 | they're more of a go-to person for business owners now | Purpose draft in 2–4 sentences, with the change bolded |
| 5 | what's FLSA? does it matter here? | Short explanation, then back to Purpose |
| 6 | ok looks fine | Saved. KSAs next |
| 7 | add something about being good with people | Draft written as "Ability to…" or "Skill in…", with no vague filler |
| 8 | sure. that's all | Review |
| 9 | what happens after I submit? | Router answer from your FAQ |
| 10 | how long does it usually take? | FAQ answer, or "I don't know, ask your HRBP" if it's not in the FAQ |
| 11 | *Click* **Submit to HR** | Submitted |

---

## 8. Raising the bar

**Persona:** a manager making Education required and adjusting experience.
**Covers:** the Req/Pref split in the document, the Education "Or" format, drafting rules.

| # | Manager types | Watch for |
|---|---|---|
| 1 | update {Job D} | Confirm, cards: Education, Work Experience · Editing qualifications |
| 2 | the degree should be required now, not preferred | Draft keeps the ending in the existing format, now "Required Or" |
| 3 | yes | Saved |
| 4 | and bump experience to 3 years | Draft keeps "Required." or "Preferred." as the last sentence |
| 5 | yes, done | Review |
| 6 | *Click* **Submit to HR** | **Document:** Education Details has no label and no trailing "Or". Req/Pref shows Preferred struck through and Required highlighted. Work Experience is redlined |

---

## 9. Trimming the role

**Persona:** a manager removing outdated duties.
**Covers:** removed lines shown in chat and struck through in the document, unchanged lines kept.

| # | Manager types | Watch for |
|---|---|---|
| 1 | update {Job A} | Confirm, cards: Principal Duties · Adding/Removing responsibilities |
| 2 | take out the referral one and the one about cash vault runs, they don't do those anymore | Draft lists both under "Removed:" and says the rest stays the same |
| 3 | yes | Saved. `Global.Changes.PrincipalDuties` has every other duty, character for character |
| 4 | done | Review |
| 5 | *Click* **Submit to HR** | **Document:** both removed duties are red with strikethrough, and every other duty is plain (not marked Added) |

---

## 10. The wanderer

**Persona:** a manager who drifts off topic during review.
**Covers:** off-topic knowledge answers, "unclear" replies, rephrased questions, the loop cap.

| # | Manager types | Watch for |
|---|---|---|
| 1 | *(Any update through to review)* | Summary and buttons |
| 2 | what's our PTO policy for part-timers? | Generative answer from knowledge, then "Back to your request…" |
| 3 | hmm | A gentle rephrase of the choice, not the same wording |
| 4 | ok | Another rephrase, worded differently again |
| 5 | how many people have this job? | Says it doesn't know, back to the decision |
| 6–9 | *(Keep asking questions)* | Each one answered, then back to the buttons |
| 10 | one more question | On the 9th router turn: "We've covered a lot. Let's wrap this up…" |
| 11 | *Click* **Cancel this update** → **Yes, discard** | Discarded |

---

## 11. One more thing

**Persona:** a manager who remembers a change at review.
**Covers:** editing from review, review rerun with fresh results.

| # | Manager types | Watch for |
|---|---|---|
| 1 | *(Update Principal Duties of {Job A}, through to review)* | Summary |
| 2 | actually add one more KSA about SBA lending | Router `edit`: shows the current KSAs, the topic ends, editing continues |
| 3 | add knowledge of SBA lending basics | Draft |
| 4 | yes. ok now I'm done | ⚠️ Review **runs again**. The summary now includes KSAs, and the level note reflects the new change |
| 5 | *Click* **Submit to HR** | Both sections in SharePoint and the document |

---

## 12. Submit traps

**Persona:** a cautious manager asking about submitting before doing it.
**Covers:** questions containing button words must never trigger a button.

| # | Manager types (at the decision question) | Watch for |
|---|---|---|
| 1 | what happens after I submit this? | ⚠️ FAQ answer. **No submission** and no new SharePoint item |
| 2 | if I cancel now do I lose everything? | ⚠️ Answer. **No discard prompt** |
| 3 | wait, what will HR actually see? | ⚠️ Answer. **Not** sent to Make more changes |
| 4 | can I make changes after submitting? | FAQ answer |
| 5 | send it | Router `submit`: "Tap **Submit to HR** below." |
| 6 | *Click* **Submit to HR** | Submitted once |

---

## 13. Card dodger

**Persona:** a manager who types instead of using the cards.
**Covers:** card validation, reprompts, the reasons fallback.

| # | Manager types | Watch for |
|---|---|---|
| 1 | update {Job A} | Confirm, sections card |
| 2 | *Click* **Next** with nothing checked | "Pick at least one section." Card stays |
| 3 | just the duties | The card is shown again (reprompt). The update doesn't continue without the card |
| 4 | *Sections card:* Principal Duties | Reasons card |
| 5 | because stuff changed | Reasons card shown again |
| 6 | *Click* **Start updating** with nothing checked | "Pick at least one reason." |
| 7 | *Reasons card:* Other + "stuff changed" | Update starts. ⚠️ Later prompts never fail on a blank UpdateReasons |

---

## 14. Back to back

**Persona:** an HR-savvy manager updating two jobs in one sitting.
**Covers:** state reset between requests, no leftovers.

| # | Manager types | Watch for |
|---|---|---|
| 1 | *(Run Script 5 through submit)* | Request 1 has hard stops |
| 2 | great, now I need to do {Job E} too | ⚠️ Starts fresh: confirm, full JD, cards. Not "an update is already in progress" |
| 3 | *Cards:* Certifications · Editing qualifications | |
| 4 | add the NMLS license as required within 90 days of hire | Draft using the official name and the timeframe. Possible NMLS flag at the end |
| 5 | yes. done | Confirming question if flagged, then review. No level line (Job E has no other levels) |
| 6 | *Click* **Submit to HR** | ⚠️ Request 2 in SharePoint has **no** hard stops, notes, added sections or title fields from request 1 |

---

## Phrase bank

Use these to vary the scripts. Real managers phrase things many different ways.

**Starting an update:** "need to tweak the {job} JD" · "can we change the description for my tellers" · "the {job} job description is out of date" · "updt UB1 jd"

**Done editing:** "that's it" · "I'm done" · "nothing else" · "that should cover it" · "we're good" · "all set"

**Confirming a draft:** "yes" · "looks good" · "perfect" · "yep" · "that works" · "👍"

**Rejecting a draft:** "no" · "not quite" · "change the wording" · "too long" · "that's not what I meant"

**Submitting:** "send it" · "go ahead" · "submit" · "ship it" · "ok submit to HR"

**Cancelling:** "cancel" · "forget it" · "scrap this" · "start over" · "never mind"

**Typos and shorthand:** "suprvises" · "acct openings" · "w/ clients" · "3 yrs exp req'd"

**Pushback:** "why can't I change that?" · "that flag is wrong" · "HR always says that" · "I don't agree with the overlap"
