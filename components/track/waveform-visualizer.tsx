"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { usePlayer } from "@/components/player/player-context"
import type { Track } from "@/lib/types"

interface WaveformVisualizerProps {
  track: Track
  shareToken?: string
  audioBuffer: AudioBuffer | null
}

const BAR_GAP = 2
const WINDOW_BARS = 50
const PULSE_MAG = 0.08
const SMOOTH_STEP = 1 // пиксель за кадр

export function WaveformVisualizer({ track, shareToken, audioBuffer }: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { currentTrack, currentTime, duration, togglePlay, seek } = usePlayer()
  const isActive = currentTrack?.id === track.id
  const animRef = useRef<number>(0)
  const [peaks, setPeaks] = useState<number[]>([])
  const lastHeightsRef = useRef<number[]>([])
  const offsetRef = useRef(0) // текущий сдвиг в пикселях

  // Генерация пиков для всего трека
  useEffect(() => {
    if (!audioBuffer || duration === 0) return
    const channelData = audioBuffer.getChannelData(0)
    const peakCount = Math.max(Math.floor(duration * 60), 200)
    const blockSize = Math.floor(channelData.length / peakCount)
    const newPeaks = Array.from({ length: peakCount }, (_, i) => {
      let max = 0
      for (let j = i * blockSize; j < (i + 1) * blockSize; j++) {
        const abs = Math.abs(channelData[j])
        if (abs > max) max = abs
      }
      return Math.max(0.02, max)
    })
    setPeaks(newPeaks)
    lastHeightsRef.current = new Array(newPeaks.length).fill(0)
  }, [audioBuffer, duration])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !peaks.length || !isActive || duration === 0) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { width, height } = canvas
    ctx.clearRect(0, 0, width, height)

    const totalPeaks = peaks.length
    const pixelsPerPeak = width / WINDOW_BARS
    const barsInWindow = Math.min(WINDOW_BARS, totalPeaks)
    const centerX = width / 2

    // Вычисляем целевой offset, но двигаемся к нему на 1 пиксель за кадр
    const targetOffset = -(currentTime / duration * totalPeaks - totalPeaks / 2) * pixelsPerPeak
    if (offsetRef.current < targetOffset) {
      offsetRef.current = Math.min(offsetRef.current + SMOOTH_STEP, targetOffset)
    } else if (offsetRef.current > targetOffset) {
      offsetRef.current = Math.max(offsetRef.current - SMOOTH_STEP, targetOffset)
    }

    const lastHeights = lastHeightsRef.current
    const t = 0.15

    for (let i = 0; i < totalPeaks; i++) {
      const peak = peaks[i]
      const pulse = 1 + Math.sin(performance.now() * 0.005 + i) * PULSE_MAG
      const targetH = peak * height * 0.85 * pulse
      lastHeights[i] += (targetH - lastHeights[i]) * t
      const barH = lastHeights[i]

      const x = centerX + (i - totalPeaks / 2) * pixelsPerPeak + offsetRef.current
      if (x + pixelsPerPeak < 0 || x > width) continue

      const y = (height - barH) / 2
      const barWidth = Math.max(1, pixelsPerPeak - BAR_GAP)
      const r = Math.min(barWidth / 2, 2)

      ctx.fillStyle = i <= currentTime / duration * totalPeaks
        ? "rgba(124, 58, 237, 0.9)"
        : "rgba(200,200,200,0.3)"

      ctx.beginPath()
      ctx.roundRect(x, y, barWidth, barH, r)
      ctx.fill()
    }

    lastHeightsRef.current = lastHeights
  }, [peaks, currentTime, duration, isActive])

  useEffect(() => {
    let running = true
    const loop = () => {
      if (!running) return
      draw()
      animRef.current = requestAnimationFrame(loop)
    }
    loop()
    return () => {
      running = false
      cancelAnimationFrame(animRef.current)
    }
  }, [draw])

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || duration === 0) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const centerX = canvas.width / 2
    const pixelsPerPeak = canvas.width / WINDOW_BARS
    const totalPeaks = peaks.length
    const currentPeakIndex = currentTime / duration * totalPeaks

    const barsOffset = (x - centerX) / pixelsPerPeak
    const newIndex = Math.min(Math.max(0, Math.floor(currentPeakIndex + barsOffset)), totalPeaks - 1)
    const newTime = (newIndex / totalPeaks) * duration
    seek(newTime)

    if (!isActive) togglePlay(track, shareToken)
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
