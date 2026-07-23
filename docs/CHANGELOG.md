# PPS App — Change Log

All changes are grouped by work session. Research-integrity notes call out anything
that affects collected data; those items require Randy's sign-off before being used
to collect real participant data.

---

## 2026-07-23 — Phase C: video affective-response task; dashboard sees live progress

⚠️ **Measurement change — needs Randy's sign-off before live collection.** The
situational scenario task added in Phase B is replaced by a video task. The construct
is related (emotion intensity + confidence, for three targets) but the item is a film
clip instead of a written situation and the scale is **1–100 instead of 1–7**, so
these ratings are not directly comparable to Phase B data.

### 1. Video affective-response task (replaces the scenario task)

- **New files:** `src/video-task/videos.ts`, `StimulusPlayer.tsx`, `VideoWatchPage.tsx`,
  `VideoRatingPage.tsx`, `VideoSelectionPage.tsx`, `VideoTaskMain.tsx`,
  `videos.test.ts`.
- **Edited:** `src/classification-task/ClassificationTaskMain.tsx` (step `scenarios` →
  `videoTask`).
- **Retired, not deleted:** `scenarios.ts` and `components/ScenarioRating.tsx` are no
  longer reachable from the flow. Left in the tree so switching back is a one-line
  change if Randy wants the scenario task kept.

**Structure**, deliberately the same shape as the task it replaces: three targets
(yourself / your partner / an average UW-Madison student) in random order; the same
eight clips rated for each; clip order randomized within a target block; emotion order
randomized within a clip.

**Each trial is two pages.** Page 1 plays the clip — no native controls, so it cannot
be scrubbed, and **Continue is disabled until the clip has run to the end**. Page 2 is
the six questions: three emotions × (how strongly the clip evoked it, how confident the
participant is), on 1–100 sliders, all on one page. A "Replay video" button on page 2
opens the clip again and the number of replays is recorded.

**Clip sets.** Five premade sets of eight. A dyad is assigned one set by
`fnv1a(dyadId) mod 5` — both lab machines derive the same set from the Dyad ID typed on
their own participant form, so the pair is yoked with no communication between machines,
and the choice is reproducible from the data file. `SET_ASSIGNMENT_METHOD` is written
into the output next to the set id.

### Decisions that need Randy

- **All five sets currently hold the same eight clips** (1615, 0494, 1097, 0027, 0366,
  0962, 0014, 1328) because the real groupings aren't chosen yet. The full study needs
  ≥40 unique clips. Swapping a set in is one line per set in `videos.ts`.
- **Clip 0494** is annotated with five emotions (disgust, fear, sadness, disappointment,
  anger). The task probes three, so the first three are used; all five are kept in the
  `annotated` field. **Which three should be probed?**
- **Confidence is 1–100**, matching the intensity scale on the same page rather than the
  1–7 confidence used by the scenario task.
- **Sliders start at 50** with the value hidden until touched — same behaviour as
  `SelfFrequency`. Consistent with the rest of the app, but it is a midpoint anchor.
- **A full viewing is required in every target block** (`REQUIRE_FULL_WATCH_EACH_BLOCK`
  in `VideoTaskMain.tsx`), so each of the 24 ratings follows a fresh viewing rather than
  memory. Flip the constant to false if pilot timing pushes the session past an hour.
- **Instruction wording is a first draft.**

### 2. Video selection task

One page after the ratings: every clip they saw, with two checkbox columns — "My partner
would like this" and "I would like this". Clips can be replayed from the page. Selecting
nothing is allowed but asks for confirmation first.

### 3. Round-robin dashboard shows live progress and help requests

- **New files:** `src/roundrobin/progress.ts`, `ProgressPanel.tsx`, `FolderSettings.tsx`,
  `src/components/HelpButton.tsx`, `src/utils/settings.ts`, `src/utils/hash.ts`,
  `progress.test.ts`.
- **Edited:** `AdminDashboard.tsx`, `App.tsx`, `DyadTaskMain.tsx`, `lib.rs`,
  `tauri.conf.json`, `Cargo.toml`.

Every step change writes a small per-participant JSON file (`p-<hash>.json`, hashed so
emails don't appear in filenames) into a `progress` folder. The dashboard re-reads that
folder every 3 s and shows stage, current page, a session progress bar, and a red banner
for anyone who pressed the new **"Need help?"** button. One file per participant, not one
shared file, so two machines writing at once cannot overwrite each other.

**The help button is hidden during the dyad continuous rating.** The slider reads raw
mouse X (`Slider.tsx`), so a participant moving the pointer to a corner to click it would
be recorded as a "very negative" rating. `DyadTaskMain` now reports when the pointer is
the measurement and `App` hides the button for that whole period.

**Progress tracking never blocks a session:** a failed progress write is logged and
dropped. It is researcher convenience, not study data.

### 4. Shared tracking folder and stimulus folder

Two optional paths set on the dashboard and stored in `settings.json` in app data:
`storeDir` (round-robin + progress; point every machine at one Research Drive folder to
get a single live view) and `stimulusDir` (the clip library). Rust falls back to the
machine-local app-data folder if a configured folder is missing, so an unmounted
Research Drive cannot stop a session from starting.

Clips are **not** committed and **not** in the installer built by CI — `mp4_noname/` and
`public/videos/` are gitignored. `npm run stimuli` copies the demo clips into
`public/videos` for local dev builds; the real study should set the stimulus folder.
This needed `protocol-asset` on the `tauri` crate plus an `assetProtocol` scope in
`tauri.conf.json`.

### Output / data dictionary (no CSV schema change — reuses the existing columns)

Written to `transitions.csv` alongside the questionnaire rows.

| ratingTask | subTask | emotion1 | emotion2 | ratingPerson | response |
|---|---|---|---|---|---|
| `video_task` | `set_assignment` | | | | set id, e.g. `SET_C` |
| `video_task` | `set_assignment_method` | | | | `fnv1a(dyadId) mod 5` |
| `video_task` | `set_contents` | | | | the eight clip ids, `;`-joined |
| `video_task` | `target_order` | | | | the three targets, `;`-joined |
| `video_task` | `video_order` | | | target | clip order for that block, `;`-joined |
| `video_affect` | clip id | emotion | `intensity` | target | 1–100 |
| `video_affect` | clip id | emotion | `confidence` | target | 1–100 |
| `video_affect` | clip id | | `watch_plays` | target | completed viewings on the watch page |
| `video_affect` | clip id | | `first_watch_ms` | target | ms from page shown to end of first viewing |
| `video_affect` | clip id | | `rating_page_replays` | target | replays opened on the rating page |
| `video_selection` | `for_partner` / `for_self` | | | | selected clip ids, `;`-joined |
| `video_selection` | `n_for_partner` / `n_for_self` | | | | count |
| `video_selection` | `presented_order` | | | | row order as shown |

Long format, as before. Per participant: 3 targets × 8 clips × (3 emotions × 2 measures
+ 3 timing rows) = **216 `video_affect` rows**, plus 7 `video_task` and 5
`video_selection` rows.

### Verification

- `npm test` → 46/46 pass (31 new: set assignment, catalog integrity, clip-source
  resolution, progress files, stage maths, help-request state).
- `npx tsc --noEmit`, `npm run build`, `cargo check` → all pass.
- Driven end-to-end in a headless browser: all 24 trials plus both target transitions and
  the selection page; row counts and contents verified (216 / 7 / 5 as above). Confirmed
  Continue stays disabled until a clip finishes, and that a help request raised by a
  participant appears on the dashboard, clears from the dashboard, and the participant's
  notice then disappears on its own.
- **Not yet run on lab hardware.** Clip playback from a Research Drive path over the
  asset protocol, and the shared tracking folder across two machines, should both be
  tried on the actual lab machines before live use.

---

## 2026-06-10 — Phase B: situational scenarios replace the emotion-transition task

⚠️ **This is a measurement change and MUST be reviewed/approved by Randy before any
live data collection.** It replaces an existing construct (emotion-transition
likelihood, "how likely is X to become Y") with a new one (situational emotion
intensity + confidence). Data collected with this task is NOT comparable to any
pilot data from the old transition task.

### What changed
- **Removed:** the emotion-transition task — the 75-pair `emotionTransitions` array,
  the `EmotionsRating` component (deleted), and its 0–100% slider rating.
- **Added:** a situational scenario task (`scenarios.ts`,
  `components/ScenarioRating.tsx`). For each target the participant reads each
  situation and rates, per emotion, (a) intensity and (b) confidence, each on a
  **1–7** scale (1 = Not at all, 7 = Extremely).
- **Files:** `src/classification-task/scenarios.ts` (new),
  `src/classification-task/components/ScenarioRating.tsx` (new),
  `src/classification-task/ClassificationTaskMain.tsx` (edited),
  `src/classification-task/components/EmotionsRating.tsx` (deleted).

### Decisions (confirmed by Alex, 2026-06-10)
- **8 scenarios** (the mockup set, including "moving to a new city").
- **No progress counter** — the "scenario #N of 8" from the mockup was intentionally
  dropped, consistent with Phase A change #1 (don't show remaining progress).
- **Target-adapted prompts** — the situation is third person ("Imagine that a
  person…"); the emotion prompt adapts to who is being rated: "Rate the degree to
  which **you / your partner / an average UW-Madison student** would feel *angry*."
- **Confidence kept** — every emotion gets a 1–7 "How confident are you about your
  rating?" follow-up.

### Scenarios and their emotions (3rd-person wording)
| id | emotions |
|----|----------|
| stood_up_friend | angry, embarrassed, sad |
| goal_achieved | content, happy, pride |
| life_going_well | content, pride, happy |
| credit_stolen | sad, annoyed, angry |
| friend_moving | happy, anxious, sad |
| bug_in_food | angry, disgust, scared |
| new_city | happy, anxious, excited |
| speech_celebration | anxious, excited, scared |

### Randomization (method logged via row order; same approach as the rest of the app)
- **Target order** (yourself / your partner / average student): randomized — unchanged
  from before.
- **Scenario order**: randomized per target (`ScenarioRating` re-mounts per target via
  a React `key`, reshuffling).
- **Emotion order within a scenario**: randomized.
- Presentation order is recoverable from the row sequence + `trialNumber` +
  `sessionTimestamp` in the output (every rating is its own timestamped row).

### Output / data dictionary (no CSV schema change — reuses the existing columns)
Written to the same classification file (still named `transitions.csv`; it already
holds every classification sub-task, distinguished by `ratingTask`). Scenario rows:
- `ratingTask` = `emotion_scenarios`
- `subTask` = scenario id (e.g. `stood_up_friend`)
- `emotion1` = the rated emotion (e.g. `angry`)
- `emotion2` = the measure: `intensity` or `confidence`
- `ratingPerson` = `yourself` | `your partner` | `an average UW-Madison student`
- `response` = the 1–7 value
- `trialNumber` increments per write (captures presentation order)

This is **long format**: each emotion produces two rows (one `intensity`, one
`confidence`). 8 scenarios × 3 emotions × 2 measures × 3 targets = **144 rows** per
participant for this task.

### Instructions
The pre-task instructions were rewritten for the new task (1–7 scale, confidence,
three targets). **Draft wording — please review.**

### Wording to confirm with Randy
- `friend_moving` was completed to "…moving across the country **to start a new
  job**" (the short list entry was truncated; the mockup had the full clause).
- Instruction text is a first draft.

### Verification
- `npm run build` (tsc + vite) → passes.
- `npm test` → 6/6 pass (CSV regression unaffected).
- **Not yet interactively QA'd on device.** The full participant flow (instructions →
  3 targets × 8 scenarios, Tab-to-submit, completeness validation, between-target
  screens) should be clicked through on a lab machine before live use.

---

## 2026-06-10 — Phase A: kiosk hardening + data-safety (v2.0.0)

Four researcher-requested changes plus supporting infrastructure. No questionnaire
wording, scale, randomization, counterbalancing, or sampling-rate logic was changed
in this phase. (Phase B — replacing the emotion-transition task with situational
scenarios — is tracked separately and not part of this commit.)

### 1. Removed the progress indicator from the emotion-rating task
- **File:** `src/classification-task/components/EmotionsRating.tsx`
- **What:** Deleted the `Person X of Y · Transition N of M` label that was shown
  above each rating.
- **Why:** Seeing remaining count let participants gauge how much was left and rush
  to finish, degrading data quality.
- **Follow-on cleanup:** the `personIndex` and `totalPersons` props were now unused,
  so they were removed from `EmotionsRating`'s props/interface and from the call
  site in `ClassificationTaskMain.tsx`. No behavior change.
- **Research integrity:** none — purely a display element. Recorded data is identical.

### 2. Researcher-only "Save & Quit" gate (Ctrl+Shift+Q)
- **Files:** `src/components/AdminQuitModal.tsx` (new), `src/utils/flushRegistry.ts`
  (new), `src/App.tsx`, `src/dyad-task/DyadTaskMain.tsx`,
  `src-tauri/src/lib.rs`.
- **What:** Pressing **Ctrl+Shift+Q** opens a modal that requires the researcher to
  type the word **`Confirm`**. On confirm, the app flushes all data collected so far
  to disk and then exits. The participant is not told this shortcut exists, and the
  typed-word requirement prevents an accidental key combo from quitting a session.
- **Data safety — why the flush matters:** the dyad task buffers continuous slider
  samples in memory and only writes them to `ratings.csv` every 15 seconds
  (`DyadTaskMain` `sliderFlushRef`). A naive quit would lose up to ~15 s of samples.
  The new `flushRegistry` lets the active task register a flush callback; the quit
  handler `await`s `flushAll()` **before** calling the Tauri `exit_app` command, so
  in-progress data is persisted first.
- **Implementation notes:**
  - `flushRegistry.ts` — tiny register/`flushAll` module (uses `Promise.allSettled`
    so one failing flush doesn't block the others).
  - `DyadTaskMain` registers a flush that drains `sampleBufferRef` to disk.
  - `exit_app` (Rust command) calls `app.exit(0)`, which bypasses the close guard
    described in #3.
  - The modal's input stops keydown propagation so typing `Confirm` never reaches
    the task-level keyboard handlers running underneath.
- **Research integrity:** positive — reduces data loss on early termination. The
  flushed rows use the exact same format/columns as normal writes.

### 3. Prevent the participant from exiting the application
- **Files:** `src-tauri/tauri.conf.json`, `src-tauri/src/lib.rs`, `src/App.tsx`,
  `src/utils/lockdown.ts` (new).
- **What was added (the app can enforce these):**
  - Window flags: `fullscreen`, `alwaysOnTop`, `decorations: false`,
    `closable: false`, `minimizable: false`, `maximizable: false`,
    `resizable: false`, `skipTaskbar: true`.
  - Rust: `set_always_on_top(true)` and a `CloseRequested` guard that calls
    `api.prevent_close()` — this blocks Alt+F4 and the window close button. The only
    way out is the researcher Save & Quit gate (#2), which uses `app.exit(0)`.
  - In-app keyboard suppression (`lockdown.ts`, applied by a capture-phase listener
    in `App.tsx`): blocks reload (F5, Ctrl+R), dev tools (F12, Ctrl+Shift+I/J/C),
    fullscreen toggle (F11), close/quit (Ctrl+W, Ctrl+Q), print (Ctrl+P), find
    (Ctrl+F/G), zoom (Ctrl +/-/0), Ctrl+Tab, and Alt+←/→. Plain **Tab** and
    **Space** are deliberately NOT blocked — the study uses them to submit/advance —
    and normal typing in text fields is unaffected.
- **⚠️ Limit — what an app CANNOT block (must be done on the lab machines):**
  A webview application cannot reliably suppress true OS-shell gestures because the
  Windows shell handles them before the app sees the keystroke:
  - **Alt+Tab** (switch window)
  - **Windows key / Win+Tab** (Start, Task View)
  - **3-finger swipe up** (Task View) and **Win+D / Show Desktop**
  - **Ctrl+Alt+Del**

  To fully lock the study machines, configure Windows **Assigned Access (kiosk mode)**
  for the study user account, or a Group Policy that disables the Win key, Task View,
  and hot corners. This is a per-machine setup task, not something the app can do.
  *(If we decide we need it, a native low-level keyboard hook could suppress the Win
  key from inside the app, but it needs native code + testing on the actual lab
  hardware — flagged, not implemented.)*
- **Dev note:** because of always-on-top + prevent-close, during `npm run tauri dev`
  the window stays on top and won't close via the X. Quit it with the Save & Quit
  gate (Ctrl+Shift+Q → `Confirm`) or by stopping the dev terminal.
- **Research integrity:** none — collection logic untouched.

### 4. CSV is not broken by commas/quotes/newlines in free-text responses
- **Files:** `src/utils/csv.ts` (doc only), `src/utils/csv.test.ts` (new),
  `package.json`, `tsconfig.json`.
- **Finding:** the previous version broke columns when a free-text response
  contained a comma. **This is already fixed in the v2 rewrite** — every CSV row is
  built with `[...].map(csvEscape).join(",")`, and `csvEscape` wraps any field
  containing a comma/quote/newline in quotes (RFC 4180), doubles embedded quotes,
  and flattens newlines to spaces. Verified that all free-text inputs route through
  it: the dyad written report (`DyadTaskMain.buildRow`), and the `experience` /
  `studyFeedback` text fields (`ClassificationTaskMain.writeCSVRow`).
- **What was added:** a regression test (`csv.test.ts`, 6 cases incl. the
  comma-in-response column-break case) and the `npm test` script (Vitest). Test files
  are excluded from the production `tsc` build via `tsconfig.json`.
- **Research integrity:** positive — guarantees free-text responses can never shift
  data columns. Output format unchanged for comma-free values.

### Verification
- `npm test` → 6/6 pass.
- `npm run build` (tsc + vite) → passes, no type errors.
- `cargo check` (src-tauri) → passes.
- Not yet run on lab hardware. Manual kiosk/lockdown behavior should be verified on
  an actual study machine before live use.

### Pre-existing item still open (from the rewrite, not changed here)
- The `elapsedSec` column in `ratings.csv` was changed from `÷15000` to `÷1000`
  (correct ms→seconds) during the v2 rewrite. The Oct–Dec 2025 pilot used the old
  `÷15000` value, so this app's output won't match the pilot's elapsed-time scale.
  **Needs Randy's sign-off** before live collection. (Sampling cadence is unchanged.)
