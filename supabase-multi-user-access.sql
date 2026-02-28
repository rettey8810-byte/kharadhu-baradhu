-- Multi-User Access and Profile Sharing
-- Enable family members to share access to the same profile

-- Create profile_members table for shared access
CREATE TABLE IF NOT EXISTS public.profile_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES public.expense_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  invited_by uuid REFERENCES auth.users(id),
  invitation_accepted boolean DEFAULT false,
  invitation_email text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  UNIQUE(profile_id, user_id)
);

-- Enable RLS
ALTER TABLE public.profile_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profile_members
CREATE POLICY "Users can view their profile memberships"
  ON public.profile_members
  FOR SELECT
  USING (user_id = auth.uid() OR profile_id IN (
    SELECT profile_id FROM public.profile_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Profile owners can manage members"
  ON public.profile_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profile_members 
      WHERE profile_id = profile_members.profile_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- Function to invite a user to a profile
CREATE OR REPLACE FUNCTION public.invite_profile_member(
  p_profile_id uuid,
  p_email text,
  p_role text DEFAULT 'member'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invited_by uuid;
  v_existing_user_id uuid;
  v_member_id uuid;
BEGIN
  -- Check if inviter has permission
  v_invited_by := auth.uid();
  
  IF NOT EXISTS (
    SELECT 1 FROM public.profile_members 
    WHERE profile_id = p_profile_id 
    AND user_id = v_invited_by 
    AND role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only profile owners and admins can invite members';
  END IF;
  
  -- Check if user exists
  SELECT id INTO v_existing_user_id
  FROM auth.users 
  WHERE email = p_email;
  
  -- Check if already a member
  IF EXISTS (
    SELECT 1 FROM public.profile_members 
    WHERE profile_id = p_profile_id 
    AND (user_id = v_existing_user_id OR invitation_email = p_email)
  ) THEN
    RAISE EXCEPTION 'User is already a member or has a pending invitation';
  END IF;
  
  -- Insert member
  INSERT INTO public.profile_members (
    profile_id,
    user_id,
    role,
    invited_by,
    invitation_accepted,
    invitation_email
  ) VALUES (
    p_profile_id,
    v_existing_user_id,
    p_role,
    v_invited_by,
    v_existing_user_id IS NOT NULL, -- Auto-accept if user exists
    p_email
  )
  RETURNING id INTO v_member_id;
  
  RETURN v_member_id;
END;
$$;

-- Function to accept invitation
CREATE OR REPLACE FUNCTION public.accept_profile_invitation(p_member_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profile_members
  SET 
    invitation_accepted = true,
    user_id = auth.uid(),
    updated_at = timezone('utc'::text, now())
  WHERE id = p_member_id
  AND invitation_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  AND invitation_accepted = false;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found or already accepted';
  END IF;
END;
$$;

-- Function to remove a member
CREATE OR REPLACE FUNCTION public.remove_profile_member(p_member_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile_id uuid;
  v_target_role text;
BEGIN
  -- Get profile_id and role of target member
  SELECT profile_id, role INTO v_profile_id, v_target_role
  FROM public.profile_members
  WHERE id = p_member_id;
  
  -- Check if remover has permission
  IF NOT EXISTS (
    SELECT 1 FROM public.profile_members 
    WHERE profile_id = v_profile_id 
    AND user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only profile owners and admins can remove members';
  END IF;
  
  -- Cannot remove owner
  IF v_target_role = 'owner' THEN
    RAISE EXCEPTION 'Cannot remove the profile owner';
  END IF;
  
  DELETE FROM public.profile_members WHERE id = p_member_id;
END;
$$;

-- Update existing RLS policies to support shared profiles

-- Update expense_profiles SELECT policy
DROP POLICY IF EXISTS "Users can view own profiles" ON public.expense_profiles;
CREATE POLICY "Users can view own or shared profiles"
  ON public.expense_profiles
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    id IN (
      SELECT profile_id FROM public.profile_members 
      WHERE user_id = auth.uid() AND invitation_accepted = true
    )
  );

-- Update transactions policies for shared profiles
DROP POLICY IF EXISTS "Users can insert transactions to own profiles" ON public.transactions;
CREATE POLICY "Users can insert transactions to own or shared profiles"
  ON public.transactions
  FOR INSERT
  WITH CHECK (
    profile_id IN (
      SELECT id FROM public.expense_profiles WHERE user_id = auth.uid()
      UNION
      SELECT profile_id FROM public.profile_members 
      WHERE user_id = auth.uid() AND invitation_accepted = true
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profile_members_profile_id ON public.profile_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_members_user_id ON public.profile_members(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_members_invitation_email ON public.profile_members(invitation_email);

-- Grant permissions
GRANT ALL ON public.profile_members TO authenticated;
GRANT ALL ON public.profile_members TO anon;
GRANT EXECUTE ON FUNCTION public.invite_profile_member TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_profile_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_profile_member TO authenticated;

COMMENT ON TABLE public.profile_members IS 'Stores profile sharing relationships for multi-user access';
