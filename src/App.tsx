import { useEffect, useState } from "react";

import ParticipantForm from "./components/ParticipantForm";
import DyadTaskMain from "./dyad-task/DyadTaskMain";
import ClassificationTaskMain from "./classification-task/ClassificationTaskMain";
import ErrorBanner from "./components/ErrorBanner";
import AdminQuitModal from "./components/AdminQuitModal";
import { flushAll } from "./utils/flushRegistry";
import { isBlockedShortcut } from "./utils/lockdown";
import { invoke } from "@tauri-apps/api/core";

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
    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("keydown", onKeyDown, true);
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
  };

  const handleClassificationTaskComplete = () => {
    setCompletedTasks((prev) => ({ ...prev, classification: true }));
    setSelectedTask(null);
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

      {allTasksCompleted ? (
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
        />
      ) : selectedTask === "classification" ? (
        <ClassificationTaskMain
          formData={formData}
          csvFilePath={classificationCsvFilePath}
          onComplete={handleClassificationTaskComplete}
          onCsvError={handleCsvError}
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
