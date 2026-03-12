import { createClient } from "@/lib/supabase/server"
import { LibraryClient } from "@/components/dashboard/library-client"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // My tracks
  const { data: myTracks } = await supabase
    .from("tracks")
    .select("*, track_permissions(*)")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })

  // Tracks shared specifically with me via track_permissions
  // First get my profile
  const { data: myProfile } = await supabase
    .from("profiles")
    .select("username, email")
    .eq("id", user!.id)
    .single()

  const identifiers = [
    myProfile?.email,
    myProfile?.username,
  ].filter(Boolean) as string[]

  let sharedTracks: typeof myTracks = []
  if (identifiers.length > 0) {
    const { data: permTracks } = await supabase
      .from("track_permissions")
      .select("track_id")
      .in("grantee_identifier", identifiers)

    const trackIds = permTracks?.map((p) => p.track_id) || []

    if (trackIds.length > 0) {
      const { data } = await supabase
        .from("tracks")
        .select("*, profiles(*), track_permissions(*)")
        .in("id", trackIds)
        .neq("user_id", user!.id)
        .order("created_at", { ascending: false })
      sharedTracks = data || []
    }
  }

  return (
    <LibraryClient
      myTracks={myTracks || []}
      sharedTracks={sharedTracks || []}
      userId={user!.id}
    />
  )
}
