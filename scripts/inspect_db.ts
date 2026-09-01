import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(url, serviceKey);

async function inspectHackathons() {
  const { data, error } = await supabase.from('hackathons').select('*').limit(3);
  if (error) {
    console.error('Error fetching hackathons:', error);
    return;
  }
  if (data && data.length > 0) {
    console.log('Hackathons columns:', Object.keys(data[0]));
    data.forEach((h, i) => {
      console.log(`Hackathon ${i}:`, {
        id: h.id,
        title: h.title,
        status: h.status,
        publication_status: h.publication_status,
        max_team_size: h.max_team_size
      });
    });
  }
}

inspectHackathons().catch(console.error);
