# Hey Ben — getting the PPS Study app running on the lab machines

Hi Ben,

This is the app the participants use in Room 385 after their conversation — the
conversation rating task, the new video task, and all the questionnaires, with
the round-robin check-in at the front. Here's everything you need to get it onto
a lab computer and run a session. Should take about 15 minutes. Just go in order.

**If you're on the lab Macs, follow the macOS lines.** Everything below covers
both; the app is identical on the two platforms.

## 1. Grab the app

If I already sent you the file over Slack or email, save it anywhere (Desktop is
fine) and skip to step 2.

Otherwise you can download it yourself — no programming tools needed:

1. Go to **https://github.com/alexmueller07/niedenthal-person-perception-study-app/actions**
2. In the left sidebar pick the workflow for your machine:
   - **macOS** → "Build macOS app"
   - **Windows** → "Build Windows app"
3. Click the most recent run with a **green check** next to it (a yellow dot
   means it's still building — wait a few minutes). Make sure it's a run on the
   **main** branch.
4. Scroll to the bottom of that page. Under **Artifacts**, click
   **`pps-study-macos`** (or **`pps-study-windows`**). It downloads as a `.zip`.
   Unzip it — inside is a `.dmg` on Mac, or `PPS Study_2.0.0_x64-setup.exe` on
   Windows.

The Mac build is a universal binary, so it runs on both Intel and Apple Silicon
Macs. You don't have to pick.

## 2. Install it

**macOS.** The app is **unsigned** — we don't have an Apple Developer
certificate — so macOS will fight you a little the first time. This is expected,
it's our own build.

1. Double-click the `.dmg`, then drag **PPS Study** into **Applications**.
2. Open Applications, **right-click** (or Control-click) **PPS Study → Open**,
   then click **Open** again in the warning box. You must do this the first time;
   double-clicking it will just be blocked.
3. If macOS instead says the app **"is damaged and can't be opened"**, that's the
   quarantine flag, not real damage. Open **Terminal** and run:

   ```
   xattr -dr com.apple.quarantine "/Applications/PPS Study.app"
   ```

   Then open it normally. (Recent macOS versions show "damaged" where older ones
   offered the right-click → Open route, so you may go straight to this step.)
4. If it's blocked with no Open option at all, go to **System Settings →
   Privacy & Security**, scroll down, and click **Open Anyway** next to the
   message about PPS Study.

**Windows.** Double-click the setup file. SmartScreen will complain because the
app isn't signed — click **More info → Run anyway**. Click through the installer
and you get a **"PPS Study"** shortcut.

## 3. Point it at the videos — do this before your first session

**The download does not contain the video clips.** They're large and they're not
ours to redistribute, so the app reads them from a folder you choose. Without
this step the video task will say a clip could not be loaded.

1. Get the clip library — the **`mp4_noname`** folder — onto the machine, or
   mount the Research Drive (`smb://research.drive.wisc.edu/niedenthal`) so the
   folder is reachable. A local copy is faster and safer than playing 8 clips
   over the network; ask me if you don't have one.
2. Launch the app and sign in as **`admin@admin`** on the check-in screen.
3. Under **"Folders on this machine"**, next to **Stimulus video folder**, click
   **Browse** and pick the `mp4_noname` folder. It saves as soon as you pick it.
4. Sign out. That's it — the setting sticks on that machine, so it's a one-time
   job per computer.

For the proof-of-concept the app only needs eight clips out of that folder
(1615, 0494, 1097, 0027, 0366, 0962, 0014, 1328), so a folder holding just those
eight works too.

## 4. Run it

The app opens **fullscreen and locked** (participants can't Alt-Tab or Cmd-Tab
out of it). The flow you'll see:

1. **Check-in screen** — the participant types their **email** (no password).
   - A new email gets placed into a random **group of 5**; a returning email
     keeps its group. They see their group number and how many partners they
     still have to meet, then press Continue.
   - Type **`admin@admin`** instead to open the **round-robin dashboard**: every
     group, who has met whom, one-click "mark met" on any pair, who's left, and
     a **live view of where every participant currently is in the app** — plus
     anyone who has pressed the help button. See section 6.
2. **Participant info form** — you (the RA) fill this in: IDs, computer side
   (Left/Right — this controls the rating order, so get it right), and the
   **save folder**. Point the save folder at the study folder on the **Research
   Drive** — participant data must not live anywhere else.

   The **Dyad ID** matters more than it looks: it decides which of the five clip
   sets the pair gets. Both machines must have the same Dyad ID typed in, or the
   two partners will rate different videos.
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

## 5. Getting out of the app

**Ctrl+Shift+Q** — or **Cmd+Shift+Q** on the Macs — at any point opens the
researcher save-and-quit gate. Type the word **`Confirm`** and it flushes any
buffered data to disk before closing.

Never force-quit mid-session (Task Manager on Windows, Force Quit on Mac) — the
continuous slider samples are only written to disk every 15 seconds, so you'd
lose up to ~15 seconds of data.

## 6. The shared tracking folder (optional, but worth it)

Also under **"Folders on this machine"** on the dashboard. Point *every* lab
machine at one folder on the Research Drive and the dashboard shows every session
as it runs — who's on which task, how far through, and who has asked for help —
from whichever machine you're sitting at. Leave it empty and each machine keeps
its own private copy and can only see itself.

Restart the app after changing it, so everything is read from the same place.

## 7. Where the data lands

| What | Where |
|------|-------|
| Continuous ratings | `ratings.csv` in the session folder you picked |
| Questionnaire + video-task answers | `transitions.csv` in the same folder |
| Round-robin tracking | `roundrobin.json` in the shared tracking folder, or the app data folder if you haven't set one |
| Live progress / help requests | one small `p-*.json` per participant in a `progress` subfolder of the same place |
| Folder settings | `settings.json` in the app data folder on that machine |

The app data folder is `%APPDATA%\com.wisc.pps-study` on Windows and
`~/Library/Application Support/com.wisc.pps-study` on macOS.

The round-robin and progress files contain participant **emails**, so they stay
on the lab machine / Research Drive — never copy them to a personal device
(IRB 2020-1657).

## 8. If something looks wrong

Screenshot it and text or email me. Two things worth checking first:

- **"This clip could not be loaded"** → the stimulus folder in section 3 isn't
  set, or the Research Drive isn't mounted.
- **Videos play but the wrong ones / partner sees different clips** → the two
  machines have different Dyad IDs typed on the participant form.

## For whoever works on this later (not needed to run it)

Dev machine needs certain base requirements and then:

```
npm install
npm run stimuli        # copy the demo clips out of the library into public/videos
npm run tauri dev      # run in a dev window
npm run tauri build    # build the installer
npm test               # unit tests
```

Stimulus clips are gitignored, so a fresh clone has none and neither do the CI
builds — that's why section 3 exists. `npm run stimuli` copies the ones the app
needs out of `./mp4_noname` (or pass another folder: `npm run stimuli -- D:\clips`).
Whatever ends up in `public/videos` is baked into *that local build* as the
fallback used when no stimulus folder is set.

`npm run dev` also serves **http://localhost:1420/preview.html** — a dev-only
screen picker that jumps straight to any page of the video task, the selection
page, or the dashboard, and prints the rows that would go to `transitions.csv`.
Useful for showing a screen to Randy without sitting through a whole session. It
is not part of any build.

That's everything. If anything acts weird, screenshot it and text or email me
and I'll sort it out.

— Alex
