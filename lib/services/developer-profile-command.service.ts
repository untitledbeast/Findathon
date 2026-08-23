import { RequestContext } from '../context/request-context';
import { IDeveloperProfileRepository } from '../domain/repositories/developer-profile.repository.interface';
import { GitHubProvider } from '../providers/github.provider';
import { LeetCodeProvider } from '../providers/leetcode.provider';
import { LinkedInProvider } from '../providers/linkedin.provider';
import { DeveloperProfileEntity } from '../domain/entities/developer-profile.entity';
import { DeveloperSkillProfile } from '../domain/value-objects/developer-skill-profile';
import { isValidUUID } from '../domain/mappers/developer-profile.mapper';
import { encryptToken } from '../security/token-encryption';
import { AuthenticationError, NotFoundError, BaseError } from '../errors';
import { LeetCodeSyncCooldownError } from '../errors/leetcode.errors';
import { LinkedInAccountConflictError } from '../errors/linkedin.errors';
import { LinkedInOAuthTransaction } from '../security/linkedin-oidc';
import crypto from 'crypto';

export class DeveloperProfileCommandService {
  constructor(
    private readonly repository: IDeveloperProfileRepository,
    private readonly githubProvider: GitHubProvider,
    private readonly leetCodeProvider: LeetCodeProvider = new LeetCodeProvider(),
    private readonly linkedInProvider: LinkedInProvider = new LinkedInProvider()
  ) {}

  /**
   * Connects user GitHub account:
   * 1. Exchanges OAuth code for access token
   * 2. Encrypts and stores tokens in developer_external_accounts (status = 'active')
   * 3. Fetches up to 40 recently updated repositories & languages
   * 4. Extracts skill evidence and upserts evidence records without duplicates
   * 5. Recomputes aggregated developer intelligence profile
   */
  public async connectGitHub(context: RequestContext, code: string): Promise<DeveloperProfileEntity> {
    if (!context.user || !context.user.id || !isValidUUID(context.user.id)) {
      throw new AuthenticationError('Valid authenticated user session required to connect GitHub');
    }
    const userId = context.user.id;

    // 1. Exchange authorization code
    const authResult = await this.githubProvider.exchangeCode(code);

    try {
      // 2. Encrypt and persist external account
      const encryptedAccessToken = encryptToken(authResult.accessToken);
      const encryptedRefreshToken = authResult.refreshToken ? encryptToken(authResult.refreshToken) : null;

      await this.repository.upsertExternalAccount({
        userId,
        provider: 'github',
        accessTokenEncrypted: encryptedAccessToken,
        refreshTokenEncrypted: encryptedRefreshToken,
        scopes: authResult.scopes,
        status: 'active',
        lastSyncedAt: new Date().toISOString()
      });

      // 3. Fetch user profile and capped 40 repos
      const githubData = await this.githubProvider.fetchUserProfile(authResult.accessToken);

      // Update provider_user_id
      await this.repository.upsertExternalAccount({
        userId,
        provider: 'github',
        providerUserId: String(githubData.user.id),
        accessTokenEncrypted: encryptedAccessToken,
        refreshTokenEncrypted: encryptedRefreshToken,
        scopes: authResult.scopes,
        status: 'active',
        lastSyncedAt: new Date().toISOString()
      });

      // 4. Generate evidence signals and upsert into database (unique constraint ensures idempotence)
      const evidenceList = this.githubProvider.toEvidence(userId, githubData);
      await this.repository.saveEvidenceBatch(evidenceList);

      // 5. Recompute aggregated developer intelligence profile
      const updatedProfile = await this.recomputeProfileInternal(userId, true);
      return updatedProfile;
    } catch (err) {
      console.error('[DeveloperProfileCommandService.connectGitHub] Sync failed mid-operation:', err);

      // Graceful degradation: Mark external account status as error without corrupting existing profile
      try {
        await this.repository.upsertExternalAccount({
          userId,
          provider: 'github',
          status: 'error',
          lastSyncedAt: new Date().toISOString()
        });
      } catch {
        // Ignore secondary error handling failure
      }

      if (err instanceof BaseError) throw err;
      throw new BaseError(
        err instanceof Error ? err.message : 'Failed to synchronize GitHub data',
        'GITHUB_SYNC_ERROR',
        500
      );
    }
  }

  /**
   * Connects user LeetCode profile:
   * 1. Validates and normalizes username
   * 2. Fetches public statistics from LeetCode GraphQL endpoint (server-side only)
   * 3. Upserts developer_external_accounts row
   * 4. Transforms statistics into skill evidence and upserts idempotently
   * 5. Recomputes combined developer intelligence profile
   */
  public async connectLeetCode(context: RequestContext, rawUsername: string): Promise<DeveloperProfileEntity> {
    if (!context.user || !context.user.id || !isValidUUID(context.user.id)) {
      throw new AuthenticationError('Valid authenticated user session required to connect LeetCode');
    }
    const userId = context.user.id;
    const username = this.leetCodeProvider.normalizeUsername(rawUsername);

    // 1. Fetch public profile statistics (server-side only)
    const profileData = await this.leetCodeProvider.fetchProfile(username);

    try {
      // 2. Persist external account link
      await this.repository.upsertExternalAccount({
        userId,
        provider: 'leetcode',
        providerUserId: profileData.username,
        accessTokenEncrypted: null,
        refreshTokenEncrypted: null,
        scopes: [],
        status: 'active',
        lastSyncedAt: new Date().toISOString()
      });

      // 3. Extract and persist evidence batch (idempotent upsert via unique constraint)
      const evidenceList = this.leetCodeProvider.toEvidence(userId, profileData);
      await this.repository.saveEvidenceBatch(evidenceList);

      // 4. Recompute combined profile
      const updatedProfile = await this.recomputeProfileInternal(userId, undefined, true);
      return updatedProfile;
    } catch (err) {
      console.error('[DeveloperProfileCommandService.connectLeetCode] Persistence failed mid-operation:', err);

      if (err instanceof BaseError) throw err;
      throw new BaseError(
        err instanceof Error ? err.message : 'Failed to synchronize LeetCode profile',
        'LEETCODE_SYNC_ERROR',
        500
      );
    }
  }

  /**
   * Refreshes LeetCode statistics for the currently connected profile with a 60-second cooldown.
   */
  public async syncLeetCode(context: RequestContext): Promise<DeveloperProfileEntity> {
    if (!context.user || !context.user.id || !isValidUUID(context.user.id)) {
      throw new AuthenticationError('Valid authenticated user session required to sync LeetCode');
    }
    const userId = context.user.id;

    // 1. Check existing connection
    const existingAccount = await this.repository.getExternalAccount(userId, 'leetcode');
    if (!existingAccount || !existingAccount.providerUserId || existingAccount.status === 'revoked') {
      throw new NotFoundError('No active LeetCode connection found to sync');
    }

    // 2. Enforce 60-second cooldown
    if (existingAccount.lastSyncedAt) {
      const lastSyncMs = new Date(existingAccount.lastSyncedAt).getTime();
      const elapsedSec = (Date.now() - lastSyncMs) / 1000;
      if (elapsedSec < 60) {
        throw new LeetCodeSyncCooldownError(Math.ceil(60 - elapsedSec));
      }
    }

    const username = existingAccount.providerUserId;

    try {
      // 3. Fetch fresh stats
      const profileData = await this.leetCodeProvider.fetchProfile(username);

      // 4. Update sync timestamp
      await this.repository.upsertExternalAccount({
        userId,
        provider: 'leetcode',
        providerUserId: profileData.username,
        status: 'active',
        lastSyncedAt: new Date().toISOString()
      });

      // 5. Upsert updated evidence
      const evidenceList = this.leetCodeProvider.toEvidence(userId, profileData);
      await this.repository.saveEvidenceBatch(evidenceList);

      // 6. Recompute profile
      return await this.recomputeProfileInternal(userId, undefined, true);
    } catch (err) {
      console.error('[DeveloperProfileCommandService.syncLeetCode] Sync failed:', err);

      // Preserve previous evidence and profile; do not delete or corrupt state
      if (err instanceof BaseError) throw err;
      throw new BaseError(
        err instanceof Error ? err.message : 'Failed to refresh LeetCode data',
        'LEETCODE_SYNC_ERROR',
        500
      );
    }
  }

  /**
   * Disconnects LeetCode account, removes LeetCode evidence, and refreshes profile.
   */
  public async disconnectLeetCode(context: RequestContext): Promise<DeveloperProfileEntity> {
    if (!context.user || !context.user.id || !isValidUUID(context.user.id)) {
      throw new AuthenticationError('Valid authenticated user session required to disconnect LeetCode');
    }
    const userId = context.user.id;

    // 1. Delete external account record
    await this.repository.deleteExternalAccount(userId, 'leetcode');

    // 2. Delete ONLY LeetCode evidence signals
    await this.repository.deleteEvidenceBySource(userId, 'leetcode');

    // 3. Recompute profile with leetcodeConnected = false
    return this.recomputeProfileInternal(userId, undefined, false);
  }

  /**
   * Recomputes developer profile scores from all recorded evidence.
   */
  public async recomputeProfile(context: RequestContext): Promise<DeveloperProfileEntity> {
    if (!context.user || !context.user.id || !isValidUUID(context.user.id)) {
      throw new AuthenticationError('Valid authenticated user session required to recompute profile');
    }
    return this.recomputeProfileInternal(context.user.id);
  }

  /**
   * Disconnects GitHub account, removes evidence, and refreshes profile.
   */
  public async disconnectGitHub(context: RequestContext): Promise<DeveloperProfileEntity> {
    if (!context.user || !context.user.id || !isValidUUID(context.user.id)) {
      throw new AuthenticationError('Valid authenticated user session required to disconnect account');
    }
    const userId = context.user.id;

    // 1. Delete or revoke external account record
    await this.repository.deleteExternalAccount(userId, 'github');

    // 2. Delete GitHub evidence signals
    await this.repository.deleteEvidenceBySource(userId, 'github');

    // 3. Recompute profile with githubConnected = false
    return this.recomputeProfileInternal(userId, false);
  }

  /**
   * Connects user LinkedIn account via OpenID Connect:
   * 1. Validates session binding (context user matches transaction user)
   * 2. Exchanges authorization code with PKCE code_verifier for tokens
   * 3. Validates OIDC ID token signature, issuer, audience, and nonce
   * 4. Retrieves userinfo and validates subject consistency
   * 5. Checks cross-user account conflict (1:1 LinkedIn sub ownership)
   * 6. Encrypts access token and persists developer_external_accounts row
   * 7. Records zero-technical-weight identity evidence
   * 8. Recomputes developer profile with linkedinConnected = true
   */
  public async connectLinkedIn(
    context: RequestContext,
    code: string,
    transaction: LinkedInOAuthTransaction
  ): Promise<DeveloperProfileEntity> {
    if (!context.user || !context.user.id || !isValidUUID(context.user.id)) {
      throw new AuthenticationError('Valid authenticated user session required to connect LinkedIn');
    }
    const userId = context.user.id;

    // 1. Validate session binding between initiating transaction and callback caller
    if (transaction.userId !== userId) {
      throw new AuthenticationError('OAuth session binding mismatch: transaction belongs to another authenticated session');
    }

    // 2. Exchange authorization code with PKCE verifier
    const authResult = await this.linkedInProvider.exchangeCode(code, transaction.codeVerifier);

    // 3. Validate OIDC ID Token claims & JWKS signature
    const validatedIdToken = await this.linkedInProvider.validateIdToken(authResult.idToken, transaction.nonce);
    const sub = validatedIdToken.sub;

    // 4. Fetch userinfo & verify subject consistency
    let userInfoName = validatedIdToken.name;
    let userInfoEmail = validatedIdToken.email;
    let userInfoPicture = validatedIdToken.picture;
    let userInfoEmailVerified = validatedIdToken.email_verified;
    let userInfoLocale = validatedIdToken.locale?.country || validatedIdToken.locale?.language;

    try {
      const userInfo = await this.linkedInProvider.fetchUserInfo(authResult.accessToken, sub);
      if (userInfo.name) userInfoName = userInfo.name;
      if (userInfo.email) userInfoEmail = userInfo.email;
      if (userInfo.picture) userInfoPicture = userInfo.picture;
      if (userInfo.email_verified !== undefined) userInfoEmailVerified = userInfo.email_verified;
      if (userInfo.locale) userInfoLocale = userInfo.locale.country || userInfo.locale.language;
    } catch (err) {
      console.warn('[DeveloperProfileCommandService.connectLinkedIn] Userinfo fetch notice (using ID token claims):', err);
    }

    // 5. Check cross-user account conflict
    const existingAccountWithSub = await this.repository.findByProviderUserId('linkedin', sub);
    if (existingAccountWithSub && existingAccountWithSub.userId !== userId && existingAccountWithSub.status === 'active') {
      throw new LinkedInAccountConflictError();
    }

    try {
      // 6. Encrypt access token & persist external account
      const encryptedAccessToken = encryptToken(authResult.accessToken);

      await this.repository.upsertExternalAccount({
        userId,
        provider: 'linkedin',
        providerUserId: sub,
        accessTokenEncrypted: encryptedAccessToken,
        refreshTokenEncrypted: null,
        scopes: authResult.scopes,
        status: 'active',
        lastSyncedAt: new Date().toISOString()
      });

      // 7. Persist zero-weight identity evidence
      const evidence = this.linkedInProvider.toEvidence(userId, {
        sub,
        name: userInfoName,
        email: userInfoEmail,
        emailVerified: userInfoEmailVerified,
        pictureUrl: userInfoPicture,
        locale: userInfoLocale
      });
      await this.repository.saveEvidence(evidence);

      // 8. Recompute profile with linkedinConnected = true
      return await this.recomputeProfileInternal(userId, undefined, undefined, true);
    } catch (err) {
      console.error('[DeveloperProfileCommandService.connectLinkedIn] Persistence failed:', err);
      if (err instanceof BaseError) throw err;
      throw new BaseError(
        err instanceof Error ? err.message : 'Failed to synchronize LinkedIn connection',
        'LINKEDIN_SYNC_ERROR',
        500
      );
    }
  }

  /**
   * Disconnects LinkedIn account, removes identity evidence, and refreshes profile.
   */
  public async disconnectLinkedIn(context: RequestContext): Promise<DeveloperProfileEntity> {
    if (!context.user || !context.user.id || !isValidUUID(context.user.id)) {
      throw new AuthenticationError('Valid authenticated user session required to disconnect LinkedIn');
    }
    const userId = context.user.id;

    // 1. Delete external account row
    await this.repository.deleteExternalAccount(userId, 'linkedin');

    // 2. Delete LinkedIn evidence
    await this.repository.deleteEvidenceBySource(userId, 'linkedin');

    // 3. Recompute profile with linkedinConnected = false
    return this.recomputeProfileInternal(userId, undefined, undefined, false);
  }

  private async recomputeProfileInternal(
    userId: string,
    isGitHubConnectedOverride?: boolean,
    isLeetCodeConnectedOverride?: boolean,
    isLinkedInConnectedOverride?: boolean
  ): Promise<DeveloperProfileEntity> {
    // 1. Load all evidence for user across all sources
    const allEvidence = await this.repository.getEvidenceByUserId(userId);

    // 2. Compute pure domain aggregates
    const aggregates = DeveloperSkillProfile.computeAggregates(allEvidence);

    // 3. Check active external accounts
    const existing = await this.repository.getByUserId(userId);
    const externalAccounts = await this.repository.getExternalAccounts(userId);

    const hasActiveGitHub = isGitHubConnectedOverride !== undefined
      ? isGitHubConnectedOverride
      : externalAccounts.some(acc => acc.provider === 'github' && acc.status === 'active');

    const hasActiveLeetCode = isLeetCodeConnectedOverride !== undefined
      ? isLeetCodeConnectedOverride
      : externalAccounts.some(acc => acc.provider === 'leetcode' && acc.status === 'active');

    const hasActiveLinkedIn = isLinkedInConnectedOverride !== undefined
      ? isLinkedInConnectedOverride
      : externalAccounts.some(acc => acc.provider === 'linkedin' && acc.status === 'active');

    const now = Date.now();
    const updatedEntity = new DeveloperProfileEntity({
      id: (existing?.id && isValidUUID(existing.id)) ? existing.id : crypto.randomUUID(),
      userId,
      topLanguages: aggregates.topLanguages,
      topSkills: aggregates.topSkills,
      interests: aggregates.interests,
      experienceLevel: aggregates.experienceLevel,
      githubConnected: hasActiveGitHub,
      leetcodeConnected: hasActiveLeetCode,
      linkedinConnected: hasActiveLinkedIn,
      lastComputedAt: now,
      createdAt: existing?.createdAt || now,
      updatedAt: now
    });

    return this.repository.upsert(updatedEntity);
  }
}
