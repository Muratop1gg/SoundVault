import { PlayerProvider } from "@/components/player/player-context"
import { GlobalPlayer } from "@/components/player/global-player"
import { DashboardNav } from "@/components/dashboard/nav"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  return (
    <PlayerProvider>
      <div className="min-h-screen flex flex-col bg-background">
        <DashboardNav user={user} profile={profile} />
        <main className="flex-1 pb-28">{children}</main>
        <GlobalPlayer />
      </div>
    </PlayerProvider>
  )
}
