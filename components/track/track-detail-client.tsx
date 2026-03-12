"use client"

import { useState, useEffect } from "react"
import { usePlayer } from "@/components/player/player-context"
import { WaveformVisualizer } from "./waveform-visualizer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Play,
  Pause,
  Download,
  Link2,
  Lock,
  Globe,
  Users,
  Music2,
} from "lucide-react"
import { cn, formatDuration, formatFileSize } from "@/lib/utils"
import { toast } from "sonner"
import type { Track } from "@/lib/types"

interface TrackDetailClientProps {
  track: Track
  shareToken?: string
  isOwner: boolean
}

const ACCESS_ICONS = {
  private: Lock,
  link: Globe,
  specific: Users,
}

const ACCESS_LABELS = {
  private: "Приватный",
  link: "По ссылке",
  specific: "Ограниченный доступ",
}

export function TrackDetailClient({ track, shareToken, isOwner }: TrackDetailClientProps) {
  const { currentTrack, isPlaying, togglePlay } = usePlayer()
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null)
  const isActive = currentTrack?.id === track.id

  useEffect(() => {
    // Decode audio for real waveform
    let cancelled = false
    async function decodeAudio() {
      try {
        const tokenParam = shareToken ? `?token=${shareToken}` : ""
        const res = await fetch(`/api/tracks/${track.id}/stream${tokenParam}`)
        if (!res.ok) return
        const arrayBuf = await res.arrayBuffer()
        if (cancelled) return
        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
        const buf = await ctx.decodeAudioData(arrayBuf)
        if (!cancelled) setAudioBuffer(buf)
        ctx.close()
      } catch {
        // fallback to placeholder waveform
      }
    }
    decodeAudio()
    return () => { cancelled = true }
  }, [track.id, shareToken])

  function handleDownload() {
    const tokenParam = shareToken ? `?token=${shareToken}&download=1` : "?download=1"
    const a = document.createElement("a")
    a.href = `/api/tracks/${track.id}/stream${tokenParam}`
    a.download = track.file_name
    a.click()
  }

  function copyShareLink() {
    const url = `${window.location.origin}/track/${track.id}?token=${track.share_token}`
    navigator.clipboard.writeText(url)
    toast.success("Ссылка скопирована!")
  }

  const AccessIcon = ACCESS_ICONS[track.access_type]

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex-shrink-0">
          <Music2 className="w-10 h-10 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-balance">{track.title}</h1>
          <div className="flex items-center flex-wrap gap-2 mt-2">
            {track.category && (
              <Badge variant="secondary">{track.category}</Badge>
            )}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <AccessIcon className="w-3.5 h-3.5" />
              {ACCESS_LABELS[track.access_type]}
            </div>
            {track.duration && (
              <span className="text-xs text-muted-foreground">{formatDuration(track.duration)}</span>
            )}
            {track.file_size && (
              <span className="text-xs text-muted-foreground">{formatFileSize(track.file_size)}</span>
            )}
          </div>
          {track.tags && track.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {track.tags.map((t) => (
                <Badge key={t} variant="outline" className="text-xs">
                  {t}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Waveform */}
      <div className="rounded-2xl border border-border/50 bg-card/60 p-5 mb-6">
        <WaveformVisualizer
          track={track}
          shareToken={shareToken}
          audioBuffer={audioBuffer}
        />

        {/* Playback controls */}
        <div className="flex items-center gap-4 mt-4">
          <Button
            size="icon"
            className={cn(
              "rounded-full w-12 h-12",
              isActive ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary border border-primary/30 hover:bg-primary hover:text-primary-foreground"
            )}
            onClick={() => togglePlay(track, shareToken)}
            aria-label={isActive && isPlaying ? "Пауза" : "Воспроизвести"}
          >
            {isActive && isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current" />
            )}
          </Button>
          <p className="text-sm text-muted-foreground">
            {isActive && isPlaying ? "Воспроизводится..." : "Нажмите для воспроизведения"}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={handleDownload} className="gap-2">
          <Download className="w-4 h-4" />
          Скачать
        </Button>
        {(isOwner || track.access_type === "link") && (
          <Button variant="outline" onClick={copyShareLink} className="gap-2">
            <Link2 className="w-4 h-4" />
            Поделиться ссылкой
          </Button>
        )}
      </div>

      {/* File info */}
      <div className="mt-8 rounded-xl border border-border/40 bg-card/40 divide-y divide-border/30">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-muted-foreground">Файл</span>
          <span className="text-sm font-medium">{track.file_name}</span>
        </div>
        {track.duration && (
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-muted-foreground">Длительность</span>
            <span className="text-sm font-medium">{formatDuration(track.duration)}</span>
          </div>
        )}
        {track.file_size && (
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-muted-foreground">Размер</span>
            <span className="text-sm font-medium">{formatFileSize(track.file_size)}</span>
          </div>
        )}
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-muted-foreground">Загружен</span>
          <span className="text-sm font-medium">
            {new Date(track.created_at).toLocaleDateString("ru-RU")}
          </span>
        </div>
      </div>
    </div>
  )
}
