export interface SubmitDraftData {
  title?: string;
  tagline?: string;
  description?: string;
  cover_image_url?: string;
  tags?: string[];
  domain?: string;
  start_date?: string;
  end_date?: string;
  registration_deadline?: string;
  mode?: 'Online' | 'Offline' | 'Hybrid';
  location_city?: string;
  location_college?: string;
  full_address?: string;
  prize_pool?: string;
  registration_fee?: 'Free' | 'Paid';
  registration_fee_amount?: string;
  solo_allowed?: boolean;
  min_team_size?: number;
  max_team_size?: number;
  eligibility?: string[];
  requirements?: string;
  register_url?: string;
  contact_name?: string;
  organization?: string;
  contact_email?: string;
  contact_phone?: string;
  social_twitter?: string;
  social_linkedin?: string;
  social_discord?: string;
  social_instagram?: string;
}

const KEYS = {
  SAVED_IDS: 'findathon_saved_ids',
  SUBMIT_DRAFT: 'findathon_submit_draft',
  FEATURE_FLAGS: 'findathon_feature_flags',
};

class StorageService {
  private isAvailable(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }

  getSavedIds(): string[] {
    if (!this.isAvailable()) return [];
    try {
      const data = localStorage.getItem(KEYS.SAVED_IDS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  setSavedIds(ids: string[]): void {
    if (!this.isAvailable()) return;
    try {
      localStorage.setItem(KEYS.SAVED_IDS, JSON.stringify(ids));
    } catch (e) {
      console.error('StorageService.setSavedIds error:', e);
    }
  }

  toggleSavedId(id: string): string[] {
    const current = this.getSavedIds();
    const updated = current.includes(id) ? current.filter(i => i !== id) : [...current, id];
    this.setSavedIds(updated);
    return updated;
  }

  isSaved(id: string): boolean {
    return this.getSavedIds().includes(id);
  }

  getSubmitDraft(): SubmitDraftData | null {
    if (!this.isAvailable()) return null;
    try {
      const data = localStorage.getItem(KEYS.SUBMIT_DRAFT);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  setSubmitDraft(draft: SubmitDraftData): void {
    if (!this.isAvailable()) return;
    try {
      localStorage.setItem(KEYS.SUBMIT_DRAFT, JSON.stringify(draft));
    } catch (e) {
      console.error('StorageService.setSubmitDraft error:', e);
    }
  }

  clearSubmitDraft(): void {
    if (!this.isAvailable()) return;
    try {
      localStorage.removeItem(KEYS.SUBMIT_DRAFT);
    } catch (e) {
      console.error('StorageService.clearSubmitDraft error:', e);
    }
  }
}

export const storageService = new StorageService();
