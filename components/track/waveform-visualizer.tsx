"use client"

import { useEffect, useRef, useCallback } from "react"
import { usePlayer } from "@/components/player/player-context"
import type { Track } from "@/lib/types"

interface WaveformVisualizerProps {
  track: Track
  shareToken?: string
  audioBuffer: AudioBuffer | null
}

const BAR_COUNT = 120
const BAR_GAP = 2

export function WaveformVisualizer({ track, shareToken, audioBuffer }: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { currentTrack, isPlaying, currentTime, duration, togglePlay, seek } = usePlayer()
  const isActive = currentTrack?.id === track.id
  const animFrameRef = useRef<number>(0)

  // Build peak data from AudioBuffer or generate a placeholder
  const getPeaks = useCallback((): number[] => {
    if (audioBuffer) {
      const channelData = audioBuffer.getChannelData(0)
      const blockSize = Math.floor(channelData.length / BAR_COUNT)
      return Array.from({ length: BAR_COUNT }, (_, i) => {
        const start = i * blockSize
        let max = 0
        for (let j = start; j < start + blockSize; j++) {
          const abs = Math.abs(channelData[j])
          if (abs > max) max = abs
        }
        return Math.max(0.04, max)
      })
    }
    // Placeholder pseudo-waveform
    return Array.from({ length: BAR_COUNT }, (_, i) => {
      const base = Math.sin(i * 0.18) * 0.3 + 0.5
      // Use index as deterministic seed to avoid re-renders
      const pseudo = ((i * 2654435761) >>> 0) / 0xffffffff
      return Math.max(0.05, Math.min(1, base + (pseudo * 0.3 - 0.15)))
    })
  }, [audioBuffer])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { width, height } = canvas
    ctx.clearRect(0, 0, width, height)

    const peakData = getPeaks()
    const barWidth = (width - BAR_GAP * (BAR_COUNT - 1)) / BAR_COUNT
    const progressFraction = isActive && duration > 0 ? currentTime / duration : 0

    peakData.forEach((peak, i) => {
      const x = i * (barWidth + BAR_GAP)
      const barH = Math.max(4, peak * (height * 0.88))
      const y = (height - barH) / 2
      const played = i / BAR_COUNT <= progressFraction

      // Gradient-ish look: played bars bright, future bars dim
      ctx.fillStyle = played
        ? "oklch(0.72 0.19 230)"
        : "oklch(0.28 0.01 265)"

      const r = Math.min(barWidth / 2, 3)
      ctx.beginPath()
      ctx.roundRect(x, y, barWidth, barH, r)
      ctx.fill()
    })
  }, [getPeaks, isActive, currentTime, duration])

  useEffect(() => {
    let running = true
    function loop() {
      if (!running) return
      draw()
      animFrameRef.current = requestAnimationFrame(loop)
    }
    loop()
    return () => {
      running = false
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [draw])

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return

    if (!isActive) {
      // Start playback on this track
      togglePlay(track, shareToken)
      return
    }

    if (duration > 0) {
      const rect = canvas.getBoundingClientRect()
      const frac = (e.clientX - rect.left) / rect.width
      seek(frac * duration)
    }
  }

  return (
    <canvas
      ref={canvasRef}
      width={960}
      height={128}
      className="w-full h-32 cursor-pointer rounded-xl"
      onClick={handleClick}
      role="slider"
      aria-label="Прогресс воспроизведения"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={isActive && duration > 0 ? Math.round((currentTime / duration) * 100) : 0}
    />
  )
}
