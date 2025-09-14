"use client";

import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface WaveformProps {
  audioElement: HTMLAudioElement | null;
  audioUrl: string;
  isPlaying: boolean;
  className?: string;
  height?: number;
}

export function Waveform({
  audioElement,
  audioUrl,
  isPlaying,
  className,
  height = 80,
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Set up audio analysis with proxied audio
  useEffect(() => {
    if (!audioUrl || !canvasRef.current) return;

    const setupAudioAnalysis = async () => {
      try {
        // Create audio context if it doesn't exist
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        // Resume audio context if suspended
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }

        // Create analyzer if it doesn't exist
        if (!analyserRef.current) {
          analyserRef.current = audioContextRef.current.createAnalyser();
          analyserRef.current.fftSize = 256;
          analyserRef.current.smoothingTimeConstant = 0.6;
        }

        // Create a new audio element with proxied URL to avoid CORS
        if (!sourceRef.current) {
          const proxiedAudioUrl = `/api/audio-proxy?url=${encodeURIComponent(audioUrl)}`;
          const proxyAudioElement = new Audio();
          proxyAudioElement.crossOrigin = 'anonymous';
          proxyAudioElement.src = proxiedAudioUrl;

          // Create source from the proxy audio element
          sourceRef.current = audioContextRef.current.createMediaElementSource(proxyAudioElement);
          sourceRef.current.connect(analyserRef.current);
          // DO NOT connect analyser to destination - we only want analysis, not playback

          // Sync proxy audio with the original audio element
          if (audioElement) {
            audioElement.addEventListener('play', () => {
              proxyAudioElement.currentTime = audioElement.currentTime;
              proxyAudioElement.play().catch(console.error);
            });

            audioElement.addEventListener('pause', () => {
              proxyAudioElement.pause();
            });

            audioElement.addEventListener('seeked', () => {
              proxyAudioElement.currentTime = audioElement.currentTime;
            });

            audioElement.addEventListener('timeupdate', () => {
              // Keep proxy audio in sync (with small tolerance to avoid constant updates)
              const timeDiff = Math.abs(proxyAudioElement.currentTime - audioElement.currentTime);
              if (timeDiff > 0.5) {
                proxyAudioElement.currentTime = audioElement.currentTime;
              }
            });
          }

          setIsInitialized(true);
        }
      } catch (error) {
        console.error('Error setting up audio analysis:', error);
        setIsInitialized(false);
      }
    };

    setupAudioAnalysis();

    // Cleanup
    return () => {
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
    };
  }, [audioUrl, audioElement]);

  // Set up canvas dimensions
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      canvas.width = rect.width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [height]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying || !canvasRef.current) {
      // Stop animation and show static bars when not playing
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      drawStaticBars();
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationRunning = true;

    const animate = () => {
      if (!animationRunning || !isPlaying) return;

      const rect = canvas.getBoundingClientRect();

      if (isInitialized && analyserRef.current) {
        // Real audio analysis
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        drawRealWave(ctx, dataArray, rect.width, height);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      animationRunning = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isPlaying, isInitialized, height]);

  const drawRealWave = (
    ctx: CanvasRenderingContext2D,
    dataArray: Uint8Array,
    canvasWidth: number,
    canvasHeight: number
  ) => {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    const barCount = 60;
    const barWidth = canvasWidth / barCount;
    const centerY = canvasHeight / 2;

    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    gradient.addColorStop(0, "rgb(251, 146, 60)"); // orange-400
    gradient.addColorStop(1, "rgb(254, 215, 170)"); // orange-200

    ctx.fillStyle = gradient;

    for (let i = 0; i < barCount; i++) {
      const dataIndex = Math.floor((i / barCount) * dataArray.length);
      const amplitude = dataArray[dataIndex] / 255;
      const barHeight = amplitude * canvasHeight * 0.8;

      const x = i * barWidth;
      const y = centerY - barHeight / 2;

      ctx.fillRect(x, y, barWidth - 1, Math.max(barHeight, 2));
    }
  };


  const drawStaticBars = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, height);

    const barCount = 60;
    const barWidth = rect.width / barCount;
    const centerY = height / 2;

    ctx.fillStyle = "rgb(254, 215, 170)"; // orange-200

    for (let i = 0; i < barCount; i++) {
      const x = i * barWidth;
      const y = centerY - 2;
      ctx.fillRect(x, y, barWidth - 1, 4);
    }
  };

  return (
    <div className={cn(
      "relative overflow-hidden rounded-lg bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200/50",
      className
    )}>
      <canvas
        ref={canvasRef}
        className="w-full"
        style={{ height: `${height}px` }}
      />

      {/* Subtle overlay gradients for depth */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-white/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-black/10 to-transparent" />
      </div>

      {/* Playing indicator */}
      {isPlaying && (
        <div className="absolute top-2 right-2">
          <div className="flex space-x-1">
            <div className="w-1 h-4 bg-orange-500 rounded-full animate-pulse" />
            <div
              className="w-1 h-4 bg-orange-500 rounded-full animate-pulse"
              style={{ animationDelay: '0.2s' }}
            />
            <div
              className="w-1 h-4 bg-orange-500 rounded-full animate-pulse"
              style={{ animationDelay: '0.4s' }}
            />
          </div>
        </div>
      )}

    </div>
  );
}