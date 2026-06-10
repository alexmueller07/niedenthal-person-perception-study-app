// In-app keyboard lockdown.
//
// Returns true when a keydown event is a browser/OS shortcut that a participant
// could use to escape, reload, navigate, or open dev tools, and that the webview
// is able to intercept. The App-level capture listener calls preventDefault on
// these.
//
// IMPORTANT — limits of an in-app approach: a webview application CANNOT reliably
// suppress true OS-shell gestures (Alt+Tab, the Windows key, Win+Tab / 3-finger
// Task View, Win+D / Show Desktop, Ctrl+Alt+Del). Those are handled by the
// Windows shell before the app ever sees them. Full kiosk lockdown on the lab
// machines must be done with Windows Assigned Access (kiosk mode) or Group Policy.
// See docs/CHANGELOG.md.
//
// Note: plain Tab and Space are deliberately NOT blocked — the study uses Tab to
// submit ratings and Space to advance, and text fields need normal typing.
export function isBlockedShortcut(e: KeyboardEvent): boolean {
  const key = e.key;
  const lower = key.length === 1 ? key.toLowerCase() : key;

  // Function keys: reload (F5), fullscreen toggle (F11), dev tools (F12).
  if (key === "F5" || key === "F11" || key === "F12") return true;

  // Reload: Ctrl+R / Ctrl+Shift+R.
  if (e.ctrlKey && lower === "r") return true;

  // Close window / quit: Ctrl+W, Ctrl+Q.
  if (e.ctrlKey && (lower === "w" || lower === "q")) return true;

  // Print: Ctrl+P.
  if (e.ctrlKey && lower === "p") return true;

  // Find: Ctrl+F, Ctrl+G.
  if (e.ctrlKey && (lower === "f" || lower === "g")) return true;

  // Zoom: Ctrl+'+', Ctrl+'-', Ctrl+'0'.
  if (e.ctrlKey && (key === "+" || key === "-" || key === "=" || key === "0")) return true;

  // Dev tools: Ctrl+Shift+I / J / C.
  if (e.ctrlKey && e.shiftKey && (lower === "i" || lower === "j" || lower === "c")) return true;

  // Tab-cycling within the app chrome: Ctrl+Tab.
  if (e.ctrlKey && key === "Tab") return true;

  // History navigation: Alt+ArrowLeft / Alt+ArrowRight.
  if (e.altKey && (key === "ArrowLeft" || key === "ArrowRight")) return true;

  return false;
}
