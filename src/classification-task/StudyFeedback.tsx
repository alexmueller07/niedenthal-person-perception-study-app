import { useState } from "react";
import ConfirmationModal from "../components/ConfirmationModal";
import type { ClassificationTaskProps } from "./types";

export default function StudyFeedback({ onContinue }: ClassificationTaskProps) {
  const [textInput, setTextInput] = useState("");
  const [showConfirmationModal, setShowConfirmationModal] = useState<boolean>(false);

  return (
    <div className="min-h-full w-full flex flex-col items-center justify-center bg-black">
      <div className="bg-black border p-8 text-center max-w-7xl mx-auto flex-1 flex flex-col justify-center">
        <div className="mt-6">
          <label className="block text-white text-2xl mb-6 mt-20">
            We're interested in hearing more about your experience with our study.
            Please share any thoughts you have below.
          </label>
          <textarea
            value={textInput}
            placeholder="Please respond here..."
            onChange={(e) => setTextInput(e.target.value)}
            className="w-full h-56 p-4 text-white bg-gray-800 border border-white rounded-lg resize-none focus:outline-none focus:border-blue-400 text-xl"
            autoFocus
          />
        </div>
      </div>
      <div className="w-full flex justify-center pb-8">
        <button
          type="button"
          onClick={() => {
            if (textInput.trim() !== "") {
              onContinue?.({ text: textInput });
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
        onConfirm={() => { setShowConfirmationModal(false); onContinue?.({ text: textInput }); }}
        message="There are unanswered questions on this page. Would you like to continue?"
        confirmText="Continue"
        cancelText="Close"
      />
    </div>
  );
}
