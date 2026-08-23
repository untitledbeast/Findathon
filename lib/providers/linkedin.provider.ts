import { DeveloperSkillEvidenceEntity } from '../domain/entities/developer-skill-evidence.entity';
import { LinkedInOAuthError, LinkedInApiError, LinkedInNotConfiguredError } from '../errors/linkedin.errors';
import crypto from 'crypto';

export interface LinkedInUserInfo {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  email?: string;
  email_verified?: boolean;
}

export interface LinkedInAuthResult {
  accessToken: string;
  expiresIn?: number;
  refreshToken?: string;
  scopes: string[];
  idToken?: string;
}

export class LinkedInProvider {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly callbackUrl: string;

  constructor() {
    this.clientId = (process.env.LINKEDIN_CLIENT_ID || '').trim();
    this.clientSecret = (process.env.LINKEDIN_CLIENT_SECRET || '').trim();
    this.callbackUrl = (
      process.env.LINKEDIN_REDIRECT_URI ||
      process.env.LINKEDIN_CALLBACK_URL ||
      `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/linkedin/callback`
    ).trim();
  }

  /**
   * Generates the LinkedIn OAuth authorize URL with CSRF state protection.
   * OpenID Connect scopes requested: openid profile email
   */
  public buildAuthUrl(state: string): string {
    if (!this.clientId) {
      throw new LinkedInNotConfiguredError(
        'LinkedIn OAuth is not configured: LINKEDIN_CLIENT_ID is missing in your environment configuration (.env.local).'
      );
    }

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.callbackUrl,
      state,
      scope: 'openid profile email'
    });

    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  }

  /**
   * Exchanges authorization code for an OAuth access token server-side.
   */
  public async exchangeCode(code: string): Promise<LinkedInAuthResult> {
    if (!code) {
      throw new LinkedInOAuthError('Authorization code is required');
    }
    if (!this.clientId || !this.clientSecret) {
      throw new LinkedInNotConfiguredError(
        'LinkedIn OAuth is not configured: LINKEDIN_CLIENT_ID or LINKEDIN_CLIENT_SECRET is missing in your environment configuration (.env.local).'
      );
    }

    try {
      const bodyParams = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.callbackUrl
      });

      const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json'
        },
        body: bodyParams.toString()
      });

      const data = await response.json();

      if (!response.ok || data.error || !data.access_token) {
        const errorDesc = data.error_description || data.error || `Token exchange failed with status ${response.status}`;
        throw new LinkedInOAuthError(errorDesc);
      }

      const scopes = typeof data.scope === 'string'
        ? data.scope.split(' ').map((s: string) => s.trim()).filter(Boolean)
        : ['openid', 'profile', 'email'];

      return {
        accessToken: data.access_token,
        expiresIn: data.expires_in,
        refreshToken: data.refresh_token,
        scopes,
        idToken: data.id_token
      };
    } catch (err) {
      if (err instanceof LinkedInOAuthError || err instanceof LinkedInNotConfiguredError) {
        throw err;
      }
      throw new LinkedInOAuthError(
        err instanceof Error ? err.message : 'LinkedIn token exchange failed'
      );
    }
  }

  /**
   * Fetches user profile from LinkedIn OpenID Connect userinfo endpoint.
   */
  public async fetchUserProfile(accessToken: string): Promise<LinkedInUserInfo> {
    if (!accessToken) {
      throw new LinkedInApiError('Access token is required to fetch LinkedIn profile', 401);
    }

    try {
      const response = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');

        if (response.status === 401) {
          throw new LinkedInApiError('LinkedIn access token is invalid or expired.', 401);
        } else if (response.status === 403) {
          throw new LinkedInApiError('LinkedIn denied access. Check your app permissions and privacy settings.', 403);
        } else if (response.status === 429) {
          throw new LinkedInApiError('LinkedIn API rate limit exceeded. Please try again in a few minutes.', 429);
        } else if (response.status >= 500) {
          throw new LinkedInApiError('LinkedIn servers are temporarily unavailable. Please try again later.', response.status);
        }

        throw new LinkedInApiError(
          `Failed to fetch LinkedIn profile (status ${response.status}): ${errorText || 'Unknown error'}`,
          response.status
        );
      }

      let userInfo: LinkedInUserInfo;
      try {
        userInfo = await response.json();
      } catch {
        throw new LinkedInApiError('LinkedIn returned a malformed response. Please try again.', 502);
      }

      if (!userInfo || typeof userInfo !== 'object') {
        throw new LinkedInApiError('LinkedIn returned an unexpected response format.', 502);
      }

      if (!userInfo.sub) {
        throw new LinkedInApiError('LinkedIn userinfo response missing subject identifier.', 502);
      }

      return userInfo;
    } catch (err) {
      if (err instanceof LinkedInApiError) throw err;
      throw new LinkedInApiError(
        err instanceof Error ? err.message : 'Failed to retrieve LinkedIn user information',
        502
      );
    }
  }

  /**
   * Transforms raw LinkedIn OIDC profile data into typed Domain Evidence entities.
   */
  public toEvidence(userId: string, userInfo: LinkedInUserInfo): DeveloperSkillEvidenceEntity[] {
    const now = Date.now();
    const displayName = userInfo.name || [userInfo.given_name, userInfo.family_name].filter(Boolean).join(' ') || 'LinkedIn User';

    return [
      new DeveloperSkillEvidenceEntity({
        id: crypto.randomUUID(),
        userId,
        source: 'linkedin',
        evidenceType: 'activity',
        externalId: userInfo.sub,
        url: 'https://www.linkedin.com',
        signals: {
          sub: userInfo.sub,
          name: displayName,
          givenName: userInfo.given_name,
          familyName: userInfo.family_name,
          email: userInfo.email,
          emailVerified: userInfo.email_verified,
          picture: userInfo.picture
        },
        weight: 0.8,
        createdAt: now,
        updatedAt: now
      })
    ];
  }
}
