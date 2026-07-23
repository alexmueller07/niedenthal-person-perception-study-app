// Machine-level researcher settings.
//
// Two folder paths the lab sets once per machine, from the round-robin
// dashboard. Both are optional: with neither set, the app runs entirely
// self-contained (bundled proof-of-concept clips, per-machine tracking file),
// which is what a fresh install does.
//
// settings.json always lives in this machine's app-data folder — one of the
// things it stores is where everything else lives, so it cannot itself be
// relocated. Rust reads the same file (see store_dir in src-tauri/src/lib.rs).

import { invoke } from "@tauri-apps/api/core";

export interface AppSettings {
  /**
   * Absolute path to the clip library (the lab's `mp4_noname` folder), or null
   * to use the proof-of-concept clips bundled in public/videos.
   */
  stimulusDir: string | null;
  /**
   * Absolute path to a shared folder holding the round-robin and progress
   * files, or null to keep them in this machine's app-data folder. Point every
   * lab machine at one folder and the dashboard sees every session live.
   */
  storeDir: string | null;
}

export const EMPTY_SETTINGS: AppSettings = { stimulusDir: null, storeDir: null };

const LOCALSTORAGE_KEY = "pps-settings";

function hasTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = hasTauri()
      ? await invoke<string>("load_settings")
      : localStorage.getItem(LOCALSTORAGE_KEY) ?? "";
    if (!raw) return EMPTY_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      stimulusDir: parsed.stimulusDir ?? null,
      storeDir: parsed.storeDir ?? null,
    };
  } catch (err) {
    console.error("Settings load failed:", err);
    return EMPTY_SETTINGS;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const raw = JSON.stringify(settings, null, 2);
  if (hasTauri()) {
    await invoke("save_settings", { contents: raw });
    return;
  }
  localStorage.setItem(LOCALSTORAGE_KEY, raw);
}
