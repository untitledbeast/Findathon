import { ProfileEntity } from '../entities/ProfileEntity';

export interface IProfileRepository {
  findById(id: string): Promise<ProfileEntity | null>;
  save(profile: ProfileEntity): Promise<ProfileEntity>;
  update(id: string, profile: Partial<ProfileEntity>): Promise<ProfileEntity>;
}
