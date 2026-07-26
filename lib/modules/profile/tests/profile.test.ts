import assert from 'node:assert';
import { ProfileEntity } from '../domain/entities/ProfileEntity';
import { ProfileService } from '../application/services/ProfileService';
import { IProfileRepository } from '../domain/repositories/IProfileRepository';
import { createRequestContext } from '@/lib/context/request-context';

class MockProfileRepository implements IProfileRepository {
  private profiles = new Map<string, ProfileEntity>();

  async findById(id: string): Promise<ProfileEntity | null> {
    return this.profiles.get(id) || null;
  }

  async save(profile: ProfileEntity): Promise<ProfileEntity> {
    this.profiles.set(profile.id.toString(), profile);
    return profile;
  }

  async update(id: string, partial: Partial<ProfileEntity>): Promise<ProfileEntity> {
    const existing = this.profiles.get(id);
    if (!existing) throw new Error('Not found');
    const updated = existing.updateDetails(partial);
    this.profiles.set(id, updated);
    return updated;
  }
}

export async function runProfileTests(): Promise<boolean> {
  // Test 1: ProfileEntity creation & update
  const entity = ProfileEntity.create({
    fullName: 'Jane Doe',
    avatarUrl: 'https://example.com/avatar.jpg',
    role: 'user',
  }, 'user-123');

  assert.strictEqual(entity.id.toString(), 'user-123');
  assert.strictEqual(entity.fullName, 'Jane Doe');

  const updated = entity.updateDetails({ bio: 'Full-stack developer' });
  assert.strictEqual(updated.bio, 'Full-stack developer');

  // Test 2: ProfileService get & update
  const repo = new MockProfileRepository();
  const service = new ProfileService(repo);

  const context = createRequestContext({
    id: 'user-456',
    email: 'user@example.com',
    fullName: 'John Smith',
    avatarUrl: null,
    role: 'user'
  });

  const updateRes = await service.updateProfile(context, {
    fullName: 'John Smith Updated',
    bio: 'React Lead'
  });

  assert.strictEqual(updateRes.ok, true);
  if (updateRes.ok) {
    assert.strictEqual(updateRes.value.fullName, 'John Smith Updated');
    assert.strictEqual(updateRes.value.bio, 'React Lead');
  }

  const getRes = await service.getProfile(context, 'user-456');
  assert.strictEqual(getRes.ok, true);

  return true;
}

if (require.main === module) {
  runProfileTests().then(() => console.log('Profile tests passed!'));
}
