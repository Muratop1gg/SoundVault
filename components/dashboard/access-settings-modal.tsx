"use client"

import { useState, useEffect } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { X, Plus, Loader2, Link2, Copy } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import type { Track, TrackPermission } from "@/lib/types"

interface AccessSettingsModalProps {
  track: Track | null
  onClose: () => void
}

export function AccessSettingsModal({ track, onClose }: AccessSettingsModalProps) {
  const router = useRouter()
  const [accessType, setAccessType] = useState(track?.access_type || "private")
  const [permissions, setPermissions] = useState<TrackPermission[]>([])
  const [newIdentifier, setNewIdentifier] = useState("")
  const [saving, setSaving] = useState(false)
  const [addingUser, setAddingUser] = useState(false)

  useEffect(() => {
    if (track) {
      setAccessType(track.access_type)
      setPermissions(track.track_permissions || [])
    }
  }, [track])

  async function saveAccessType(type: string) {
    if (!track) return
    setSaving(true)
    const res = await fetch(`/api/tracks/${track.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_type: type }),
    })
    if (res.ok) {
      setAccessType(type as typeof accessType)
      toast.success("Настройки доступа сохранены")
      router.refresh()
    } else {
      toast.error("Ошибка сохранения")
    }
    setSaving(false)
  }

  async function addUser() {
    if (!track || !newIdentifier.trim()) return
    setAddingUser(true)
    const res = await fetch(`/api/tracks/${track.id}/permissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grantee_identifier: newIdentifier.trim() }),
    })
    if (res.ok) {
      const data = await res.json()
      setPermissions([...permissions, data.permission])
      setNewIdentifier("")
      toast.success("Пользователь добавлен")
    } else {
      toast.error("Ошибка добавления")
    }
    setAddingUser(false)
  }

  async function removeUser(grantee: string) {
    if (!track) return
    const res = await fetch(`/api/tracks/${track.id}/permissions`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grantee_identifier: grantee }),
    })
    if (res.ok) {
      setPermissions(permissions.filter((p) => p.grantee_identifier !== grantee))
      toast.success("Пользователь удалён")
    }
  }

  function copyShareLink() {
    if (!track) return
    const url = `${window.location.origin}/track/${track.id}?token=${track.share_token}`
    navigator.clipboard.writeText(url)
    toast.success("Ссылка скопирована!")
  }

  if (!track) return null

  return (
    <Dialog open={!!track} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-card border-border/60">
        <DialogHeader>
          <DialogTitle className="truncate">Доступ: {track.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Access type selector */}
          <div className="space-y-2">
            <Label>Тип доступа</Label>
            <Select
              value={accessType}
              onValueChange={saveAccessType}
              disabled={saving}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Приватный — только вы</SelectItem>
                <SelectItem value="link">По ссылке — все с ссылкой</SelectItem>
                <SelectItem value="specific">Определённые пользователи</SelectItem>
              </SelectContent>
            </Select>
            {saving && <p className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Сохранение...</p>}
          </div>

          {/* Share link */}
          {accessType === "link" && (
            <div className="space-y-2">
              <Label>Ссылка для доступа</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/track/${track.id}?token=${track.share_token}`}
                  className="text-xs bg-muted/50"
                />
                <Button size="icon" variant="secondary" onClick={copyShareLink}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Specific user permissions */}
          {accessType === "specific" && (
            <div className="space-y-3">
              <Label>Доступ для пользователей</Label>
              <div className="flex gap-2">
                <Input
                  value={newIdentifier}
                  onChange={(e) => setNewIdentifier(e.target.value)}
                  placeholder="Email или username"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addUser() } }}
                />
                <Button size="icon" variant="secondary" onClick={addUser} disabled={addingUser || !newIdentifier.trim()}>
                  {addingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </Button>
              </div>

              {permissions.length > 0 ? (
                <div className="space-y-1.5">
                  {permissions.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30 border border-border/40"
                    >
                      <span className="text-sm truncate">{p.grantee_identifier}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-7 h-7 text-muted-foreground hover:text-destructive-foreground"
                        onClick={() => removeUser(p.grantee_identifier)}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Нет добавленных пользователей
                </p>
              )}
            </div>
          )}

          {accessType === "link" && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-start gap-2">
              <Link2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Любой, у кого есть ссылка, может прослушать и скачать этот трек.
              </p>
            </div>
          )}

          <Button className="w-full" onClick={onClose}>
            Готово
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
