"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, Music, Sparkles, Play, Pause, Heart } from "lucide-react";
import { SpotifyLogo } from "@/components/ui/SpotifyLogo";
import { GmailLogo } from "@/components/ui/GmailLogo";
import { IMessageToggle } from "@/components/ui/iMessageToggle";
import { SunoService, SunoClip } from "@/lib/suno-service";
import InlineProcessing, {
  ProcessingState,
} from "@/components/InlineProcessing";
import { Waveform } from "@/components/ui/waveform";

export default function MusicGenerator() {
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [generatedTags, setGeneratedTags] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const [generatedClips, setGeneratedClips] = useState<SunoClip[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<{ [key: string]: boolean }>({});
  const [audioElements, setAudioElements] = useState<{
    [key: string]: HTMLAudioElement;
  }>({});
  const [currentTime, setCurrentTime] = useState<{ [key: string]: number }>({});
  const [duration, setDuration] = useState<{ [key: string]: number }>({});
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<{
    [key: string]: number | undefined;
  }>({});
  const [isDownloading, setIsDownloading] = useState<{
    [key: string]: boolean;
  }>({});

  // OAuth state
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null);
  const [gmailToken, setGmailToken] = useState<string | null>(null);
  const [isSpotifyConnected, setIsSpotifyConnected] = useState(false);
  const [isGmailConnected, setIsGmailConnected] = useState(false);
  const [isSpotifyConnecting, setIsSpotifyConnecting] = useState(false);
  const [isGmailConnecting, setIsGmailConnecting] = useState(false);

  // iMessage state
  const [isMessagesEnabled, setIsMessagesEnabled] = useState(true);

  // Generate from My Life state
  const [isGeneratingFromLife, setIsGeneratingFromLife] = useState(false);

  // Processing Modal state
  const [processingState, setProcessingState] = useState<ProcessingState>({
    currentStep: "messages",
    currentSubStep: "",
    progress: 0,
    isProcessing: false,
    data: {},
  });
  const [isProcessingVisible, setIsProcessingVisible] = useState(false);

  const handleDownload = async (clip: SunoClip) => {
    if (!clip.audio_url || isDownloading[clip.id]) return;

    setIsDownloading((prev) => ({ ...prev, [clip.id]: true }));

    try {
      const response = await fetch(clip.audio_url);
      if (!response.ok) throw new Error("Failed to fetch audio");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${clip.title || "generated-song"}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
      // Fallback: try direct link (may open in new tab)
      const link = document.createElement("a");
      link.href = clip.audio_url;
      link.download = `${clip.title || "generated-song"}.mp3`;
      link.click();
    } finally {
      setIsDownloading((prev) => ({ ...prev, [clip.id]: false }));
    }
  };

  // Check for OAuth callback tokens on page load and restore from localStorage
  useEffect(() => {
    // First, check localStorage for existing tokens
    const storedSpotifyToken = localStorage.getItem("spotify_access_token");
    const storedGmailToken = localStorage.getItem("gmail_access_token");

    if (storedSpotifyToken) {
      setSpotifyToken(storedSpotifyToken);
      setIsSpotifyConnected(true);
    }
    if (storedGmailToken) {
      setGmailToken(storedGmailToken);
      setIsGmailConnected(true);
    }

    // Then check URL parameters for new tokens
    const urlParams = new URLSearchParams(window.location.search);
    const spotifyAccessToken = urlParams.get("spotify_access_token");
    const gmailAccessToken = urlParams.get("gmail_access_token");

    if (spotifyAccessToken) {
      setSpotifyToken(spotifyAccessToken);
      setIsSpotifyConnected(true);
      localStorage.setItem("spotify_access_token", spotifyAccessToken);
    }
    if (gmailAccessToken) {
      setGmailToken(gmailAccessToken);
      setIsGmailConnected(true);
      localStorage.setItem("gmail_access_token", gmailAccessToken);
    }

    if (spotifyAccessToken || gmailAccessToken) {
      // Clean URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleSpotifyLogin = async () => {
    if (isSpotifyConnected) return;
    setIsSpotifyConnecting(true);
    window.location.href = "/api/spotify/auth";
  };

  const handleSpotifyDisconnect = async () => {
    setSpotifyToken(null);
    setIsSpotifyConnected(false);
    localStorage.removeItem("spotify_access_token");

    // Clear Spotify OAuth session by making a request to revoke endpoint
    try {
      if (spotifyToken) {
        await fetch("https://accounts.spotify.com/api/revoke", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            token: spotifyToken,
          }),
        });
      }
    } catch (error) {
      console.log("Error revoking Spotify token:", error);
    }

    // Clear all Spotify-related cookies and session data
    document.cookie.split(";").forEach((c) => {
      const eqPos = c.indexOf("=");
      const name = eqPos > -1 ? c.substring(0, eqPos) : c;
      if (name.trim().toLowerCase().includes("spotify")) {
        document.cookie =
          name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      }
    });
  };

  const handleGmailLogin = async () => {
    if (isGmailConnected) return;
    setIsGmailConnecting(true);
    window.location.href = "/api/gmail/auth";
  };

  const handleGmailDisconnect = async () => {
    setGmailToken(null);
    setIsGmailConnected(false);
    localStorage.removeItem("gmail_access_token");

    // Clear Gmail OAuth session by revoking the token
    try {
      if (gmailToken) {
        await fetch(
          `https://oauth2.googleapis.com/revoke?token=${gmailToken}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
          }
        );
      }
    } catch (error) {
      console.log("Error revoking Gmail token:", error);
    }

    // Clear all Google-related cookies and session data
    document.cookie.split(";").forEach((c) => {
      const eqPos = c.indexOf("=");
      const name = eqPos > -1 ? c.substring(0, eqPos) : c;
      if (
        name.trim().toLowerCase().includes("google") ||
        name.trim().toLowerCase().includes("gmail")
      ) {
        document.cookie =
          name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      }
    });
  };

  const updateProcessingState = (updates: Partial<ProcessingState>) => {
    setProcessingState((prev) => ({ ...prev, ...updates }));
  };

  const handleGenerateFromLife = async () => {
    if (!isSpotifyConnected || !isGmailConnected) {
      setError("Please connect both Spotify and Gmail first");
      return;
    }

    // Initialize processing view
    setIsProcessingVisible(true);
    setIsGeneratingFromLife(true);
    setIsComplete(false);
    setGeneratedClips([]);
    setError(null);

    updateProcessingState({
      currentStep: "messages",
      currentSubStep: "",
      progress: 0,
      isProcessing: true,
      data: {},
    });

    try {
      // STEP 1: Message Data Collection
      updateProcessingState({
        currentStep: "messages",
        currentSubStep: "Analyzing conversation patterns...",
        progress: 5,
      });

      // Extract real iMessage data
      const iMessageResponse = await fetch("/api/imessage/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const iMessageData = iMessageResponse.ok
        ? await iMessageResponse.json()
        : null;

      if (iMessageData?.data?.preview) {
        updateProcessingState({
          currentSubStep: "Processing recent conversations...",
          progress: 15,
          data: { messagesPreview: iMessageData.data.preview },
        });
      } else {
        // Fallback if iMessage extraction fails
        updateProcessingState({
          currentSubStep: "Processing recent conversations...",
          progress: 15,
          data: {
            messagesPreview: [
              iMessageData?.data?.summary || "Message extraction unavailable",
            ],
          },
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // STEP 2: Gmail Data Collection
      updateProcessingState({
        currentStep: "gmail",
        currentSubStep: "Fetching recent messages...",
        progress: 20,
      });

      const gmailResponse = await fetch("/api/gmail/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: gmailToken }),
      });

      const gmailData = gmailResponse.ok ? await gmailResponse.json() : null;

      if (gmailData?.data?.recentEmails) {
        const subjects = gmailData.data.recentEmails.map(
          (email: any) => email.subject
        );
        updateProcessingState({
          currentSubStep: `Processing ${gmailData.data.count} messages...`,
          progress: 30,
          data: { ...processingState.data, gmailPreview: subjects },
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 1000)); // Show preview

      // STEP 3: Spotify Data Collection
      updateProcessingState({
        currentStep: "spotify",
        currentSubStep: "Loading top artists...",
        progress: 40,
      });

      console.log(
        "[Frontend] Fetching Spotify data with token:",
        spotifyToken?.substring(0, 20) + "..."
      );
      const spotifyResponse = await fetch("/api/spotify/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: spotifyToken }),
      });

      console.log(
        `[Frontend] Spotify API response: ${spotifyResponse.status} ${spotifyResponse.statusText}`
      );

      let spotifyData = null;
      if (spotifyResponse.ok) {
        spotifyData = await spotifyResponse.json();
        console.log("[Frontend] Spotify data fetched successfully");
      } else {
        const errorText = await spotifyResponse.text();
        console.error(
          `[Frontend] Spotify API failed: ${spotifyResponse.status} - ${errorText}`
        );
        if (spotifyResponse.status === 403) {
          console.error(
            "[Frontend] 403 Forbidden - likely token expired or insufficient scopes"
          );
        } else if (spotifyResponse.status === 401) {
          console.error(
            "[Frontend] 401 Unauthorized - token invalid or malformed"
          );
        } else if (spotifyResponse.status === 429) {
          console.error("[Frontend] 429 Rate Limited - too many requests");
        }
        spotifyData = null;
      }

      if (spotifyData?.data?.topArtists) {
        const artists = spotifyData.data.topArtists.map(
          (artist: any) => artist.name
        );
        updateProcessingState({
          currentSubStep: "Loading top tracks...",
          progress: 55,
          data: { ...processingState.data, spotifyPreview: artists },
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 1000)); // Show preview

      // STEP 4: Claude Prompt Generation
      updateProcessingState({
        currentStep: "claude",
        currentSubStep: "Analyzing your data...",
        progress: 70,
      });

      const promptResponse = await fetch("/api/generate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spotifyData: spotifyData?.data,
          gmailData: gmailData?.data,
          includeMessages: isMessagesEnabled
        })
      });

      if (!promptResponse.ok) {
        throw new Error("Failed to generate personalized prompt");
      }

      const promptData = await promptResponse.json();

      updateProcessingState({
        currentSubStep: "Generating personalized prompt...",
        progress: 85,
        data: { ...processingState.data, generatedPrompt: promptData.prompt },
      });

      // Store the generated prompt for display
      setGeneratedPrompt(promptData.prompt);
      setGeneratedTags(promptData.tags);

      await new Promise((resolve) => setTimeout(resolve, 2000)); // Show typing effect

      // STEP 4: Suno Generation (Non-blocking)
      updateProcessingState({
        currentStep: "suno",
        currentSubStep: "Sending prompt to Suno AI...",
        progress: 80,
      });

      // Start Suno generation but don't wait for completion
      SunoService.generateAndWaitForCompletion(
        {
          prompt: promptData.prompt,
          tags: promptData.tags || undefined,
          makeInstrumental: false,
        },
        (clips) => {
          if (clips && clips.length > 0) {
            setGeneratedClips(clips);
            // Check if any clips are available for streaming
            const hasStreamingClips = clips.some(
              (clip) => clip.status === "streaming" && clip.audio_url
            );
            if (hasStreamingClips) {
              setIsComplete(true);
            }
          }
        }
      )
        .then((finalClips) => {
          setGeneratedClips(finalClips);
          setIsComplete(true);
        })
        .catch((error) => {
          console.error("Suno generation error:", error);
          setError(
            error instanceof Error ? error.message : "Failed to generate song"
          );
        });

      // Update to show Suno started, then auto-complete the processing view
      updateProcessingState({
        currentSubStep:
          "AI composing your song... You can return to the main page!",
        progress: 85,
      });

      // Auto-complete after a short delay to let user see Suno started
      setTimeout(() => {
        updateProcessingState({
          currentStep: "complete",
          currentSubStep: "Song generation in progress...",
          progress: 100,
        });
      }, 2000);
    } catch (error) {
      console.error("Generate from life error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to generate personalized song";
      setError(errorMessage);
      updateProcessingState({
        data: { ...processingState.data, error: errorMessage },
      });
    } finally {
      setIsGeneratingFromLife(false);
    }
  };

  const handleCancelProcessing = () => {
    setIsProcessingVisible(false);
    setIsGeneratingFromLife(false);
    updateProcessingState({
      isProcessing: false,
      currentStep: "gmail",
      currentSubStep: "",
      progress: 0,
      data: {},
    });
  };

  const handleCompleteProcessing = () => {
    setIsProcessingVisible(false);
    setIsGeneratingFromLife(false);
  };

  const refreshAudioMetadata = (clip: SunoClip) => {
    const clipId = clip.id;
    const audio = audioElements[clipId];
    if (audio) {
      if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
        setDuration((prev) => ({ ...prev, [clipId]: audio.duration }));
      }
      if (audio.currentTime !== undefined && isFinite(audio.currentTime)) {
        setCurrentTime((prev) => ({ ...prev, [clipId]: audio.currentTime }));
      }
    }
  };

  const togglePlayPause = (clip: SunoClip) => {
    if (!clip.audio_url) return;

    const clipId = clip.id;

    // Refresh metadata when status is complete but duration isn't set
    if (clip.status === "complete" && !duration[clipId]) {
      refreshAudioMetadata(clip);
    }

    if (audioElements[clipId]) {
      if (isPlaying[clipId]) {
        audioElements[clipId].pause();
        setIsPlaying((prev) => ({ ...prev, [clipId]: false }));
      } else {
        // Pause all other audio first
        Object.keys(audioElements).forEach((id) => {
          if (id !== clipId && isPlaying[id]) {
            audioElements[id].pause();
            setIsPlaying((prev) => ({ ...prev, [id]: false }));
          }
        });

        audioElements[clipId].play();
        setIsPlaying((prev) => ({ ...prev, [clipId]: true }));
      }
    } else {
      const audio = new Audio(clip.audio_url);
      audio.addEventListener("ended", () => {
        setIsPlaying((prev) => ({ ...prev, [clipId]: false }));
      });
      audio.addEventListener("error", (e) => {
        console.error("Audio playback error:", e);
        setIsPlaying((prev) => ({ ...prev, [clipId]: false }));
      });
      audio.addEventListener("loadedmetadata", () => {
        if (audio.duration && isFinite(audio.duration)) {
          setDuration((prev) => ({ ...prev, [clipId]: audio.duration }));
        }
      });
      audio.addEventListener("timeupdate", () => {
        // Don't update current time while dragging to prevent conflicts
        if (!isDragging || isDragging !== clipId) {
          if (audio.currentTime && isFinite(audio.currentTime)) {
            setCurrentTime((prev) => ({
              ...prev,
              [clipId]: audio.currentTime,
            }));
          }
        }
      });

      audio.addEventListener("timeupdate", () => {
        if (audio.duration && isFinite(audio.duration) && !duration[clipId]) {
          setDuration((prev) => ({ ...prev, [clipId]: audio.duration }));
        }
      });

      setAudioElements((prev) => ({ ...prev, [clipId]: audio }));

      // Pause all other audio first
      Object.keys(audioElements).forEach((id) => {
        if (isPlaying[id]) {
          audioElements[id].pause();
          setIsPlaying((prev) => ({ ...prev, [id]: false }));
        }
      });

      audio.play();
      setIsPlaying((prev) => ({ ...prev, [clipId]: true }));
    }
  };

  const handleSeek = (clip: SunoClip, seekTime: number) => {
    const clipId = clip.id;
    if (audioElements[clipId]) {
      audioElements[clipId].currentTime = seekTime;
      setCurrentTime((prev) => ({ ...prev, [clipId]: seekTime }));
    }
  };

  const handleMouseDown = (clip: SunoClip, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(clip.id);

    const progressBar = document.querySelector(
      `[data-clip-id="${clip.id}"]`
    ) as HTMLElement;

    if (!progressBar || !getClipDuration(clip)) return;

    let lastSeekTime = currentTime[clip.id] || 0;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      const rect = progressBar.getBoundingClientRect();

      const rawClickPosition = (e.clientX - rect.left) / rect.width;
      const clickPosition = Math.max(0, Math.min(1, rawClickPosition));
      const clipDuration = getClipDuration(clip);
      const seekTime = clickPosition * clipDuration;
      lastSeekTime = seekTime;
      setDragPosition((prev) => ({ ...prev, [clip.id]: seekTime }));
    };

    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault();

      if (lastSeekTime !== undefined && lastSeekTime >= 0) {
        handleSeek(clip, lastSeekTime);
        setCurrentTime((prev) => ({ ...prev, [clip.id]: lastSeekTime }));
      }

      setIsDragging(null);
      setDragPosition((prev) => {
        const newState = { ...prev };
        delete newState[clip.id];
        return newState;
      });
      document.removeEventListener("mousemove", handleMouseMove, {
        capture: true,
      });
      document.removeEventListener("mouseup", handleMouseUp, { capture: true });
    };
    document.addEventListener("mousemove", handleMouseMove, { capture: true });
    document.addEventListener("mouseup", handleMouseUp, { capture: true });
  };

  const handleTrackClick = (clip: SunoClip, e: React.MouseEvent) => {
    if (isDragging) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickPosition = (e.clientX - rect.left) / rect.width;
    const seekTime = clickPosition * getClipDuration(clip);
    handleSeek(clip, seekTime);
  };

  const formatTime = (time: number): string => {
    if (!time || isNaN(time) || !isFinite(time)) return "0:00";

    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const getDisplayPosition = (clipId: string): number => {
    if (isDragging === clipId && dragPosition[clipId] !== undefined) {
      return dragPosition[clipId]!;
    }
    return currentTime[clipId] || 0;
  };

  const getProgressPercentage = (clipId: string, clip?: SunoClip): number => {
    const position = getDisplayPosition(clipId);
    const clipDuration = clip ? getClipDuration(clip) : duration[clipId];
    if (!clipDuration || !isFinite(clipDuration) || clipDuration <= 0) return 0;
    return Math.min(100, Math.max(0, (position / clipDuration) * 100));
  };

  const getClipDuration = (clip: SunoClip): number => {
    return duration[clip.id] || clip.metadata.duration || 0;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black relative overflow-hidden">
      {/* Animated background elements with teal presence */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Teal accent shapes */}
        <div className="absolute top-20 left-10 w-40 h-24 bg-gradient-to-r from-teal-500/15 to-blue-500/12 rounded-full blur-xl pulse-slow" />
        <div className="absolute top-40 right-20 w-48 h-28 bg-gradient-to-r from-blue-500/12 to-teal-500/18 rounded-full blur-xl pulse-slow delay-1000" />
        <div className="absolute bottom-32 left-1/4 w-44 h-26 bg-gradient-to-r from-teal-500/20 to-cyan-500/15 rounded-full blur-xl pulse-slow delay-2000" />
        <div className="absolute bottom-20 right-1/3 w-36 h-22 bg-gradient-to-r from-cyan-500/12 to-teal-500/16 rounded-full blur-xl pulse-slow delay-500" />
        <div className="absolute top-60 left-1/2 w-32 h-20 bg-gradient-to-r from-teal-500/14 to-blue-500/10 rounded-full blur-2xl pulse-slow delay-3000" />

        {/* Additional teal background elements */}
        <div className="absolute top-1/3 right-1/6 w-28 h-16 bg-gradient-to-r from-teal-400/8 to-cyan-400/12 rounded-full blur-lg pulse-slow delay-4000" />
        <div className="absolute bottom-1/4 left-1/8 w-24 h-14 bg-gradient-to-r from-blue-400/10 to-teal-400/14 rounded-full blur-lg pulse-slow delay-2500" />

        {/* Floating accent points */}
        <div
          className="absolute top-1/4 left-1/3 w-3 h-3 bg-teal-400/40 rounded-full float"
          style={{ animationDelay: "0s" }}
        />
        <div
          className="absolute top-3/4 right-1/4 w-2 h-2 bg-blue-400/40 rounded-full float"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute top-1/2 left-1/6 w-4 h-4 bg-teal-400/30 rounded-full float"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="absolute bottom-1/3 right-1/3 w-2.5 h-2.5 bg-cyan-400/35 rounded-full float"
          style={{ animationDelay: "3s" }}
        />
      </div>

      {/* Teal-tinted grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(36,183,208,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(36,183,208,0.03)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none" />

      <div className="relative z-10 w-full px-6 py-16">
        <div className="w-full max-w-7xl mx-auto space-y-16">
          {/* Header */}
          <div className="text-center space-y-8 fade-in">
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="p-4 surface-2 rounded-2xl border border-blue-500/30 hover:border-blue-400/50 transition-colors hover-glow">
                <Music className="w-12 h-12 text-blue-400" />
              </div>
              <div className="p-3 surface-2 rounded-xl border border-teal-500/30 hover:border-teal-400/50 transition-colors hover-glow">
                <Sparkles className="w-10 h-10 text-teal-400" />
              </div>
            </div>
            <div className="space-y-6">
              <h1 className="text-7xl font-bold text-balance bg-gradient-to-r from-white via-blue-200 to-teal-300 bg-clip-text text-transparent hover:scale-105 transition-transform duration-500">
                Serenade
              </h1>
              <p className="text-2xl text-gray-300 max-w-4xl mx-auto font-light leading-relaxed">
                Transform your digital footprint into a personalized musical
                masterpiece
              </p>
            </div>
          </div>

          {/* Main Interface - Full Width */}
          <div className="w-full space-y-12">
            <Card className="surface-2 hover-lift p-12 rounded-3xl border border-gray-600/50 slide-up shadow-2xl w-full">
              <div className="space-y-10">
                {/* OAuth Connections */}
                <div className="space-y-8">
                  <div className="text-center">
                    <h2 className="text-3xl font-semibold text-white mb-3">
                      Connect Your Digital Life
                    </h2>
                    <p className="text-lg text-gray-300">
                      Link your accounts to create a truly personalized song
                    </p>
                  </div>

                  {/* Connection Grid */}
                  <div className="grid md:grid-cols-3 gap-8">
                    {/* Spotify Login */}
                    <div className="space-y-4">
                      <SpotifyLogo
                        isConnected={isSpotifyConnected}
                        isConnecting={isSpotifyConnecting}
                        onConnect={handleSpotifyLogin}
                        onDisconnect={handleSpotifyDisconnect}
                        size={32}
                      />
                    </div>

                    {/* Gmail Login */}
                    <div className="space-y-4">
                      <GmailLogo
                        isConnected={isGmailConnected}
                        isConnecting={isGmailConnecting}
                        onConnect={handleGmailLogin}
                        onDisconnect={handleGmailDisconnect}
                        size={32}
                      />
                    </div>

                    {/* iMessage Toggle */}
                    <div className="space-y-4">
                      <IMessageToggle
                        isEnabled={isMessagesEnabled}
                        onToggle={() => setIsMessagesEnabled(!isMessagesEnabled)}
                        size={32}
                      />
                    </div>
                  </div>

                  {/* Generate from Life Button */}
                  {isSpotifyConnected && isGmailConnected && (
                    <div className="pt-8 border-t border-gray-600/30">
                      <Button
                        onClick={handleGenerateFromLife}
                        disabled={isGeneratingFromLife}
                        size="lg"
                        className="w-full h-20 text-2xl font-bold rounded-3xl surface-1 border-2 border-teal-500/40 hover:border-teal-400/60 hover:bg-teal-500/10 text-white shadow-2xl hover:shadow-teal-500/20 transition-all duration-500 hover:scale-105"
                      >
                        {isGeneratingFromLife ? (
                          <>
                            <div className="w-6 h-6 border-2 border-current/30 border-t-current rounded-full animate-spin mr-3" />
                            <span className="text-white">
                              Creating Your Serenade...
                            </span>
                          </>
                        ) : (
                          <>
                            <Heart className="w-8 h-8 mr-4 text-teal-400" />
                            <span className="text-white">
                              Create My Serenade
                            </span>
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  <div className="text-center">
                    <p className="text-lg text-gray-300 font-medium">
                      {!isSpotifyConnected && !isGmailConnected
                        ? "Connect both services to create a song inspired by your music taste and recent life events"
                        : !isSpotifyConnected
                        ? "Connect Spotify to complete the setup"
                        : !isGmailConnected
                        ? "Connect Gmail to complete the setup"
                        : "Ready to generate your personalized song! ✨"}
                    </p>
                  </div>

                  {/* Display Generated Prompt */}
                  {generatedPrompt && (
                    <div className="surface-3 p-8 rounded-3xl border border-teal-500/30 shadow-lg">
                      <div className="flex items-center gap-3 mb-6">
                        <Sparkles className="w-6 h-6 text-teal-400" />
                        <h3 className="text-2xl font-semibold text-white">
                          Your Personal Song Prompt
                        </h3>
                      </div>
                      <div className="space-y-4">
                        <div className="max-h-none overflow-visible">
                          <p className="text-gray-200 italic text-lg leading-relaxed whitespace-pre-wrap break-words">
                            "{generatedPrompt}"
                          </p>
                        </div>
                        {generatedTags && (
                          <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-600/30">
                            <span className="text-sm text-teal-400 font-semibold">
                              Style:
                            </span>
                            {generatedTags.split(",").map((tag, index) => (
                              <span
                                key={index}
                                className="px-3 py-2 surface-1 border border-teal-500/40 text-teal-300 rounded-full text-sm font-medium"
                              >
                                {tag.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Inline Processing View */}
                {isProcessingVisible && (
                  <InlineProcessing
                    isVisible={isProcessingVisible}
                    processingState={processingState}
                    onCancel={handleCancelProcessing}
                    onComplete={handleCompleteProcessing}
                  />
                )}

                {/* Error Display */}
                {error && (
                  <div className="surface-1 p-6 rounded-3xl border border-red-500/30">
                    <p className="text-lg text-red-400">
                      <strong>Error:</strong> {error}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Generated Songs - Full Width */}
            {generatedClips.length > 0 && (
              <div className="w-full space-y-8">
                {isComplete && (
                  <div className="text-center fade-in">
                    <div className="flex items-center justify-center gap-3 mb-4">
                      <Sparkles className="w-8 h-8 text-teal-400 animate-pulse" />
                      <span className="text-3xl">🎉</span>
                      <Sparkles className="w-8 h-8 text-blue-400 animate-pulse" />
                    </div>
                    <h3 className="text-3xl font-semibold text-white mb-3">
                      Your Serenade
                      {generatedClips.length > 1 ? "s are" : " is"} Ready!
                    </h3>
                    <p className="text-xl text-gray-300">
                      Your personalized musical journey awaits
                    </p>
                  </div>
                )}

                <div className="grid gap-6">
                  {generatedClips
                    .filter(
                      (clip) =>
                        (clip.status === "streaming" ||
                          clip.status === "complete") &&
                        clip.audio_url
                    )
                    .map((clip) => {
                      if (
                        clip.status === "complete" &&
                        !duration[clip.id] &&
                        audioElements[clip.id]
                      ) {
                        setTimeout(() => refreshAudioMetadata(clip), 100);
                      }

                      return (
                        <Card
                          key={clip.id}
                          className={`surface-2 hover-lift p-8 rounded-3xl ${
                            clip.status === "complete"
                              ? "border border-green-500/30 shadow-lg shadow-green-500/10"
                              : "border border-yellow-500/30 shadow-lg shadow-yellow-500/10"
                          } transition-all duration-500`}
                        >
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-400/20 to-teal-400/20 rounded-2xl flex items-center justify-center">
                                  <Music className="w-6 h-6 text-blue-400" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-xl text-white">
                                    {clip.title || "Untitled Song"}
                                  </h3>
                                  {clip.status === "streaming" && (
                                    <span className="inline-flex items-center gap-1 text-xs bg-yellow-400/20 text-yellow-400 px-3 py-1 rounded-full mt-1">
                                      <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                                      Live Streaming
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-sm text-blue-200/60 font-medium">
                                {clip.metadata.duration
                                  ? `${Math.round(clip.metadata.duration)}s`
                                  : ""}
                              </div>
                            </div>

                            {clip.metadata.tags && (
                              <div className="flex flex-wrap gap-2">
                                <span className="text-sm text-teal-400 font-medium">
                                  Style:
                                </span>
                                {clip.metadata.tags
                                  .split(",")
                                  .map((tag, index) => (
                                    <span
                                      key={index}
                                      className="px-2 py-1 bg-teal-400/10 text-teal-300 rounded-full text-xs font-medium"
                                    >
                                      {tag.trim()}
                                    </span>
                                  ))}
                              </div>
                            )}

                            {clip.status === "streaming" && (
                              <div className="glass p-3 rounded-xl bg-yellow-400/5 border border-yellow-400/20">
                                <p className="text-sm text-yellow-300 flex items-center gap-2">
                                  <span className="text-lg">🎵</span>
                                  Your song is still being composed! You can
                                  start listening, but full playback controls
                                  will be available once complete.
                                </p>
                              </div>
                            )}

                            {/* Audio Controls */}
                            <div className="space-y-3">
                              {/* Progress Bar - Only show for completed songs */}
                              {clip.status === "complete" &&
                                (duration[clip.id] ||
                                  clip.metadata.duration) && (
                                  <div className="space-y-2">
                                    <div className="flex justify-between text-sm font-medium text-blue-200/80">
                                      <span>
                                        {formatTime(
                                          getDisplayPosition(clip.id)
                                        )}
                                      </span>
                                      <span>
                                        {formatTime(getClipDuration(clip))}
                                      </span>
                                    </div>

                                    {/* Custom Progress Bar */}
                                    <div className="relative">
                                      <div
                                        className="h-3 bg-gradient-to-r from-blue-400/10 to-teal-400/10 rounded-full cursor-pointer border border-blue-400/20 backdrop-blur-sm"
                                        data-clip-id={clip.id}
                                        onClick={(e) =>
                                          handleTrackClick(clip, e)
                                        }
                                      >
                                        <div
                                          className="h-3 progress-gradient rounded-full pointer-events-none shadow-lg"
                                          style={{
                                            width: `${getProgressPercentage(
                                              clip.id,
                                              clip
                                            )}%`,
                                          }}
                                        />
                                        {/* Scrub handle */}
                                        <div
                                          className={`absolute top-1/2 w-5 h-5 bg-gradient-to-r from-blue-400 to-teal-400 rounded-full transform -translate-y-1/2 -translate-x-1/2 shadow-xl cursor-grab hover:from-blue-500 hover:to-teal-500 select-none transition-all duration-200 ${
                                            isDragging === clip.id
                                              ? "cursor-grabbing scale-125"
                                              : ""
                                          }`}
                                          style={{
                                            left: `${getProgressPercentage(
                                              clip.id,
                                              clip
                                            )}%`,
                                          }}
                                          onMouseDown={(e) =>
                                            handleMouseDown(clip, e)
                                          }
                                          onTouchStart={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setIsDragging(clip.id);

                                            const progressBar =
                                              document.querySelector(
                                                `[data-clip-id="${clip.id}"]`
                                              ) as HTMLElement;

                                            if (
                                              !progressBar ||
                                              !getClipDuration(clip)
                                            )
                                              return;

                                            const handleTouchMove = (
                                              e: TouchEvent
                                            ) => {
                                              e.preventDefault();
                                              if (e.touches[0]) {
                                                const rect =
                                                  progressBar.getBoundingClientRect();
                                                const clickPosition = Math.max(
                                                  0,
                                                  Math.min(
                                                    1,
                                                    (e.touches[0].clientX -
                                                      rect.left) /
                                                      rect.width
                                                  )
                                                );
                                                const seekTime =
                                                  clickPosition *
                                                  getClipDuration(clip);
                                                setDragPosition((prev) => ({
                                                  ...prev,
                                                  [clip.id]: seekTime,
                                                }));
                                              }
                                            };

                                            const handleTouchEnd = (
                                              e: TouchEvent
                                            ) => {
                                              e.preventDefault();
                                              let finalSeekTime =
                                                dragPosition[clip.id];

                                              if (e.changedTouches[0]) {
                                                const rect =
                                                  progressBar.getBoundingClientRect();
                                                const finalClickPosition =
                                                  Math.max(
                                                    0,
                                                    Math.min(
                                                      1,
                                                      (e.changedTouches[0]
                                                        .clientX -
                                                        rect.left) /
                                                        rect.width
                                                    )
                                                  );
                                                finalSeekTime =
                                                  finalClickPosition *
                                                  getClipDuration(clip);
                                              }

                                              if (finalSeekTime !== undefined) {
                                                handleSeek(clip, finalSeekTime);
                                                setCurrentTime((prev) => ({
                                                  ...prev,
                                                  [clip.id]: finalSeekTime,
                                                }));
                                              }

                                              setIsDragging(null);
                                              setDragPosition((prev) => {
                                                const newState = { ...prev };
                                                delete newState[clip.id];
                                                return newState;
                                              });

                                              document.removeEventListener(
                                                "touchmove",
                                                handleTouchMove,
                                                { capture: true }
                                              );
                                              document.removeEventListener(
                                                "touchend",
                                                handleTouchEnd,
                                                { capture: true }
                                              );
                                            };

                                            document.addEventListener(
                                              "touchmove",
                                              handleTouchMove,
                                              {
                                                passive: false,
                                                capture: true,
                                              }
                                            );
                                            document.addEventListener(
                                              "touchend",
                                              handleTouchEnd,
                                              {
                                                capture: true,
                                              }
                                            );
                                          }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                )}

                              {/* Live Audio Wave Visualization */}
                              {clip.status === "complete" && clip.audio_url && (
                                <div className="mt-4">
                                  <Waveform
                                    audioElement={
                                      audioElements[clip.id] || null
                                    }
                                    audioUrl={clip.audio_url}
                                    isPlaying={!!isPlaying[clip.id]}
                                    className="rounded-lg shadow-sm"
                                    height={80}
                                  />
                                </div>
                              )}

                              {/* Control Buttons */}
                              <div className="flex gap-3">
                                <Button
                                  onClick={() => togglePlayPause(clip)}
                                  size="lg"
                                  className="flex-1 h-12 btn-gradient text-white font-semibold rounded-2xl shadow-lg hover:shadow-blue-400/25 transition-all duration-300"
                                >
                                  {isPlaying[clip.id] ? (
                                    <>
                                      <Pause className="w-5 h-5 mr-2" />
                                      Pause
                                    </>
                                  ) : (
                                    <>
                                      <Play className="w-5 h-5 mr-2" />
                                      Play
                                    </>
                                  )}
                                </Button>

                                <Button
                                  onClick={() => handleDownload(clip)}
                                  size="lg"
                                  className={`flex-1 h-12 font-semibold rounded-2xl transition-all duration-300 ${
                                    clip.status === "streaming" ||
                                    isDownloading[clip.id]
                                      ? "glass border-2 border-gray-400/30 text-gray-400"
                                      : "glass border-2 border-teal-400/30 hover:border-teal-400/60 text-white hover:bg-teal-400/10 hover-lift shadow-lg hover:shadow-teal-400/25"
                                  }`}
                                  disabled={
                                    isDownloading[clip.id] ||
                                    clip.status === "streaming"
                                  }
                                >
                                  {isDownloading[clip.id] ? (
                                    <>
                                      <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin mr-2" />
                                      Downloading...
                                    </>
                                  ) : clip.status === "streaming" ? (
                                    <>
                                      <Download className="w-5 h-5 mr-2 opacity-50" />
                                      Available when complete
                                    </>
                                  ) : (
                                    <>
                                      <Download className="w-5 h-5 mr-2" />
                                      Download
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
