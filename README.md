# Hey Ben — getting the PPS Study app running on the lab machines

Hi Ben,

This is the app the participants use in Room 385 after their conversation — the
video rating task plus all the questionnaires, with the round-robin check-in at
the front. Here's everything you need to get it onto a lab computer and run a
session. Should take about 10 minutes. Just go in order.

## 1. Grab the installer

If I already sent you the file (`PPS Study_2.0.0_x64-setup.exe`) over Slack or
email, save it anywhere (Desktop is fine) and skip to step 2.

Otherwise you can download it yourself — no programming tools needed:

1. Go to **https://github.com/alexmueller07/niedenthal-person-perception-study-app/actions**
2. Click the most recent **"Build Windows app"** run with a **green check** next
   to it (a yellow dot means it's still building — wait a few minutes).
3. Scroll to the bottom of that page. Under **Artifacts**, click
   **`pps-study-windows`**. It downloads as a `.zip` — unzip it and inside is
   **`PPS Study_2.0.0_x64-setup.exe`**.

## 2. Install it

1. Double-click the setup file.
2. Windows SmartScreen will probably complain because the app isn't signed —
   click **More info → Run anyway**. That's expected, it's our own build.
3. Click through the installer. You get a **"PPS Study"** shortcut when it's done.

## 3. Run it

The app opens **fullscreen and locked** (participants can't Alt-Tab out of it).
The flow you'll see:

1. **Check-in screen** — the participant types their **email** (no password).
   - A new email gets placed into a random **group of 5**; a returning email
     keeps its group. They see their group number and how many partners they
     still have to meet, then press Continue.
   - Type **`admin@admin`** instead to open the **round-robin dashboard**: every
     group, who has met whom, one-click "mark met" on any pair, who's left, and
     a **live view of where every participant currently is in the app** — plus
     anyone who has pressed the help button. See section 5.
2. **Participant info form** — you (the RA) fill this in: IDs, computer side
   (Left/Right — this controls the rating order, so get it right), and the
   **save folder**. Point the save folder at the study folder on the **Research
   Drive** — participant data must not live anywhere else.
3. **Dyad task** — it asks for the conversation video file (`.mp4`/`.mov`), then
   runs the continuous rating blocks automatically.
4. **Video task** — eight short clips. For each clip: a page where they watch it
   (Continue stays greyed out until the clip has played all the way through),
   then a page with six sliders — how strongly it evoked each of three feelings,
   and how confident they are in each rating. They go through all eight clips
   three times: once for themselves, once for their partner, once for an average
   UW student. It ends with a page asking which clips they'd send to their
   partner and which they'd pick for themselves.
5. **Questionnaires** — all the questionnaire pages. The question header stays
   pinned while the page scrolls and the Continue button is always bottom-right.

Throughout, a small **"Need help?"** button sits in the bottom-left corner. If a
participant presses it, it shows up in red on the dashboard. It's deliberately
hidden during the conversation-rating video, because the mouse position *is* the
data on that screen.

## 4. Getting out of the app

**Ctrl+Shift+Q** at any point opens the researcher save-and-quit gate (it
flushes any buffered data to disk before closing — never kill the app from
Task Manager mid-session). This works no matter what screen the app is on.

## 5. Two folders to set once per machine (sign in as `admin@admin`)

The dashboard has a **"Folders on this machine"** box with two settings. Both are
optional — with neither set the app still runs — but the study wants both.

**Stimulus video folder.** The clips the video task plays. They are not inside
the installer (they're big, and they're not ours to hand out), so point this at
the clip library — the `mp4_noname` folder — on the Research Drive or a local
copy of it. If you leave it empty, a build made on a dev machine falls back to
eight clips bundled at build time; a build downloaded from GitHub Actions has
none, and the video task will say a clip could not be loaded. **Set this before
running a session.**

**Shared tracking folder.** Where the round-robin file and the live progress
files live. Point *every* lab machine at the same folder on the Research Drive
and the dashboard shows every session as it runs, including help requests, from
whichever machine you're sitting at. Leave it empty and each machine keeps its
own private copy and can only see itself. Restart the app after changing it.

## 6. Where the data lands

| What | Where |
|------|-------|
| Continuous ratings | `ratings.csv` in the session folder you picked |
| Questionnaire + video-task answers | `transitions.csv` in the same folder |
| Round-robin tracking | `roundrobin.json` in the shared tracking folder, or `%APPDATA%\com.wisc.pps-study` if you haven't set one |
| Live progress / help requests | one small `p-*.json` per participant in a `progress` subfolder of the same place |
| Folder settings | `settings.json`, always in `%APPDATA%\com.wisc.pps-study` on that machine |

The round-robin and progress files contain participant **emails**, so they stay
on the lab machine / Research Drive — never copy them to a personal device
(IRB 2020-1657).

## 7. Mac version (if you ever need it)

Same Actions page, but pick the **"Build macOS app"** workflow and download
**`pps-study-macos`** (a `.dmg`). It's unsigned, so the first time:
right-click the app → **Open** → **Open** again. If macOS says the app "is
damaged", run this in Terminal and try again:

```
xattr -dr com.apple.quarantine "/Applications/PPS Study.app"
```

## For whoever hacks on this later (not needed to run it)

Dev machine needs Node 20+ and Rust (rustup, MSVC toolchain on Windows). Then:

```
npm install
npm run stimuli        # copy the demo clips out of the library into public/videos
npm run tauri dev      # run in a dev window
npm run tauri build    # build the installer (src-tauri/target/release/bundle/nsis/)
npm test               # unit tests
```

Stimulus clips are gitignored, so a fresh clone has none. `npm run stimuli`
copies the ones the app needs out of `./mp4_noname` (or pass another folder:
`npm run stimuli -- D:\clips`). Whatever ends up in `public/videos` is baked into
that build as the fallback used when no stimulus folder is set on the dashboard.

`npm run dev` also serves **http://localhost:1420/preview.html** — a dev-only
screen picker that jumps straight to any page of the video task, the selection
page, or the dashboard, and prints the rows that would go to `transitions.csv`.
Useful for showing a screen to Randy without sitting through a whole session. It
is not part of any build.

That's everything. If anything acts weird, screenshot it and text or email me
and I'll sort it out fast.

— Alex
