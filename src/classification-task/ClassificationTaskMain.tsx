import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { csvEscape } from "../utils/csv";
import type { FormData } from "../App";
import PressKeyPrompt from "../components/PressKeyPrompt";
import Instructions from "../dyad-task/Instructions";
import EmotionsRating from "./components/EmotionsRating";
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

const SOFTWARE_VERSION = "2.0.0";

interface ClassificationTaskMainProps {
  formData: FormData;
  csvFilePath: string;
  onComplete?: () => void;
  onCsvError?: (msg: string) => void;
}

function ClassificationTaskMain({
  formData,
  csvFilePath,
  onComplete,
  onCsvError,
}: ClassificationTaskMainProps) {
  const trialNumber = useRef<number>(1);

  const writeCSVRow = async (
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
  };

  const handleCsvError = (err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("CSV write failed:", msg);
    onCsvError?.(`Write failed: ${msg}`);
  };

  const [currentStep, setCurrentStep] = useState<string>("instructions");
  const [instructionIndex, setInstructionIndex] = useState<number>(0);
  const [currentPersonIndex, setCurrentPersonIndex] = useState<number>(0);
  const [shuffledPeople, setShuffledPeople] = useState<string[]>([]);
  const [showTransition, setShowTransition] = useState<boolean>(false);
  const [formOrder, setFormOrder] = useState<string[]>([]);
  const [currentFormIndex, setCurrentFormIndex] = useState<number>(0);

  const RATING_PEOPLE = ["yourself", "your partner", "an average UW-Madison student"];

  useEffect(() => {
    setShuffledPeople([...RATING_PEOPLE].sort(() => Math.random() - 0.5));
    const blockRandomized = ["loneliness", "socialConnectedness", "expressivity"].sort(
      () => Math.random() - 0.5
    );
    setFormOrder([
      "emotionTransitions",
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

  const emotionTransitions = [
    { initial: "assertive", final: "confident" },
    { initial: "assertive", final: "grouchy" },
    { initial: "assertive", final: "sad" },
    { initial: "assertive", final: "assertive" },
    { initial: "assertive", final: "unrestrained" },
    { initial: "confident", final: "confident" },
    { initial: "confident", final: "grouchy" },
    { initial: "confident", final: "sad" },
    { initial: "confident", final: "assertive" },
    { initial: "confident", final: "unrestrained" },
    { initial: "grouchy", final: "confident" },
    { initial: "grouchy", final: "grouchy" },
    { initial: "grouchy", final: "sad" },
    { initial: "grouchy", final: "assertive" },
    { initial: "grouchy", final: "unrestrained" },
    { initial: "sad", final: "confident" },
    { initial: "sad", final: "grouchy" },
    { initial: "sad", final: "sad" },
    { initial: "sad", final: "assertive" },
    { initial: "sad", final: "unrestrained" },
    { initial: "unrestrained", final: "confident" },
    { initial: "unrestrained", final: "grouchy" },
    { initial: "unrestrained", final: "sad" },
    { initial: "unrestrained", final: "assertive" },
    { initial: "unrestrained", final: "unrestrained" },
    { initial: "bold", final: "nervous" },
    { initial: "bold", final: "irritable" },
    { initial: "bold", final: "lively" },
    { initial: "bold", final: "bold" },
    { initial: "bold", final: "talkative" },
    { initial: "irritable", final: "nervous" },
    { initial: "irritable", final: "irritable" },
    { initial: "irritable", final: "lively" },
    { initial: "irritable", final: "bold" },
    { initial: "irritable", final: "talkative" },
    { initial: "lively", final: "nervous" },
    { initial: "lively", final: "irritable" },
    { initial: "lively", final: "lively" },
    { initial: "lively", final: "bold" },
    { initial: "lively", final: "talkative" },
    { initial: "nervous", final: "nervous" },
    { initial: "nervous", final: "irritable" },
    { initial: "nervous", final: "lively" },
    { initial: "nervous", final: "bold" },
    { initial: "nervous", final: "talkative" },
    { initial: "talkative", final: "nervous" },
    { initial: "talkative", final: "irritable" },
    { initial: "talkative", final: "lively" },
    { initial: "talkative", final: "bold" },
    { initial: "talkative", final: "talkative" },
    { initial: "contempt", final: "satisfaction" },
    { initial: "contempt", final: "love" },
    { initial: "contempt", final: "contempt" },
    { initial: "contempt", final: "disgust" },
    { initial: "contempt", final: "embarrassment" },
    { initial: "disgust", final: "satisfaction" },
    { initial: "disgust", final: "love" },
    { initial: "disgust", final: "contempt" },
    { initial: "disgust", final: "disgust" },
    { initial: "disgust", final: "embarrassment" },
    { initial: "embarrassment", final: "satisfaction" },
    { initial: "embarrassment", final: "love" },
    { initial: "embarrassment", final: "contempt" },
    { initial: "embarrassment", final: "disgust" },
    { initial: "embarrassment", final: "embarrassment" },
    { initial: "love", final: "satisfaction" },
    { initial: "love", final: "love" },
    { initial: "love", final: "contempt" },
    { initial: "love", final: "disgust" },
    { initial: "love", final: "embarrassment" },
    { initial: "satisfaction", final: "satisfaction" },
    { initial: "satisfaction", final: "love" },
    { initial: "satisfaction", final: "contempt" },
    { initial: "satisfaction", final: "disgust" },
    { initial: "satisfaction", final: "embarrassment" },
  ];

  useEffect(() => {
    const handleKeyPress = async (event: KeyboardEvent) => {
      if (currentStep === "instructions") {
        if (instructionIndex + 1 >= 10) {
          setCurrentStep("ratings");
          return;
        }
        setInstructionIndex((i) => i + 1);
        return;
      }
      if (currentStep === "ratings" && showTransition && event.key === " ") {
        event.preventDefault();
        setShowTransition(false);
        setCurrentPersonIndex((prev) => prev + 1);
        return;
      }
      if (currentStep === "completed") {
        onComplete?.();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [currentStep, instructionIndex, showTransition, onComplete]);

  const handleTransitionSubmit = async (initial: string, final: string, rating: number) => {
    const ratingPerson = shuffledPeople[currentPersonIndex];
    try {
      await writeCSVRow("emotion_transitions", `${initial}_to_${final}`, initial, final, ratingPerson, rating);
    } catch (err) {
      handleCsvError(err);
    }
  };

  const handleAllTransitionsComplete = async () => {
    if (currentPersonIndex + 1 < shuffledPeople.length) {
      setShowTransition(true);
    } else {
      setCurrentFormIndex(1);
      setCurrentStep("selfFrequency");
    }
  };

  const advanceForm = () => {
    if (currentFormIndex < formOrder.length - 1) {
      const nextIndex = currentFormIndex + 1;
      setCurrentFormIndex(nextIndex);
      setCurrentStep(formOrder[nextIndex]);
    } else {
      setCurrentStep("completed");
      onComplete?.();
    }
  };

  const handleStepComplete = async (stepData?: ClassificationStepData) => {
    try {
      switch (currentStep) {
        case "instructions":
          setCurrentStep("ratings");
          break;

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

        {currentStep === "instructions" && (
          <div className="overflow-hidden h-screen justify-center items-center">
            <Instructions
              onBack={() => setInstructionIndex((i) => Math.max(0, i - 1))}
              instructionIndex={instructionIndex}
              groupSize={5}
              instructions={[
                "You will be presented with pairs of emotions.",
                "The first emotion denotes the current state; the second emotion denotes the next emotional state.",
                "Your task is to estimate the likelihood of a person feeling the first emotion later feeling the second emotion.",
                "For this example, what is the chance of a person currently feeling Tired next feeling Excited?",
                "You will make your rating on a scale from 0-100%, where 0% means that there is zero chance that a person feeling tired will feel excited next, and where 100% means that a person feeling tired now will definitely feel excited next.",
                "You will be asked to provide ratings for three different people: yourself, your partner, and an average UW-Madison student.",
                "The three people will be presented in random order.",
                "For each person, please try to be as accurate as possible.",
                "This part will take approximately 30 minutes.",
                "We ask that you answer each question efficiently in order to keep your participation time within one hour.",
              ]}
            />
          </div>
        )}

        {currentStep === "ratings" && (
          <>
            {showTransition ? (
              <div className="min-h-screen w-full flex flex-col justify-center items-center bg-black overflow-hidden">
                <div className="max-w-4xl mx-auto">
                  <h1 className="text-white text-2xl">Phase Complete!</h1>
                  <p className="text-white text-2xl pt-20">
                    You have completed all emotion transition ratings for{" "}
                    <strong>{shuffledPeople[currentPersonIndex]}</strong>.
                  </p>
                  <p className="text-white text-2xl pt-20">
                    You will now be rating <strong>{shuffledPeople[currentPersonIndex + 1]}</strong>.
                  </p>
                  <PressKeyPrompt keyLabel="Space" text="to continue to the next person" />
                </div>
              </div>
            ) : shuffledPeople.length > 0 ? (
              <div className="min-h-screen w-full flex flex-col items-center justify-center bg-black overflow-hidden">
                <EmotionsRating
                  emotionTransitions={emotionTransitions}
                  ratingPerson={shuffledPeople[currentPersonIndex]}
                  personIndex={currentPersonIndex}
                  totalPersons={shuffledPeople.length}
                  onTransitionSubmit={handleTransitionSubmit}
                  onAllTransitionsComplete={handleAllTransitionsComplete}
                />
              </div>
            ) : (
              <div className="min-h-screen w-full flex items-center justify-center bg-black">
                <h1 className="text-white text-4xl font-bold">Loading...</h1>
              </div>
            )}
          </>
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
