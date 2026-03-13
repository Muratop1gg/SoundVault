"use client"

import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
  type ReactNode,
} from "react"
import type { Track } from "@/lib/types"

interface PlayerState {
  currentTrack: Track | null
  shareToken?: string
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isLoading: boolean
  error: string | null
}

interface PlayerContextValue extends PlayerState {
  audioRef: React.RefObject<HTMLAudioElement | null>
  play: (track: Track, shareToken?: string) => void
  pause: () => void
  resume: () => void
  togglePlay: (track: Track, shareToken?: string) => void
  seek: (time: number) => void
  setVolume: (vol: number) => void
  retry: () => void
}

const PlayerContext = createContext<PlayerContextValue | null>(null)

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [state, setState] = useState<PlayerState>({
    currentTrack: null,
    shareToken: undefined,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    isLoading: false,
    error: null,
  })

  useEffect(() => {
    const audio = new Audio()
    audio.volume = 0.8
    audio.preload = "metadata"
    audioRef.current = audio

    const onTimeUpdate = () => setState((s) => ({ ...s, currentTime: audio.currentTime }))
    const onDurationChange = () => setState((s) => ({ ...s, duration: audio.duration || 0 }))
    const onEnded = () => setState((s) => ({ ...s, isPlaying: false }))
    const onLoadStart = () => setState((s) => ({ ...s, isLoading: true, error: null }))
    const onCanPlay = () => setState((s) => ({ ...s, isLoading: false }))
    const onError = () => setState((s) => ({ ...s, isLoading: false, isPlaying: false, error: audio.error?.message || "Failed to load audio" }))

    audio.addEventListener("timeupdate", onTimeUpdate)
    audio.addEventListener("durationchange", onDurationChange)
    audio.addEventListener("ended", onEnded)
    audio.addEventListener("loadstart", onLoadStart)
    audio.addEventListener("canplay", onCanPlay)
    audio.addEventListener("error", onError)

    return () => {
      audio.pause()
      audio.src = ""
      audio.removeEventListener("timeupdate", onTimeUpdate)
      audio.removeEventListener("durationchange", onDurationChange)
      audio.removeEventListener("ended", onEnded)
      audio.removeEventListener("loadstart", onLoadStart)
      audio.removeEventListener("canplay", onCanPlay)
      audio.removeEventListener("error", onError)
    }
  }, [])

  const play = useCallback((track: Track, shareToken?: string) => {
    const audio = audioRef.current
    if (!audio) return
    const tokenParam = shareToken ? `?token=${shareToken}` : ""
    audio.src = `/api/tracks/${track.id}/stream${tokenParam}`
    audio.play().catch(() => { })
    setState((s) => ({
      ...s,
      currentTrack: track,
      shareToken,
      isPlaying: true,
      currentTime: 0,
      duration: audio.duration || 0,
      isLoading: false,
      error: null,
    }))
  }, [])

  const pause = useCallback(() => { audioRef.current?.pause(); setState((s) => ({ ...s, isPlaying: false })) }, [])
  const resume = useCallback(() => { audioRef.current?.play().catch(() => { }); setState((s) => ({ ...s, isPlaying: true })) }, [])

  const togglePlay = useCallback(
    (track: Track, shareToken?: string) => {
      if (state.currentTrack?.id === track.id) {
        state.isPlaying ? pause() : resume()
      } else play(track, shareToken)
    },
    [state.currentTrack?.id, state.isPlaying, play, pause, resume]
  )

  const seek = useCallback((time: number) => {
    if (audioRef.current) audioRef.current.currentTime = time
    setState((s) => ({ ...s, currentTime: time }))
  }, [])

  const setVolume = useCallback((vol: number) => {
    if (audioRef.current) audioRef.current.volume = vol
    setState((s) => ({ ...s, volume: vol }))
  }, [])

  const retry = useCallback(() => { if (audioRef.current) audioRef.current.play().catch(() => { }); setState((s) => ({ ...s, isPlaying: true })) }, [])

  return (
    <PlayerContext.Provider
      value={{
        ...state,
        audioRef,
        play,
        pause,
        resume,
        togglePlay,
        seek,
        setVolume,
        retry,
      }}
    >
      {children}
    </PlayerContext.Provider>
  )
}

export function usePlayer() {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider")
  return ctx
}
