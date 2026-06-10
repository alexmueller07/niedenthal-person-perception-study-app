import { useEffect, useState } from "react";
import MatrixQuestion from "../components/MatrixQuestion";
import ConfirmationModal from "../components/ConfirmationModal";
import type { ClassificationTaskProps } from "./types";

const ORIGINAL_QUESTIONS = [
  'How often do you feel that you are "in tune" with the people around you?',
  "How often do you feel that you lack companionship?",
  "How often do you feel that there is no one you can turn to?",
  "How often do you feel alone?",
  "How often do you feel part of a group of friends?",
  "How often do you feel that you have a lot in common with the people around you?",
  "How often do you feel that you are no longer close to anyone?",
  "How often do you feel that your interests and ideas are not shared by those around you?",
  "How often do you feel outgoing and friendly?",
  "How often do you feel close to people?",
  "How often do you feel left out?",
  "How often do you feel that your relationships with others are not meaningful?",
  "How often do you feel that no one really knows you well?",
  "How often do you feel isolated from others?",
  "How often do you feel you can find companionship when you want it?",
  "How often do you feel that there are people who really understand you?",
  "How often do you feel shy?",
  "How often do you feel that people are around you but not with you?",
  "How often do you feel that there are people you can talk to?",
  "How often do you feel that there are people you can turn to?",
];

export default function Loneliness({ onContinue }: ClassificationTaskProps) {
  const [matrixSelections, setMatrixSelections] = useState<{ [key: number]: number }>({});
  const [showConfirmationModal, setShowConfirmationModal] = useState<boolean>(false);
  const [shuffledQuestions, setShuffledQuestions] = useState<string[]>([]);

  useEffect(() => {
    setShuffledQuestions([...ORIGINAL_QUESTIONS].sort(() => Math.random() - 0.5));
  }, []);

  const isFormValid = () =>
    Object.keys(matrixSelections).length === ORIGINAL_QUESTIONS.length &&
    Object.values(matrixSelections).every((s) => s != null);

  const getData = () => ({ matrixSelections, order: shuffledQuestions });

  return (
    <div className="min-h-full w-full flex flex-col items-center justify-center bg-black">
      <div className="bg-black border p-8 text-center max-w-7xl mx-auto flex-1 flex flex-col justify-center">
        <MatrixQuestion
          rows={shuffledQuestions}
          columns={["Never", "Rarely", "Sometimes", "Always"]}
          onSelectionChange={(rowIndex, columnIndex) =>
            setMatrixSelections((prev) => ({ ...prev, [rowIndex]: columnIndex }))
          }
          selections={matrixSelections}
        />
      </div>
      <div className="w-full flex justify-center pb-8">
        <button
          type="button"
          onClick={() => { if (isFormValid()) { onContinue?.(getData()); } else { setShowConfirmationModal(true); } }}
          className="px-8 py-3 rounded-lg font-semibold transition-colors bg-white text-black hover:bg-gray-200"
        >
          Continue
        </button>
      </div>
      <ConfirmationModal
        isOpen={showConfirmationModal}
        onClose={() => setShowConfirmationModal(false)}
        onConfirm={() => { setShowConfirmationModal(false); onContinue?.(getData()); }}
      />
    </div>
  );
}
