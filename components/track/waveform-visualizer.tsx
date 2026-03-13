"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { usePlayer } from "@/components/player/player-context"
import type { Track } from "@/lib/types"

interface WaveformVisualizerProps {
  track: Track
  shareToken?: string
  audioBuffer: AudioBuffer | null
}

const BAR_COUNT = 200
const BAR_GAP = 2

export function WaveformVisualizer({ track, shareToken, audioBuffer }: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { currentTrack, isPlaying, currentTime, duration, togglePlay, seek } = usePlayer()
  const isActive = currentTrack?.id === track.id

  const [peaks, setPeaks] = useState<number[]>([])

  // Compute waveform peaks once
  useEffect(() => {
    if (!audioBuffer) {
      // Placeholder
      const placeholder = Array.from({ length: BAR_COUNT }, (_, i) => {
        const base = Math.sin(i * 0.15) * 0.3 + 0.5
        return Math.max(0.05, Math.min(1, base))
      })
      setPeaks(placeholder)
      return
    }

    const channelData = audioBuffer.getChannelData(0)
    const blockSize = Math.floor(channelData.length / BAR_COUNT)
    const newPeaks = Array.from({ length: BAR_COUNT }, (_, i) => {
      const start = i * blockSize
      let max = 0
      for (let j = start; j < start + blockSize; j++) {
        const abs = Math.abs(channelData[j])
        if (abs > max) max = abs
      }
      return Math.max(0.02, max)
    })
    setPeaks(newPeaks)
  }, [audioBuffer])

  // Draw waveform
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { width, height } = canvas
    ctx.clearRect(0, 0, width, height)

    const barWidth = (width - BAR_GAP * (BAR_COUNT - 1)) / BAR_COUNT
    const progressFraction = isActive && duration > 0 ? currentTime / duration : 0

    peaks.forEach((peak, i) => {
      const x = i * (barWidth + BAR_GAP)
      const barH = peak * height * 0.9
      const y = (height - barH) / 2

      // Left = played, right = unplayed
      ctx.fillStyle = i / BAR_COUNT <= progressFraction
        ? "#4c1d95" // played (фиолет)
        : "#c4c4c4" // unplayed (серый)

      const r = Math.min(barWidth / 2, 3)
      ctx.beginPath()
      ctx.roundRect(x, y, barWidth, barH, r)
      ctx.fill()
    })
  }, [peaks, isActive, currentTime, duration])

  // Animation loop
  useEffect(() => {
    let running = true
    const loop = () => {
      if (!running) return
      draw()
      requestAnimationFrame(loop)
    }
    loop()
    return () => {
      running = false
    }
  }, [draw])

  // Click to seek / play
  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return

    if (!isActive) {
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
    />
  )
}
