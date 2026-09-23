import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(url, serviceKey);

async function runAudit() {
  console.log('=== REMOTE DATABASE FORENSIC AUDIT ===');
  console.log('Project URL:', url);

  // 1. List all local migrations
  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
  const migrationFiles = fs.readdirSync(migrationsDir).sort();
  console.log('\n--- Local Migration Files (' + migrationFiles.length + ') ---');
  migrationFiles.forEach(f => console.log(' - ' + f));

  // 2. Check existence of key tables
  const tablesToCheck = [
    'profiles',
    'hackathons',
    'search_history',
    'search_events',
    'saved_collections',
    'collection_items',
    'user_interests',
    'curated_collections',
    'admin_allowlist',
    'admin_audit_logs',
    'developer_profiles',
    'developer_skill_evidence',
    'developer_external_accounts',
    'developer_evidence',
    'reviews',
    'bookmarks',
    'notifications',
    'teams',
    'team_members',
    'team_invitations',
    'connections',
    'user_blocks',
    'team_projects',
    'team_tasks'
  ];

  console.log('\n--- Table Existence Check ---');
  const tableStatus: Record<string, boolean> = {};
  for (const table of tablesToCheck) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    const exists = !error || !error.message.includes('Could not find the table');
    tableStatus[table] = exists;
    console.log(`Table [${table}]: ${exists ? 'EXISTS' : 'DOES NOT EXIST'} ${error ? `(${error.message})` : `(${data?.length ?? 0} rows sampled)`}`);
  }

  // 3. Inspect columns of key existing tables
  console.log('\n--- Column Inspection for Existing Tables ---');
  
  // profiles
  const { data: profileSample } = await supabase.from('profiles').select('*').limit(1);
  if (profileSample && profileSample.length > 0) {
    console.log('profiles columns:', Object.keys(profileSample[0]));
    console.log('profiles.discoverable_for_teams exists:', 'discoverable_for_teams' in profileSample[0]);
  } else {
    console.log('profiles table sample empty, checking discoverable_for_teams via select:');
    const { error } = await supabase.from('profiles').select('id, discoverable_for_teams').limit(1);
    console.log('profiles.discoverable_for_teams query:', error ? error.message : 'OK (Column exists)');
  }

  // hackathons
  const { data: hackathonSample } = await supabase.from('hackathons').select('*').limit(1);
  if (hackathonSample && hackathonSample.length > 0) {
    console.log('hackathons columns:', Object.keys(hackathonSample[0]));
    console.log('hackathons.min_team_size exists:', 'min_team_size' in hackathonSample[0]);
    console.log('hackathons.max_team_size exists:', 'max_team_size' in hackathonSample[0]);
    console.log('hackathons.latitude exists:', 'latitude' in hackathonSample[0]);
    console.log('hackathons.location_status exists:', 'location_status' in hackathonSample[0]);
  }

  // developer_profiles
  const { data: devProfSample } = await supabase.from('developer_profiles').select('*').limit(1);
  if (devProfSample && devProfSample.length > 0) {
    console.log('developer_profiles columns:', Object.keys(devProfSample[0]));
  }

  // developer_external_accounts / developer_accounts
  const { data: devAccSample } = await supabase.from('developer_external_accounts').select('*').limit(1);
  if (devAccSample && devAccSample.length > 0) {
    console.log('developer_external_accounts columns:', Object.keys(devAccSample[0]));
  }

  // developer_skill_evidence
  const { data: devEvSample } = await supabase.from('developer_skill_evidence').select('*').limit(1);
  if (devEvSample && devEvSample.length > 0) {
    console.log('developer_skill_evidence columns:', Object.keys(devEvSample[0]));
  }

  // 4. Check RPCs
  console.log('\n--- RPC Existence Check ---');
  const rpcsToCheck = [
    'create_team_with_owner',
    'accept_team_invitation',
    'transfer_team_ownership',
    'leave_team_with_succession',
    'handle_new_user',
    'is_admin',
    'recompute_developer_profile'
  ];

  for (const r of rpcsToCheck) {
    const { error } = await supabase.rpc(r as any, {} as any);
    const notFound = error && error.message.includes('Could not find the function');
    console.log(`RPC [${r}]: ${notFound ? 'NOT FOUND' : 'EXISTS / REACHABLE'} (${error?.message || 'OK'})`);
  }
}

runAudit().catch(console.error);
