import PressKeyPrompt from "../components/PressKeyPrompt";
import ConfirmationModal from "../components/ConfirmationModal";

interface RatingOverlayProps {
  currentRatingTarget: "self" | "partner";
  textInput: string;
  setTextInput: (v: string) => void;
  numberScale: number | undefined;
  setNumberScale: (v: number | undefined) => void;
  attemptedSubmit: boolean;
  onConfirmIncomplete: () => void;
  onDismissIncomplete: () => void;
}

function RatingOverlay({
  currentRatingTarget,
  textInput,
  setTextInput,
  numberScale,
  setNumberScale,
  attemptedSubmit,
  onConfirmIncomplete,
  onDismissIncomplete,
}: RatingOverlayProps) {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-black cursor-auto">
      <div className=" max-w-2xl mx-auto px-8">
        <h1 className="text-white text-2xl mb-8">
          Please use the box below to write about how{" "}
          {currentRatingTarget === "self" ? "YOU were" : "YOUR PARTNER was"}{" "}
          feeling during the part of the conversation you just watched.
        </h1>

        <div className="space-y-6">
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            className="w-full h-56 p-4 text-white bg-gray-800 border border-white rounded-lg resize-none focus:outline-none focus:border-blue-400 text-xl"
            placeholder="Type your response here..."
            autoFocus
          />

          <div>
            <label className="block text-white text-2xl mb-6 mt-32">
              To what extent do you feel that{" "}
              {currentRatingTarget === "self" ? "YOUR PARTNER " : "YOU "}{" "}
              elicited these feelings in{" "}
              {currentRatingTarget === "self" ? "YOU " : "YOUR PARTNER "}?
              Click the corresponding number.
            </label>
            <div className="flex justify-between items-center">
              <span className="text-white text-xl">Not at all</span>
              <div className="flex justify-center items-center space-x-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((point) => (
                  <div key={point} className="flex flex-col items-center">
                    <button
                      onClick={() => setNumberScale(point)}
                      className={`w-8 h-8 rounded-full border-2 transition-all duration-200 ${
                        numberScale === point
                          ? "bg-white border-white"
                          : "bg-transparent border-white hover:bg-gray-600"
                      }`}
                    />
                    <span className="text-white text-xs mt-1">{point}</span>
                  </div>
                ))}
              </div>
              <span className="text-white text-xl">Very</span>
            </div>
            <p className="text-center text-white text-lg mt-6">
              Selected: {numberScale ?? "—"}
            </p>
          </div>

          <PressKeyPrompt keyLabel="Tab" text="to continue" />

          <ConfirmationModal
            isOpen={attemptedSubmit}
            onClose={onDismissIncomplete}
            onConfirm={onConfirmIncomplete}
            message="You haven't answered all the questions. Are you sure you want to go on?"
            confirmText="Continue"
            cancelText="Close"
          />
        </div>
      </div>
    </div>
  );
}

export default RatingOverlay;
