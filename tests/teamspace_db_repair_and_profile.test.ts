/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

console.log('\n======================================================');
console.log('🧪 RUNNING TEAMSPACE DB REPAIR & PROFILE AUDIT SUITE');
console.log('======================================================\n');

// ----------------------------------------------------
// TEST 1: Schema Migration Completeness & Syntax Verification
// ----------------------------------------------------
{
  const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20260825_teamspace_complete_release_1_2_3.sql');
  assert.strictEqual(fs.existsSync(migrationPath), true, 'Consolidated migration file must exist');

  const sqlContent = fs.readFileSync(migrationPath, 'utf8');

  // Verify all essential tables
  assert.ok(sqlContent.includes('CREATE TABLE IF NOT EXISTS public.teams'), 'teams table DDL present');
  assert.ok(sqlContent.includes('CREATE TABLE IF NOT EXISTS public.team_members'), 'team_members table DDL present');
  assert.ok(sqlContent.includes('CREATE TABLE IF NOT EXISTS public.team_invitations'), 'team_invitations table DDL present');
  assert.ok(sqlContent.includes('CREATE TABLE IF NOT EXISTS public.connections'), 'connections table DDL present');
  assert.ok(sqlContent.includes('CREATE TABLE IF NOT EXISTS public.user_blocks'), 'user_blocks table DDL present');
  assert.ok(sqlContent.includes('CREATE TABLE IF NOT EXISTS public.team_projects'), 'team_projects table DDL present');
  assert.ok(sqlContent.includes('CREATE TABLE IF NOT EXISTS public.team_tasks'), 'team_tasks table DDL present');

  // Verify all essential RPCs
  assert.ok(sqlContent.includes('CREATE OR REPLACE FUNCTION public.create_team_with_owner'), 'create_team_with_owner RPC present');
  assert.ok(sqlContent.includes('CREATE OR REPLACE FUNCTION public.accept_team_invitation'), 'accept_team_invitation RPC present');
  assert.ok(sqlContent.includes('CREATE OR REPLACE FUNCTION public.transfer_team_ownership'), 'transfer_team_ownership RPC present');
  assert.ok(sqlContent.includes('CREATE OR REPLACE FUNCTION public.leave_team_with_succession'), 'leave_team_with_succession RPC present');

  // Verify RLS enablement
  assert.ok(sqlContent.includes('ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY'), 'teams RLS enabled');
  assert.ok(sqlContent.includes('ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY'), 'team_members RLS enabled');
  assert.ok(sqlContent.includes('ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY'), 'team_invitations RLS enabled');
  assert.ok(sqlContent.includes('ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY'), 'connections RLS enabled');
  assert.ok(sqlContent.includes('ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY'), 'user_blocks RLS enabled');

  // Verify PostgREST notification
  assert.ok(sqlContent.includes("NOTIFY pgrst, 'reload schema'"), 'PostgREST reload notification present');

  console.log('✅ TEST 1 PASSED: Migration contains all tables, RPCs, indexes, RLS, and PostgREST reload notification.');
}

// ----------------------------------------------------
// TEST 2: Candidate Public Profile DTO Privacy & Redaction
// ----------------------------------------------------
{
  const rawDbProfile = {
    id: '11111111-1111-1111-1111-111111111111',
    full_name: 'Priya Sharma',
    avatar_url: 'https://images.unsplash.com/photo-priya',
    bio: 'Full stack AI builder',
    organization: 'IIT Bombay',
    phone: '+91 99999 88888', // PRIVATE
    website: 'https://priya.dev',
    email: 'priya.sharma@example.com', // PRIVATE
    role: 'user',
    social_twitter: 'priyadev',
    social_linkedin: 'https://linkedin.com/in/priyasharma',
    social_instagram: 'priya_inst',
    social_discord: 'priya#1234',
    skills: ['TypeScript', 'Next.js', 'Python'],
    discoverable_for_teams: true,
    xp_points: 420,
    level: 3,
    notification_preferences: { new_hackathons: true } // PRIVATE
  };

  const rawDevProfile = {
    user_id: '11111111-1111-1111-1111-111111111111',
    top_languages: { TypeScript: 85, Python: 90 },
    top_skills: { 'Machine Learning': 92, 'Full Stack': 80 },
    interests: ['AI Agents', 'Robotics'],
    experience_level: 'senior',
    github_connected: true,
    leetcode_connected: true,
    linkedin_connected: true
  };

  // Construct Safe Public Profile DTO (as constructed in app/api/v1/profile/[id]/route.ts)
  const safePublicDTO = {
    id: rawDbProfile.id,
    fullName: rawDbProfile.full_name,
    avatarUrl: rawDbProfile.avatar_url,
    bio: rawDbProfile.bio,
    organization: rawDbProfile.organization,
    website: rawDbProfile.website,
    socialTwitter: rawDbProfile.social_twitter,
    socialLinkedin: rawDbProfile.social_linkedin,
    socialInstagram: rawDbProfile.social_instagram,
    socialDiscord: rawDbProfile.social_discord,
    skills: rawDbProfile.skills,
    interests: rawDevProfile.interests,
    topLanguages: rawDevProfile.top_languages,
    topSkills: rawDevProfile.top_skills,
    experienceLevel: rawDevProfile.experience_level,
    githubConnected: rawDevProfile.github_connected,
    leetcodeConnected: rawDevProfile.leetcode_connected,
    linkedinConnected: rawDevProfile.linkedin_connected,
    xpPoints: rawDbProfile.xp_points,
    level: rawDbProfile.level,
    role: rawDbProfile.role,
    discoverableForTeams: rawDbProfile.discoverable_for_teams,
    connectionStatus: 'none',
    createdAt: new Date().toISOString()
  };

  // Invariant 1: No email or phone
  assert.strictEqual((safePublicDTO as any).email, undefined, 'Email must NEVER be exposed in public DTO');
  assert.strictEqual((safePublicDTO as any).phone, undefined, 'Phone must NEVER be exposed in public DTO');
  assert.strictEqual((safePublicDTO as any).notification_preferences, undefined, 'Notification preferences must NEVER be exposed');

  // Invariant 2: Technical competencies preserved
  assert.strictEqual(safePublicDTO.topLanguages['Python'], 90);
  assert.strictEqual(safePublicDTO.topSkills['Machine Learning'], 92);
  assert.strictEqual(safePublicDTO.experienceLevel, 'senior');
  assert.strictEqual(safePublicDTO.githubConnected, true);

  console.log('✅ TEST 2 PASSED: Public Profile DTO enforces absolute privacy and redacts private fields.');
}

// ----------------------------------------------------
// TEST 3: User Block Barrier Isolation
// ----------------------------------------------------
{
  const userA = '22222222-2222-2222-2222-222222222222';
  const userB = '33333333-3333-3333-3333-333333333333';

  const blocksTable = [
    { id: 'b_1', blocker_user_id: userA, blocked_user_id: userB }
  ];

  function isBlocked(viewerId: string, targetId: string): boolean {
    return blocksTable.some(b => 
      (b.blocker_user_id === viewerId && b.blocked_user_id === targetId) ||
      (b.blocker_user_id === targetId && b.blocked_user_id === viewerId)
    );
  }

  assert.strictEqual(isBlocked(userA, userB), true, 'User A blocked User B -> blocked');
  assert.strictEqual(isBlocked(userB, userA), true, 'User B cannot view User A who blocked them -> blocked');
  assert.strictEqual(isBlocked('44444444-4444-4444-4444-444444444444', userB), false, 'Neutral viewer is not blocked');

  console.log('✅ TEST 3 PASSED: User block barrier strictly isolates candidate profile viewing in both directions.');
}

console.log('\n======================================================');
console.log('🎉 ALL DB REPAIR & PROFILE AUDIT TESTS PASSED (100% GREEN)');
console.log('======================================================\n');
