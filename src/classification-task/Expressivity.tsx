import { useEffect, useState } from "react";
import MatrixQuestion from "../components/MatrixQuestion";
import ConfirmationModal from "../components/ConfirmationModal";
import type { ClassificationTaskProps } from "./types";

const ORIGINAL_ROWS = [
  "My body reacts very strongly to emotional situations.",
  "I am an emotionally expressive person.",
  "When I'm happy, my feelings show.",
  "I experience my emotions very strongly.",
  "I sometimes cry during sad movies.",
  "I have strong emotions.",
  "I am sometimes unable to hide my feelings, even though I would like to.",
  "No matter how nervous or upset I am, I tend to keep a calm exterior.",
  "I've learned it is better to suppress my anger than to show it.",
  "It is difficult for me to hide my fear.",
  "I laugh out loud when someone tells me a joke that I think is funny.",
  "People often do not know what I am feeling.",
  "What I'm feeling is written all over my face.",
  "There have been times when I have not been able to stop crying even though I tried to stop.",
  "Whenever I feel positive emotions, people can easily see exactly what I am feeling.",
  "Whenever I feel negative emotions, people can easily see exactly what I am feeling.",
];

const COLUMNS = [
  "Strongly Disagree", "Disagree", "Somewhat Disagree",
  "Neither Agree nor Disagree", "Somewhat Agree", "Agree", "Strongly Agree",
];

export default function Expressivity({ onContinue }: ClassificationTaskProps) {
  const [matrixSelections, setMatrixSelections] = useState<{ [key: number]: number }>({});
  const [shuffledRows, setShuffledRows] = useState<string[]>([]);
  const [showConfirmationModal, setShowConfirmationModal] = useState<boolean>(false);

  useEffect(() => {
    setShuffledRows([...ORIGINAL_ROWS].sort(() => Math.random() - 0.5));
  }, []);

  const isFormValid = () =>
    Object.keys(matrixSelections).length === ORIGINAL_ROWS.length &&
    Object.values(matrixSelections).every((s) => s != null);

  const getData = () => ({ matrixSelections, order: shuffledRows });

  return (
    <div className="min-h-full w-full flex flex-col items-center justify-center bg-black">
      <div className="bg-black border p-8 text-center max-w-7xl mx-auto flex-1 flex flex-col justify-center">
        <MatrixQuestion
          rows={shuffledRows}
          columns={COLUMNS}
          selections={matrixSelections}
          onSelectionChange={(rowIndex, columnIndex) =>
            setMatrixSelections((prev) => ({ ...prev, [rowIndex]: columnIndex }))
          }
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
