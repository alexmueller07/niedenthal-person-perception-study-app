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
     group, who has met whom, one-click "mark met" on any pair, and who's left.
     This is where you track the between-day interview progress.
2. **Participant info form** — you (the RA) fill this in: IDs, computer side
   (Left/Right — this controls the rating order, so get it right), and the
   **save folder**. Point the save folder at the study folder on the **Research
   Drive** — participant data must not live anywhere else.
3. **Dyad task** — it asks for the conversation video file (`.mp4`/`.mov`), then
   runs the continuous rating blocks automatically.
4. **Questionnaires** — scenario ratings and all the questionnaire pages. The
   question header stays pinned while the page scrolls and the Continue button
   is always bottom-right.

## 4. Getting out of the app

**Ctrl+Shift+Q** at any point opens the researcher save-and-quit gate (it
flushes any buffered data to disk before closing — never kill the app from
Task Manager mid-session). This works no matter what screen the app is on.

## 5. Where the data lands

| What | Where |
|------|-------|
| Continuous ratings | `ratings.csv` in the session folder you picked |
| Questionnaire answers | `transitions.csv` in the same folder |
| Round-robin tracking | `roundrobin.json` in the app's data folder on that machine (`%APPDATA%\com.wisc.pps-study`) |

The round-robin file contains participant **emails**, so it stays on the lab
machine / Research Drive — never copy it to a personal device (IRB 2020-1657).
Heads-up: each lab machine keeps its own round-robin file, so do all check-ins
on the same computer (or copy the file over) if you want one combined view.

## 6. Mac version (if you ever need it)

Same Actions page, but pick the **"Build macOS app"** workflow and download
**`pps-study-macos`** (a `.dmg`). It's unsigned, so the first time:
right-click the app → **Open** → **Open** again. If macOS says the app "is
damaged", run this in Terminal and try again:

```
xattr -dr com.apple.quarantine "/Applications/PPS Study.app"
```

## For whoever works on this later (not needed to run it)

Dev machine needs certain base requirements and then:

```
npm install
npm run tauri dev      # run in a dev window
npm run tauri build    # build the installer (src-tauri/target/release/bundle/nsis/)
npm test               # unit tests
```

That's everything. If anything acts weird, screenshot it and text or email me
and I'll sort it out.

— Alex
