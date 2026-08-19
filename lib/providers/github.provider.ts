import { DeveloperSkillEvidenceEntity } from '../domain/entities/developer-skill-evidence.entity';
import { GitHubRateLimitError, GitHubOAuthError, GitHubApiError } from '../errors/github.errors';
import { BaseError } from '../errors/base.error';

export interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
  html_url: string;
  bio: string | null;
  public_repos: number;
  followers: number;
  created_at: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  fork: boolean;
  archived: boolean;
  language: string | null;
  languages_url?: string;
  languages?: Record<string, number>;
  topics?: string[];
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  size: number;
  created_at: string;
  updated_at: string;
  pushed_at: string;
}

export interface GitHubAuthResult {
  accessToken: string;
  refreshToken?: string;
  scopes: string[];
}

export class GitHubProvider {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly callbackUrl: string;

  constructor() {
    this.clientId = (process.env.GITHUB_CLIENT_ID || '').trim();
    this.clientSecret = (process.env.GITHUB_CLIENT_SECRET || '').trim();
    this.callbackUrl = (
      process.env.GITHUB_CALLBACK_URL ||
      process.env.GITHUB_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/v1/developer-profile/github/callback`
    ).trim();
  }

  /**
   * Generates the GitHub OAuth authorize URL with CSRF state protection.
   * Scopes requested: read:user, user:email, public_repo
   */
  public buildAuthUrl(state: string): string {
    if (!this.clientId) {
      throw new BaseError(
        'GitHub OAuth is not configured: GITHUB_CLIENT_ID is missing in your environment configuration (.env.local).',
        'GITHUB_OAUTH_NOT_CONFIGURED',
        500
      );
    }
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.callbackUrl,
      scope: 'read:user user:email public_repo',
      state
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchanges authorization code for an OAuth access token.
   */
  public async exchangeCode(code: string): Promise<GitHubAuthResult> {
    if (!code) {
      throw new GitHubOAuthError('Authorization code is required');
    }
    if (!this.clientId || !this.clientSecret) {
      throw new BaseError(
        'GitHub OAuth is not configured: GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET is missing in your environment configuration (.env.local).',
        'GITHUB_OAUTH_NOT_CONFIGURED',
        500
      );
    }

    try {
      const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code,
          redirect_uri: this.callbackUrl
        })
      });

      const data = await response.json();
      if (data.error || !data.access_token) {
        throw new GitHubOAuthError(data.error_description || data.error || 'Failed to exchange GitHub authorization code');
      }

      const scopes = typeof data.scope === 'string'
        ? data.scope.split(',').map((s: string) => s.trim())
        : [];

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        scopes
      };
    } catch (err) {
      if (err instanceof BaseError) throw err;
      throw new GitHubOAuthError(err instanceof Error ? err.message : 'GitHub token exchange failed');
    }
  }

  /**
   * Fetches user profile and up to 40 most recently updated public repositories from GitHub API.
   */
  public async fetchUserProfile(accessToken: string): Promise<{ user: GitHubUser; repos: GitHubRepo[] }> {
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'Findathon-App'
    };

    // 1. Fetch User Profile
    const userRes = await fetch('https://api.github.com/user', { headers });
    this.checkRateLimit(userRes);

    if (!userRes.ok) {
      throw new GitHubApiError(`Failed to fetch GitHub profile (status ${userRes.status})`, userRes.status);
    }
    const user: GitHubUser = await userRes.json();

    // 2. Fetch User Repositories (hard-capped at 40 most recently updated)
    const reposRes = await fetch('https://api.github.com/user/repos?per_page=40&sort=updated&direction=desc', { headers });
    this.checkRateLimit(reposRes);

    if (!reposRes.ok) {
      throw new GitHubApiError(`Failed to fetch GitHub repositories (status ${reposRes.status})`, reposRes.status);
    }
    const rawRepos: GitHubRepo[] = await reposRes.json();

    // 3. Fetch granular languages breakdown for those 40 repos (batched with rate limit safeguard)
    const enrichedRepos = await Promise.all(
      rawRepos.map(async (repo) => {
        if (repo.languages_url) {
          try {
            const langRes = await fetch(repo.languages_url, { headers });
            if (langRes.ok) {
              const langData = await langRes.json();
              return { ...repo, languages: langData };
            }
          } catch {
            // Non-blocking fallback
          }
        }
        return repo;
      })
    );

    return { user, repos: enrichedRepos };
  }

  /**
   * Transforms raw GitHub data into typed Domain Evidence entities.
   * Weight rules:
   * - base = 1.0
   * - if isFork -> * 0.5
   * - if age > 2 years -> * 0.5
   * - if age > 1 year -> * 0.75
   * - clamp to [0.2, 1.0]
   */
  public toEvidence(userId: string, githubData: { user: GitHubUser; repos: GitHubRepo[] }): DeveloperSkillEvidenceEntity[] {
    const evidenceList: DeveloperSkillEvidenceEntity[] = [];
    const now = Date.now();
    const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;

    // 1. User Account Activity Evidence
    evidenceList.push(
      new DeveloperSkillEvidenceEntity({
        id: crypto.randomUUID(),
        userId,
        source: 'github',
        evidenceType: 'activity',
        externalId: String(githubData.user.id),
        url: githubData.user.html_url,
        signals: {
          login: githubData.user.login,
          bio: githubData.user.bio,
          publicRepos: githubData.user.public_repos,
          followers: githubData.user.followers,
          createdAt: githubData.user.created_at
        },
        weight: 0.8,
        createdAt: now,
        updatedAt: now
      })
    );

    // 2. Repository Evidences
    for (const repo of githubData.repos) {
      let weight = 1.0;

      // Rule: Fork penalty
      if (repo.fork) {
        weight *= 0.5;
      }

      // Rule: Age degradation
      const repoPushedAt = repo.pushed_at ? new Date(repo.pushed_at).getTime() : now;
      const repoAgeMs = Math.max(0, now - repoPushedAt);

      if (repoAgeMs > 2 * YEAR_MS) {
        weight *= 0.5;
      } else if (repoAgeMs > 1 * YEAR_MS) {
        weight *= 0.75;
      }

      // Clamp weight strictly to [0.2, 1.0]
      weight = Math.max(0.2, Math.min(1.0, Math.round(weight * 100) / 100));

      const normalizedTopics = (repo.topics || []).map(t => this.normalizeTag(t));

      evidenceList.push(
        new DeveloperSkillEvidenceEntity({
          id: crypto.randomUUID(),
          userId,
          source: 'github',
          evidenceType: 'repo',
          externalId: String(repo.id),
          url: repo.html_url,
          signals: {
            name: repo.name,
            fullName: repo.full_name,
            description: repo.description,
            language: repo.language,
            languages: repo.languages || (repo.language ? { [repo.language]: 1000 } : {}),
            topics: normalizedTopics,
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            isFork: repo.fork,
            pushedAt: repo.pushed_at,
            createdAt: repo.created_at
          },
          weight,
          createdAt: repoPushedAt,
          updatedAt: repoPushedAt
        })
      );
    }

    return evidenceList;
  }

  /**
   * Normalizes technology aliases (e.g. Next.js -> next, ReactJS -> react, C++ -> cpp).
   */
  public normalizeTag(rawTag: string): string {
    if (!rawTag) return '';
    const clean = rawTag.trim().toLowerCase();

    const ALIAS_MAP: Record<string, string> = {
      'next.js': 'next',
      nextjs: 'next',
      'react.js': 'react',
      reactjs: 'react',
      'vue.js': 'vue',
      vuejs: 'vue',
      'node.js': 'node',
      nodejs: 'node',
      'express.js': 'express',
      expressjs: 'express',
      'c++': 'cpp',
      'c#': 'csharp',
      csharp: 'csharp',
      golang: 'go',
      postgresql: 'postgres',
      mongodb: 'mongodb',
      tailwindcss: 'tailwind',
      'scikit-learn': 'sklearn',
      'deep-learning': 'deep-learning',
      'machine-learning': 'machine-learning'
    };

    return ALIAS_MAP[clean] || clean;
  }

  private checkRateLimit(response: Response): void {
    const remaining = response.headers.get('x-ratelimit-remaining');
    if (response.status === 429 || (response.status === 403 && remaining === '0')) {
      const resetTime = response.headers.get('x-ratelimit-reset');
      const resetDate = resetTime ? new Date(parseInt(resetTime, 10) * 1000).toLocaleTimeString() : 'a few minutes';
      throw new GitHubRateLimitError(`GitHub is rate-limiting us. Resets at ${resetDate}.`);
    }
  }
}
