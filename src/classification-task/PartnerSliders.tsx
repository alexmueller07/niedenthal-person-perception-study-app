import { useEffect, useState } from "react";
import MatrixSlider from "../components/MatrixSlider";
import ConfirmationModal from "../components/ConfirmationModal";
import type { ClassificationTaskProps } from "./types";

const ORIGINAL_ROWS = ["Is similar to me?", "Is close to me?", "Is familiar to me?"];

export default function PartnerSliders({ onContinue }: ClassificationTaskProps) {
  const [sliderSelections, setSliderSelections] = useState<{ [key: number]: number }>({});
  const [shuffledRows, setShuffledRows] = useState<string[]>([]);
  const [showConfirmationModal, setShowConfirmationModal] = useState<boolean>(false);

  useEffect(() => {
    setShuffledRows([...ORIGINAL_ROWS].sort(() => Math.random() - 0.5));
  }, []);

  const selectionsForDisplay = Object.entries(sliderSelections).reduce(
    (acc, [rowIndex, value]) => {
      const q = shuffledRows[parseInt(rowIndex)];
      if (q) acc[q] = value;
      return acc;
    },
    {} as { [key: string]: number }
  );

  const isFormValid = () => Object.keys(sliderSelections).length === ORIGINAL_ROWS.length;
  const getData = () => ({ sliderSelections, order: shuffledRows });

  return (
    <div className="min-h-full w-full flex flex-col items-center justify-center bg-black">
      <div className="bg-black border p-8 w-10/12 mx-auto flex-1 flex flex-col justify-center">
        <div className="mt-20">
          <MatrixSlider
            title="My partner... (1-100: 1 = Not at all, 100 = Very much)"
            rows={shuffledRows}
            leftLabel="Not at all"
            rightLabel="Very much"
            onSelectionChange={(rowIndex, value) =>
              setSliderSelections((prev) => ({ ...prev, [rowIndex]: value }))
            }
            selections={selectionsForDisplay}
          />
        </div>
      </div>
      <div className="w-full flex justify-center pb-8 mt-20">
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
