import { HackathonService } from './hackathon.service';
import { OrganizerRepository } from '@/lib/domain/organizer.repository';
import { UniversityRepository } from '@/lib/domain/university.repository';

export function createHackathonService() {
  return HackathonService;
}

export function createOrganizerService() {
  return OrganizerRepository;
}

export function createUniversityService() {
  return UniversityRepository;
}
