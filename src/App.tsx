import { useCallback, useEffect, useRef, useState } from "react";

import ParticipantForm from "./components/ParticipantForm";
import DyadTaskMain from "./dyad-task/DyadTaskMain";
import ClassificationTaskMain from "./classification-task/ClassificationTaskMain";
import ErrorBanner from "./components/ErrorBanner";
import AdminQuitModal from "./components/AdminQuitModal";
import HelpButton from "./components/HelpButton";
import SignIn from "./roundrobin/SignIn";
import Welcome from "./roundrobin/Welcome";
import AdminDashboard from "./roundrobin/AdminDashboard";
import { loadData, saveData, signIn as rrSignIn } from "./roundrobin/store";
import type { RRData, RRParticipant } from "./roundrobin/store";
import { isHelpOpen, loadProgress, mergeProgress, saveProgress } from "./roundrobin/progress";
import type { RRProgress, StageKey } from "./roundrobin/progress";
import { flushAll } from "./utils/flushRegistry";
import { isBlockedShortcut } from "./utils/lockdown";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export interface FormData {
  dyadId: string;
  participantId: string;
  partnerId: string;
  computer: string;
  subjectInitials: string;
  saveFolder: string;
  raName: string;
  sessionTime: string;
  sessionDate: string;
}

function App() {
  const [formData, setFormData] = useState<FormData>({
    dyadId: "",
    participantId: "",
    partnerId: "",
    computer: "",
    subjectInitials: "",
    saveFolder: "",
    raName: "",
    sessionTime: "",
    sessionDate: "",
  });

  const [selectedTask, setSelectedTask] = useState<"dyad" | "classification" | null>(null);
  const [dyadCsvFilePath, setDyadCsvFilePath] = useState<string>("");
  const [classificationCsvFilePath, setClassificationCsvFilePath] = useState<string>("");
  const [completedTasks, setCompletedTasks] = useState({ dyad: false, classification: false });
  const [taskOrder, setTaskOrder] = useState<number>(0);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [showAdminQuit, setShowAdminQuit] = useState<boolean>(false);

  // Round-robin check-in gate. The app opens on an email-only sign-in:
  // participants get registered into a random group of 5 and continue into the
  // study; admin@admin opens the researcher tracking dashboard instead.
  const [stage, setStage] = useState<"signin" | "welcome" | "admin" | "study">("signin");
  const [rrData, setRrData] = useState<RRData | null>(null);
  const [rrParticipant, setRrParticipant] = useState<RRParticipant | null>(null);
  const [rrIsNew, setRrIsNew] = useState<boolean>(false);

  // Live progress for the researcher dashboard, written on every step change.
  // Held in a ref rather than state: it is reported from inside task callbacks
  // and nothing in this component renders from it, so keeping it out of the
  // render cycle avoids re-rendering the running task on every trial.
  const progressRef = useRef<RRProgress | null>(null);
  const [helpPending, setHelpPending] = useState<boolean>(false);
  // Cursor position is the measurement during the continuous rating, so the
  // help button has to disappear while that runs — see DyadTaskMain.
  const [cursorLocked, setCursorLocked] = useState<boolean>(false);

  useEffect(() => {
    void loadData().then(setRrData);
  }, []);

  const persistRr = (data: RRData) => {
    setRrData(data);
    void saveData(data).catch((err) => {
      console.error("Round-robin save failed:", err);
      setCsvError(`Round-robin save failed: ${err}`);
    });
  };

  const writeProgress = useCallback((email: string, patch: Partial<RRProgress>) => {
    const next = mergeProgress(progressRef.current ?? undefined, email, patch);
    progressRef.current = next;
    // Progress tracking is a convenience for the researcher, never study data:
    // a failed write is logged and dropped rather than interrupting a session.
    void saveProgress(next).catch((err) => console.error("Progress save failed:", err));
  }, []);

  const reportProgress = useCallback(
    (stage: StageKey, done: number, total: number, detail: string) => {
      const email = rrParticipant?.email;
      if (!email) return;
      writeProgress(email, { stage, done, total, detail });
    },
    [rrParticipant, writeProgress]
  );

  const handleRequestHelp = () => {
    const email = rrParticipant?.email;
    if (!email) return;
    setHelpPending(true);
    writeProgress(email, {
      helpRequestedAt: new Date().toISOString(),
      helpResolvedAt: null,
    });
  };

  // While a help request is outstanding, watch for the researcher clearing it
  // so the participant's "researcher notified" notice goes away on its own.
  useEffect(() => {
    if (!helpPending || !rrParticipant) return;
    const id = window.setInterval(() => {
      void loadProgress().then((all) => {
        const mine = all[rrParticipant.email];
        if (mine && !isHelpOpen(mine)) {
          progressRef.current = { ...(progressRef.current ?? mine), ...mine };
          setHelpPending(false);
        }
      });
    }, 5000);
    return () => window.clearInterval(id);
  }, [helpPending, rrParticipant]);

  const handleParticipantSignIn = (email: string) => {
    const base = rrData ?? { version: 1 as const, groupSize: 5, participants: [], meetings: {} };
    const result = rrSignIn(base, email);
    if (result.isNew) persistRr(result.data);
    setRrParticipant(result.participant);
    setRrIsNew(result.isNew);
    setStage("welcome");
    writeProgress(result.participant.email, {
      stage: "checkin",
      done: 1,
      total: 1,
      detail: `Group ${result.participant.group}`,
      helpRequestedAt: null,
      helpResolvedAt: null,
    });
  };

  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    // Capture-phase keydown: opens the researcher quit gate and suppresses
    // browser/OS escape shortcuts before the task-level handlers see them.
    const onKeyDown = (e: KeyboardEvent) => {
      // Researcher-only save-and-quit gate: Ctrl+Shift+Q.
      if (e.ctrlKey && e.shiftKey && (e.key === "Q" || e.key === "q")) {
        e.preventDefault();
        e.stopPropagation();
        setShowAdminQuit(true);
        return;
      }
      if (isBlockedShortcut(e)) {
        e.preventDefault();
      }
    };

    document.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("keydown", onKeyDown, true); // capture phase

    // Primary path for Ctrl+Shift+Q: an OS-level global shortcut registered in
    // Rust. It fires even when the webview does not have keyboard focus (the
    // reason the keydown-only version was unreliable). The keydown listener
    // above stays as a fallback and for browser dev.
    let unlistenQuit: (() => void) | null = null;
    if ("__TAURI_INTERNALS__" in window) {
      void listen("admin-quit", () => setShowAdminQuit(true)).then((un) => {
        unlistenQuit = un;
      });
    }

    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("keydown", onKeyDown, true);
      unlistenQuit?.();
    };
  }, []);

  // Flush any in-memory data to disk, then quit. Triggered only from the
  // researcher AdminQuitModal.
  const handleConfirmQuit = async () => {
    try {
      await flushAll();
    } catch (err) {
      console.error("Flush before quit failed:", err);
    }
    try {
      await invoke("exit_app");
    } catch (err) {
      console.error("exit_app failed:", err);
    }
  };

  const handleFormSubmit = async () => {
    try {
      const basePath = await invoke<string>("setup_rating_directory", {
        basePath: formData.saveFolder,
        dyadId: formData.dyadId,
        participantId: formData.participantId,
        partnerId: formData.partnerId,
        initials: formData.subjectInitials,
      });

      setDyadCsvFilePath(`${basePath}/ratings.csv`);
      setClassificationCsvFilePath(`${basePath}/transitions.csv`);
      setSelectedTask("dyad");
      setTaskOrder(1);
      reportProgress("dyad", 0, 4, "Instructions");
    } catch (error) {
      console.error("Error setting up directory:", error);
      alert("Error setting up file directory. Please check the save folder path and try again.");
    }
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleDyadTaskComplete = () => {
    setCompletedTasks((prev) => ({ ...prev, dyad: true }));
    setTaskOrder(2);
    setSelectedTask("classification");
    setCursorLocked(false);
    reportProgress("video", 0, 25, "Instructions");
  };

  const handleClassificationTaskComplete = () => {
    setCompletedTasks((prev) => ({ ...prev, classification: true }));
    setSelectedTask(null);
    reportProgress("done", 1, 1, "Session complete");
  };

  const handleCsvError = (msg: string) => {
    setCsvError(msg);
  };

  const allTasksCompleted = completedTasks.dyad && completedTasks.classification;

  return (
    <div className="w-screen bg-black cursor-auto">
      <AdminQuitModal
        isOpen={showAdminQuit}
        onCancel={() => setShowAdminQuit(false)}
        onConfirm={handleConfirmQuit}
      />

      {csvError && (
        <ErrorBanner message={csvError} onDismiss={() => setCsvError(null)} />
      )}

      {/* Participant help signal. Hidden during the continuous rating, where
          moving the pointer to a corner would be recorded as a slider value. */}
      {stage === "study" && rrParticipant && !cursorLocked && (
        <HelpButton onRequestHelp={handleRequestHelp} pending={helpPending} />
      )}

      {stage === "signin" ? (
        <SignIn
          onParticipant={handleParticipantSignIn}
          onAdmin={() => setStage("admin")}
        />
      ) : stage === "admin" ? (
        <AdminDashboard
          data={rrData ?? { version: 1, groupSize: 5, participants: [], meetings: {} }}
          onChange={persistRr}
          onRefresh={setRrData}
          onExit={() => setStage("signin")}
        />
      ) : stage === "welcome" && rrData && rrParticipant ? (
        <Welcome
          data={rrData}
          participant={rrParticipant}
          isNew={rrIsNew}
          onContinue={() => setStage("study")}
        />
      ) : allTasksCompleted ? (
        <div className="h-screen w-full flex flex-col items-center justify-center">
          <p className="text-white text-2xl text-center max-w-2xl px-8">
            Please alert your researcher that you are finished.
          </p>
        </div>
      ) : selectedTask === "dyad" ? (
        <DyadTaskMain
          formData={formData}
          csvFilePath={dyadCsvFilePath}
          taskOrder={taskOrder}
          onComplete={handleDyadTaskComplete}
          onCsvError={handleCsvError}
          onProgress={(done, total, detail) => reportProgress("dyad", done, total, detail)}
          onCursorLock={setCursorLocked}
        />
      ) : selectedTask === "classification" ? (
        <ClassificationTaskMain
          formData={formData}
          csvFilePath={classificationCsvFilePath}
          onComplete={handleClassificationTaskComplete}
          onCsvError={handleCsvError}
          onProgress={(stage, done, total, detail) =>
            reportProgress(stage, done, total, detail)
          }
        />
      ) : (
        <ParticipantForm
          formData={formData}
          onChange={handleFormChange}
          onSubmit={handleFormSubmit}
        />
      )}
    </div>
  );
}

export default App;
