import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Add/remove specific user permissions
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { grantee_identifier } = await request.json()

  // Verify ownership
  const { data: track } = await supabase
    .from("tracks")
    .select("user_id")
    .eq("id", id)
    .single()

  if (!track || track.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { data, error } = await supabase
    .from("track_permissions")
    .insert({ track_id: id, grantee_identifier })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ permission: data })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { grantee_identifier } = await request.json()

  const { data: track } = await supabase
    .from("tracks")
    .select("user_id")
    .eq("id", id)
    .single()

  if (!track || track.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await supabase
    .from("track_permissions")
    .delete()
    .eq("track_id", id)
    .eq("grantee_identifier", grantee_identifier)

  return NextResponse.json({ success: true })
}
