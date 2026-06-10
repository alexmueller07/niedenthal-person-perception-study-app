# PPS App — Change Log

All changes are grouped by work session. Research-integrity notes call out anything
that affects collected data; those items require Randy's sign-off before being used
to collect real participant data.

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
