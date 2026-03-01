-- Family Groups Feature Schema
-- Allows users to create family groups and share multiple profiles with family members

-- Family Groups table
CREATE TABLE IF NOT EXISTS family_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family Group Members (users in the group)
CREATE TABLE IF NOT EXISTS family_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- Family Group Profiles (which profiles are shared with the group)
CREATE TABLE IF NOT EXISTS family_group_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES expense_profiles(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, profile_id)
);

-- Enable RLS
ALTER TABLE family_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_group_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for family_groups
CREATE POLICY "Users can view groups they are members of"
  ON family_groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_group_members 
      WHERE group_id = family_groups.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Group owners can update their groups"
  ON family_groups FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM family_group_members 
      WHERE group_id = family_groups.id AND user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Group owners can delete their groups"
  ON family_groups FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM family_group_members 
      WHERE group_id = family_groups.id AND user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Authenticated users can create groups"
  ON family_groups FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- RLS Policies for family_group_members
CREATE POLICY "Members can view group members"
  ON family_group_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_group_members AS my_membership
      WHERE my_membership.group_id = family_group_members.group_id 
      AND my_membership.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners and admins can add members"
  ON family_group_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_group_members 
      WHERE group_id = family_group_members.group_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners can remove any member, admins can remove members only"
  ON family_group_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM family_group_members AS my_membership
      WHERE my_membership.group_id = family_group_members.group_id 
      AND my_membership.user_id = auth.uid()
      AND (
        my_membership.role = 'owner' 
        OR (my_membership.role = 'admin' AND family_group_members.role = 'member')
        OR family_group_members.user_id = auth.uid()
      )
    )
  );

-- RLS Policies for family_group_profiles
CREATE POLICY "Members can view shared profiles"
  ON family_group_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_group_members 
      WHERE group_id = family_group_profiles.group_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Owners and admins can share profiles"
  ON family_group_profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_group_members 
      WHERE group_id = family_group_profiles.group_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners and admins can unshare profiles"
  ON family_group_profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM family_group_members 
      WHERE group_id = family_group_profiles.group_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- Function to get all accessible profiles (owned + family group shared)
CREATE OR REPLACE FUNCTION get_accessible_profiles()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  name TEXT,
  is_default BOOLEAN,
  created_at TIMESTAMPTZ,
  access_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  -- User's own profiles
  SELECT 
    ep.id,
    ep.user_id,
    ep.name,
    ep.is_default,
    ep.created_at,
    'owner'::TEXT as access_type
  FROM expense_profiles ep
  WHERE ep.user_id = auth.uid()
  
  UNION
  
  -- Profiles shared through family groups
  SELECT 
    ep.id,
    ep.user_id,
    ep.name,
    ep.is_default,
    ep.created_at,
    'family'::TEXT as access_type
  FROM expense_profiles ep
  INNER JOIN family_group_profiles fgp ON fgp.profile_id = ep.id
  INNER JOIN family_group_members fgm ON fgm.group_id = fgp.group_id
  WHERE fgm.user_id = auth.uid()
  AND ep.id NOT IN (
    SELECT id FROM expense_profiles WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-add creator as owner when group is created
CREATE OR REPLACE FUNCTION auto_add_group_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO family_group_members (group_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_add_group_owner
  AFTER INSERT ON family_groups
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_group_owner();
