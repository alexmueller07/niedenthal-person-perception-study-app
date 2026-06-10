import { useState } from "react";
import MatrixSlider from "../components/MatrixSlider";
import ConfirmationModal from "../components/ConfirmationModal";
import type { ClassificationTaskProps } from "./types";

const EMOTIONS = [
  "confident", "grouchy", "sad", "assertive", "unrestrained",
  "nervous", "irritable", "lively", "bold", "talkative",
  "satisfaction", "love", "contempt", "disgust", "embarrassment",
];

export default function SelfFrequency({ onContinue }: ClassificationTaskProps) {
  const [sliderSelections, setSliderSelections] = useState<{ [key: string]: number }>({});
  const [showConfirmationModal, setShowConfirmationModal] = useState<boolean>(false);
  const [touchedRows, setTouchedRows] = useState<Set<string>>(new Set());

  const [shuffledEmotions] = useState(() => [...EMOTIONS].sort(() => Math.random() - 0.5));

  const handleSliderSelectionChange = (rowIndex: number, value: number) => {
    const emotion = shuffledEmotions[rowIndex];
    setSliderSelections((prev) => ({ ...prev, [emotion]: value }));
    setTouchedRows((prev) => { const next = new Set(prev); next.add(emotion); return next; });
  };

  const isFormValid = () => touchedRows.size === EMOTIONS.length;

  const getData = () => ({ ratings: sliderSelections, order: shuffledEmotions });

  return (
    <div className="min-h-full w-full flex flex-col items-center justify-center bg-black">
      <div className="bg-black border p-8 text-center max-w-7xl mx-auto flex-1 flex flex-col justify-center">
        <MatrixSlider
          leftLabel="Never"
          rightLabel="All the time"
          defaultSelection={50}
          title="In this part of the study, you will be asked to estimate how often YOU experience each of the previously seen states. (1-100: 1 = Never 100 = All the time)"
          rows={shuffledEmotions}
          onSelectionChange={handleSliderSelectionChange}
          selections={sliderSelections}
        />
      </div>
      <div className="w-full flex justify-center pb-8">
        <button
          type="button"
          onClick={() => {
            if (isFormValid()) {
              onContinue?.(getData());
            } else {
              setShowConfirmationModal(true);
            }
          }}
          className="px-8 py-3 rounded-lg font-semibold transition-colors bg-white text-black hover:bg-gray-200"
        >
          Continue
        </button>
      </div>
      <ConfirmationModal
        isOpen={showConfirmationModal}
        onClose={() => setShowConfirmationModal(false)}
        onConfirm={() => { setShowConfirmationModal(false); onContinue?.(getData()); }}
        message="There are unanswered questions on this page. Would you like to continue?"
        confirmText="Continue"
        cancelText="Close"
      />
    </div>
  );
}
