import assert from 'assert';
import { Location, PrizePool, Url, Coordinates } from '../lib/domain/value-objects';
import { HackathonFactory } from '../lib/domain/factories';
import { formatPrize, getSafeImageUrl, DEFAULT_HACKATHON_COVER } from '../lib/utils/formatters';
import { isMarkerEligible } from '../lib/map-utils';
import { ProfileMapper } from '../lib/domain/mappers/profile.mapper';
import { HackathonMapper } from '../lib/domain/mappers/hackathon.mapper';
import { HackathonDTO, ProfileDatabaseRow } from '../types';

console.log('================================================================');
console.log('RUNNING FINDATHON MASTER ROOT-CAUSE VERIFICATION SUITE');
console.log('================================================================\n');

// -------------------------------------------------------------
// GROUP 1: SUBMISSION LOCATION CONTRACT & VALUE OBJECTS
// -------------------------------------------------------------
console.log('[Group 1] Submission Location Contract & Value Object Validation:');

// Test 1: Online event without city -> valid, coords cleared
const onlineLoc = new Location({
  city: null,
  venueName: null,
  isOnline: true,
  coordinates: new Coordinates(19.076, 72.877) // Coordinates should be cleared for online
});
assert.strictEqual(onlineLoc.getIsOnline(), true, 'Online event correctly classified');
assert.strictEqual(onlineLoc.getCoordinates(), undefined, 'Online event has no physical coordinates');
console.log('  ✓ 1. Online event without city is valid with cleared coordinates');

// Test 2: Offline event with city + venueName -> valid
const offlineLocVenue = new Location({
  city: 'Kolkata',
  venueName: 'Guru Nanak Institute of Technology (GNIT)',
  isOnline: false
});
assert.strictEqual(offlineLocVenue.getCity(), 'Kolkata', 'City correctly set');
assert.strictEqual(offlineLocVenue.getVenueName(), 'Guru Nanak Institute of Technology (GNIT)', 'Venue correctly set');
console.log('  ✓ 2. Offline event with city and venue is valid');

// Test 3: Offline event with city + address (e.g. non-college venue like coworking space) -> valid
const offlineLocAddress = new Location({
  city: 'Bengaluru',
  fullAddress: 'WeWork Galaxy, 43 Residency Rd, Shanthala Nagar, Ashok Nagar',
  isOnline: false
});
assert.strictEqual(offlineLocAddress.getCity(), 'Bengaluru');
assert.strictEqual(offlineLocAddress.getFullAddress(), 'WeWork Galaxy, 43 Residency Rd, Shanthala Nagar, Ashok Nagar');
console.log('  ✓ 3. Offline event with city and address (coworking/office) is valid');

// Test 4: Offline event without city -> throws ValidationError
let caughtNoCity = false;
try {
  new Location({
    city: '   ',
    venueName: 'Some Venue',
    isOnline: false
  });
} catch (err: unknown) {
  caughtNoCity = true;
  assert((err as Error).message.includes('City location is required'), 'Correct validation error thrown');
}
assert.strictEqual(caughtNoCity, true, 'Rejected offline event missing city');
console.log('  ✓ 4. Offline event without city is strictly rejected with clear validation error');

// Test 5: Offline event with city but missing venue AND address -> throws ValidationError
let caughtNoVenueOrAddress = false;
try {
  new Location({
    city: 'Mumbai',
    venueName: '',
    fullAddress: '',
    isOnline: false
  });
} catch (err: unknown) {
  caughtNoVenueOrAddress = true;
  assert((err as Error).message.includes('Venue name or address is required'), 'Correct validation error thrown');
}
assert.strictEqual(caughtNoVenueOrAddress, true, 'Rejected offline event missing venue and address');
console.log('  ✓ 5. Offline event missing both venue and address is rejected');
console.log('  ✓ 5. Offline event missing both venue and address is rejected');

// Test 6: Legacy alias compatibility in Location Value Object
const legacyLoc = new Location({
  locationCity: 'Panihati',
  locationCollege: 'GNIT College',
  isOnline: false
});
assert.strictEqual(legacyLoc.getCity(), 'Panihati', 'locationCity alias mapped to city');
assert.strictEqual(legacyLoc.getVenueName(), 'GNIT College', 'locationCollege alias mapped to venueName');
assert.strictEqual(legacyLoc.getCollege(), 'GNIT College', 'getCollege() accessor returns venueName');
console.log('  ✓ 6. Legacy aliases (locationCity, locationCollege) cleanly supported at value object boundary');

// -------------------------------------------------------------
// GROUP 2: FACTORY & COMMAND PARITY (GNIT PANIHATI SCENARIO)
// -------------------------------------------------------------
console.log('\n[Group 2] Factory & Command Parity (GNIT Panihati Manual Entry):');

const gnitEntity = HackathonFactory.createNew({
  title: 'GNIT HackFest 2026',
  description: 'Annual flagship technical hackathon at Guru Nanak Institute of Technology.',
  startDate: '2026-09-10T09:00:00Z',
  endDate: '2026-09-12T18:00:00Z',
  registrationDeadline: '2026-09-08T23:59:59Z',
  registerUrl: 'https://gnit.ac.in/hackfest',
  organizer: 'GNIT Tech Club',
  isOnline: false,
  locationCity: 'Panihati',
  locationCollege: 'Guru Nanak Institute of Technology (GNIT)',
  fullAddress: '157/F, Nilgunj Rd, Sahid Colony, Panihati, Kolkata, West Bengal 700114',
  coverImageUrl: 'https://d8it4huxumps7.cloudfront.net/uploads/images/opportunity/banner/6a8f184661503_moneyball.png?d=1920x557',
  prizePool: '₹2,50,000',
  submittedBy: 'user_gnit_organizer'
});

assert.strictEqual(gnitEntity.location.getCity(), 'Panihati', 'GNIT city preserved in entity');
assert.strictEqual(gnitEntity.location.getVenueName(), 'Guru Nanak Institute of Technology (GNIT)', 'GNIT venue preserved');
assert.strictEqual(gnitEntity.coverImageUrl?.getValue().includes('cloudfront.net'), true, 'CloudFront cover image preserved');
assert.strictEqual(gnitEntity.prizePool.getFormatted(), '₹2,50,000', 'INR prize pool preserved');
console.log('  ✓ 7. Manual GNIT Panihati submission creates valid entity with city, venue, CloudFront URL, and INR prize');

// -------------------------------------------------------------
// GROUP 3: PRIZE POOL & CURRENCY CONTRACT
// -------------------------------------------------------------
console.log('\n[Group 3] Prize Pool & Currency Contract:');

// Test 8: Format explicit INR
const p1 = new PrizePool('₹5,00,000');
assert.strictEqual(p1.getFormatted(), '₹5,00,000');
assert.strictEqual(p1.getNumericAmount(), 500000);
assert.strictEqual(p1.getCurrency(), 'INR');

// Test 9: Format explicit USD
const p2 = new PrizePool('$10,000');
assert.strictEqual(p2.getFormatted(), '$10,000');
assert.strictEqual(p2.getNumericAmount(), 10000);
assert.strictEqual(p2.getCurrency(), 'USD');

// Test 10: Numeric amount with currency parameter
const p3 = new PrizePool(50000, 'INR');
assert.strictEqual(p3.getFormatted(), '₹50,000');

const p4 = new PrizePool(10000, 'USD');
assert.strictEqual(p4.getFormatted(), '$10,000');

// Test 11: formatPrize helper with various currencies
assert.strictEqual(formatPrize(null, 500000, 'INR'), '₹500,000');
assert.strictEqual(formatPrize(null, 25000, 'USD'), '$25,000');
assert.strictEqual(formatPrize(null, 15000, 'EUR'), '€15,000');
assert.strictEqual(formatPrize(null, 5000, 'GBP'), '£5,000');
assert.strictEqual(formatPrize('₹10,00,000'), '₹10,00,000', 'Preserves formatted string');
assert.strictEqual(formatPrize('$50,000'), '$50,000', 'Preserves USD formatted string');
assert.strictEqual(formatPrize(null, 50000, null), '50,000', 'Unlabelled currency outputs neutral formatted number');
assert.strictEqual(formatPrize(null, 0), 'Free', 'Zero amount returns Free');

console.log('  ✓ 8. INR, USD, EUR, GBP and neutral unlabelled prize amounts formatted truthfully');

// -------------------------------------------------------------
// GROUP 4: COVER IMAGE URL VALIDATION & FALLBACKS
// -------------------------------------------------------------
console.log('\n[Group 4] Cover Image URL Validation & Fallbacks:');

// Test 12: Valid HTTPS with query parameters
const u1 = new Url('https://d8it4huxumps7.cloudfront.net/uploads/banner.png?d=1920x557&q=80');
assert(u1.getValue().startsWith('https://'), 'Valid HTTPS parsed');
assert(u1.getValue().includes('?d=1920x557&q=80'), 'Query parameters preserved intact');

// Test 13: Reject dangerous protocols
let caughtJs = false;
try {
  new Url('javascript:alert(1)');
} catch {
  caughtJs = true;
}
assert.strictEqual(caughtJs, true, 'javascript: URI rejected');

let caughtLocalhost = false;
try {
  new Url('http://localhost:3000/internal-api');
} catch {
  caughtLocalhost = true;
}
assert.strictEqual(caughtLocalhost, true, 'localhost URI rejected');

// Test 14: getSafeImageUrl fallback
assert.strictEqual(getSafeImageUrl(null), DEFAULT_HACKATHON_COVER, 'Null image falls back to default');
assert.strictEqual(getSafeImageUrl(''), DEFAULT_HACKATHON_COVER, 'Empty image falls back to default');
assert.strictEqual(getSafeImageUrl('https://example.com/banner.jpg'), 'https://example.com/banner.jpg');

console.log('  ✓ 9. Valid HTTPS with query strings preserved; localhost and javascript: URIs rejected; fallbacks verified');

// -------------------------------------------------------------
// GROUP 5: LOCATION RESOLUTION & MAP MARKER ELIGIBILITY
// -------------------------------------------------------------
console.log('\n[Group 5] Location Resolution & Map Marker Eligibility:');

// Test 15: isMarkerEligible requires offline + resolved coords
assert.strictEqual(isMarkerEligible({
  id: 'h1',
  title: 'Offline Event',
  description: '',
  start_date: '2026-09-01',
  end_date: '2026-09-02',
  is_online: false,
  tags: [],
  register_url: '#',
  organizer: '',
  status: 'approved',
  latitude: 19.0760,
  longitude: 72.8777
}), true, 'Offline event with valid coordinates is eligible for marker');

assert.strictEqual(isMarkerEligible({
  id: 'h2',
  title: 'Online Event',
  description: '',
  start_date: '2026-09-01',
  end_date: '2026-09-02',
  is_online: true,
  tags: [],
  register_url: '#',
  organizer: '',
  status: 'approved',
  latitude: 19.0760,
  longitude: 72.8777
}), false, 'Online event is NEVER eligible for physical map marker');

assert.strictEqual(isMarkerEligible({
  id: 'h3',
  title: 'Unresolved Event',
  description: '',
  start_date: '2026-09-01',
  end_date: '2026-09-02',
  is_online: false,
  tags: [],
  register_url: '#',
  organizer: '',
  status: 'approved',
  latitude: null,
  longitude: null
}), false, 'Unresolved event has no marker');

assert.strictEqual(isMarkerEligible({
  id: 'h4',
  title: 'Suspicious 0,0 Event',
  description: '',
  start_date: '2026-09-01',
  end_date: '2026-09-02',
  is_online: false,
  tags: [],
  register_url: '#',
  organizer: '',
  status: 'approved',
  latitude: 0,
  longitude: 0
}), false, 'Null Island (0,0) rejected');

console.log('  ✓ 10. Marker eligibility strictly isolates physical vs online vs unresolved events');

// -------------------------------------------------------------
// GROUP 6: TEAMSPACE PROFILE DISCOVERABILITY MAPPING
// -------------------------------------------------------------
console.log('\n[Group 6] TeamSpace Profile Discoverability Mapping:');

const rowTrue = {
  id: 'user_123',
  full_name: 'Jane Doe',
  discoverable_for_teams: true,
  role: 'user'
};

const dtoTrue = ProfileMapper.rowToDTO(rowTrue as unknown as ProfileDatabaseRow);
assert.strictEqual(dtoTrue.discoverableForTeams, true, 'Row discoverable_for_teams=true mapped to DTO discoverableForTeams=true');

const updatePayload = ProfileMapper.dtoToRow({
  discoverableForTeams: false
});
assert.strictEqual(updatePayload.discoverable_for_teams, false, 'DTO discoverableForTeams=false mapped to row discoverable_for_teams=false');

console.log('  ✓ 11. ProfileMapper bidirectional discoverableForTeams <-> discoverable_for_teams verified');

// -------------------------------------------------------------
// GROUP 7: DATABASE MAPPER DB_COLUMNS INTEGRITY
// -------------------------------------------------------------
console.log('\n[Group 7] HackathonMapper DB_COLUMNS Preservation:');

const rawDto: Partial<HackathonDTO> = {
  id: 'h_test_1',
  title: 'Full Stack Hack',
  tagline: 'Build next-gen apps',
  locationCity: 'Panihati',
  locationCollege: 'GNIT',
  fullAddress: '157/F Nilgunj Rd',
  mode: 'offline',
  isOnline: false,
  prizePool: '₹1,00,000',
  latitude: 22.6955,
  longitude: 88.3758,
  coverImageUrl: 'https://images.unsplash.com/photo-1517245386807',
  submittedBy: 'user_author'
};

const rowSanitized = HackathonMapper.dtoToRow(rawDto);
assert.strictEqual(rowSanitized.tagline, 'Build next-gen apps', 'Tagline preserved');
assert.strictEqual(rowSanitized.location_city, 'Panihati', 'City preserved');
assert.strictEqual(rowSanitized.location_college, 'GNIT', 'Venue preserved');
assert.strictEqual(rowSanitized.full_address, '157/F Nilgunj Rd', 'Full address preserved');
assert.strictEqual(rowSanitized.mode, 'offline', 'Mode preserved');
assert.strictEqual(rowSanitized.prize_pool, '₹1,00,000', 'Prize pool preserved');
assert.strictEqual(rowSanitized.latitude, 22.6955, 'Latitude preserved');
assert.strictEqual(rowSanitized.longitude, 88.3758, 'Longitude preserved');
assert.strictEqual(rowSanitized.cover_image_url, 'https://images.unsplash.com/photo-1517245386807', 'Cover image URL preserved');
assert.strictEqual(rowSanitized.submitted_by, 'user_author', 'SubmittedBy preserved');

console.log('  ✓ 12. HackathonMapper.dtoToRow retains all location, prize, cover, and coordinate columns without stripping');

console.log('\n================================================================');
console.log('ALL MASTER ROOT-CAUSE VERIFICATION CHECKS PASSED (100% GREEN)');
console.log('================================================================');
