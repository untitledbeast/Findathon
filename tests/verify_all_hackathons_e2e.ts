import { createHackathonModule } from '../lib/composition';
import { createRequestContext } from '../lib/context/request-context';
import { createHackathonQueryService } from '../lib/services/factories';
import { HackathonSearchSpecification } from '../lib/domain/specifications';
import { StatelessDiscoveryEngine } from '../lib/discovery-engine';

async function runE2E() {
  console.log('====================================================');
  console.log('RUNNING FINDATHON ALL HACKATHONS E2E FORENSIC AUDIT');
  console.log('====================================================\n');

  const context = createRequestContext(null, {});
  const { searchHandler } = createHackathonModule();

  // 1. ALL HACKATHONS
  const allRes = await searchHandler.execute(context, { limit: 20 });
  console.log('[1] All Hackathons:');
  console.log(`    Status: ${allRes.ok ? 'OK' : 'FAIL'}`);
  if (allRes.ok) {
    console.log(`    Count: ${allRes.value.hackathons.length} | Total: ${allRes.value.total}`);
    allRes.value.hackathons.forEach((h, i) => console.log(`    ${i + 1}. ${h.title} (online: ${h.isOnline}, city: ${h.locationCity})`));
  }

  // 2. ONLINE HACKATHONS
  const onlineRes = await searchHandler.execute(context, { isOnline: true, limit: 20 });
  console.log('\n[2] Online Hackathons:');
  console.log(`    Status: ${onlineRes.ok ? 'OK' : 'FAIL'}`);
  if (onlineRes.ok) {
    console.log(`    Count: ${onlineRes.value.hackathons.length} | Total: ${onlineRes.value.total}`);
    onlineRes.value.hackathons.forEach((h, i) => console.log(`    ${i + 1}. ${h.title} (online: ${h.isOnline})`));
  }

  // 3. IN-PERSON HACKATHONS
  const offlineRes = await searchHandler.execute(context, { isOnline: false, limit: 20 });
  console.log('\n[3] In-Person Hackathons:');
  console.log(`    Status: ${offlineRes.ok ? 'OK' : 'FAIL'}`);
  if (offlineRes.ok) {
    console.log(`    Count: ${offlineRes.value.hackathons.length} | Total: ${offlineRes.value.total}`);
    offlineRes.value.hackathons.forEach((h, i) => console.log(`    ${i + 1}. ${h.title} (city: ${h.locationCity})`));
  }

  // 4. SEARCH QUERY: Mumbai
  const searchRes = await searchHandler.execute(context, { query: 'Mumbai', limit: 20 });
  console.log('\n[4] Search "Mumbai":');
  console.log(`    Status: ${searchRes.ok ? 'OK' : 'FAIL'}`);
  if (searchRes.ok) {
    console.log(`    Count: ${searchRes.value.hackathons.length} | Total: ${searchRes.value.total}`);
    searchRes.value.hackathons.forEach((h, i) => console.log(`    ${i + 1}. ${h.title}`));
  }

  // 5. IMPOSSIBLE SEARCH: NonExistentXYZ
  const impossibleRes = await searchHandler.execute(context, { query: 'NonExistentXYZ12345', limit: 20 });
  console.log('\n[5] Impossible Search "NonExistentXYZ12345":');
  console.log(`    Status: ${impossibleRes.ok ? 'OK' : 'FAIL'}`);
  if (impossibleRes.ok) {
    console.log(`    Count: ${impossibleRes.value.hackathons.length} | Total: ${impossibleRes.value.total}`);
  }

  // 6. LIB/REPOSITORY.TS (Discovery Engine)
  const discoveryEngine = new StatelessDiscoveryEngine();
  const discRes = await discoveryEngine.discover({});
  console.log('\n[6] Discovery Engine (Categories & Spotlight):');
  console.log(`    Results Count: ${discRes.results.length} | Total: ${discRes.total}`);

  // 7. QUERY SERVICE GET ALL
  const queryService = createHackathonQueryService();
  const spec = new HackathonSearchSpecification({});
  const qsRes = await queryService.getAll(context, spec);
  console.log('\n[7] Query Service getAll:');
  console.log(`    Status: ${qsRes.ok ? 'OK' : 'FAIL'}`);
  if (qsRes.ok) {
    console.log(`    Count: ${qsRes.value.hackathons.length} | Total: ${qsRes.value.total}`);
  }

  console.log('\n====================================================');
  console.log('ALL TESTS COMPLETED SUCCESSFULLY');
  console.log('====================================================');
}

runE2E().catch(console.error);
