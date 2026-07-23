import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { csvEscape } from "../utils/csv";
import type { FormData } from "../App";
import VideoTaskMain from "../video-task/VideoTaskMain";
import PartnerHistory from "./PartnerHistory";
import SelfFrequency from "./SelfFrequency";
import Loneliness from "./Loneliness";
import Demographics from "./Demographics";
import PartnerSliders from "./PartnerSliders";
import SocialConnectedness from "./SocialConnectedness";
import Experience from "./Experience";
import Expressivity from "./Expressivity";
import StudyFeedback from "./StudyFeedback";
import Autism from "./Autism";
import type { ClassificationStepData } from "./types";
import { shuffle } from "../utils/shuffle";

const SOFTWARE_VERSION = "2.0.0";

// Human-readable names for the questionnaire steps, shown on the researcher
// dashboard so "where is this participant" is answerable at a glance.
const STEP_LABELS: Record<string, string> = {
  videoTask: "Video affective-response task",
  selfFrequency: "Emotion frequency",
  experience: "Conversation experience",
  partnerSliders: "Partner ratings",
  loneliness: "Loneliness",
  socialConnectedness: "Social connectedness",
  expressivity: "Expressivity",
  autism: "Autism-spectrum quotient",
  partnerHistory: "Partner history",
  demographics: "Demographics",
  studyFeedback: "Study feedback",
};

interface ClassificationTaskMainProps {
  formData: FormData;
  csvFilePath: string;
  onComplete?: () => void;
  onCsvError?: (msg: string) => void;
  /** Reports progress for the researcher dashboard. */
  onProgress?: (
    stage: "video" | "questionnaires",
    done: number,
    total: number,
    detail: string
  ) => void;
}

function ClassificationTaskMain({
  formData,
  csvFilePath,
  onComplete,
  onCsvError,
  onProgress,
}: ClassificationTaskMainProps) {
  const trialNumber = useRef<number>(1);

  const writeCSVRow = useCallback(async (
    ratingTask: string,
    subTask: string,
    emotion1: string = "",
    emotion2: string = "",
    ratingPerson: string = "",
    response: number | string = ""
  ) => {
    const row = [
      formData.dyadId,
      formData.participantId,
      formData.partnerId,
      formData.computer,
      formData.subjectInitials,
      formData.raName,
      formData.sessionTime,
      formData.sessionDate,
      new Date().toISOString(),
      ratingTask,
      subTask,
      emotion1,
      emotion2,
      ratingPerson,
      response,
      trialNumber.current,
      SOFTWARE_VERSION,
    ]
      .map(csvEscape)
      .join(",");

    await invoke("write_csv_transitions", { path: csvFilePath, contents: [row] });
    trialNumber.current += 1;
  }, [csvFilePath, formData]);

  const handleCsvError = (err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("CSV write failed:", msg);
    onCsvError?.(`Write failed: ${msg}`);
  };

  const [currentStep, setCurrentStep] = useState<string>("videoTask");
  const [formOrder, setFormOrder] = useState<string[]>([]);
  const [currentFormIndex, setCurrentFormIndex] = useState<number>(0);

  useEffect(() => {
    const blockRandomized = shuffle(["loneliness", "socialConnectedness", "expressivity"]);
    setFormOrder([
      "videoTask",
      "selfFrequency",
      "experience",
      "partnerSliders",
      blockRandomized[0],
      blockRandomized[1],
      blockRandomized[2],
      "autism",
      "partnerHistory",
      "demographics",
      "studyFeedback",
    ]);
  }, [csvFilePath]);


  const handleVideoTaskComplete = () => {
    setCurrentFormIndex(1);
    setCurrentStep(formOrder[1] ?? "selfFrequency");
  };

  const advanceForm = () => {
    if (currentFormIndex < formOrder.length - 1) {
      const nextIndex = currentFormIndex + 1;
      setCurrentFormIndex(nextIndex);
      setCurrentStep(formOrder[nextIndex]);
      // Questionnaire pages only — the video task reports its own sub-progress.
      onProgress?.(
        "questionnaires",
        nextIndex - 1,
        formOrder.length - 1,
        STEP_LABELS[formOrder[nextIndex]] ?? formOrder[nextIndex]
      );
    } else {
      setCurrentStep("completed");
      onComplete?.();
    }
  };

  const handleStepComplete = async (stepData?: ClassificationStepData) => {
    try {
      switch (currentStep) {
        case "partnerHistory":
          await writeCSVRow("partner_history", "Have you met your partner prior to today's study?", "", "", "", stepData?.partnerHistory ? "Yes" : "No");
          await writeCSVRow("partner_history", "How long have you known your partner? (in months)", "", "", "", String(stepData?.partnerHistoryMonths ?? ""));
          await writeCSVRow("partner_history", "I am happy with my friendship with my partner", "", "", "", String((stepData?.matrixSelections as Record<number, number>)?.[0] ?? ""));
          await writeCSVRow("partner_history", "My partner is fun to sit and talk with", "", "", "", String((stepData?.matrixSelections as Record<number, number>)?.[1] ?? ""));
          advanceForm();
          break;

        case "selfFrequency": {
          const order = stepData?.order as string[] | undefined;
          const ratings = stepData?.ratings as Record<string, number> | undefined;
          if (order && ratings) {
            for (const emotion of order) {
              await writeCSVRow("self_frequency", `How often do you feel ${emotion}?`, "", "", "", ratings[emotion] ?? "");
            }
          }
          advanceForm();
          break;
        }

        case "loneliness": {
          const order = stepData?.order as string[] | undefined;
          const sel = stepData?.matrixSelections as Record<number, number> | undefined;
          if (order && sel) {
            for (const [index, question] of order.entries()) {
              await writeCSVRow("loneliness", question, "", "", "", sel[index] ?? "");
            }
          }
          advanceForm();
          break;
        }

        case "demographics":
          await writeCSVRow("demographics", "Enter your age:", "", "", "", String(stepData?.age ?? ""));
          await writeCSVRow("demographics", "Are you Spanish, Hispanic, or Latino?", "", "", "", String(stepData?.hispanicLatino ?? ""));
          await writeCSVRow("demographics", "Choose one or more races that you consider yourself to be:", "", "", "", (stepData?.races as string[] | undefined)?.join(";") ?? "");
          await writeCSVRow("demographics", "Please specify (other race):", "", "", "", String(stepData?.otherRace ?? ""));
          await writeCSVRow("demographics", "What is your sex?", "", "", "", String(stepData?.sex ?? ""));
          await writeCSVRow("demographics", "Please provide the zip code of your permanent address (where you grew up):", "", "", "", String(stepData?.zipCode ?? ""));
          advanceForm();
          break;

        case "partnerSliders": {
          const order = stepData?.order as string[] | undefined;
          const sliderSel = stepData?.sliderSelections as Record<number, number> | undefined;
          if (order && sliderSel) {
            for (const [index, question] of order.entries()) {
              await writeCSVRow("partner_sliders", question, "", "", "", sliderSel[index] ?? "");
            }
          }
          advanceForm();
          break;
        }

        case "autism": {
          const order = stepData?.order as string[] | undefined;
          const sel = stepData?.matrixSelections as Record<number, number> | undefined;
          if (order && sel) {
            for (const [index, question] of order.entries()) {
              await writeCSVRow("autism", question, "", "", "", sel[index] ?? "");
            }
          }
          advanceForm();
          break;
        }

        case "experience":
          await writeCSVRow("experience", "How often were you thinking about the fact that your conversation was being video recorded?", "", "", "", String(stepData?.sync ?? ""));
          await writeCSVRow("experience", "How comfortable did you feel during the conversation?", "", "", "", String(stepData?.wavelength ?? ""));
          await writeCSVRow("experience", "We're interested in hearing more about your experience during your conversation. Please share any thoughts that you have below", "", "", "", String(stepData?.text ?? ""));
          advanceForm();
          break;

        case "socialConnectedness": {
          const order = stepData?.order as string[] | undefined;
          const sel = stepData?.matrixSelections as Record<number, number> | undefined;
          if (order && sel) {
            for (const [index, question] of order.entries()) {
              await writeCSVRow("social_connectedness", question, "", "", "", sel[index] ?? "");
            }
          }
          advanceForm();
          break;
        }

        case "expressivity": {
          const order = stepData?.order as string[] | undefined;
          const sel = stepData?.matrixSelections as Record<number, number> | undefined;
          if (order && sel) {
            for (const [index, question] of order.entries()) {
              await writeCSVRow("expressivity", question, "", "", "", sel[index] ?? "");
            }
          }
          advanceForm();
          break;
        }

        case "studyFeedback":
          await writeCSVRow("study_feedback", "We're interested in hearing more about your experience with our study. Please share any thoughts you have below.", "", "", "", String(stepData?.text ?? ""));
          advanceForm();
          break;

        default:
          break;
      }
    } catch (err) {
      handleCsvError(err);
    }
  };

  if (currentStep === "completed") {
    onComplete?.();
    return null;
  }

  return (
    <div className="min-h-full w-full flex flex-col items-center justify-center bg-black">
      <div className="w-full mx-auto px-8">

        {currentStep === "videoTask" && (
          <VideoTaskMain
            dyadId={formData.dyadId}
            writeRow={writeCSVRow}
            onProgress={(done, total, label) => onProgress?.("video", done, total, label)}
            onComplete={handleVideoTaskComplete}
            onCsvError={handleCsvError}
          />
        )}

        {currentStep === "partnerHistory" && (
          <PartnerHistory onContinue={(data) => handleStepComplete(data)} />
        )}
        {currentStep === "selfFrequency" && (
          <SelfFrequency onContinue={(data) => handleStepComplete(data)} />
        )}
        {currentStep === "experience" && (
          <Experience onContinue={(data) => handleStepComplete(data)} />
        )}
        {currentStep === "partnerSliders" && (
          <PartnerSliders onContinue={(data) => handleStepComplete(data)} />
        )}
        {currentStep === "loneliness" && (
          <Loneliness onContinue={(data) => handleStepComplete(data)} />
        )}
        {currentStep === "socialConnectedness" && (
          <SocialConnectedness onContinue={(data) => handleStepComplete(data)} />
        )}
        {currentStep === "expressivity" && (
          <Expressivity onContinue={(data) => handleStepComplete(data)} />
        )}
        {currentStep === "demographics" && (
          <Demographics onContinue={(data) => handleStepComplete(data)} />
        )}
        {currentStep === "autism" && (
          <Autism onContinue={(data) => handleStepComplete(data)} />
        )}
        {currentStep === "studyFeedback" && (
          <StudyFeedback onContinue={(data) => handleStepComplete(data)} />
        )}
      </div>
    </div>
  );
}

export default ClassificationTaskMain;
