import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    // Check Content-Type header
    const contentType = request.headers.get("content-type") || ""
    if (!contentType.includes("multipart/form-data")) {
      console.error("Invalid content type:", contentType)
      return NextResponse.json({
        error: "Invalid content type. Expected multipart/form-data"
      }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Try to parse FormData with error handling
    let formData: FormData
    try {
      formData = await request.formData()
    } catch (parseError) {
      console.error("FormData parsing error:", parseError)
      return NextResponse.json({
        error: "Failed to parse form data. Make sure you're sending a valid FormData object."
      }, { status: 400 })
    }

    // Log all entries for debugging
    console.log("FormData entries:")
    const entries: [string, any][] = []
    for (const [key, value] of formData.entries()) {
      entries.push([key, value instanceof File ? `File: ${value.name}` : value])
    }
    console.log(entries)

    const file = formData.get("file") as File | null
    const title = formData.get("title") as string | null
    const category = formData.get("category") as string | null
    const tags = formData.get("tags") as string | null
    const accessType = formData.get("access_type") as string | null
    const duration = formData.get("duration") as string | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file is actually a File object
    if (!(file instanceof File)) {
      console.error("File is not a File object:", file)
      return NextResponse.json({
        error: "Invalid file object in form data"
      }, { status: 400 })
    }

    // Rest of your upload logic...
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
        access_type: accessType || "private",
      })
      .select()
      .single()

    if (error) {
      console.error("Supabase error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ track })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Upload failed"
    }, { status: 500 })
  }
}