"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Empty } from "@/components/ui/empty"
import { UploadModal } from "./upload-modal"
import { TrackCard } from "./track-card"
import { AccessSettingsModal } from "./access-settings-modal"
import { Upload, Music2, Share2 } from "lucide-react"
import type { Track } from "@/lib/types"

interface LibraryClientProps {
  myTracks: Track[]
  sharedTracks: Track[]
  userId: string
}

export function LibraryClient({ myTracks, sharedTracks, userId }: LibraryClientProps) {
  const router = useRouter()
  const [uploadOpen, setUploadOpen] = useState(false)
  const [settingsTrack, setSettingsTrack] = useState<Track | null>(null)
  const [localMyTracks, setLocalMyTracks] = useState<Track[]>(myTracks)

  function handleDelete(id: string) {
    setLocalMyTracks((t) => t.filter((x) => x.id !== id))
  }

  function handleUploaded(track: Track) {
    setLocalMyTracks((prev) => [track, ...prev])
  }

  // When access settings change, refresh to get updated track
  function handleSettingsClose() {
    setSettingsTrack(null)
    router.refresh()
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Библиотека</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {localMyTracks.length}{" "}
            {localMyTracks.length === 1
              ? "трек загружен"
              : localMyTracks.length >= 2 && localMyTracks.length <= 4
              ? "трека загружено"
              : "треков загружено"}
          </p>
        </div>
        <Button onClick={() => setUploadOpen(true)} className="gap-2">
          <Upload className="w-4 h-4" />
          Загрузить трек
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="mine">
        <TabsList className="mb-6 bg-muted/40">
          <TabsTrigger value="mine" className="gap-2">
            <Music2 className="w-4 h-4" />
            Мои треки
            {localMyTracks.length > 0 && (
              <span className="ml-1 text-xs bg-primary/20 text-primary rounded-full px-1.5 py-0.5 font-medium">
                {localMyTracks.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="shared" className="gap-2">
            <Share2 className="w-4 h-4" />
            Поделились со мной
            {sharedTracks.length > 0 && (
              <span className="ml-1 text-xs bg-primary/20 text-primary rounded-full px-1.5 py-0.5 font-medium">
                {sharedTracks.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mine">
          {localMyTracks.length === 0 ? (
            <Empty className="py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="p-4 rounded-full bg-primary/10">
                  <Music2 className="w-8 h-8 text-primary/60" />
                </div>
                <div className="text-center">
                  <p className="font-medium">Нет загруженных треков</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Загрузите свой первый аудиофайл
                  </p>
                </div>
                <Button
                  onClick={() => setUploadOpen(true)}
                  size="sm"
                  className="gap-2 mt-1"
                >
                  <Upload className="w-4 h-4" />
                  Загрузить
                </Button>
              </div>
            </Empty>
          ) : (
            <div className="space-y-2">
              {localMyTracks.map((track) => (
                <TrackCard
                  key={track.id}
                  track={track}
                  isOwner
                  onDelete={handleDelete}
                  onSettings={setSettingsTrack}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="shared">
          {sharedTracks.length === 0 ? (
            <Empty className="py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="p-4 rounded-full bg-primary/10">
                  <Share2 className="w-8 h-8 text-primary/60" />
                </div>
                <div className="text-center">
                  <p className="font-medium">Нет треков от других пользователей</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Треки появятся, когда кто-то поделится ими с вами
                  </p>
                </div>
              </div>
            </Empty>
          ) : (
            <div className="space-y-2">
              {sharedTracks.map((track) => (
                <TrackCard key={track.id} track={track} isOwner={false} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={handleUploaded}
      />
      <AccessSettingsModal track={settingsTrack} onClose={handleSettingsClose} />
    </div>
  )
}
