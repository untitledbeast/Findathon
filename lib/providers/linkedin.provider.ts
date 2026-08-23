import { DeveloperSkillEvidenceEntity } from '../domain/entities/developer-skill-evidence.entity';
import {
  LinkedInConfigError,
  LinkedInOAuthError,
  LinkedInTokenExchangeError,
  LinkedInOidcValidationError,
  LinkedInApiError,
  LinkedInRateLimitError
} from '../errors/linkedin.errors';
import {
  LINKEDIN_OIDC_CONFIG,
  LinkedInOAuthTransaction,
  deriveCodeChallenge,
  validateLinkedInIdToken,
  ValidatedLinkedInIdToken
} from '../security/linkedin-oidc';
import crypto from 'crypto';

export interface LinkedInAuthResult {
  accessToken: string;
  idToken: string;
  expiresIn?: number;
  scopes: string[];
}

export interface LinkedInUserInfo {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  email?: string;
  email_verified?: boolean;
  locale?: {
    country?: string;
    language?: string;
  };
}

export interface LinkedInProfileData {
  sub: string;
  name?: string;
  email?: string;
  emailVerified?: boolean;
  pictureUrl?: string;
  locale?: string;
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
      `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/v1/developer-profile/linkedin/callback`
    ).trim();
  }

  /**
   * Generates LinkedIn OIDC authorization URL with PKCE (S256), state, and nonce.
   */
  public buildAuthUrl(transaction: LinkedInOAuthTransaction): string {
    if (!this.clientId) {
      throw new LinkedInConfigError();
    }

    const codeChallenge = deriveCodeChallenge(transaction.codeVerifier);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.callbackUrl,
      scope: 'openid profile email',
      state: transaction.state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      nonce: transaction.nonce
    });

    return `${LINKEDIN_OIDC_CONFIG.authorizationEndpoint}?${params.toString()}`;
  }

  /**
   * Exchanges authorization code for access token and OIDC ID token.
   */
  public async exchangeCode(code: string, codeVerifier: string): Promise<LinkedInAuthResult> {
    if (!code) {
      throw new LinkedInOAuthError('Authorization code is required');
    }
    if (!this.clientId || !this.clientSecret) {
      throw new LinkedInConfigError();
    }

    try {
      const bodyParams = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.callbackUrl,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code_verifier: codeVerifier
      });

      const response = await fetch(LINKEDIN_OIDC_CONFIG.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: bodyParams.toString()
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new LinkedInRateLimitError();
        }
        let errorData: Record<string, unknown> = {};
        try {
          errorData = await response.json();
        } catch {
          // Ignore JSON parse failure
        }

        const errorDesc = String(errorData.error_description || errorData.error || response.statusText);
        throw new LinkedInTokenExchangeError(
          `LinkedIn token exchange failed (${response.status}): ${errorDesc}`,
          response.status,
          errorData
        );
      }

      const data = await response.json();

      if (!data.access_token) {
        throw new LinkedInTokenExchangeError('Token response is missing access_token');
      }

      if (!data.id_token) {
        throw new LinkedInTokenExchangeError('Token response is missing id_token (OIDC scope required)');
      }

      const scopes = typeof data.scope === 'string' ? data.scope.split(' ') : ['openid', 'profile', 'email'];

      return {
        accessToken: data.access_token,
        idToken: data.id_token,
        expiresIn: data.expires_in,
        scopes
      };
    } catch (err) {
      if (
        err instanceof LinkedInConfigError ||
        err instanceof LinkedInTokenExchangeError ||
        err instanceof LinkedInRateLimitError
      ) {
        throw err;
      }
      const message = err instanceof Error ? err.message : 'Network error during LinkedIn token exchange';
      throw new LinkedInTokenExchangeError(message, 502, err);
    }
  }

  /**
   * Validates the OIDC ID Token against official LinkedIn JWKS.
   */
  public async validateIdToken(idToken: string, expectedNonce: string): Promise<ValidatedLinkedInIdToken> {
    return validateLinkedInIdToken(idToken, expectedNonce, this.clientId);
  }

  /**
   * Fetches user identity info from `/v2/userinfo` and enforces subject consistency.
   */
  public async fetchUserInfo(accessToken: string, expectedSub: string): Promise<LinkedInUserInfo> {
    if (!accessToken) {
      throw new LinkedInApiError('Access token is required to fetch user info');
    }

    try {
      const response = await fetch(LINKEDIN_OIDC_CONFIG.userinfoEndpoint, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 429) throw new LinkedInRateLimitError();
        throw new LinkedInApiError(`Failed to fetch userinfo from LinkedIn (${response.status})`, response.status);
      }

      const data = (await response.json()) as LinkedInUserInfo;

      // Subject consistency check
      if (data.sub && data.sub !== expectedSub) {
        throw new LinkedInOidcValidationError('Userinfo subject does not match ID token subject', {
          idTokenSub: expectedSub,
          userinfoSub: data.sub
        });
      }

      return data;
    } catch (err) {
      if (err instanceof LinkedInApiError || err instanceof LinkedInOidcValidationError || err instanceof LinkedInRateLimitError) {
        throw err;
      }
      const message = err instanceof Error ? err.message : 'Network error while fetching LinkedIn userinfo';
      throw new LinkedInApiError(message, 502, err);
    }
  }

  /**
   * Converts validated LinkedIn identity profile into a zero-technical-weight evidence entity.
   */
  public toEvidence(userId: string, profile: LinkedInProfileData): DeveloperSkillEvidenceEntity {
    const now = Date.now();
    return new DeveloperSkillEvidenceEntity({
      id: crypto.randomUUID(),
      userId,
      source: 'linkedin',
      evidenceType: 'identity_profile',
      externalId: profile.sub,
      url: `https://www.linkedin.com`,
      signals: {
        has_linkedin_connection: true,
        sub: profile.sub,
        name: profile.name || null,
        email: profile.email || null,
        email_verified: profile.emailVerified ?? false,
        picture_url: profile.pictureUrl || null,
        locale: profile.locale || null
      },
      weight: 0.0, // Strictly 0.0 technical weight contribution
      createdAt: now,
      updatedAt: now
    });
  }
}
