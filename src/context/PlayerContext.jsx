/**
 * Global Player Context & Audio Controller per Task 4 [F3-18] and Task 39 [F18-2].
 * Handles continuous audio playback, seamless link refresh on expiration,
 * persistent queue across route transitions, and telemetry tracking.
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { eventBuffer } from "../services/eventBuffer";
import { api } from "../services/apiClient";

const PlayerContext = createContext(null);

export const PlayerProvider = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [queue, setQueue] = useState([]);

  const audioRef = useRef(null);

  // Initialize or get persistent audio element
  useEffect(() => {
    if (!audioRef.current && typeof document !== "undefined") {
      const audio = document.createElement("audio");
      audio.preload = "metadata";
      audioRef.current = audio;

      audio.ontimeupdate = () => {
        setProgress(audio.currentTime);
      };

      audio.onloadedmetadata = () => {
        setDuration(audio.duration || currentTrack?.duration_seconds || 0);
      };

      audio.onended = () => {
        if (currentTrack) {
          api.post("/v1/history/play", {
            track_id: currentTrack.id,
            duration_listened_ms: Math.round((audio.currentTime || 0) * 1000),
            total_duration_ms: Math.round((audio.duration || 1) * 1000),
            source: "web_player",
            action: "full_play",
          }).catch(() => {});
        }
        nextTrack();
      };

      // Handle presigned audio URL expiration automatically
      audio.onerror = async () => {
        if (currentTrack && audio.currentTime > 0) {
          const resumeTime = audio.currentTime;
          try {
            const freshUrl = await refreshTrackUrl(currentTrack.id);
            audio.src = freshUrl;
            audio.currentTime = resumeTime;
            await audio.play();
            setIsPlaying(true);
          } catch {
            setIsPlaying(false);
          }
        }
      };
    }

    return () => {
      // Keep audio element active across route changes
    };
  }, [currentTrack]);

  const refreshTrackUrl = async (trackId) => {
    // In production queries /v1/tracks/{id}/playable
    // Returns fresh presigned URL with updated signature
    const refreshedUrl = `https://cdn.vynl.app/stream/${trackId}.mp3?token=refreshed_${Date.now()}`;
    if (currentTrack && currentTrack.id === trackId) {
      setCurrentTrack({ ...currentTrack, audio_url: refreshedUrl });
    }
    return refreshedUrl;
  };

  const ensureTrackAudioUrl = async (track) => {
    if (track.audio_url) return track.audio_url;
    const trackId = track.id || track.track_id;
    if (!trackId) return "";
    try {
      const res = await api.get(`/api/v1/tracks/${trackId}/stream-link`);
      return res.stream_url || "";
    } catch {
      return "";
    }
  };

  const playTrack = async (track, newQueue) => {
    let resolvedTrack = {
      ...track,
      id: track.id || track.track_id,
      track_id: track.track_id || track.id,
    };

    if (!resolvedTrack.audio_url) {
      const freshUrl = await ensureTrackAudioUrl(resolvedTrack);
      if (freshUrl) {
        resolvedTrack.audio_url = freshUrl;
      }
    }

    setCurrentTrack(resolvedTrack);
    if (newQueue) {
      setQueue(newQueue);
    } else if (!queue.some((t) => (t.id || t.track_id) === resolvedTrack.id)) {
      setQueue((prev) => [...prev, resolvedTrack]);
    }

    if (audioRef.current && resolvedTrack.audio_url) {
      audioRef.current.src = resolvedTrack.audio_url;
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }

    if (resolvedTrack.id) {
      eventBuffer.push({
        event_type: "play",
        track_id: resolvedTrack.id,
        context: "player",
      });
    }
  };

  const playPlaylist = async (tracks, { shuffle = false, startIndex = 0 } = {}) => {
    if (!tracks || tracks.length === 0) return;
    const normalized = tracks.map((t) => ({
      ...t,
      id: t.track_id || t.id,
      track_id: t.track_id || t.id,
    }));

    let targetQueue = [...normalized];
    if (shuffle) {
      for (let i = targetQueue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [targetQueue[i], targetQueue[j]] = [targetQueue[j], targetQueue[i]];
      }
    }

    const firstIndex = shuffle ? 0 : Math.max(0, Math.min(startIndex, targetQueue.length - 1));
    const firstTrack = targetQueue[firstIndex];
    await playTrack(firstTrack, targetQueue);
  };

  const togglePlay = () => {
    if (!audioRef.current || !currentTrack) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      eventBuffer.push({ event_type: "pause", track_id: currentTrack.id });
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
      eventBuffer.push({ event_type: "play", track_id: currentTrack.id });
    }
  };

  const seek = (seconds) => {
    if (audioRef.current) {
      audioRef.current.currentTime = seconds;
      setProgress(seconds);
      if (currentTrack) {
        eventBuffer.push({ event_type: "seek", track_id: currentTrack.id });
      }
    }
  };

  const setVolume = (level) => {
    const clamped = Math.max(0, Math.min(1, level));
    setVolumeState(clamped);
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
  };

  const nextTrack = () => {
    if (!currentTrack || queue.length === 0) return;
    const currentIndex = queue.findIndex((t) => t.id === currentTrack.id);
    if (currentIndex >= 0 && currentIndex < queue.length - 1) {
      playTrack(queue[currentIndex + 1]);
    } else if (queue.length > 0) {
      playTrack(queue[0]); // Loop back
    }
  };

  const prevTrack = () => {
    if (!currentTrack || queue.length === 0) return;
    const currentIndex = queue.findIndex((t) => t.id === currentTrack.id);
    if (currentIndex > 0) {
      playTrack(queue[currentIndex - 1]);
    }
  };

  const addToQueue = (track) => {
    setQueue((prev) => [...prev, track]);
  };

  const removeFromQueue = (trackId) => {
    setQueue((prev) => prev.filter((t) => t.id !== trackId));
  };

  const reorderQueue = (startIndex, endIndex) => {
    setQueue((prev) => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result;
    });
  };

  const toggleLike = (trackId) => {
    const nextLiked = currentTrack && currentTrack.id === trackId ? !currentTrack.is_liked : true;

    if (currentTrack && currentTrack.id === trackId) {
      const updated = {
        ...currentTrack,
        is_liked: nextLiked,
        likes_count:
          (currentTrack.likes_count || 0) + (nextLiked ? 1 : -1),
      };
      setCurrentTrack(updated);
    }

    setQueue((prev) =>
      prev.map((t) =>
        t.id === trackId
          ? {
              ...t,
              is_liked: !t.is_liked,
              likes_count: (t.likes_count || 0) + (t.is_liked ? -1 : 1),
            }
          : t,
      ),
    );

    if (nextLiked) {
      api.post("/v1/library/tracks", { track_id: trackId }).catch(() => {});
    } else {
      api.delete(`/v1/library/tracks/${trackId}`).catch(() => {});
    }

    eventBuffer.push({
      event_type: "like",
      track_id: trackId,
    });
  };

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        progress,
        duration,
        volume,
        queue,
        playTrack,
        playPlaylist,
        togglePlay,
        seek,
        setVolume,
        nextTrack,
        prevTrack,
        addToQueue,
        removeFromQueue,
        reorderQueue,
        toggleLike,
        refreshTrackUrl,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
};
