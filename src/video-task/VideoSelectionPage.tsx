import { useState } from "react";
import StimulusPlayer from "./StimulusPlayer";
import ConfirmationModal from "../components/ConfirmationModal";

// Final page of the video task: which of the clips they just rated would they
// send to their partner, and which would they keep for themselves.
//
// Both judgments sit on one page, one row per clip, so the participant compares
// "my partner would like this" against "I would like this" for the same clip
// side by side rather than from memory two screens apart. Selecting nothing is
// allowed — an empty set is itself a response — but it prompts a confirmation
// so an accidental skip is caught.

export interface VideoSelectionResult {
  /** Clip ids the participant would send to their partner. */
  forPartner: string[];
  /** Clip ids the participant would pick for themselves. */
  forSelf: string[];
  /** The row order as presented, for the record. */
  presentedOrder: string[];
}

interface VideoSelectionPageProps {
  /** Clip ids in the order they should be shown (already randomized upstream). */
  videoIds: string[];
  srcFor: (id: string) => string;
  onSubmit: (result: VideoSelectionResult) => void;
}

function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-pressed={checked}
      aria-label={label}
      className={`w-8 h-8 border flex items-center justify-center text-lg font-bold transition-colors ${
        checked
          ? "bg-white text-black border-white"
          : "bg-black text-black border-gray-500 hover:border-white"
      }`}
    >
      {checked ? "✓" : ""}
    </button>
  );
}

export default function VideoSelectionPage({
  videoIds,
  srcFor,
  onSubmit,
}: VideoSelectionPageProps) {
  const [forPartner, setForPartner] = useState<Set<string>>(new Set());
  const [forSelf, setForSelf] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<string | null>(null);
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);

  const toggle = (
    set: Set<string>,
    apply: (next: Set<string>) => void,
    id: string
  ) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    apply(next);
  };

  const submit = () => {
    setShowEmptyConfirm(false);
    onSubmit({
      forPartner: videoIds.filter((id) => forPartner.has(id)),
      forSelf: videoIds.filter((id) => forSelf.has(id)),
      presentedOrder: videoIds,
    });
  };

  const handleContinue = () => {
    if (forPartner.size === 0 && forSelf.size === 0) setShowEmptyConfirm(true);
    else submit();
  };

  return (
    <div className="min-h-full w-full flex flex-col bg-black pb-24">
      <div className="sticky top-0 z-40 w-full bg-black border-b border-white px-8 py-4">
        <h2 className="text-white text-2xl font-bold text-center">
          If you could share these videos, which ones would you send to your
          partner, and which would you pick for yourself?
        </h2>
      </div>

      <div className="flex-1 flex flex-col items-center px-8 py-8 max-w-5xl w-full mx-auto">
        <p className="text-white text-lg mb-6 text-center max-w-4xl">
          These are the videos you just rated. Select as many or as few as you
          like in each column. Click a video to watch it again.
        </p>

        <div className="w-full bg-black border p-6">
          <div className="flex items-center border-b border-white pb-3 mb-2">
            <span className="flex-1 text-white text-lg font-bold">Video</span>
            <span className="w-56 text-white text-lg font-bold text-center">
              My partner would like this
            </span>
            <span className="w-56 text-white text-lg font-bold text-center">
              I would like this
            </span>
          </div>

          {videoIds.map((id, index) => (
            <div
              key={id}
              className="flex items-center border-b border-gray-600 py-3"
            >
              <div className="flex-1 flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setPreview(id)}
                  className="relative w-40 shrink-0 border border-gray-500 hover:border-white transition-colors"
                  aria-label={`Watch video ${index + 1} again`}
                >
                  {/* #t=1 asks the webview to render the one-second frame as a
                      still, so the row shows the clip rather than a black box. */}
                  <video
                    src={`${srcFor(id)}#t=1`}
                    preload="metadata"
                    muted
                    className="w-full h-24 object-cover bg-black pointer-events-none"
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-white text-sm bg-black/40">
                    Watch again
                  </span>
                </button>
                <span className="text-white text-lg">Video {index + 1}</span>
              </div>

              <div className="w-56 flex justify-center">
                <Checkbox
                  checked={forPartner.has(id)}
                  onChange={() => toggle(forPartner, setForPartner, id)}
                  label={`My partner would like video ${index + 1}`}
                />
              </div>
              <div className="w-56 flex justify-center">
                <Checkbox
                  checked={forSelf.has(id)}
                  onChange={() => toggle(forSelf, setForSelf, id)}
                  label={`I would like video ${index + 1}`}
                />
              </div>
            </div>
          ))}

          <div className="flex items-center pt-4">
            <span className="flex-1 text-gray-400 text-base">Selected</span>
            <span className="w-56 text-gray-400 text-base text-center">
              {forPartner.size} of {videoIds.length}
            </span>
            <span className="w-56 text-gray-400 text-base text-center">
              {forSelf.size} of {videoIds.length}
            </span>
          </div>
        </div>
      </div>

      <div className="fixed bottom-8 right-8 z-40">
        <button
          type="button"
          onClick={handleContinue}
          className="px-8 py-3 rounded-lg font-semibold transition-colors bg-white text-black hover:bg-gray-200"
        >
          Continue
        </button>
      </div>

      {preview && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center px-8">
          <div className="bg-black border border-white p-6 max-w-4xl w-full">
            <StimulusPlayer src={srcFor(preview)} compact onWatched={() => {}} />
            <div className="flex justify-end mt-4">
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="px-6 py-2 text-white border border-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                Back to the list
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={showEmptyConfirm}
        onClose={() => setShowEmptyConfirm(false)}
        onConfirm={submit}
        message="You haven't selected any videos in either column. Are you sure you want to continue?"
        confirmText="Continue anyway"
        cancelText="Go back"
      />
    </div>
  );
}
