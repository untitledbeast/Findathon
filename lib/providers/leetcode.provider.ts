import { DeveloperSkillEvidenceEntity } from '../domain/entities/developer-skill-evidence.entity';
import {
  LeetCodeUserNotFoundError,
  LeetCodeProfilePrivateError,
  LeetCodeRateLimitError,
  LeetCodeNetworkError,
  LeetCodeApiError
} from '../errors/leetcode.errors';
import { ValidationError } from '../errors';
import crypto from 'crypto';

export interface LeetCodeSubmissionCount {
  difficulty: string;
  count: number;
}

export interface LeetCodeLanguageCount {
  languageName: string;
  problemsSolved: number;
}

export interface LeetCodeTagCount {
  tagName: string;
  tagSlug: string;
  tier: 'fundamental' | 'intermediate' | 'advanced';
  problemsSolved: number;
}

export interface LeetCodeUserProfile {
  username: string;
  ranking: number | null;
  reputation: number | null;
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  languages: LeetCodeLanguageCount[];
  topics: LeetCodeTagCount[];
  contestRating: number | null;
  globalRanking: number | null;
  attendedContestsCount: number | null;
}

export class LeetCodeProvider {
  private readonly graphqlUrl = 'https://leetcode.com/graphql';

  /**
   * Validates and sanitizes a raw LeetCode username.
   */
  public normalizeUsername(input: string): string {
    if (!input || typeof input !== 'string') {
      throw new ValidationError('LeetCode username is required');
    }
    const trimmed = input.trim();
    if (!trimmed) {
      throw new ValidationError('LeetCode username is required');
    }
    if (trimmed.length > 50) {
      throw new ValidationError('Username is too long (maximum 50 characters)');
    }
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      throw new ValidationError('Enter username only, not a URL');
    }
    const clean = trimmed.replace(/^@/, '');
    if (!/^[a-zA-Z0-9_-]+$/.test(clean)) {
      throw new ValidationError('Username contains invalid characters (letters, numbers, underscores, and hyphens only)');
    }
    return clean;
  }

  /**
   * Fetches public profile statistics from LeetCode public GraphQL endpoint.
   */
  public async fetchProfile(rawUsername: string): Promise<LeetCodeUserProfile> {
    const username = this.normalizeUsername(rawUsername);

    const query = `
      query getUserProfile($username: String!) {
        matchedUser(username: $username) {
          username
          profile {
            ranking
            reputation
          }
          submitStatsGlobal {
            acSubmissionNum {
              difficulty
              count
            }
          }
          languageProblemCount {
            languageName
            problemsSolved
          }
          tagProblemCounts {
            advanced {
              tagName
              tagSlug
              problemsSolved
            }
            intermediate {
              tagName
              tagSlug
              problemsSolved
            }
            fundamental {
              tagName
              tagSlug
              problemsSolved
            }
          }
        }
        userContestRanking(username: $username) {
          rating
          globalRanking
          attendedContestsCount
        }
      }
    `;

    let response: Response;
    try {
      response = await fetch(this.graphqlUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Referer: `https://leetcode.com/${username}/`
        },
        body: JSON.stringify({
          query,
          variables: { username }
        }),
        signal: AbortSignal.timeout(12000)
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'TimeoutError') {
        throw new LeetCodeNetworkError({ reason: 'Request timed out' });
      }
      throw new LeetCodeNetworkError(err);
    }

    if (response.status === 429) {
      throw new LeetCodeRateLimitError();
    }
    if (response.status === 502 || response.status === 503 || response.status === 504) {
      throw new LeetCodeNetworkError({ status: response.status });
    }
    interface GraphQLResponse {
      data?: {
        matchedUser?: {
          username?: string;
          profile?: {
            ranking?: number;
            reputation?: number;
          };
          submitStatsGlobal?: {
            acSubmissionNum?: Array<{ difficulty?: string; count?: number }>;
          };
          languageProblemCount?: Array<{ languageName?: string; problemsSolved?: number }>;
          tagProblemCounts?: Record<string, Array<{ tagName?: string; tagSlug?: string; problemsSolved?: number }>>;
        } | null;
        userContestRanking?: {
          rating?: number;
          globalRanking?: number;
          attendedContestsCount?: number;
        } | null;
      };
      errors?: Array<{ message?: string }>;
    }

    let payload: GraphQLResponse;
    try {
      payload = (await response.json()) as GraphQLResponse;
    } catch {
      throw new LeetCodeApiError('Invalid JSON response received from LeetCode', 502);
    }

    if (payload.errors && Array.isArray(payload.errors) && payload.errors.length > 0) {
      const errorMsg = payload.errors.map(e => e.message || '').join(' ');
      if (errorMsg.includes('does not exist') || errorMsg.includes('User not found') || !payload.data?.matchedUser) {
        throw new LeetCodeUserNotFoundError(username, payload.errors);
      }
      if (errorMsg.includes('private')) {
        throw new LeetCodeProfilePrivateError(username, payload.errors);
      }
    }

    const matchedUser = payload.data?.matchedUser;
    if (!matchedUser) {
      throw new LeetCodeUserNotFoundError(username);
    }

    // Parse submission difficulty distribution
    let totalSolved = 0;
    let easySolved = 0;
    let mediumSolved = 0;
    let hardSolved = 0;

    const subList = matchedUser.submitStatsGlobal?.acSubmissionNum;
    if (Array.isArray(subList)) {
      for (const item of subList) {
        const count = Number(item.count) || 0;
        if (item.difficulty === 'All') totalSolved = count;
        else if (item.difficulty === 'Easy') easySolved = count;
        else if (item.difficulty === 'Medium') mediumSolved = count;
        else if (item.difficulty === 'Hard') hardSolved = count;
      }
    }

    // Parse languages
    const languages: LeetCodeLanguageCount[] = [];
    if (Array.isArray(matchedUser.languageProblemCount)) {
      for (const lang of matchedUser.languageProblemCount) {
        if (lang.languageName && typeof lang.problemsSolved === 'number' && lang.problemsSolved > 0) {
          languages.push({
            languageName: String(lang.languageName).trim(),
            problemsSolved: lang.problemsSolved
          });
        }
      }
    }

    // Parse algorithmic topic tags across all three tiers
    const topics: LeetCodeTagCount[] = [];
    const tagObj = matchedUser.tagProblemCounts;
    if (tagObj && typeof tagObj === 'object') {
      const tiers: Array<'fundamental' | 'intermediate' | 'advanced'> = ['fundamental', 'intermediate', 'advanced'];
      for (const tier of tiers) {
        const list = tagObj[tier];
        if (Array.isArray(list)) {
          for (const item of list) {
            if (item.tagSlug && typeof item.problemsSolved === 'number' && item.problemsSolved > 0) {
              topics.push({
                tagName: item.tagName || item.tagSlug,
                tagSlug: item.tagSlug,
                tier,
                problemsSolved: Number(item.problemsSolved) || 0
              });
            }
          }
        }
      }
    }

    // Parse contest rankings if user participated
    const contestData = payload.data?.userContestRanking;
    const contestRating = contestData?.rating ? Math.round(Number(contestData.rating)) : null;
    const globalRanking = contestData?.globalRanking ? Number(contestData.globalRanking) : null;
    const attendedContestsCount = contestData?.attendedContestsCount ? Number(contestData.attendedContestsCount) : null;

    return {
      username: matchedUser.username || username,
      ranking: matchedUser.profile?.ranking ? Number(matchedUser.profile.ranking) : null,
      reputation: matchedUser.profile?.reputation ? Number(matchedUser.profile.reputation) : null,
      totalSolved,
      easySolved,
      mediumSolved,
      hardSolved,
      languages,
      topics,
      contestRating,
      globalRanking,
      attendedContestsCount
    };
  }

  /**
   * Transforms raw LeetCode statistics into normalized Domain Skill Evidence entities.
   */
  public toEvidence(userId: string, profile: LeetCodeUserProfile): DeveloperSkillEvidenceEntity[] {
    const evidenceList: DeveloperSkillEvidenceEntity[] = [];
    const now = Date.now();
    const cleanUser = profile.username.toLowerCase();

    // 1. Primary Profile Summary Evidence
    evidenceList.push(
      new DeveloperSkillEvidenceEntity({
        id: crypto.randomUUID(),
        userId,
        source: 'leetcode',
        evidenceType: 'activity',
        externalId: `${cleanUser}-summary`,
        url: `https://leetcode.com/${profile.username}/`,
        signals: {
          username: profile.username,
          totalSolved: profile.totalSolved,
          easySolved: profile.easySolved,
          mediumSolved: profile.mediumSolved,
          hardSolved: profile.hardSolved,
          ranking: profile.ranking,
          contestRating: profile.contestRating,
          globalRanking: profile.globalRanking,
          attendedContestsCount: profile.attendedContestsCount
        },
        weight: 0.9,
        createdAt: now,
        updatedAt: now
      })
    );

    // 2. Language Usage Evidences
    for (const lang of profile.languages) {
      if (lang.problemsSolved <= 0) continue;
      const normalizedKey = lang.languageName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const langWeight = Math.min(1.0, Math.max(0.3, Math.round((Math.log10(lang.problemsSolved + 1) / 3) * 100) / 100));

      evidenceList.push(
        new DeveloperSkillEvidenceEntity({
          id: crypto.randomUUID(),
          userId,
          source: 'leetcode',
          evidenceType: 'activity',
          externalId: `${cleanUser}-lang-${normalizedKey}`,
          url: `https://leetcode.com/${profile.username}/`,
          signals: {
            languageName: lang.languageName,
            problemsSolved: lang.problemsSolved
          },
          weight: langWeight,
          createdAt: now,
          updatedAt: now
        })
      );
    }

    // 3. Algorithmic Topic Evidences
    for (const topic of profile.topics) {
      if (topic.problemsSolved <= 0) continue;
      const topicWeight = Math.min(1.0, Math.max(0.4, Math.round((Math.log10(topic.problemsSolved + 1) / 2.5) * 100) / 100));

      evidenceList.push(
        new DeveloperSkillEvidenceEntity({
          id: crypto.randomUUID(),
          userId,
          source: 'leetcode',
          evidenceType: 'submission',
          externalId: `${cleanUser}-topic-${topic.tagSlug}`,
          url: `https://leetcode.com/tag/${topic.tagSlug}/`,
          signals: {
            tagName: topic.tagName,
            tagSlug: topic.tagSlug,
            tier: topic.tier,
            problemsSolved: topic.problemsSolved
          },
          weight: topicWeight,
          createdAt: now,
          updatedAt: now
        })
      );
    }

    return evidenceList;
  }
}
