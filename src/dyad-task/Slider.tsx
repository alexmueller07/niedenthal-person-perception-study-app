import { useEffect, useRef, useState } from "react";

// The continuous valence slider.
//
// MEASUREMENT — do not change without talking to Randy. The recorded value is
// `pointer X / window width * 100`, sampled every 100 ms. That formula is what
// the pilot data was collected with, so it stays exactly as it is; the pilot and
// the new sessions have to be comparable.
//
// Layout (Randy, 2026-07-30: "the words on the slider still aren't centered").
// The track now spans the same width as the labels above it, and the bar spans
// the window, so the anchors sit at the true ends of the track and the midpoint
// label sits at the true middle. Previously the track lived in a 64rem box while
// the value was a fraction of the whole window, so nothing lined up with
// anything. Only the drawing changed — the number written to ratings.csv is
// identical.
//
// The pointer is hidden while this runs (`cursor-none`), so the handle is the
// participant's only feedback: it is drawn large, with a centre tick to make
// "neutral" findable without looking away from the video.

interface SliderProps {
  resetTrigger?: number;
  onSample?: (value: number) => void;
}

/** Where the tick marks go, as a percentage across the track. */
const TICKS = [0, 25, 50, 75, 100];

function Slider({ resetTrigger, onSample }: SliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const sliderRef = useRef(50);
  const frameRef = useRef<number | null>(null);

  // The sampling loop below must survive a parent re-render untouched: if the
  // effect depended on `onSample` directly, a new inline callback would tear the
  // interval down and start a fresh one, and the 100 ms cadence is the
  // measurement.
  const onSampleRef = useRef(onSample);
  onSampleRef.current = onSample;

  useEffect(() => {
    if (resetTrigger !== undefined) {
      setSliderPosition(50);
      sliderRef.current = 50;
    }
  }, [resetTrigger]);

  useEffect(() => {
    // The ref is updated on every mouse event because it is what gets sampled;
    // the visible handle is repainted at most once per frame. Painting on every
    // mousemove was doing far more React work than the 100 ms sampler needs.
    const handleMouseMove = (event: MouseEvent) => {
      const position = (event.clientX / window.innerWidth) * 100;
      sliderRef.current = position;
      if (frameRef.current === null) {
        frameRef.current = window.requestAnimationFrame(() => {
          frameRef.current = null;
          setSliderPosition(sliderRef.current);
        });
      }
    };

    const captureInterval = setInterval(() => {
      onSampleRef.current?.(sliderRef.current);
    }, 100);

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearInterval(captureInterval);
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <div className="w-full">
      <div className="relative mb-5 h-8">
        <span className="absolute left-0 top-0 text-white text-2xl">Very Negative</span>
        <span className="absolute left-1/2 top-0 -translate-x-1/2 text-gray-400 text-xl">
          Neutral
        </span>
        <span className="absolute right-0 top-0 text-white text-2xl">Very Positive</span>
      </div>

      <div className="relative h-3 w-full rounded-full bg-white cursor-none">
        {TICKS.map((tick) => (
          <span
            key={tick}
            className="absolute top-1/2 h-5 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-gray-500"
            style={{ left: `${tick}%` }}
          />
        ))}
        <div
          className="absolute top-1/2 h-9 w-6 rounded-full border-2 border-black bg-white cursor-none"
          style={{
            // Clamped so the handle stays fully on screen at either extreme;
            // the value behind it is not clamped.
            left: `clamp(0.75rem, ${sliderPosition}%, calc(100% - 0.75rem))`,
            transform: "translateX(-50%) translateY(-50%)",
          }}
        />
      </div>
    </div>
  );
}

export default Slider;
