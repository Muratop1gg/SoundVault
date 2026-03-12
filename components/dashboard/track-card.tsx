"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { usePlayer } from "@/components/player/player-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Play,
  Pause,
  Music2,
  MoreHorizontal,
  Download,
  Link2,
  Trash2,
  Settings2,
  Lock,
  Globe,
  Users,
} from "lucide-react"
import { cn, formatDuration, formatFileSize } from "@/lib/utils"
import type { Track } from "@/lib/types"
import { toast } from "sonner"

interface TrackCardProps {
  track: Track
  shareToken?: string
  onDelete?: (id: string) => void
  onSettings?: (track: Track) => void
  isOwner?: boolean
}

const ACCESS_ICONS = {
  private: Lock,
  link: Globe,
  specific: Users,
}

const ACCESS_LABELS = {
  private: "Приватный",
  link: "По ссылке",
  specific: "Ограниченный",
}

export function TrackCard({ track, shareToken, onDelete, onSettings, isOwner }: TrackCardProps) {
  const { currentTrack, isPlaying, togglePlay } = usePlayer()
  const router = useRouter()

  const isActive = currentTrack?.id === track.id
  const AccessIcon = ACCESS_ICONS[track.access_type]

  async function handleDelete() {
    if (!confirm("Удалить трек?")) return
    const res = await fetch(`/api/tracks/${track.id}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Трек удалён")
      onDelete?.(track.id)
      router.refresh()
    } else {
      toast.error("Ошибка при удалении")
    }
  }

  async function copyShareLink() {
    const url = `${window.location.origin}/track/${track.id}?token=${track.share_token}`
    await navigator.clipboard.writeText(url)
    toast.success("Ссылка скопирована!")
  }

  function handleDownload() {
    const tokenParam = shareToken ? `?token=${shareToken}&download=1` : "?download=1"
    const a = document.createElement("a")
    a.href = `/api/tracks/${track.id}/stream${tokenParam}`
    a.download = track.file_name
    a.click()
  }

  return (
    <div
      className={cn(
        "group flex items-center gap-3 p-3 rounded-xl border transition-all",
        isActive
          ? "bg-primary/5 border-primary/30"
          : "bg-card/60 border-border/40 hover:bg-card hover:border-border/70"
      )}
    >
      {/* Play button */}
      <Button
        size="icon"
        variant="ghost"
        className={cn(
          "flex-shrink-0 rounded-full w-10 h-10 transition-all",
          isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary hover:bg-primary/10"
        )}
        onClick={() => togglePlay(track, shareToken)}
        aria-label={isActive && isPlaying ? "Пауза" : "Воспроизвести"}
      >
        {isActive && isPlaying ? (
          <Pause className="w-4 h-4 fill-current" />
        ) : (
          <Play className="w-4 h-4 fill-current" />
        )}
      </Button>

      {/* Waveform icon */}
      <div className="flex-shrink-0 p-1.5 rounded-lg bg-muted/50">
        <Music2 className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground")} />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <Link
          href={`/track/${track.id}${shareToken ? `?token=${shareToken}` : ""}`}
          className="text-sm font-medium hover:text-primary transition-colors truncate block"
        >
          {track.title}
        </Link>
        <div className="flex items-center gap-2 mt-0.5">
          {track.category && (
            <span className="text-xs text-muted-foreground">{track.category}</span>
          )}
          {track.tags?.slice(0, 2).map((t) => (
            <Badge key={t} variant="outline" className="text-xs py-0 px-1.5 h-4">
              {t}
            </Badge>
          ))}
        </div>
      </div>

      {/* Meta */}
      <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
        <div className="flex items-center gap-1" title={ACCESS_LABELS[track.access_type]}>
          <AccessIcon className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
        {track.duration && (
          <span className="text-xs text-muted-foreground tabular-nums">{formatDuration(track.duration)}</span>
        )}
        <span className="text-xs text-muted-foreground hidden md:block">{formatFileSize(track.file_size)}</span>
      </div>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="flex-shrink-0 w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem asChild>
            <Link href={`/track/${track.id}${shareToken ? `?token=${shareToken}` : ""}`}>
              <Music2 className="w-4 h-4 mr-2" />
              Открыть
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            Скачать
          </DropdownMenuItem>
          {track.access_type === "link" && (
            <DropdownMenuItem onClick={copyShareLink}>
              <Link2 className="w-4 h-4 mr-2" />
              Копировать ссылку
            </DropdownMenuItem>
          )}
          {isOwner && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onSettings?.(track)}>
                <Settings2 className="w-4 h-4 mr-2" />
                Настройки доступа
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive-foreground" onClick={handleDelete}>
                <Trash2 className="w-4 h-4 mr-2" />
                Удалить
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
