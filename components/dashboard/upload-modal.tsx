"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Upload,
  X,
  Music2,
  Loader2,
  Plus,
} from "lucide-react"
import { toast } from "sonner"
import { cn, formatFileSize } from "@/lib/utils"

import type { Track } from "@/lib/types"

interface UploadModalProps {
  open: boolean
  onClose: () => void
  onUploaded?: (track: Track) => void
}

const AUDIO_ACCEPT = ".mp3,.wav,.flac,.ogg,.m4a,.aac,.opus,.wma"
const CATEGORIES = ["Музыка", "Подкаст", "Звуковые эффекты", "Голос", "Прочее"]

export function UploadModal({ open, onClose, onUploaded }: UploadModalProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("")
  const [accessType, setAccessType] = useState("private")
  const [tagInput, setTagInput] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [dragging, setDragging] = useState(false)

  function reset() {
    setFile(null)
    setTitle("")
    setCategory("")
    setAccessType("private")
    setTagInput("")
    setTags([])
    setUploading(false)
    setProgress(0)
    setDragging(false)
  }

  function handleClose() {
    if (!uploading) {
      reset()
      onClose()
    }
  }

  function handleFileChange(f: File | null) {
    if (!f) return
    if (!f.type.startsWith("audio/")) {
      toast.error("Пожалуйста, выберите аудиофайл")
      return
    }
    setFile(f)
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""))
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    handleFileChange(f)
  }

  function addTag() {
    const t = tagInput.trim().toLowerCase()
    if (t && !tags.includes(t)) setTags([...tags, t])
    setTagInput("")
  }

  function removeTag(t: string) {
    setTags(tags.filter((x) => x !== t))
  }

  // Get audio duration
  async function getAudioDuration(f: File): Promise<number | null> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(f)
      const audio = new Audio(url)
      audio.addEventListener("loadedmetadata", () => {
        URL.revokeObjectURL(url)
        resolve(audio.duration || null)
      })
      audio.addEventListener("error", () => {
        URL.revokeObjectURL(url)
        resolve(null)
      })
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return

    setUploading(true)
    setProgress(10)

    const duration = await getAudioDuration(file)
    setProgress(20)

    const formData = new FormData()
    formData.append("file", file)
    formData.append("title", title || file.name)
    if (category) formData.append("category", category)
    formData.append("tags", tags.join(","))
    formData.append("access_type", accessType)
    if (duration) formData.append("duration", String(duration))

    setProgress(40)

    try {
      const res = await fetch("/api/tracks/upload", {
        method: "POST",
        body: formData,
      })
      setProgress(90)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Ошибка загрузки")
      setProgress(100)
      toast.success("Трек загружен!")
      onUploaded?.(data.track)
      router.refresh()
      setTimeout(() => {
        reset()
        onClose()
      }, 400)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка загрузки")
      setUploading(false)
      setProgress(0)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md bg-card border-border/60">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Загрузить трек
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Drop zone */}
          {!file ? (
            <div
              className={cn(
                "border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors",
                dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
              )}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="p-3 rounded-full bg-primary/10">
                <Music2 className="w-6 h-6 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Перетащите файл сюда</p>
                <p className="text-xs text-muted-foreground mt-1">или нажмите для выбора</p>
                <p className="text-xs text-muted-foreground mt-1">MP3, WAV, FLAC, OGG, M4A, AAC, OPUS</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept={AUDIO_ACCEPT}
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
              />
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
              <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                <Music2 className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="flex-shrink-0 w-7 h-7"
                onClick={() => { setFile(null); setTitle("") }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {file && (
            <>
              {/* Title */}
              <div className="space-y-1.5">
                <Label htmlFor="track-title">Название</Label>
                <Input
                  id="track-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Название трека"
                  required
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <Label>Категория</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите категорию" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Access type */}
              <div className="space-y-1.5">
                <Label>Доступ</Label>
                <Select value={accessType} onValueChange={setAccessType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Приватный</SelectItem>
                    <SelectItem value="link">По ссылке</SelectItem>
                    <SelectItem value="specific">Определённым пользователям</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tags */}
              <div className="space-y-1.5">
                <Label>Теги</Label>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Добавить тег"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); addTag() }
                    }}
                  />
                  <Button type="button" size="icon" variant="secondary" onClick={addTag}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {tags.map((t) => (
                      <Badge key={t} variant="secondary" className="gap-1 cursor-pointer" onClick={() => removeTag(t)}>
                        {t}
                        <X className="w-3 h-3" />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {uploading && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Загрузка...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={handleClose} disabled={uploading}>
              Отмена
            </Button>
            <Button type="submit" className="flex-1" disabled={!file || uploading}>
              {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Загрузить
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
