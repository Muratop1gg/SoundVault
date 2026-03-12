export type AccessType = "private" | "link" | "specific"

export interface Profile {
  id: string
  username: string | null
  email: string | null
  created_at: string
}

export interface Track {
  id: string
  user_id: string
  title: string
  category: string | null
  tags: string[]
  blob_pathname: string
  file_name: string
  file_size: number | null
  duration: number | null
  access_type: AccessType
  share_token: string
  created_at: string
  updated_at: string
  // joined
  profiles?: Profile
  track_permissions?: TrackPermission[]
}

export interface TrackPermission {
  id: string
  track_id: string
  grantee_identifier: string
  created_at: string
}
