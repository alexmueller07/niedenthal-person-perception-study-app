import { useState, useEffect, useCallback } from "react";
import PressKeyPrompt from "../../components/PressKeyPrompt";
import ConfirmationModal from "../../components/ConfirmationModal";

interface Transition {
  initial: string;
  final: string;
}

interface TransitionRating {
  initial: string;
  final: string;
  rating: number;
  person: string;
}

interface EmotionsRatingProps {
  ratingPerson: string;
  emotionTransitions: Transition[];
  onTransitionSubmit?: (initial: string, final: string, rating: number) => void;
  onAllTransitionsComplete?: (ratings: TransitionRating[]) => void;
}

const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export default function EmotionsRating({
  ratingPerson,
  emotionTransitions,
  onTransitionSubmit,
  onAllTransitionsComplete,
}: EmotionsRatingProps) {
  const [rating, setRating] = useState<number>(50);
  const [currentTransitionIndex, setCurrentTransitionIndex] = useState<number>(0);
  const [shuffledTransitions, setShuffledTransitions] = useState<Transition[]>([]);
  const [completedRatings, setCompletedRatings] = useState<TransitionRating[]>([]);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [canSubmitAtMs, setCanSubmitAtMs] = useState<number>(0);
  const [showDefaultConfirm, setShowDefaultConfirm] = useState<boolean>(false);

  useEffect(() => {
    if (emotionTransitions.length > 0) {
      setShuffledTransitions(shuffleArray(emotionTransitions));
    }
  }, [emotionTransitions]);

  const handleTransitionSubmit = useCallback(
    (initial: string, final: string, ratingValue: number) => {
      const newRating: TransitionRating = { initial, final, rating: ratingValue, person: ratingPerson };
      const updatedRatings = [...completedRatings, newRating];
      setCompletedRatings(updatedRatings);
      onTransitionSubmit?.(initial, final, ratingValue);

      if (currentTransitionIndex + 1 >= shuffledTransitions.length) {
        setIsComplete(true);
        onAllTransitionsComplete?.(updatedRatings);
      } else {
        setCurrentTransitionIndex((prev) => prev + 1);
        setRating(50);
      }
    },
    [
      currentTransitionIndex,
      shuffledTransitions.length,
      onTransitionSubmit,
      onAllTransitionsComplete,
      completedRatings,
      ratingPerson,
    ]
  );

  useEffect(() => {
    setCanSubmitAtMs(Date.now() + 500);
  }, [currentTransitionIndex]);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (
        event.key === "Tab" &&
        !isComplete &&
        shuffledTransitions.length > 0 &&
        Date.now() >= canSubmitAtMs
      ) {
        event.preventDefault();
        const current = shuffledTransitions[currentTransitionIndex];
        if (rating === 50) {
          setShowDefaultConfirm(true);
          return;
        }
        handleTransitionSubmit(current.initial, current.final, rating);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [rating, currentTransitionIndex, shuffledTransitions, handleTransitionSubmit, isComplete, canSubmitAtMs]);

  if (shuffledTransitions.length === 0) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-black">
        <h1 className="text-white text-4xl font-bold">Loading transitions...</h1>
      </div>
    );
  }

  const current = shuffledTransitions[currentTransitionIndex];

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-black overflow-hidden">
      <div className="max-w-4xl w-full mx-auto px-8">
        {/* Progress indicator intentionally removed: showing remaining count led
            participants to rush to finish, degrading data quality. */}
        <p className="text-white text-2xl mb-16">
          Please rate the likelihood (0%–100%) of the following emotion transition for{" "}
          <strong>{ratingPerson}</strong>:
        </p>

        <p className="text-white text-3xl text-center mb-16 font-semibold">
          {current.initial} → {current.final}
        </p>

        <div className="space-y-8">
          {/* Slider track */}
          <div
            className="relative w-full h-2 bg-white rounded-full cursor-pointer"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const position = ((e.clientX - rect.left) / rect.width) * 100;
              setRating(Math.max(0, Math.min(100, position)));
            }}
          >
            <div
              className="absolute w-6 h-6 bg-white rounded-full top-1/2 cursor-pointer shadow-lg"
              style={{ left: `${rating}%`, transform: "translateX(-50%) translateY(-50%)" }}
              onMouseDown={(e) => {
                const sliderRect = e.currentTarget.parentElement?.getBoundingClientRect();
                const onMove = (ev: MouseEvent) => {
                  if (sliderRect) {
                    const pos = ((ev.clientX - sliderRect.left) / sliderRect.width) * 100;
                    setRating(Math.max(0, Math.min(100, pos)));
                  }
                };
                const onUp = () => {
                  document.removeEventListener("mousemove", onMove);
                  document.removeEventListener("mouseup", onUp);
                };
                document.addEventListener("mousemove", onMove);
                document.addEventListener("mouseup", onUp);
              }}
            />
          </div>

          {/* Tick labels */}
          <div className="relative w-full h-6">
            {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((value) => (
              <span
                key={value}
                className="absolute text-white text-sm text-center"
                style={{ left: `${value}%`, transform: "translateX(-50%)" }}
              >
                {value}
              </span>
            ))}
          </div>

          <p className="text-white text-2xl text-center mt-8">
            Selected: <strong>{Math.round(rating)}%</strong>
          </p>

          <PressKeyPrompt keyLabel="Tab" text="to submit and continue" />
        </div>
      </div>

      <ConfirmationModal
        isOpen={showDefaultConfirm}
        onClose={() => setShowDefaultConfirm(false)}
        onConfirm={() => {
          setShowDefaultConfirm(false);
          handleTransitionSubmit(current.initial, current.final, rating);
        }}
        message={`You have selected the default value of 50. Is this correct for the transition from ${current.initial} → ${current.final} for ${ratingPerson}?`}
        confirmText="Continue"
        cancelText="Close"
      />
    </div>
  );
}
