import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import { PlayerProvider } from "@/components/player/player-context"
import { GlobalPlayer } from "@/components/player/global-player"
import { TrackDetailClient } from "@/components/track/track-detail-client"
import { DashboardNav } from "@/components/dashboard/nav"
import { Music2 } from "lucide-react"
import Link from "next/link"

interface TrackPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ token?: string }>
}

export default async function TrackPage({ params, searchParams }: TrackPageProps) {
  const { id } = await params
  const { token } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch track with permissions
  const { data: track, error } = await supabase
    .from("tracks")
    .select("*, track_permissions(*), profiles(*)")
    .eq("id", id)
    .single()

  if (error || !track) notFound()

  const isOwner = user && track.user_id === user.id

  // Access control
  const isLinkAccess = track.access_type === "link" && token === track.share_token
  const isSpecificAccess =
    track.access_type === "specific" &&
    user &&
    track.track_permissions?.some(
      (p: { grantee_identifier: string }) =>
        p.grantee_identifier === user.email ||
        p.grantee_identifier === user.user_metadata?.username
    )

  if (!isOwner && !isLinkAccess && !isSpecificAccess) {
    if (!user) redirect(`/auth/login`)
    notFound()
  }

  // Get profile for nav
  const { data: profile } = user
    ? await supabase.from("profiles").select("*").eq("id", user.id).single()
    : { data: null }

  return (
    <PlayerProvider>
      <div className="min-h-screen flex flex-col bg-background">
        {user ? (
          <DashboardNav user={user} profile={profile} />
        ) : (
          <header className="sticky top-0 z-40 border-b border-border/50 bg-background/90 backdrop-blur-xl">
            <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
                  <Music2 className="w-5 h-5 text-primary" />
                </div>
                <span className="font-semibold tracking-tight">SoundVault</span>
              </Link>
              <Link href="/auth/login" className="text-sm text-primary hover:underline">
                Войти
              </Link>
            </div>
          </header>
        )}
        <main className="flex-1 pb-28">
          <TrackDetailClient
            track={track}
            shareToken={token}
            isOwner={!!isOwner}
          />
        </main>
        <GlobalPlayer />
      </div>
    </PlayerProvider>
  )
}
