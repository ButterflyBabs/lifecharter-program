# LifeCharter Program App · Phased Build Plan

**Status:** plan approved in principle 2026-09-27 · no code written yet · updated as we go

**Goal:** enrollment opens at the LifeCharter Incubator, **Thursday Nov 12, 2026, 5pm MT**, on **lifecharter.life**.

---

## Decisions made

- **Standalone app** on lifecharter.life, in its own codebase, in the LifeCharter brand (not inside the Collective).
- **One login** shared with the LifeCharter Collective, and with Command Suite when graduates go on to enroll there. Same email and password everywhere; program access, Collective channels and Command Suite access are all granted to that one account.
- **One dimension per week**, 13 weeks: Orientation, the Cocoon, the Vessel, the Circle, the Flight, and Wings Out.
- **The four elements are renamed:** My Truth, My Horizon, My Why, My Flight Plan. Each week follows the seven movements.
- **Each lesson in the app has** the video, the transcript, the handout and workbook pages, and resources.
- **Members build their own LifeCharter**, one chapter per week, and sign it in Week 12.
- **Pricing (decided 2026-09-27):** all three levels are shown on the enrollment page, but only **Guided** can be bought at launch, with **50 Founding Seats**.

| Level | What's included | Price | At launch |
|---|---|---|---|
| Self-Guided | App, videos, handouts, Collective channel, Gathering replays | $397 | Shown · "Opens after the founding group" · notify me |
| **Guided** (main offer) | + live Weekly Gatherings, text and email support | $997 regular · **founding $797, or 3 payments of $297** | **Open · 50 Founding Seats** |
| Private | + four 1:1 sessions with Babs, and a personal Charter Signing | $2,500 | Shown · "Opens after the founding group" · notify me |

- **Founding offer (confirmed 2026-09-27):** $797 paid in full, or 3 payments of $297. The founding price closes **Sun Nov 15, 5pm MT** for the November Incubator, and **Sun Dec 13, 5pm MT** for the December Incubator. After each deadline, Guided returns to $997 until the next Incubator opens its founding window.
- **The next Incubator stays private until after the current one (confirmed 2026-09-27).** The public never sees the December date early. The enrollment page only ever shows the current founding deadline ("Founding price ends Sun Nov 15"). After Nov 12, the Incubator landing and registration pages switch to the December date. At the December Incubator, the founding window opens again until Dec 13.
- **Each Incubator starts its own class (confirmed 2026-09-27).** November Incubator enrollees begin **Mon Nov 23, 2026** with Orientation. December Incubator enrollees begin **Mon Dec 21, 2026**.
- **New weeks open every Sunday** (confirmed 2026-09-27). November class: Week 1 opens Sun Nov 29, and Week 12 (Charter Signing) opens **Sun Feb 14, 2027**. December class: Week 1 opens Sun Dec 27, and Week 12 opens **Sun Mar 14, 2027**. Members can go back to earlier weeks any time to catch up.
- **No holiday breaks.** Classes run straight through; members can catch up if they need to.
- **Classes overlap, by design.** With monthly Incubators in 2027, several classes will be running at once, each on its own week.
- **One Weekly LifeCharter Gathering for all classes: Tuesdays at 6pm MT** (confirmed 2026-09-27). Everyone meets together, whatever week they're on. It purposely shares the SOUL Sessions slot (third Tuesday, 6pm MT). When a class reaches Week 12, its Charter Signing happens during that week's Gathering.
- **Founding Seats are shared (confirmed 2026-09-27):** 50 seats in total across the November and December Incubators. Seats sold in November count against the same 50.
- **Weekly Gathering replays (added 2026-09-27):** every Gathering is recorded and appears as a replay in the app's Gatherings page for all classes, newest first, with the date and a short summary. It's also posted to the Replays pathway in the Collective's LifeCharter Program channel.
- **Video (decided 2026-09-27, set up later):** Gatherings run on **Zoom**; lesson videos and replays are hosted on **Vimeo**. Zoom cloud recordings import into a Vimeo "Gathering Replays" folder, and the app picks them up. Babs creates the Vimeo token herself. Parked on the brand & offer punch list (t19); needed before the November class begins Nov 23.

## What we're building on

- **Hosting:** Vercel (team amilynne-carrolls-projects). Code: GitHub (ButterflyBabs).
- **Accounts and data:** Supabase, the same account system as the Collective and Command Suite, with the program's own tables.
- **Payments:** Stripe. Checkout creates the member's program access.
- **Email:** Resend, sending from lifecharter.life.
- **CRM:** Global Control, connected once Nicely sends the API docs.
- **Video:** Vimeo (lessons and replays), with Zoom for the live Gatherings. Set-up is parked on the punch list.

## What members get at launch

- An enrollment page on lifecharter.life showing all three levels, a live **Founding Seats remaining** counter (out of 50), and checkout for Guided only. The other two levels show "Opens after the founding group" and collect notify-me sign-ups.
- A home screen with the 13-week path; each week opens on schedule
- Lesson pages: video · transcript · handout PDF · resources
- **Digital Charter pages** that save as they type: ratings, belief sorter, My Truth, My Horizon, My Why, My Flight Plan, next right movement, Soul Challenge log
- **My LifeCharter**, where each finished chapter collects week by week
- Weekly email reminders, plus the Gathering schedule and link
- **Gathering replays** for every Weekly Gathering
- A link into the LifeCharter Collective
- Admin for Babs: members, progress, and content

## Phases

### Phase 0 · Set-up · Sep 28 – Oct 3
- All Phase 0 decisions made ✓ (Vimeo set-up parked on the punch list) for the first group (and holiday break?); video host
- New GitHub repo and Vercel project
- Program tables in the shared account system; lifecharter.life added to the sign-in allowlist
- Stripe products: Guided (founding pay-in-full, founding 3-payment plan, regular price); Self-Guided and Private created but not yet sold

### Phase 1 · Member app · Oct 4 – 17
- Sign-in with the shared login
- Classes: each member belongs to a class (e.g. November 2026) with its own start date; Orientation opens on the start date and each new week opens on Sunday; members can always go back to earlier weeks
- Home screen with the 13-week path and weekly unlocking
- Lesson pages with all four tabs
- Charter pages for Weeks 0–1, saving as members type

### Phase 2 · Enrollment · Oct 18 – 31
- Enrollment page on lifecharter.life
- Checkout creates the account and program access; welcome emails
- Founding seat cap: one shared count of 50 across both Incubators; checkout closes automatically at 50 seats, and the page switches to a waitlist
- Founding windows: set in admin, one per Incubator (opens at the Incubator, closes at its deadline). The page shows only the current window's deadline, never a future Incubator, and shows $997 between windows
- The 3-payment plan stops automatically after the third payment
- Notify-me list for Self-Guided and Private
- One Gatherings calendar for all classes, with the link; a Charter Signing marker when a class reaches Week 12
- Gathering replays: each recording appears in the app automatically (from the video host's Replays folder) and is posted to the Collective's Replays pathway
- Admin view
- Charter pages for all 13 weeks

### Phase 3 · Content & testing · Nov 1 – 9
- Orientation and Week 1 videos uploaded (Babs records by about **Nov 15**)
- Babs's own words filled into the scripts
- Test enrollments from start to finish
- Phone and accessibility checks

### Phase 4 · Go live · Nov 10 – 22
- lifecharter.life switched from its redirect to the app
- Babs makes one real payment to confirm checkout
- Enrollment opens at the Incubator, Thu Nov 12
- Founding price closes Sun Nov 15
- November class begins Mon Nov 23: Orientation opens (Week 1 opens Sun Nov 29)

### During the first group · weekly
- Each week's video uploaded one week before it opens
- Printable Charter PDF and on-screen Charter Signing ready before Week 12
- Yearly Charter Renewal reminders
- Phone install

## What only Babs can do

1. **Decide:** ~~price and payment plan~~ (decided: three levels, Guided founding offer) · ~~confirm the founding price and deadline~~ (done) · ~~start date~~ (Nov 23 / Dec 21; weeks open Sundays; no holiday breaks) · ~~Gathering~~ (Tuesdays 6pm MT) · ~~video host~~ (Vimeo + Zoom; set-up parked)
2. **Review** the 13 scripts and handouts, and fill in the places marked for your words
3. **Record** Orientation and Week 1 by about Nov 15, then each week at least a week before it opens

## Notes

- The shared account system also serves the Command Shift app. We'll add lifecharter.life to its sign-in settings without changing anything that app relies on.
- One login means the same email and password on every site. Because the sites live on different web addresses, members sign in once on each site. They never need a second account.
- The Command Suite checkout doesn't accept the $500 alumni code (LCALUMNI500) yet. That fix is on the brand & offer punch list, and it needs to be done before the first graduation.
- **Gathering format:** because one Gathering serves every class, it's built around the seven movements and Soul Challenge shares, so it works whatever dimension each person is on. Each class's Charter Signing takes place in its Week 12 Gathering.
