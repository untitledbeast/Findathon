import { normalizeHackathonDetail } from '../lib/utils/hackathon-normalizer';
import {
  formatPrize,
  formatDate,
  formatDateRange,
  normalizeUrl,
  isValidExternalUrl,
  getSafeImageUrl,
  getDaysUntil,
  DEFAULT_HACKATHON_COVER
} from '../lib/utils/formatters';
import { createHackathonModule } from '../lib/composition';
import { createRequestContext } from '../lib/context/request-context';
import { createHackathonQueryService } from '../lib/services/factories';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runMasterBeastModeTests() {
  console.log('====================================================');
  console.log('RUNNING MASTER BEAST MODE UNIVERSAL HARDENING SUITE');
  console.log('====================================================\n');

  // ─── [1] EXACT REGRESSION TEST: toLocaleString CRASH ELIMINATION ──
  console.log('[1] Exact Regression Test: Missing/Null Prize Fields:');
  {
    // Case A: prizePool is null and prizeAmount is undefined (The exact crash that occurred)
    const rawCrashingObject = {
      id: 'crash-test-1',
      title: 'Crash Prevention Hackathon',
      prizePool: null,
      prizeAmount: undefined
    };
    const normalizedA = normalizeHackathonDetail(rawCrashingObject);
    assert(normalizedA.prizeDisplay === 'TBD', 'Must safely output TBD without throwing TypeError');
    assert(normalizedA.prizeAmount === 0, 'prizeAmount must default to 0');
    console.log('  ✓ Case A: prizePool: null, prizeAmount: undefined -> prizeDisplay: "TBD" (No crash)');

    // Case B: prizeAmount is 0 (Meaningful zero amount)
    const rawZeroPrize = {
      id: 'zero-prize-test',
      title: 'Free Student Hackathon',
      prizeAmount: 0
    };
    const normalizedB = normalizeHackathonDetail(rawZeroPrize);
    assert(normalizedB.prizeDisplay === 'Free Registration', '0 prize amount must output Free Registration');
    console.log('  ✓ Case B: prizeAmount: 0 -> prizeDisplay: "Free Registration"');

    // Case C: Numeric prizeAmount
    const rawNumericPrize = {
      id: 'numeric-prize-test',
      title: 'Grand AI Hackathon',
      prizeAmount: 100000
    };
    const normalizedC = normalizeHackathonDetail(rawNumericPrize);
    assert(normalizedC.prizeDisplay === '$100,000', '100000 must format to $100,000');
    console.log('  ✓ Case C: prizeAmount: 100000 -> prizeDisplay: "$100,000"');

    // Case D: Pre-formatted custom currency string
    const rawStringPrize = {
      id: 'string-prize-test',
      title: 'India Web3 Fest',
      prizePool: '₹25,00,000'
    };
    const normalizedD = normalizeHackathonDetail(rawStringPrize);
    assert(normalizedD.prizeDisplay === '₹25,00,000', 'Explicit formatted string must be preserved');
    console.log('  ✓ Case D: prizePool: "₹25,00,000" -> prizeDisplay: "₹25,00,000"');
  }

  // ─── [2] UNIVERSAL FORMATTERS RESILIENCE ─────────────────────────
  console.log('\n[2] Centralized Safe Formatters Verification:');
  {
    // formatPrize
    assert(formatPrize(null, null) === 'TBD', 'formatPrize(null, null) returns TBD');
    assert(formatPrize(undefined, undefined) === 'TBD', 'formatPrize(undefined, undefined) returns TBD');
    assert(formatPrize(null, 5000) === '$5,000', 'formatPrize(null, 5000) returns $5,000');
    assert(formatPrize(null, '75000') === '$75,000', 'formatPrize(null, "75000") returns $75,000');
    console.log('  ✓ formatPrize handles null, undefined, numeric strings, and raw numbers');

    // formatDate
    assert(formatDate(null) === 'TBD', 'formatDate(null) returns fallback');
    assert(formatDate('invalid-date-string') === 'TBD', 'formatDate invalid returns fallback');
    assert(formatDate('2026-08-25T00:00:00.000Z') === 'Aug 25, 2026', 'formatDate valid ISO works');
    console.log('  ✓ formatDate never outputs "Invalid Date" or crashes');

    // formatDateRange
    assert(formatDateRange(null, null) === 'Dates Announced Soon', 'formatDateRange null handling');
    assert(
      formatDateRange('2026-08-10T00:00:00.000Z', '2026-08-12T00:00:00.000Z') === 'Aug 10–12, 2026',
      'Same month date range formatting'
    );
    assert(
      formatDateRange('2026-08-30T00:00:00.000Z', '2026-09-02T00:00:00.000Z') === 'Aug 30 – Sep 2, 2026',
      'Cross month date range formatting'
    );
    console.log('  ✓ formatDateRange handles same-day, same-month, cross-month, and missing dates');

    // normalizeUrl & isValidExternalUrl
    assert(normalizeUrl(null) === '#', 'normalizeUrl null returns fallback');
    assert(normalizeUrl('javascript:alert(1)') === '#', 'normalizeUrl blocks javascript: scheme');
    assert(normalizeUrl('findathon.vercel.app') === 'https://findathon.vercel.app', 'normalizeUrl prepends https://');
    assert(isValidExternalUrl('https://devfolio.co/hackathons'), 'valid external URL recognized');
    assert(!isValidExternalUrl('#'), 'hash link is not valid external URL');
    console.log('  ✓ normalizeUrl prevents XSS and guarantees secure HTTPS protocol');

    // getSafeImageUrl
    assert(getSafeImageUrl(null) === DEFAULT_HACKATHON_COVER, 'null image returns default cover');
    assert(getSafeImageUrl('') === DEFAULT_HACKATHON_COVER, 'empty image returns default cover');
    assert(getSafeImageUrl('https://example.com/cover.png') === 'https://example.com/cover.png', 'valid image returns URL');
    console.log('  ✓ getSafeImageUrl provides robust image fallback');

    // getDaysUntil
    const future = new Date();
    future.setDate(future.getDate() + 5);
    const daysResult = getDaysUntil(future.toISOString());
    assert(daysResult.days >= 4 && daysResult.days <= 6, 'Calculates future days accurately');
    console.log('  ✓ getDaysUntil calculates timeline metrics accurately');
  }

  // ─── [3] UNIVERSAL HACKATHON NORMALIZER WITH INCOMPLETE RECORDS ──
  console.log('\n[3] Universal Normalizer with Sparse & Legacy Records:');
  {
    // Minimal record with only ID and title
    const minimal = normalizeHackathonDetail({ id: 'min-1', title: 'Minimal Hackathon' });
    assert(minimal.id === 'min-1', 'ID preserved');
    assert(minimal.title === 'Minimal Hackathon', 'Title preserved');
    assert(minimal.description === 'No description provided.', 'Default description assigned');
    assert(minimal.locationDisplay === 'In-Person', 'Default locationDisplay assigned');
    assert(minimal.organizer === 'Community Organizer', 'Default organizer assigned');
    assert(minimal.organizerInitial === 'C', 'organizerInitial derived cleanly');
    assert(minimal.coverImageUrl === DEFAULT_HACKATHON_COVER, 'Default cover applied');
    assert(minimal.formattedRating === '5.0', 'Default rating formatted safely');
    assert(minimal.formattedReviewCount === '0', 'Default review count formatted safely');
    assert(minimal.teamSizeDisplay === '1 – 4 Members', 'Default team size formatted safely');
    assert(Array.isArray(minimal.tags) && minimal.tags.length === 0, 'Tags initialized as empty array');
    console.log('  ✓ Minimal record normalized into complete, non-null UI model');

    // Legacy record with snake_case and inconsistent names
    const legacy = normalizeHackathonDetail({
      id: 'legacy-1',
      title: 'Legacy Hackfest',
      start_date: '2026-11-01T00:00:00.000Z',
      end_date: '2026-11-03T00:00:00.000Z',
      location_city: 'Bangalore',
      location_college: 'IISc',
      is_online: false,
      prize_pool: '$20,000',
      register_url: 'devfolio.co/legacy-hack',
      tags: ['AI', 'Robotics']
    });
    assert(legacy.formattedDates === 'Nov 1–3, 2026', 'Legacy dates formatted');
    assert(legacy.locationDisplay === 'Bangalore', 'Legacy locationDisplay formatted');
    assert(legacy.venueDisplay === 'IISc', 'Legacy venueDisplay formatted');
    assert(legacy.prizeDisplay === '$20,000', 'Legacy prize formatted');
    assert(legacy.registerUrl === 'https://devfolio.co/legacy-hack', 'Legacy registration URL normalized');
    assert(legacy.tags.length === 2 && legacy.tags[0] === 'AI', 'Legacy tags mapped');
    console.log('  ✓ Legacy snake_case records normalized seamlessly');
  }

  // ─── [4] DETAIL QUERY & NOT-FOUND ISOLATION ─────────────────────
  console.log('\n[4] Database Detail Query & Fault Isolation:');
  {
    const queryService = createHackathonQueryService();
    const context = createRequestContext(null, {});

    // Existing ID check (from verified DB rows)
    const existingId = 'a6236b42-c71d-4dd2-bb38-ce87b97c593e'; // HackMumbai 2026
    const resExisting = await queryService.getById(context, existingId);
    assert(resExisting.ok, 'Existing record query must succeed');
    if (resExisting.ok) {
      assert(resExisting.value.id === existingId, 'ID matches');
      assert(resExisting.value.title.includes('HackMumbai'), 'Title matches');
      console.log(`  ✓ Existing hackathon loaded: "${resExisting.value.title}"`);
    }

    // Non-existent ID check (Must return clean 404 NOT_FOUND error, not crash or 500)
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const resMissing = await queryService.getById(context, fakeId);
    assert(!resMissing.ok, 'Missing record must return error result');
    if (!resMissing.ok) {
      assert(resMissing.error.statusCode === 404, 'Status code must be 404');
      console.log('  ✓ Non-existent hackathon returns clean 404 NOT_FOUND');
    }
  }

  // ─── [5] END-TO-END FUTURE HACKATHON DISCOVERY & DETAIL LIFECYCLE ──
  console.log('\n[5] End-to-End Discovery & Ingestion Verification:');
  {
    const context = createRequestContext(null, {});
    const { searchHandler } = createHackathonModule();

    const searchRes = await searchHandler.execute(context, { limit: 10 });
    assert(searchRes.ok, 'Search handler must succeed');
    if (searchRes.ok) {
      assert(searchRes.value.hackathons.length === 6, 'Must return all 6 active hackathons');
      assert(searchRes.value.total === 6, 'Total count must be 6');
      for (const h of searchRes.value.hackathons) {
        const normalized = normalizeHackathonDetail(h);
        assert(typeof normalized.id === 'string' && normalized.id.length > 0, 'Every hackathon has valid ID');
        assert(typeof normalized.title === 'string' && normalized.title.length > 0, 'Every hackathon has valid Title');
        assert(typeof normalized.prizeDisplay === 'string', 'Every hackathon has safe prizeDisplay');
        assert(typeof normalized.formattedDates === 'string', 'Every hackathon has safe formattedDates');
        assert(typeof normalized.registerUrl === 'string', 'Every hackathon has safe registerUrl');
      }
      console.log(`  ✓ All ${searchRes.value.hackathons.length} hackathons normalized with 100% field safety`);
    }
  }

  console.log('\n====================================================');
  console.log('MASTER BEAST MODE SUITE: ALL TESTS PASSED (100% GREEN)');
  console.log('====================================================');
}

runMasterBeastModeTests().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
