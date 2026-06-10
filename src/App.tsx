import { useEffect, useState } from "react";

import ParticipantForm from "./components/ParticipantForm";
import DyadTaskMain from "./dyad-task/DyadTaskMain";
import ClassificationTaskMain from "./classification-task/ClassificationTaskMain";
import ErrorBanner from "./components/ErrorBanner";
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

  useEffect(() => {
    const handler = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", handler);
    return () => document.removeEventListener("contextmenu", handler);
  }, []);

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
