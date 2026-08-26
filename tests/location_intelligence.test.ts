/* eslint-disable */
import {
  AddressNormalizer,
  LocationValidator,
  LocationResolver,
  NominatimGeocoder,
  HybridGeocodeCache,
  IGeocoder,
  GeocodeResult
} from '../lib/location';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

// Mock Geocoder for deterministic testing
class MockGeocoder implements IGeocoder {
  public callCount = 0;
  public mockResponses = new Map<string, GeocodeResult>();

  public async geocode(address: string): Promise<GeocodeResult | null> {
    this.callCount++;
    const key = address.toLowerCase();

    for (const [mockKey, resp] of this.mockResponses.entries()) {
      if (key.includes(mockKey.toLowerCase())) {
        return resp;
      }
    }

    if (key.includes('mumbai') || key.includes('iit bombay')) {
      return {
        latitude: 19.1334,
        longitude: 72.9133,
        formattedAddress: 'IIT Bombay, Powai, Mumbai, Maharashtra, India',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        precision: 'exact_venue',
        provider: 'mock',
        confidence: 0.95
      };
    }

    if (key.includes('pune') || key.includes('coep')) {
      return {
        latitude: 18.5293,
        longitude: 73.8565,
        formattedAddress: 'COEP Technological University, Shivajinagar, Pune, Maharashtra, India',
        city: 'Pune',
        state: 'Maharashtra',
        country: 'India',
        precision: 'exact_venue',
        provider: 'mock',
        confidence: 0.95
      };
    }

    if (key.includes('delhi') || key.includes('dtu')) {
      return {
        latitude: 28.7501,
        longitude: 77.1177,
        formattedAddress: 'Delhi Technological University, Shahbad Daulatpur, Delhi, India',
        city: 'Delhi',
        state: 'Delhi',
        country: 'India',
        precision: 'exact_venue',
        provider: 'mock',
        confidence: 0.95
      };
    }

    if (key.includes('bangalore') || key.includes('bengaluru') || key.includes('iisc')) {
      return {
        latitude: 13.0184,
        longitude: 77.5644,
        formattedAddress: 'Indian Institute of Science, Bangalore, Karnataka, India',
        city: 'Bengaluru',
        state: 'Karnataka',
        country: 'India',
        precision: 'exact_venue',
        provider: 'mock',
        confidence: 0.95
      };
    }

    if (key.includes('invalid_nowhere_xyz')) {
      return null;
    }

    return null;
  }
}

async function runLocationIntelligenceTests() {
  console.log('====================================================');
  console.log('RUNNING MAP ENGINE LOCATION INTELLIGENCE TEST SUITE');
  console.log('====================================================\n');

  const mockGeocoder = new MockGeocoder();
  const memoryCache = new HybridGeocodeCache();
  const resolver = new LocationResolver(mockGeocoder, memoryCache);

  // ─── [TEST 1] Offline Event with Exact Structured Address ──────
  console.log('[Test 1] Offline event with exact structured address:');
  {
    const res = await resolver.resolve({
      isOnline: false,
      venue: 'IIT Bombay',
      address: 'Main Gate Road, Powai',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      postalCode: '400076'
    });

    assert(res.status === 'RESOLVED', 'Status must be RESOLVED');
    assert(res.latitude !== null && Math.abs(res.latitude - 19.1334) < 0.01, 'Latitude matches IIT Bombay');
    assert(res.longitude !== null && Math.abs(res.longitude - 72.9133) < 0.01, 'Longitude matches IIT Bombay');
    assert(res.source === 'GEOCODER', 'Source must be GEOCODER on first call');
    console.log(`  ✓ Resolved: "${res.normalizedAddress}" -> [${res.latitude}, ${res.longitude}]`);
  }

  // ─── [TEST 2] Offline Event with Venue + City ───────────────────
  console.log('\n[Test 2] Offline event with venue + city (COEP, Pune):');
  {
    const res = await resolver.resolve({
      isOnline: false,
      venue: 'COEP',
      city: 'Pune',
      country: 'India'
    });

    assert(res.status === 'RESOLVED', 'Status must be RESOLVED');
    assert(res.latitude !== null && Math.abs(res.latitude - 18.5293) < 0.01, 'Latitude matches Pune COEP');
    assert(res.longitude !== null && Math.abs(res.longitude - 73.8565) < 0.01, 'Longitude matches Pune COEP');
    assert(res.confidence! >= 0.85, 'Confidence must be high for college venue');
    console.log(`  ✓ Resolved: "${res.normalizedAddress}" -> [${res.latitude}, ${res.longitude}] (Confidence: ${res.confidence})`);
  }

  // ─── [TEST 3] Online Event MUST NOT Have Physical Coordinates ──
  console.log('\n[Test 3] Online Event - Zero Fabricated Coordinates:');
  {
    const res = await resolver.resolve({
      isOnline: true,
      venue: 'Discord & Devpost',
      city: 'Worldwide',
      country: 'India'
    });

    assert(res.status === 'NOT_APPLICABLE', 'Online event status must be NOT_APPLICABLE');
    assert(res.latitude === null, 'Online event latitude must be strictly null');
    assert(res.longitude === null, 'Online event longitude must be strictly null');
    assert(res.normalizedAddress === null, 'Online event normalized address must be null');
    console.log('  ✓ Verified: Online event has status NOT_APPLICABLE with null coordinates (No India-center dummy pin)');
  }

  // ─── [TEST 4] Hybrid Event with Physical Venue ───────────────────
  console.log('\n[Test 4] Hybrid Event with Physical Venue:');
  {
    const res = await resolver.resolve({
      isOnline: false, // Hybrid is physical + online
      venue: 'DTU',
      city: 'Delhi',
      country: 'India'
    });

    assert(res.status === 'RESOLVED', 'Hybrid event with venue must be RESOLVED');
    assert(res.latitude !== null && res.longitude !== null, 'Coordinates resolved');
    console.log(`  ✓ Resolved: DTU Delhi -> [${res.latitude}, ${res.longitude}]`);
  }

  // ─── [TEST 5] Invalid / Unusable Address ────────────────────────
  console.log('\n[Test 5] Invalid / Unusable Address (No Fabricated Fallbacks):');
  {
    const res = await resolver.resolve({
      isOnline: false,
      venue: 'invalid_nowhere_xyz_12345',
      city: null,
      country: 'India'
    });

    assert(res.status === 'UNRESOLVED', 'Invalid address must return UNRESOLVED');
    assert(res.latitude === null, 'Latitude must be null');
    assert(res.longitude === null, 'Longitude must be null');
    assert(res.lastError !== null, 'Error reason must be recorded');
    console.log(`  ✓ Verified: Invalid address safely returns UNRESOLVED with null coordinates (Error: ${res.lastError})`);
  }

  // ─── [TEST 6] Geocoding Cache & Deduplication ───────────────────
  console.log('\n[Test 6] Geocoding Cache & Deduplication (20 Events Same Address):');
  {
    const initialCalls = mockGeocoder.callCount;

    // Resolve 20 events with identical venue and city
    for (let i = 0; i < 20; i++) {
      const res = await resolver.resolve({
        isOnline: false,
        venue: 'IISC',
        city: 'Bangalore',
        country: 'India'
      });
      assert(res.status === 'RESOLVED', 'Must resolve from cache or provider');
      assert(res.latitude !== null && res.longitude !== null, 'Valid coordinates');
      if (i > 0) {
        assert(res.source === 'CACHE', 'Subsequent calls must be served from CACHE');
      }
    }

    const totalNewCalls = mockGeocoder.callCount - initialCalls;
    assert(totalNewCalls === 1, `Expected exactly 1 external geocoder call, got ${totalNewCalls}`);
    console.log(`  ✓ 20 events with identical venue only generated ${totalNewCalls} geocoder call. 19 served instantly from CACHE.`);
  }

  // ─── [TEST 7] Address Normalization Resilience ──────────────────
  console.log('\n[Test 7] Address Normalization Cleaning & Canonicalization:');
  {
    const noisy = AddressNormalizer.normalize({
      venue: '  COEP   Technological University ,  ',
      city: '  PUNE  ',
      state: '  Maharashtra  ',
      country: '  INDIA  '
    });

    assert(noisy !== null, 'Must normalize');
    assert(noisy?.normalizedAddress === 'COEP Technological University, Pune, Maharashtra, India', 'Cleans whitespace and capitalization');
    assert(noisy?.cacheKey === 'coep technological university, pune, maharashtra, india', 'Generates lowercase deterministic cache key');
    console.log(`  ✓ Normalized: "${noisy?.normalizedAddress}" (Cache Key: "${noisy?.cacheKey}")`);
  }

  // ─── [TEST 8] Coordinate Validation Bounds & Null Island Reject ─
  console.log('\n[Test 8] Coordinate Validation & Null Island (0,0) Rejection:');
  {
    assert(!LocationValidator.isValidCoordinate(0, 0), 'Must reject Null Island (0,0)');
    assert(!LocationValidator.isValidCoordinate(null, null), 'Must reject null coordinates');
    assert(!LocationValidator.isValidCoordinate(95, 72), 'Must reject out-of-bounds latitude (95 > 90)');
    assert(!LocationValidator.isValidCoordinate(19, 200), 'Must reject out-of-bounds longitude (200 > 180)');
    assert(LocationValidator.isValidCoordinate(19.0760, 72.8777), 'Must accept valid Mumbai coordinates');
    console.log('  ✓ LocationValidator strictly enforces bounds and rejects (0,0)');
  }

  // ─── [TEST 9] Real Nominatim Live Geocoding Smoke Test ─────────
  console.log('\n[Test 9] Live Nominatim Provider Smoke Test:');
  {
    const liveGeocoder = new NominatimGeocoder({ timeoutMs: 8000 });
    const liveResult = await liveGeocoder.geocode('IIT Bombay, Mumbai, India');
    if (liveResult) {
      assert(LocationValidator.isValidCoordinate(liveResult.latitude, liveResult.longitude), 'Live coordinates valid');
      assert(liveResult.country?.toLowerCase().includes('india'), 'Country is India');
      console.log(`  ✓ Live Nominatim geocoded: IIT Bombay -> [${liveResult.latitude}, ${liveResult.longitude}] (${liveResult.formattedAddress?.slice(0, 50)}...)`);
    } else {
      console.log('  (Live Nominatim request skipped or network timed out - handled gracefully)');
    }
  }

  // ─── [TEST 10] City-Only Location Without Venue (Zero Fake Coordinates) ─
  console.log('\n[Test 10] City-Only Location (Reject City-Center Fallback):');
  {
    const res = await resolver.resolve({
      isOnline: false,
      city: 'Mumbai',
      venue: null,
      address: null,
      country: 'India'
    });

    assert(res.status === 'UNRESOLVED', 'City-only without venue must be UNRESOLVED');
    assert(res.latitude === null, 'Latitude must be null (No city center fallback)');
    assert(res.longitude === null, 'Longitude must be null (No city center fallback)');
    console.log('  ✓ Verified: City-only event safely returns UNRESOLVED with null coordinates');
  }

  // ─── [TEST 11] Event Lifecycle & Live Pulsing Status ─────────────
  console.log('\n[Test 11] Event Lifecycle & Live Status Calculation:');
  {
    const { getHackathonLifecycle, getMarkerStatus } = await import('../lib/map-utils');

    const now = new Date('2026-08-23T12:00:00Z');

    // Live event (today is during hackathon)
    const liveEvent = {
      id: 'live-1',
      title: 'Ongoing Hackathon',
      description: '',
      start_date: '2026-08-20',
      end_date: '2026-08-25',
      is_online: false,
      tags: [],
      register_url: '#',
      organizer: 'Tech Club',
      status: 'approved',
      latitude: 19.0760,
      longitude: 72.8777
    };
    assert(getHackathonLifecycle(liveEvent, now) === 'live', 'Must be marked as live');
    assert(getMarkerStatus(liveEvent, now) === 'live', 'Marker status must be live');

    // Upcoming event
    const upcomingEvent = {
      ...liveEvent,
      id: 'up-1',
      start_date: '2026-09-01',
      end_date: '2026-09-05'
    };
    assert(getHackathonLifecycle(upcomingEvent, now) === 'upcoming', 'Must be marked as upcoming');
    assert(getMarkerStatus(upcomingEvent, now) === 'open', 'Marker status must be open');

    // Ended event
    const endedEvent = {
      ...liveEvent,
      id: 'end-1',
      start_date: '2026-08-01',
      end_date: '2026-08-05'
    };
    assert(getHackathonLifecycle(endedEvent, now) === 'ended', 'Must be marked as ended');
    assert(getMarkerStatus(endedEvent, now) === 'closed', 'Marker status must be closed');

    console.log('  ✓ Verified: Lifecycle accurately classifies live, upcoming, and ended events');
  }

  // ─── [TEST 12] Centralized Marker Eligibility ───────────────────
  console.log('\n[Test 12] Physical Marker Eligibility:');
  {
    const { isMarkerEligible } = await import('../lib/map-utils');

    assert(!isMarkerEligible({
      id: '1', title: 'Online', description: '', start_date: '', end_date: '',
      is_online: true, latitude: 20.5937, longitude: 78.9629, tags: [], register_url: '', organizer: '', status: 'approved'
    }), 'Online event cannot have physical marker');

    assert(!isMarkerEligible({
      id: '2', title: 'Null Island', description: '', start_date: '', end_date: '',
      is_online: false, latitude: 0, longitude: 0, tags: [], register_url: '', organizer: '', status: 'approved'
    }), 'Null Island coordinates cannot have physical marker');

    assert(!isMarkerEligible({
      id: '3', title: 'Missing Coords', description: '', start_date: '', end_date: '',
      is_online: false, latitude: null, longitude: null, tags: [], register_url: '', organizer: '', status: 'approved'
    }), 'Missing coordinates cannot have physical marker');

    assert(isMarkerEligible({
      id: '4', title: 'IIT Bombay', description: '', start_date: '', end_date: '',
      is_online: false, latitude: 19.1334, longitude: 72.9133, tags: [], register_url: '', organizer: '', status: 'approved'
    }), 'Valid offline event with coordinates is marker eligible');

    console.log('  ✓ Verified: isMarkerEligible strictly validates physical event marker eligibility');
  }

  console.log('\n====================================================');
  console.log('LOCATION INTELLIGENCE SUITE: ALL TESTS PASSED (100% GREEN)');
  console.log('====================================================');
}

runLocationIntelligenceTests().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
