import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { csvEscape } from "../utils/csv";
import type { FormData } from "../App";
import PressKeyPrompt from "../components/PressKeyPrompt";
import Instructions from "../dyad-task/Instructions";
import ScenarioRating from "./components/ScenarioRating";
import type { EmotionRating } from "./components/ScenarioRating";
import { SCENARIOS } from "./scenarios";
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

// Instructions shown before the situational emotion-rating task.
const SCENARIO_INSTRUCTIONS = [
  "In this part of the study, you will read a series of situations.",
  "For each situation, you will rate the degree to which a person would experience different emotions in that situation.",
  "You will make each rating on a scale from 1 (Not at all) to 7 (Extremely).",
  "After each emotion rating, you will also rate how confident you are about that rating, again from 1 (Not at all) to 7 (Extremely).",
  "You will be asked to provide ratings for three different people: yourself, your partner, and an average UW-Madison student.",
  "The three people will be presented in random order.",
  "For each person, please try to be as accurate as possible.",
  "We ask that you answer each question efficiently in order to keep your participation time within one hour.",
];

// Grammatical phrase for the rated target, used in the emotion prompt. "your
// partner" and "an average UW-Madison student" already read correctly; only
// "yourself" needs to become "you".
const targetPhrase = (person: string): string => (person === "yourself" ? "you" : person);

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
    setShuffledPeople(shuffle(RATING_PEOPLE));
    const blockRandomized = shuffle(["loneliness", "socialConnectedness", "expressivity"]);
    setFormOrder([
      "scenarios",
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


  useEffect(() => {
    const handleKeyPress = async (event: KeyboardEvent) => {
      if (currentStep === "instructions") {
        if (instructionIndex + 1 >= SCENARIO_INSTRUCTIONS.length) {
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

  const handleScenarioComplete = async (scenarioId: string, ratings: EmotionRating[]) => {
    const ratingPerson = shuffledPeople[currentPersonIndex];
    try {
      // Long format: one row per (emotion, measure). emotion1 = emotion, emotion2 =
      // measure type ("intensity" | "confidence"), response = the 1-7 value.
      for (const r of ratings) {
        await writeCSVRow("emotion_scenarios", scenarioId, r.emotion, "intensity", ratingPerson, r.intensity);
        await writeCSVRow("emotion_scenarios", scenarioId, r.emotion, "confidence", ratingPerson, r.confidence);
      }
    } catch (err) {
      handleCsvError(err);
    }
  };

  const handleAllScenariosComplete = async () => {
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
              groupSize={4}
              instructions={SCENARIO_INSTRUCTIONS}
            />
          </div>
        )}

        {currentStep === "ratings" && (
          <>
            {showTransition ? (
              <div className="min-h-screen w-full flex flex-col justify-center items-center bg-black overflow-hidden">
                <div className=" max-w-4xl mx-auto">
                  <h1 className="text-white text-2xl">Phase Complete!</h1>
                  <p className="text-white text-2xl pt-32">
                    You have completed all ratings for{" "}
                    {shuffledPeople[currentPersonIndex]}.
                  </p>
                  <p className="text-white text-2xl pt-32">
                    You will now be rating{" "}
                    {shuffledPeople[currentPersonIndex + 1]}.
                  </p>
                  <div className="">
                    <PressKeyPrompt keyLabel="Space" text="to continue to the next person" />
                  </div>
                </div>
              </div>
            ) : shuffledPeople.length > 0 ? (
              <ScenarioRating
                key={currentPersonIndex}
                scenarios={SCENARIOS}
                targetPhrase={targetPhrase(shuffledPeople[currentPersonIndex])}
                onScenarioComplete={handleScenarioComplete}
                onAllScenariosComplete={handleAllScenariosComplete}
              />
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
