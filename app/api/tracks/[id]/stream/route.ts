import { get } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const shareToken = request.nextUrl.searchParams.get("token")

  // Fetch track
  const { data: track, error } = await supabase
    .from("tracks")
    .select("*, track_permissions(*)")
    .eq("id", id)
    .single()

  if (error || !track) {
    return new NextResponse("Not found", { status: 404 })
  }

  // Access control
  const isOwner = user && track.user_id === user.id
  const isLinkAccess = track.access_type === "link" && shareToken === track.share_token
  const isSpecificAccess =
    track.access_type === "specific" &&
    user &&
    track.track_permissions?.some(
      (p: { grantee_identifier: string }) =>
        p.grantee_identifier === user.email || p.grantee_identifier === user.user_metadata?.username
    )

  if (!isOwner && !isLinkAccess && !isSpecificAccess) {
    return new NextResponse("Forbidden", { status: 403 })
  }

  try {
    const result = await get(track.blob_pathname, {
      access: "private",
      ifNoneMatch: request.headers.get("if-none-match") ?? undefined,
    })

    if (!result) {
      return new NextResponse("Not found", { status: 404 })
    }

    if (result.statusCode === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: result.blob.etag,
          "Cache-Control": "private, no-cache",
        },
      })
    }

    const isDownload = request.nextUrl.searchParams.get("download") === "1"
    const headers: Record<string, string> = {
      "Content-Type": result.blob.contentType || "audio/mpeg",
      ETag: result.blob.etag,
      "Cache-Control": "private, no-cache",
      "Accept-Ranges": "bytes",
    }

    if (isDownload) {
      headers["Content-Disposition"] = `attachment; filename="${track.file_name}"`
    }

    return new NextResponse(result.stream, { headers })
  } catch (error) {
    console.error("Stream error:", error)
    return new NextResponse("Failed to stream file", { status: 500 })
  }
}
