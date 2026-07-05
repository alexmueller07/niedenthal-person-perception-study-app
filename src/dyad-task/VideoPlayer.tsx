import { forwardRef } from "react";

interface VideoPlayerProps {
  videoSrc: string | null;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(
  ({ videoSrc, onFileChange }, ref) => {
    return (
      <div className="flex flex-col items-center w-full h-full pt-8">
        {!videoSrc && (
          <div className="flex flex-col items-center justify-center h-full">
            <input
              type="file"
              accept=".mp4,.mov"
              onChange={onFileChange}
              className="px-4 py-2 border border-white bg-black text-white cursor-pointer hover:bg-gray-800"
            />
            <p className="mt-4 text-white">Select a video file to begin</p>
          </div>
        )}
        {videoSrc && (
          <video
            ref={ref}
            src={videoSrc}
            autoPlay
            className="w-4/6 max-h-full object-contain"
          />
        )}
      </div>
    );
  }
);

VideoPlayer.displayName = "VideoPlayer";

export default VideoPlayer;
