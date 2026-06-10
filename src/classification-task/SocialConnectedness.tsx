import { useEffect, useState } from "react";
import MatrixQuestion from "../components/MatrixQuestion";
import ConfirmationModal from "../components/ConfirmationModal";
import type { ClassificationTaskProps } from "./types";

const ORIGINAL_ROWS = [
  "I feel disconnected from the world around me.",
  "My friends feel like family.",
  "I don't feel I participate with anyone or any group.",
  "I feel distant from people.",
  "Even around people I know, I don't feel that I really belong.",
  "I find myself actively involved in people's lives.",
  "I see people as friendly and approachable.",
  "I am in tune with the world.",
  "I am able to connect with other people.",
  "I feel like an outsider.",
  "I fit well in new situations.",
  "I catch myself losing a sense of connectedness with society.",
  "I don't feel related to most people.",
  "I feel comfortable in the presence of strangers.",
  "I see myself as a loner.",
  "I have little sense of togetherness with my peers.",
  "I feel close to people.",
  "I am able to relate to my peers.",
  "Even among my friends, there is no sense of brother/sisterhood.",
  "I feel understood by the people I know.",
];

const COLUMNS = [
  "Strongly Disagree", "Disagree", "Somewhat Disagree",
  "Neither Agree nor Disagree", "Somewhat Agree", "Agree", "Strongly Agree",
];

export default function SocialConnectedness({ onContinue }: ClassificationTaskProps) {
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
