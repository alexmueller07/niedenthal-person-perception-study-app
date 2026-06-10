import { useState, useEffect, useRef } from "react";

interface SliderProps {
  resetTrigger?: number;
  onSample?: (value: number) => void;
}

function Slider({ resetTrigger, onSample }: SliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const sliderRef = useRef(50);

  useEffect(() => {
    if (resetTrigger !== undefined) {
      setSliderPosition(50);
      sliderRef.current = 50;
    }
  }, [resetTrigger]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const position = (event.clientX / window.innerWidth) * 100;
      setSliderPosition(position);
      sliderRef.current = position;
    };

    const captureInterval = setInterval(() => {
      if (onSample) onSample(sliderRef.current);
    }, 100);

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearInterval(captureInterval);
    };
  }, [onSample]);

  return (
    <div className="w-full mx-auto">
      <div className="flex justify-between items-center mb-6">
        <span className="text-white text-2xl">Very Negative</span>
        <span className="text-white text-2xl">Very Positive</span>
      </div>
      <div className="relative w-full h-3 mb-4 bg-white rounded-full cursor-none">
        <div
          className="absolute w-5 h-8 bg-white rounded-full top-1/2 cursor-none"
          style={{
            left: `${sliderPosition}%`,
            transform: "translateX(-50%) translateY(-50%)",
          }}
        />
      </div>
    </div>
  );
}

export default Slider;
