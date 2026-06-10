import { useEffect, useState } from "react";
import MatrixQuestion from "../components/MatrixQuestion";
import ConfirmationModal from "../components/ConfirmationModal";
import type { ClassificationTaskProps } from "./types";

const ORIGINAL_QUESTIONS = [
  "I often notice small sounds when others do not",
  "I usually concentrate more on the whole picture, rather than the small details",
  "I find it easy to do more than one thing at once",
  "If there is an interruption, I can switch back to what I was doing very quickly",
  "I find it easy to 'read between the lines' when someone is talking to me",
  "I know how to tell if someone listening to me is getting bored",
  "When I'm reading a story I find it difficult to work out the characters' intentions",
  "I like to collect information about categories of things (e.g. types of car, types of bird, types of train, types of plant etc)",
  "I find it easy to work out what someone is thinking or feeling just by looking at their face",
  "I find it difficult to work out people's intentions",
];

export default function Autism({ onContinue }: ClassificationTaskProps) {
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
          columns={["Definitely Agree", "Slightly Agree", "Slightly Disagree", "Definitely Disagree"]}
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
