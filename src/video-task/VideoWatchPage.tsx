import { useState } from "react";
import StimulusPlayer from "./StimulusPlayer";
import type { WatchStats } from "./StimulusPlayer";

// Page 1 of each trial: watch the clip. Nothing to answer here — Continue stays
// disabled until the clip has run to the end at least once, so every rating on
// page 2 follows a complete viewing.

interface VideoWatchPageProps {
  src: string;
  /** e.g. "Video 3 of 8". */
  positionLabel: string;
  /** Reminder of whose perspective is being rated this block. */
  targetReminder: string;
  /** Set when a previous block already required a full viewing of this clip. */
  alreadyWatchedEarlier: boolean;
  /** When true, a full viewing is required in every block, not just the first. */
  requireWatch: boolean;
  onWatched: (stats: WatchStats) => void;
  onContinue: () => void;
}

export default function VideoWatchPage({
  src,
  positionLabel,
  targetReminder,
  alreadyWatchedEarlier,
  requireWatch,
  onWatched,
  onContinue,
}: VideoWatchPageProps) {
  const [watched, setWatched] = useState(false);

  const gateSatisfied = watched || (!requireWatch && alreadyWatchedEarlier);

  const handleWatched = (stats: WatchStats) => {
    setWatched(true);
    onWatched(stats);
  };

  return (
    <div className="min-h-full w-full flex flex-col bg-black pb-24">
      <div className="sticky top-0 z-40 w-full bg-black border-b border-white px-8 py-4">
        <h2 className="text-white text-2xl font-bold text-center">
          Please watch the following video all the way through.
        </h2>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 py-8 max-w-5xl w-full mx-auto">
        <div className="w-full flex items-baseline justify-between mb-3">
          <span className="text-gray-400 text-base">{positionLabel}</span>
          <span className="text-gray-400 text-base">{targetReminder}</span>
        </div>

        <StimulusPlayer src={src} onWatched={handleWatched} />

        <p className="text-white text-lg mt-6 text-center max-w-3xl">
          After the video you will be asked how strongly it evokes each of three
          feelings.
        </p>
      </div>

      <div className="fixed bottom-8 right-8 z-40 flex items-center gap-4">
        {!gateSatisfied && (
          <span className="text-gray-400 text-base">
            Please watch the video before continuing.
          </span>
        )}
        <button
          type="button"
          onClick={onContinue}
          disabled={!gateSatisfied}
          className={`px-8 py-3 rounded-lg font-semibold transition-colors ${
            gateSatisfied
              ? "bg-white text-black hover:bg-gray-200"
              : "bg-gray-700 text-gray-400 cursor-not-allowed"
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
