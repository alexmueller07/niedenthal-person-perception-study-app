import { useState, useEffect, useMemo, useCallback } from "react";
import PressKeyPrompt from "../../components/PressKeyPrompt";
import type { Scenario } from "../scenarios";

export interface EmotionRating {
  emotion: string;
  intensity: number;
  confidence: number;
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
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

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
    setAttemptedSubmit(false);
  }, [scenarioIndex]);

  const isComplete = orderedEmotions.every(
    (e) => intensity[e] !== undefined && confidence[e] !== undefined
  );

  const submit = useCallback(() => {
    if (!isComplete) {
      setAttemptedSubmit(true);
      return;
    }
    const ratings: EmotionRating[] = orderedEmotions.map((e) => ({
      emotion: e,
      intensity: intensity[e],
      confidence: confidence[e],
    }));
    onScenarioComplete(current.id, ratings);

    if (scenarioIndex + 1 >= orderedScenarios.length) {
      onAllScenariosComplete();
    } else {
      setScenarioIndex((i) => i + 1);
    }
  }, [
    isComplete,
    orderedEmotions,
    intensity,
    confidence,
    current,
    scenarioIndex,
    orderedScenarios.length,
    onScenarioComplete,
    onAllScenariosComplete,
  ]);

  // Tab submits, matching the rest of the study's interaction idiom.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Tab") {
        event.preventDefault();
        submit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [submit]);

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

        {attemptedSubmit && !isComplete && (
          <p className="text-red-400 text-lg text-center mt-8">
            Please answer every rating before continuing.
          </p>
        )}

        <div className="flex justify-center mt-4">
          <PressKeyPrompt keyLabel="Tab" text="to submit and continue" />
        </div>
      </div>
    </div>
  );
}
