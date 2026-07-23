import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Instructions from "../dyad-task/Instructions";
import VideoWatchPage from "./VideoWatchPage";
import VideoRatingPage from "./VideoRatingPage";
import type { VideoRating } from "./VideoRatingPage";
import VideoSelectionPage from "./VideoSelectionPage";
import type { VideoSelectionResult } from "./VideoSelectionPage";
import type { WatchStats } from "./StimulusPlayer";
import { SET_ASSIGNMENT_METHOD, assignSet, findVideo, resolveVideoSrc } from "./videos";
import { loadSettings } from "../utils/settings";
import { shuffle } from "../utils/shuffle";

// Video affective-response task.
//
// Replaces the situational ("scenarios") emotion-rating task. Structure is
// deliberately the same as the task it replaces, so the two remain comparable:
// three targets in random order, the same eight items rated for each, item order
// randomized within a target block. What changed is the item — a film clip
// instead of a written situation — and the scale, 1-100 instead of 1-7.
//
// Every randomization here (set, target order, clip order, emotion order) is
// written to the data file, because a randomization that is not recorded cannot
// be reproduced in analysis.

/** Kept identical to the scenario task so `ratingPerson` stays comparable. */
const RATING_PEOPLE = ["yourself", "your partner", "an average UW-Madison student"];

/**
 * When true, every clip must be watched to the end in every target block. When
 * false, a clip already watched in an earlier block can be continued past
 * without a rewatch (the participant can still replay it).
 *
 * Default true: a rating that follows a fresh viewing and one made from memory
 * three blocks later are not the same measurement. Set to false if pilot timing
 * shows the session running past an hour — CONFIRM WITH RANDY before changing.
 */
const REQUIRE_FULL_WATCH_EACH_BLOCK = true;

const VIDEO_INSTRUCTIONS = [
  "In this part of the study, you will watch a series of short videos.",
  "After each video, you will rate how strongly it evokes three different feelings, on a scale from 1 (Not at all) to 100 (Extremely).",
  "For each feeling, you will also rate how confident you are in that rating, again from 1 to 100.",
  "You will make these ratings three times: once for yourself, once for your partner, and once for an average UW-Madison student.",
  "The three people will be presented in random order, and you will see the same videos each time.",
  "Please watch each video all the way through before you make your ratings.",
  "We ask that you answer each question efficiently in order to keep your participation time within one hour.",
];

const targetPhrase = (person: string): string => (person === "yourself" ? "you" : person);

const targetReminder = (person: string): string =>
  person === "yourself" ? "Rating: yourself" : `Rating: ${person}`;

export type VideoTaskWriteRow = (
  ratingTask: string,
  subTask: string,
  emotion1: string,
  emotion2: string,
  ratingPerson: string,
  response: number | string
) => Promise<void>;

interface VideoTaskMainProps {
  /** Dyad ID, used to yoke the video set across both members of the dyad. */
  dyadId: string;
  writeRow: VideoTaskWriteRow;
  /** Reports trial progress so the researcher dashboard can show it. */
  onProgress?: (done: number, total: number, label: string) => void;
  onComplete: () => void;
  onCsvError?: (err: unknown) => void;
}

export default function VideoTaskMain({
  dyadId,
  writeRow,
  onProgress,
  onComplete,
  onCsvError,
}: VideoTaskMainProps) {
  const [stimulusDir, setStimulusDir] = useState<string | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const [phase, setPhase] = useState<"instructions" | "trials" | "transition" | "selection">(
    "instructions"
  );
  const [instructionIndex, setInstructionIndex] = useState(0);
  const [targetIndex, setTargetIndex] = useState(0);
  const [trialIndex, setTrialIndex] = useState(0);
  const [page, setPage] = useState<"watch" | "rate">("watch");

  // One draw per participant, made on mount and never re-rolled.
  const [set] = useState(() => assignSet(dyadId));
  const [people] = useState<string[]>(() => shuffle(RATING_PEOPLE));
  const [orderByTarget] = useState<string[][]>(() =>
    RATING_PEOPLE.map(() => shuffle(set.videoIds))
  );
  const [selectionOrder] = useState<string[]>(() => shuffle(set.videoIds));

  const watchedEver = useRef<Set<string>>(new Set());
  const watchStatsRef = useRef<WatchStats>({ plays: 0, firstWatchMs: null });
  const assignmentLoggedRef = useRef(false);
  const loggedOrdersRef = useRef<Set<number>>(new Set());

  const totalTrials = people.length * set.videoIds.length;
  const trialsDone = targetIndex * set.videoIds.length + trialIndex;

  const handleError = useCallback(
    (err: unknown) => {
      console.error("Video task write failed:", err);
      onCsvError?.(err);
    },
    [onCsvError]
  );

  useEffect(() => {
    void loadSettings().then((s) => {
      setStimulusDir(s.stimulusDir);
      setSettingsLoaded(true);
    });
  }, []);

  const srcFor = useCallback(
    (id: string) => resolveVideoSrc(id, stimulusDir),
    [stimulusDir]
  );

  // Record the draw once, before any rating rows, so the data file always says
  // which set the participant saw and how it was chosen.
  useEffect(() => {
    if (assignmentLoggedRef.current) return;
    assignmentLoggedRef.current = true;
    void (async () => {
      try {
        await writeRow("video_task", "set_assignment", "", "", "", set.id);
        await writeRow("video_task", "set_assignment_method", "", "", "", SET_ASSIGNMENT_METHOD);
        await writeRow("video_task", "set_contents", "", "", "", set.videoIds.join(";"));
        await writeRow("video_task", "target_order", "", "", "", people.join(";"));
      } catch (err) {
        handleError(err);
      }
    })();
  }, [set, people, writeRow, handleError]);

  // Record each block's clip order the first time that block starts.
  useEffect(() => {
    if (phase !== "trials" || loggedOrdersRef.current.has(targetIndex)) return;
    loggedOrdersRef.current.add(targetIndex);
    void writeRow(
      "video_task",
      "video_order",
      "",
      "",
      people[targetIndex],
      orderByTarget[targetIndex].join(";")
    ).catch(handleError);
  }, [phase, targetIndex, people, orderByTarget, writeRow, handleError]);

  useEffect(() => {
    const detail =
      phase === "instructions"
        ? "Instructions"
        : phase === "selection"
        ? "Choosing videos to share"
        : `Video ${trialIndex + 1} of ${set.videoIds.length} · rating ${people[targetIndex]}`;
    onProgress?.(trialsDone, totalTrials + 1, detail);
  }, [phase, trialIndex, targetIndex, trialsDone, totalTrials, people, set, onProgress]);

  // Instruction screens advance on any key, matching the rest of the app.
  useEffect(() => {
    if (phase !== "instructions") return;
    const onKeyDown = () => {
      if (instructionIndex + 1 >= VIDEO_INSTRUCTIONS.length) setPhase("trials");
      else setInstructionIndex((i) => i + 1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase, instructionIndex]);

  const currentTarget = people[targetIndex];
  const currentVideoId = orderByTarget[targetIndex]?.[trialIndex];
  const currentVideo = useMemo(
    () => (currentVideoId ? findVideo(currentVideoId) : null),
    [currentVideoId]
  );

  const handleWatched = (stats: WatchStats) => {
    watchStatsRef.current = stats;
    if (currentVideoId) watchedEver.current.add(currentVideoId);
  };

  const handleWatchContinue = async () => {
    if (!currentVideoId) return;
    const stats = watchStatsRef.current;
    try {
      await writeRow("video_affect", currentVideoId, "", "watch_plays", currentTarget, stats.plays);
      await writeRow(
        "video_affect",
        currentVideoId,
        "",
        "first_watch_ms",
        currentTarget,
        stats.firstWatchMs ?? ""
      );
    } catch (err) {
      handleError(err);
    }
    watchStatsRef.current = { plays: 0, firstWatchMs: null };
    setPage("rate");
  };

  const handleRatingSubmit = async (ratings: VideoRating[], replays: number) => {
    if (!currentVideoId) return;
    try {
      // Long format: one row per (emotion, measure), matching the scenario task
      // it replaces so the same analysis scripts read both.
      for (const r of ratings) {
        await writeRow("video_affect", currentVideoId, r.emotion, "intensity", currentTarget, r.intensity);
        await writeRow("video_affect", currentVideoId, r.emotion, "confidence", currentTarget, r.confidence);
      }
      await writeRow("video_affect", currentVideoId, "", "rating_page_replays", currentTarget, replays);
    } catch (err) {
      handleError(err);
    }

    const lastTrial = trialIndex + 1 >= orderByTarget[targetIndex].length;
    if (!lastTrial) {
      setTrialIndex((i) => i + 1);
      setPage("watch");
      return;
    }
    if (targetIndex + 1 < people.length) {
      setPhase("transition");
      return;
    }
    setPhase("selection");
  };

  const handleTransitionContinue = () => {
    setTargetIndex((i) => i + 1);
    setTrialIndex(0);
    setPage("watch");
    setPhase("trials");
  };

  const handleSelectionSubmit = async (result: VideoSelectionResult) => {
    try {
      await writeRow("video_selection", "for_partner", "", "", "", result.forPartner.join(";"));
      await writeRow("video_selection", "for_self", "", "", "", result.forSelf.join(";"));
      await writeRow("video_selection", "presented_order", "", "", "", result.presentedOrder.join(";"));
      await writeRow("video_selection", "n_for_partner", "", "", "", result.forPartner.length);
      await writeRow("video_selection", "n_for_self", "", "", "", result.forSelf.length);
    } catch (err) {
      handleError(err);
    }
    onProgress?.(totalTrials + 1, totalTrials + 1, "Video affective-response task");
    onComplete();
  };

  if (!settingsLoaded) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-black">
        <h1 className="text-white text-4xl font-bold">Loading...</h1>
      </div>
    );
  }

  if (phase === "instructions") {
    return (
      <div className="overflow-hidden h-screen justify-center items-center">
        <Instructions
          instructionIndex={instructionIndex}
          onBack={() => setInstructionIndex((i) => Math.max(0, i - 1))}
          groupSize={4}
          instructions={VIDEO_INSTRUCTIONS}
        />
      </div>
    );
  }

  if (phase === "transition") {
    return (
      <div className="min-h-screen w-full flex flex-col justify-center items-center bg-black overflow-hidden">
        <div className="max-w-4xl mx-auto text-center px-8">
          <h1 className="text-white text-2xl">Phase Complete!</h1>
          <p className="text-white text-2xl pt-32">
            You have completed all video ratings for {people[targetIndex]}.
          </p>
          <p className="text-white text-2xl pt-32">
            You will now rate the same videos for {people[targetIndex + 1]}.
          </p>
          <button
            type="button"
            onClick={handleTransitionContinue}
            className="mt-24 px-8 py-4 text-white text-xl border border-white bg-black hover:bg-gray-800 transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  if (phase === "selection") {
    return (
      <VideoSelectionPage
        videoIds={selectionOrder}
        srcFor={srcFor}
        onSubmit={handleSelectionSubmit}
      />
    );
  }

  if (!currentVideo || !currentVideoId) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-black">
        <h1 className="text-white text-4xl font-bold">Loading...</h1>
      </div>
    );
  }

  const positionLabel = `Video ${trialIndex + 1} of ${orderByTarget[targetIndex].length}`;

  return page === "watch" ? (
    <VideoWatchPage
      key={`watch-${targetIndex}-${trialIndex}`}
      src={srcFor(currentVideoId)}
      positionLabel={positionLabel}
      targetReminder={targetReminder(currentTarget)}
      alreadyWatchedEarlier={watchedEver.current.has(currentVideoId)}
      requireWatch={REQUIRE_FULL_WATCH_EACH_BLOCK}
      onWatched={handleWatched}
      onContinue={handleWatchContinue}
    />
  ) : (
    <VideoRatingPage
      key={`rate-${targetIndex}-${trialIndex}`}
      videoId={currentVideoId}
      emotions={currentVideo.emotions}
      src={srcFor(currentVideoId)}
      targetPhrase={targetPhrase(currentTarget)}
      isSelf={currentTarget === "yourself"}
      positionLabel={positionLabel}
      onSubmit={handleRatingSubmit}
    />
  );
}
