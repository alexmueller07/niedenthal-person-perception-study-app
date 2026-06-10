import { useState } from "react";
import MatrixQuestion from "../components/MatrixQuestion";
import ConfirmationModal from "../components/ConfirmationModal";
import type { ClassificationTaskProps } from "./types";

export default function PartnerHistory({ onContinue }: ClassificationTaskProps) {
  const [partnerHistory, setPartnerHistory] = useState<boolean | null>(null);
  const [partnerHistoryMonths, setPartnerHistoryMonths] = useState<string>("");
  const [matrixSelections, setMatrixSelections] = useState<{ [rowIndex: number]: number }>({});
  const [showConfirmationModal, setShowConfirmationModal] = useState<boolean>(false);

  const matrixRows = [
    "I am happy with my friendship with my partner",
    "My partner is fun to sit and talk with",
  ];

  const handlePartnerHistoryChange = (value: boolean) => {
    setPartnerHistory(value);
    if (!value) {
      setMatrixSelections({});
      setPartnerHistoryMonths("");
    }
  };

  const isFormValid = () => {
    if (partnerHistory === null) return false;
    if (partnerHistory === false) return true;
    return partnerHistoryMonths.trim() !== "" && Object.keys(matrixSelections).length === 2;
  };

  const getData = () => ({
    partnerHistory,
    partnerHistoryMonths,
    matrixSelections,
  });

  const handleContinue = () => {
    if (isFormValid()) {
      onContinue?.(getData());
    } else {
      setShowConfirmationModal(true);
    }
  };

  return (
    <div className="min-h-full w-full flex flex-col items-center justify-center bg-black">
      <div className="bg-black border p-8 max-w-7xl mx-auto flex-1 flex flex-col justify-center">
        <div className="max-w-2xl mx-auto text-left flex flex-col justify-center mt-40">
          <label className="block text-white text-2xl">
            Have you met your partner prior to today's study?
          </label>
          <div className="flex space-x-4 mt-20">
            {([true, false] as const).map((val) => (
              <button
                key={String(val)}
                type="button"
                onClick={() => handlePartnerHistoryChange(val)}
                className={`flex-1 px-4 py-3 border border-white rounded-lg transition-colors ${
                  partnerHistory === val
                    ? "bg-white text-black"
                    : "bg-gray-800 hover:bg-gray-700 text-white"
                }`}
              >
                {val ? "Yes" : "No"}
              </button>
            ))}
          </div>
        </div>

        {partnerHistory === true && (
          <div className="mt-20">
            <div className="max-w-2xl mx-auto mb-6">
              <label className="block text-white text-2xl mb-2">
                How long have you known your partner? (in months):
              </label>
              <input
                type="text"
                value={partnerHistoryMonths}
                onChange={(e) => setPartnerHistoryMonths(e.target.value)}
                className="w-full p-3 text-white bg-gray-800 border border-white rounded-lg focus:outline-none focus:border-blue-400"
              />
            </div>
            <MatrixQuestion
              rows={matrixRows}
              columns={["Very much Disagree", "", "Somewhat Disagree", "", "Somewhat Agree", "", "Very much Agree"]}
              onSelectionChange={(rowIndex, columnIndex) =>
                setMatrixSelections((prev) => ({ ...prev, [rowIndex]: columnIndex }))
              }
              selections={matrixSelections}
            />
          </div>
        )}
      </div>

      <div className="w-full flex justify-center pb-8 mt-20">
        <button
          type="button"
          onClick={handleContinue}
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
