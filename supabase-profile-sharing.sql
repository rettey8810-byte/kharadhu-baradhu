-- Profile Sharing Schema
-- Tables for sharing profiles between users

-- Profile Shares table (active shares)
CREATE TABLE IF NOT EXISTS public.profile_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.expense_profiles(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_email TEXT,
  profile_name TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  share_all_profiles BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profile Share Invitations table (pending invites)
CREATE TABLE IF NOT EXISTS public.profile_share_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  profile_id UUID REFERENCES public.expense_profiles(id) ON DELETE CASCADE,
  share_all_profiles BOOLEAN DEFAULT false,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE public.profile_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_share_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profile_shares
CREATE POLICY "Users can view shares they created"
  ON public.profile_shares FOR SELECT
  USING (shared_by = auth.uid());

CREATE POLICY "Users can view shares they received"
  ON public.profile_shares FOR SELECT
  USING (shared_with = auth.uid());

CREATE POLICY "Users can create shares"
  ON public.profile_shares FOR INSERT
  WITH CHECK (shared_by = auth.uid());

CREATE POLICY "Users can delete their own shares"
  ON public.profile_shares FOR DELETE
  USING (shared_by = auth.uid());

-- RLS Policies for profile_share_invitations
CREATE POLICY "Inviters can view their invitations"
  ON public.profile_share_invitations FOR SELECT
  USING (invited_by = auth.uid());

CREATE POLICY "Users can view invitations to them"
  ON public.profile_share_invitations FOR SELECT
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can create invitations"
  ON public.profile_share_invitations FOR INSERT
  WITH CHECK (invited_by = auth.uid());

CREATE POLICY "Inviters can delete their invitations"
  ON public.profile_share_invitations FOR DELETE
  USING (invited_by = auth.uid());

-- Function to share a profile
CREATE OR REPLACE FUNCTION public.share_profile(
  p_profile_id UUID,
  p_shared_with UUID,
  p_role TEXT DEFAULT 'member'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_share_id UUID;
  v_profile_name TEXT;
  v_shared_with_email TEXT;
BEGIN
  -- Get profile name
  SELECT name INTO v_profile_name
  FROM public.expense_profiles
  WHERE id = p_profile_id;

  -- Get user email
  SELECT email INTO v_shared_with_email
  FROM auth.users
  WHERE id = p_shared_with;

  -- Create share
  INSERT INTO public.profile_shares (
    profile_id,
    shared_by,
    shared_with,
    shared_with_email,
    profile_name,
    role
  ) VALUES (
    p_profile_id,
    auth.uid(),
    p_shared_with,
    v_shared_with_email,
    v_profile_name,
    p_role
  )
  RETURNING id INTO v_share_id;

  RETURN v_share_id;
END;
$$;

-- Function to accept an invitation and create share
CREATE OR REPLACE FUNCTION public.accept_share_invitation(p_invitation_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create actual shares based on invitation
  IF EXISTS (
    SELECT 1 FROM public.profile_share_invitations
    WHERE id = p_invitation_id
    AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
  ) THEN
    -- Mark invitation as accepted
    UPDATE public.profile_share_invitations
    SET accepted = true
    WHERE id = p_invitation_id;
  END IF;
END;
$$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profile_shares_shared_by ON public.profile_shares(shared_by);
CREATE INDEX IF NOT EXISTS idx_profile_shares_shared_with ON public.profile_shares(shared_with);
CREATE INDEX IF NOT EXISTS idx_profile_shares_profile_id ON public.profile_shares(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_share_invitations_email ON public.profile_share_invitations(email);
CREATE INDEX IF NOT EXISTS idx_profile_share_invitations_invited_by ON public.profile_share_invitations(invited_by);

-- Grant permissions
GRANT ALL ON public.profile_shares TO authenticated;
GRANT ALL ON public.profile_shares TO anon;
GRANT ALL ON public.profile_share_invitations TO authenticated;
GRANT ALL ON public.profile_share_invitations TO anon;
GRANT EXECUTE ON FUNCTION public.share_profile TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_share_invitation TO authenticated;
