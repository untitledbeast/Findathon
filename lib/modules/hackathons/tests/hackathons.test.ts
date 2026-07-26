import assert from 'node:assert';
import { HackathonAggregate } from '../domain/aggregates/HackathonAggregate';
import { HackathonSearchSpecification } from '../domain/specifications/HackathonSearchSpecification';
import { SpatialSpecification } from '../domain/specifications/SpatialSpecification';

export async function runHackathonTests(): Promise<boolean> {
  // Test 1: HackathonAggregate state transitions
  const hackathon = HackathonAggregate.create({
    title: 'Global AI Challenge 2026',
    slug: 'global-ai-challenge-2026',
    description: 'Build futuristic LLM agents with $100k prize pool.',
    startDate: new Date().toISOString(),
    endDate: new Date().toISOString(),
    registrationDeadline: new Date().toISOString(),
    isOnline: true,
    tags: ['AI', 'Python', 'Agentic'],
    prizePool: '$100,000',
    prizeAmount: 100000,
    organizer: 'Findathon Host',
    status: 'draft',
    viewsCount: 10,
    avgRating: 5.0,
    reviewsCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
  }, 'hackathon-1');

  assert.strictEqual(hackathon.id.toString(), 'hackathon-1');
  assert.strictEqual(hackathon.status, 'draft');
  assert.strictEqual(hackathon.version, 1);

  hackathon.approve();
  assert.strictEqual(hackathon.status, 'approved');
  assert.strictEqual(hackathon.version, 2);

  hackathon.incrementViews();
  assert.strictEqual(hackathon.viewsCount, 11);

  // Test 2: HackathonSearchSpecification matching
  const searchSpec = new HackathonSearchSpecification({
    query: 'AI',
    isOnline: true,
    prizeMin: 50000
  });

  const matches = searchSpec.isSatisfiedBy({
    title: hackathon.title,
    description: hackathon.description,
    tags: hackathon.tags,
    isOnline: hackathon.isOnline,
    prizeAmount: hackathon.prizeAmount,
    status: hackathon.status
  });

  assert.strictEqual(matches, true);

  // Test 3: SpatialSpecification matching
  const spatialSpec = new SpatialSpecification({
    north: 13.5,
    south: 12.5,
    east: 77.8,
    west: 77.4,
    zoom: 12
  });

  const inViewport = spatialSpec.isSatisfiedBy({
    latitude: 12.9716, // Bangalore lat
    longitude: 77.5946  // Bangalore lng
  });

  assert.strictEqual(inViewport, true);

  return true;
}

if (require.main === module) {
  runHackathonTests().then(() => console.log('Hackathon domain tests passed!'));
}
