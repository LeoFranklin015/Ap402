"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useX402Client, x402Request } from '../lib/x402-client';

const VideoPlayer: React.FC = () => {
  const { connected, account, x402fetch } = useX402Client();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleLoadVideo = async () => {
    if (!connected) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError(null);
    setVideoUrl(null);

    try {
      // Use x402fetch to get the video stream with automatic payment handling
      const videoData = await x402fetch('http://localhost:4021/video');
      
      // Convert ArrayBuffer to blob
      const blob = new Blob([videoData], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setIsPlaying(true);
    } catch (err) {
      console.error('Error loading video:', err);
      setError(err instanceof Error ? err.message : 'Failed to load video');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const time = parseFloat(e.target.value);
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  if (!connected) {
    return (
      <div className="bg-gray-100 border-2 border-gray-300 rounded-lg p-6 text-center">
        <p className="text-gray-600">Please connect your wallet to access premium video content</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border-2 border-black rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Premium Video Player</h2>
        
        {/* Video Player */}
        <div className="mb-4">
          {videoUrl ? (
            <div className="relative">
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full max-w-2xl mx-auto rounded-lg shadow-lg"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                controls
              />
            </div>
          ) : (
            <div className="w-full max-w-2xl mx-auto bg-gray-900 rounded-lg shadow-lg aspect-video flex items-center justify-center">
              <div className="text-center text-white">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                <p className="text-lg">No video loaded</p>
                <p className="text-sm text-gray-400">Click "Load Premium Video" to start</p>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="space-y-4">
          {/* Play/Pause Button */}
          <div className="flex justify-center">
            <button
              onClick={handleLoadVideo}
              disabled={loading}
              className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : 'Load Premium Video (0.05 APT)'}
            </button>
          </div>

          {/* Progress Bar */}
          {videoUrl && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">{formatTime(currentTime)}</span>
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm text-gray-600">{formatTime(duration)}</span>
              </div>
            </div>
          )}

          {/* Volume Control */}
          {videoUrl && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Volume:</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={handleVolumeChange}
                className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-sm text-gray-600">{Math.round(volume * 100)}%</span>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-4 bg-red-100 border-2 border-red-300 rounded-lg">
            <h3 className="font-semibold text-red-800 mb-2">Error</h3>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Video Info */}
        {videoUrl && (
          <div className="mt-4 p-4 bg-green-100 border-2 border-green-300 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2">Video Loaded Successfully!</h3>
            <p className="text-green-700 text-sm">
              Premium video content is now available. Payment verified and video streamed.
            </p>
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="bg-gray-100 border-2 border-gray-300 rounded-lg p-6">
        <h3 className="font-bold mb-4">How Video Streaming Works</h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <span className="bg-black text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">1</span>
            <div>
              <strong>Request Video:</strong> Click "Load Premium Video" to request access
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="bg-black text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">2</span>
            <div>
              <strong>Payment Required:</strong> Server responds with 402 Payment Required (0.05 APT)
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="bg-black text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">3</span>
            <div>
              <strong>Auto Payment:</strong> x402 client automatically handles payment and retries
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="bg-black text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">4</span>
            <div>
              <strong>Video Stream:</strong> Server streams the video with range requests for smooth playback
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
