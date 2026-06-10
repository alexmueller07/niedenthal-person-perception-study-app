import { useState, useEffect, useMemo, useCallback } from "react";
import ConfirmationModal from "../../components/ConfirmationModal";
import type { Scenario } from "../scenarios";

export interface EmotionRating {
  emotion: string;
  // "" when the participant skipped the rating (skipping is allowed in a study).
  intensity: number | "";
  confidence: number | "";
}

interface ScenarioRatingProps {
  scenarios: Scenario[];
  // Grammatical phrase for the rated target, e.g. "you", "your partner",
  // "an average UW-Madison student". Used in the emotion prompt.
  targetPhrase: string;
  // Called once per scenario with all emotion ratings for that scenario.
  onScenarioComplete: (scenarioId: string, ratings: EmotionRating[]) => void;
  // Called after the last scenario for this target is submitted.
  onAllScenariosComplete: () => void;
}

const SCALE_POINTS = [1, 2, 3, 4, 5, 6, 7];

const shuffle = <T,>(array: T[]): T[] => {
  const out = [...array];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

// A 1-7 rating row with "Not at all" / "Extremely" anchors.
function ScaleSelect({
  value,
  onSelect,
}: {
  value: number | undefined;
  onSelect: (v: number) => void;
}) {
  return (
    <div className="flex items-end justify-center gap-4 mt-3">
      {SCALE_POINTS.map((point) => (
        <button
          key={point}
          type="button"
          onClick={() => onSelect(point)}
          className={`flex flex-col items-center w-16 px-2 py-2 rounded-lg border transition-colors ${
            value === point
              ? "bg-white text-black border-white"
              : "bg-black text-white border-gray-500 hover:border-white"
          }`}
        >
          <span className="text-xl font-semibold">{point}</span>
          <span className="text-xs mt-1 h-4">
            {point === 1 ? "Not at all" : point === 7 ? "Extremely" : ""}
          </span>
        </button>
      ))}
    </div>
  );
}

export default function ScenarioRating({
  scenarios,
  targetPhrase,
  onScenarioComplete,
  onAllScenariosComplete,
}: ScenarioRatingProps) {
  // Randomize scenario order once per mount (mount is keyed per target upstream).
  const [orderedScenarios] = useState<Scenario[]>(() => shuffle(scenarios));
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [showIncompleteConfirm, setShowIncompleteConfirm] = useState(false);

  const current = orderedScenarios[scenarioIndex];

  // Randomize the emotion order for the current scenario.
  const orderedEmotions = useMemo(() => shuffle(current.emotions), [current]);

  // intensity[emotion] and confidence[emotion] for the current scenario.
  const [intensity, setIntensity] = useState<Record<string, number>>({});
  const [confidence, setConfidence] = useState<Record<string, number>>({});

  // Reset answers whenever the scenario changes.
  useEffect(() => {
    setIntensity({});
    setConfidence({});
    setShowIncompleteConfirm(false);
  }, [scenarioIndex]);

  const isComplete = orderedEmotions.every(
    (e) => intensity[e] !== undefined && confidence[e] !== undefined
  );

  // Records the scenario (blank for any skipped rating) and advances.
  const doSubmit = useCallback(() => {
    const ratings: EmotionRating[] = orderedEmotions.map((e) => ({
      emotion: e,
      intensity: intensity[e] ?? "",
      confidence: confidence[e] ?? "",
    }));
    onScenarioComplete(current.id, ratings);
    setShowIncompleteConfirm(false);

    if (scenarioIndex + 1 >= orderedScenarios.length) {
      onAllScenariosComplete();
    } else {
      setScenarioIndex((i) => i + 1);
    }
  }, [
    orderedEmotions,
    intensity,
    confidence,
    current,
    scenarioIndex,
    orderedScenarios.length,
    onScenarioComplete,
    onAllScenariosComplete,
  ]);

  // Next button: warn (but never force) when something was left blank.
  const handleNext = () => {
    if (isComplete) doSubmit();
    else setShowIncompleteConfirm(true);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-black py-12 overflow-y-auto">
      <div className="max-w-3xl w-full mx-auto px-8">
        <p className="text-gray-400 text-lg mb-4">In this part of the survey, you will read a series of situations.</p>

        <p className="text-white text-2xl mb-12 leading-relaxed">{current.text}</p>

        <div className="space-y-12">
          {orderedEmotions.map((emotion) => (
            <div key={emotion} className="border-t border-gray-700 pt-8">
              <p className="text-white text-xl mb-1">
                Rate the degree to which {targetPhrase} would feel <strong>{emotion}</strong>.
              </p>
              <ScaleSelect value={intensity[emotion]} onSelect={(v) => setIntensity((p) => ({ ...p, [emotion]: v }))} />

              <p className="text-white text-xl mt-8 mb-1">How confident are you about your rating?</p>
              <ScaleSelect value={confidence[emotion]} onSelect={(v) => setConfidence((p) => ({ ...p, [emotion]: v }))} />
            </div>
          ))}
        </div>

        <div className="flex justify-center mt-10">
          <button
            type="button"
            onClick={handleNext}
            className="px-10 py-3 rounded-lg font-semibold bg-white text-black hover:bg-gray-200 transition-colors"
          >
            Next
          </button>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showIncompleteConfirm}
        onClose={() => setShowIncompleteConfirm(false)}
        onConfirm={doSubmit}
        message="Hey, you didn't answer every question on this screen. Are you sure you want to continue?"
        confirmText="Continue anyway"
        cancelText="Go back"
      />
    </div>
  );
}
