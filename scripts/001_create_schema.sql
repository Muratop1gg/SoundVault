-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- Tracks table
CREATE TABLE IF NOT EXISTS public.tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  blob_pathname TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  duration FLOAT,
  access_type TEXT NOT NULL DEFAULT 'private' CHECK (access_type IN ('private', 'link', 'specific')),
  share_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;

-- Track access: owner always can see their own
CREATE POLICY "tracks_owner_all" ON public.tracks FOR ALL USING (auth.uid() = user_id);

-- Track access: link-based (anyone with the share token can query via API, handled in app layer)
-- Track access: specific users (handled via track_permissions table)
-- Track access: public read for link/specific (we handle access checks in API routes)
CREATE POLICY "tracks_link_select" ON public.tracks FOR SELECT USING (access_type = 'link');

-- Track permissions table (for 'specific' access type)
CREATE TABLE IF NOT EXISTS public.track_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  grantee_identifier TEXT NOT NULL, -- email or username
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(track_id, grantee_identifier)
);

ALTER TABLE public.track_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "track_permissions_owner_all" ON public.track_permissions 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.tracks WHERE id = track_id AND user_id = auth.uid())
  );

CREATE POLICY "track_permissions_grantee_select" ON public.track_permissions 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND (email = grantee_identifier OR username = grantee_identifier)
    )
  );

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
