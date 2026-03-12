import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  console.log("alive0")
  const supabase = await createClient()
  console.log("alive1")
  const { data: { user } } = await supabase.auth.getUser()
  console.log("alive2")
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const title = formData.get("title") as string
    const category = formData.get("category") as string | null
    const tags = formData.get("tags") as string | null
    const accessType = (formData.get("access_type") as string) || "private"
    const duration = formData.get("duration") as string | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const safeName = `${user.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`
    const blob = await put(safeName, file, { access: "private" })

    const tagsArray = tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : []

    const { data: track, error } = await supabase
      .from("tracks")
      .insert({
        user_id: user.id,
        title: title || file.name,
        category: category || null,
        tags: tagsArray,
        blob_pathname: blob.pathname,
        file_name: file.name,
        file_size: file.size,
        duration: duration ? parseFloat(duration) : null,
        access_type: accessType,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ track })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
