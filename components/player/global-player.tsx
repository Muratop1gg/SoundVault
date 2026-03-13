"use client"

import { usePlayer } from "./player-context"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Music2,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { formatDuration } from "@/lib/utils"

export function GlobalPlayer() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isLoading,
    error,
    pause,
    resume,
    seek,
    setVolume,
    retry,
  } = usePlayer()

  if (!currentTrack) return null

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-player-bg/95 backdrop-blur-xl">
      <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center gap-4">
        {/* Track info */}
        <div className="flex items-center gap-3 min-w-0 w-56">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 flex-shrink-0">
            <Music2 className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate text-foreground">{currentTrack.title}</p>
            <p className="text-xs text-muted-foreground truncate">{currentTrack.category || "Без категории"}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex-1 flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            {error ? (
              <Button
                size="icon"
                variant="ghost"
                className="rounded-full w-9 h-9 text-destructive hover:bg-destructive/10"
                onClick={retry}
                title={error}
              >
                <AlertCircle className="w-5 h-5" />
              </Button>
            ) : (
              <Button
                size="icon"
                variant="ghost"
                className="rounded-full w-9 h-9 text-primary hover:bg-primary/10"
                onClick={isPlaying ? pause : resume}
                disabled={isLoading}
                aria-label={isPlaying ? "Пауза" : "Воспроизвести"}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current" />
                )}
              </Button>
            )}
          </div>
          <div className="w-full flex items-center gap-2">
            <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">
              {formatDuration(currentTime)}
            </span>
            <div className="flex-1">
              <Slider
                value={[progressPercent]}
                min={0}
                max={100}
                step={0.1}
                onValueChange={([v]) => seek((v / 100) * duration)}
                className="cursor-pointer"
                disabled={!duration || isLoading || !!error}
                aria-label="Прогресс воспроизведения"
              />
            </div>
            <span className="text-xs text-muted-foreground tabular-nums w-10">
              {formatDuration(duration)}
            </span>
          </div>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2 w-36">
          <Button
            size="icon"
            variant="ghost"
            className="flex-shrink-0 w-8 h-8"
            onClick={() => setVolume(volume > 0 ? 0 : 0.8)}
            aria-label="Mute"
          >
            {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
          <Slider
            value={[volume * 100]}
            min={0}
            max={100}
            step={1}
            onValueChange={([v]) => setVolume(v / 100)}
            className="w-full cursor-pointer"
            aria-label="Громкость"
          />
        </div>
      </div>
    </div>
  )
}