import { del } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: track, error } = await supabase
    .from("tracks")
    .select("blob_pathname, user_id")
    .eq("id", id)
    .single()

  if (error || !track) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (track.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    // Delete from blob storage
    await del(track.blob_pathname)
  } catch {
    // Blob might not exist, continue
  }

  const { error: dbError } = await supabase.from("tracks").delete().eq("id", id)
  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()

  const { data: track, error: fetchError } = await supabase
    .from("tracks")
    .select("user_id")
    .eq("id", id)
    .single()

  if (fetchError || !track || track.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.title !== undefined) updateData.title = body.title
  if (body.category !== undefined) updateData.category = body.category
  if (body.tags !== undefined) updateData.tags = body.tags
  if (body.access_type !== undefined) updateData.access_type = body.access_type

  const { data: updated, error } = await supabase
    .from("tracks")
    .update(updateData)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ track: updated })
}
