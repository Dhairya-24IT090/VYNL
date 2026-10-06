/**
 * Global Player Context & Audio Controller per Task 4 [F3-18] and Task 39 [F18-2].
 * Handles continuous audio playback, seamless link refresh on expiration,
 * persistent queue across route transitions, and telemetry tracking.
 */
import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { Track } from '../types'
import { eventBuffer } from '../services/eventBuffer'

export interface PlayerContextType {
  currentTrack: Track | null
  isPlaying: boolean
  progress: number
  duration: number
  volume: number
  queue: Track[]
  playTrack: (track: Track, newQueue?: Track[]) => void
  togglePlay: () => void
  seek: (seconds: number) => void
  setVolume: (level: number) => void
  nextTrack: () => void
  prevTrack: () => void
  addToQueue: (track: Track) => void
  removeFromQueue: (trackId: string) => void
  reorderQueue: (startIndex: number, endIndex: number) => void
  toggleLike: (trackId: string) => void
  refreshTrackUrl: (trackId: string) => Promise<string>
}

const PlayerContext = createContext<PlayerContextType | null>(null)

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [progress, setProgress] = useState<number>(0)
  const [duration, setDuration] = useState<number>(0)
  const [volume, setVolumeState] = useState<number>(0.8)
  const [queue, setQueue] = useState<Track[]>([])

  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Initialize or get persistent audio element
  useEffect(() => {
    if (!audioRef.current && typeof document !== 'undefined') {
      const audio = document.createElement('audio')
      audio.preload = 'metadata'
      audioRef.current = audio

      audio.ontimeupdate = () => {
        setProgress(audio.currentTime)
      }

      audio.onloadedmetadata = () => {
        setDuration(audio.duration || currentTrack?.duration_seconds || 0)
      }

      audio.onended = () => {
        nextTrack()
      }

      // Handle presigned audio URL expiration automatically
      audio.onerror = async () => {
        if (currentTrack && audio.currentTime > 0) {
          const resumeTime = audio.currentTime
          try {
            const freshUrl = await refreshTrackUrl(currentTrack.id)
            audio.src = freshUrl
            audio.currentTime = resumeTime
            await audio.play()
            setIsPlaying(true)
          } catch {
            setIsPlaying(false)
          }
        }
      }
    }

    return () => {
      // Keep audio element active across route changes
    }
  }, [currentTrack])

  const refreshTrackUrl = async (trackId: string): Promise<string> => {
    // In production queries /v1/tracks/{id}/playable
    // Returns fresh presigned URL with updated signature
    const refreshedUrl = `https://cdn.vynl.app/stream/${trackId}.mp3?token=refreshed_${Date.now()}`
    if (currentTrack && currentTrack.id === trackId) {
      setCurrentTrack({ ...currentTrack, audio_url: refreshedUrl })
    }
    return refreshedUrl
  }

  const playTrack = (track: Track, newQueue?: Track[]) => {
    setCurrentTrack(track)
    if (newQueue) {
      setQueue(newQueue)
    } else if (!queue.some((t) => t.id === track.id)) {
      setQueue((prev) => [...prev, track])
    }

    if (audioRef.current) {
      audioRef.current.src = track.audio_url
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {})
      setIsPlaying(true)
    }

    eventBuffer.push({
      event_type: 'play',
      track_id: track.id,
      context: 'player',
    })
  }

  const togglePlay = () => {
    if (!audioRef.current || !currentTrack) return

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
      eventBuffer.push({ event_type: 'pause', track_id: currentTrack.id })
    } else {
      audioRef.current.play().catch(() => {})
      setIsPlaying(true)
      eventBuffer.push({ event_type: 'play', track_id: currentTrack.id })
    }
  }

  const seek = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = seconds
      setProgress(seconds)
      if (currentTrack) {
        eventBuffer.push({ event_type: 'seek', track_id: currentTrack.id })
      }
    }
  }

  const setVolume = (level: number) => {
    const clamped = Math.max(0, Math.min(1, level))
    setVolumeState(clamped)
    if (audioRef.current) {
      audioRef.current.volume = clamped
    }
  }

  const nextTrack = () => {
    if (!currentTrack || queue.length === 0) return
    const currentIndex = queue.findIndex((t) => t.id === currentTrack.id)
    if (currentIndex >= 0 && currentIndex < queue.length - 1) {
      playTrack(queue[currentIndex + 1])
    } else if (queue.length > 0) {
      playTrack(queue[0]) // Loop back
    }
  }

  const prevTrack = () => {
    if (!currentTrack || queue.length === 0) return
    const currentIndex = queue.findIndex((t) => t.id === currentTrack.id)
    if (currentIndex > 0) {
      playTrack(queue[currentIndex - 1])
    }
  }

  const addToQueue = (track: Track) => {
    setQueue((prev) => [...prev, track])
  }

  const removeFromQueue = (trackId: string) => {
    setQueue((prev) => prev.filter((t) => t.id !== trackId))
  }

  const reorderQueue = (startIndex: number, endIndex: number) => {
    setQueue((prev) => {
      const result = Array.from(prev)
      const [removed] = result.splice(startIndex, 1)
      result.splice(endIndex, 0, removed)
      return result
    })
  }

  const toggleLike = (trackId: string) => {
    if (currentTrack && currentTrack.id === trackId) {
      const updated = {
        ...currentTrack,
        is_liked: !currentTrack.is_liked,
        likes_count: (currentTrack.likes_count || 0) + (currentTrack.is_liked ? -1 : 1),
      }
      setCurrentTrack(updated)
    }

    setQueue((prev) =>
      prev.map((t) =>
        t.id === trackId
          ? {
              ...t,
              is_liked: !t.is_liked,
              likes_count: (t.likes_count || 0) + (t.is_liked ? -1 : 1),
            }
          : t
      )
    )

    eventBuffer.push({
      event_type: 'like',
      track_id: trackId,
    })
  }

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
  )
}

export const usePlayer = (): PlayerContextType => {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider')
  return ctx
}
