export interface ProfileDTO {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  bio: string;
  organization: string;
  phone: string;
  website: string;
  socialTwitter: string;
  socialLinkedin: string;
  socialInstagram: string;
  socialDiscord: string;
  skills: string[];
  interests: string[];
  role: 'user' | 'organizer' | 'admin';
  isFirstLogin: boolean;
  onboardingComplete: boolean;
  xpPoints: number;
}
