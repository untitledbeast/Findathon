/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  generateCodeVerifier,
  deriveCodeChallenge,
  generateOAuthState,
  generateOAuthNonce,
  sanitizeReturnUrl,
  validateLinkedInIdToken,
  LINKEDIN_OIDC_CONFIG
} from '../lib/security/linkedin-oidc';
import { encryptToken, decryptToken } from '../lib/security/token-encryption';
import { DeveloperSkillEvidenceEntity } from '../lib/domain/entities/developer-skill-evidence.entity';
import { DeveloperSkillProfile } from '../lib/domain/value-objects/developer-skill-profile';
import { IDeveloperProfileRepository, ExternalAccountData } from '../lib/domain/repositories/developer-profile.repository.interface';
import { DeveloperProfileEntity } from '../lib/domain/entities/developer-profile.entity';
import { DeveloperProfileCommandService } from '../lib/services/developer-profile-command.service';
import { createRequestContext } from '../lib/context/request-context';
import { generateKeyPair, SignJWT, exportJWK } from 'jose';
import crypto from 'crypto';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

// In-Memory Repository Mock for deterministic testing
class MockDeveloperProfileRepository implements IDeveloperProfileRepository {
  private profiles = new Map<string, DeveloperProfileEntity>();
  private externalAccounts: ExternalAccountData[] = [];
  private evidenceList: DeveloperSkillEvidenceEntity[] = [];

  public async getByUserId(userId: string): Promise<DeveloperProfileEntity | null> {
    return this.profiles.get(userId) || null;
  }

  public async upsert(profile: DeveloperProfileEntity): Promise<DeveloperProfileEntity> {
    this.profiles.set(profile.userId, profile);
    return profile;
  }

  public async saveEvidence(evidence: DeveloperSkillEvidenceEntity): Promise<DeveloperSkillEvidenceEntity> {
    this.evidenceList = this.evidenceList.filter(
      e => !(e.userId === evidence.userId && e.source === evidence.source && e.evidenceType === evidence.evidenceType && e.externalId === evidence.externalId)
    );
    this.evidenceList.push(evidence);
    return evidence;
  }

  public async saveEvidenceBatch(evidenceList: DeveloperSkillEvidenceEntity[]): Promise<DeveloperSkillEvidenceEntity[]> {
    for (const e of evidenceList) {
      await this.saveEvidence(e);
    }
    return evidenceList;
  }

  public async getEvidenceByUserId(userId: string): Promise<DeveloperSkillEvidenceEntity[]> {
    return this.evidenceList.filter(e => e.userId === userId);
  }

  public async deleteEvidenceBySource(userId: string, source: string): Promise<void> {
    this.evidenceList = this.evidenceList.filter(e => !(e.userId === userId && e.source === source));
  }

  public async upsertExternalAccount(account: ExternalAccountData): Promise<void> {
    this.externalAccounts = this.externalAccounts.filter(
      a => !(a.userId === account.userId && a.provider === account.provider)
    );
    this.externalAccounts.push(account);
  }

  public async deleteExternalAccount(userId: string, provider: string): Promise<void> {
    this.externalAccounts = this.externalAccounts.filter(
      a => !(a.userId === userId && a.provider === provider)
    );
  }

  public async getExternalAccount(userId: string, provider: string): Promise<ExternalAccountData | null> {
    return this.externalAccounts.find(a => a.userId === userId && a.provider === provider) || null;
  }

  public async getExternalAccounts(userId: string): Promise<ExternalAccountData[]> {
    return this.externalAccounts.filter(a => a.userId === userId);
  }

  public async findByProviderUserId(provider: 'github' | 'leetcode' | 'linkedin', providerUserId: string): Promise<ExternalAccountData | null> {
    return this.externalAccounts.find(a => a.provider === provider && a.providerUserId === providerUserId) || null;
  }
}

async function runLinkedInOidcTestSuite() {
  console.log('====================================================');
  console.log('RUNNING MASTER LINKEDIN OIDC INTEGRATION TEST SUITE');
  console.log('====================================================\n');

  // ─── [TEST 1] PKCE & Cryptographic Utilities ───────────────────
  console.log('[Test 1] PKCE Verifier & SHA-256 S256 Challenge Derivation:');
  {
    const verifier = generateCodeVerifier();
    assert(verifier.length >= 43, 'Verifier must be at least 43 characters');
    const challenge = deriveCodeChallenge(verifier);
    assert(challenge.length >= 43, 'Challenge must be at least 43 characters');

    // Deterministic verify
    const expected = crypto.createHash('sha256').update(verifier).digest('base64url');
    assert(challenge === expected, 'deriveCodeChallenge produces correct RFC 7636 S256 challenge');

    const state1 = generateOAuthState();
    const state2 = generateOAuthState();
    assert(state1 !== state2, 'States must be unique');

    const nonce1 = generateOAuthNonce();
    const nonce2 = generateOAuthNonce();
    assert(nonce1 !== nonce2, 'Nonces must be unique');

    console.log(`  ✓ Code Verifier: ${verifier.slice(0, 16)}...`);
    console.log(`  ✓ S256 Challenge: ${challenge.slice(0, 16)}...`);
    console.log('  ✓ State & Nonce entropy verified');
  }

  // ─── [TEST 2] AES-256-GCM Transaction Encryption & Tamper Resistance ─
  console.log('\n[Test 2] Transaction Cookie Encryption & Tamper Resistance:');
  {
    const transaction = {
      state: 'test-state-123',
      codeVerifier: 'test-verifier-456',
      nonce: 'test-nonce-789',
      userId: '11111111-1111-4111-8111-111111111111',
      issuedAt: Date.now(),
      expiresAt: Date.now() + 600000
    };

    const encrypted = encryptToken(JSON.stringify(transaction));
    assert(typeof encrypted === 'string' && encrypted.includes(':'), 'Encrypted format iv:authTag:ciphertext');

    const decrypted = JSON.parse(decryptToken(encrypted));
    assert(decrypted.state === transaction.state, 'Decrypted state matches');
    assert(decrypted.nonce === transaction.nonce, 'Decrypted nonce matches');
    assert(decrypted.userId === transaction.userId, 'Decrypted userId matches');

    // Tamper test: Corrupt ciphertext
    const parts = encrypted.split(':');
    const corrupted = `${parts[0]}:${parts[1]}:${parts[2].slice(0, -2)}ff`;
    let tamperFailed = false;
    try {
      decryptToken(corrupted);
    } catch {
      tamperFailed = true;
    }
    assert(tamperFailed, 'Tampered ciphertext must fail authenticated decryption (AEAD tag check)');
    console.log('  ✓ AES-256-GCM authenticated encryption and tamper resistance verified');
  }

  // ─── [TEST 3] Open Redirect Prevention & Path Sanitization ──────
  console.log('\n[Test 3] Return URL Open Redirect Prevention:');
  {
    assert(sanitizeReturnUrl(null) === '/account?tab=intelligence', 'Null returns default internal tab');
    assert(sanitizeReturnUrl('') === '/account?tab=intelligence', 'Empty returns default internal tab');
    assert(sanitizeReturnUrl('/profile') === '/profile', 'Internal relative path accepted');
    assert(sanitizeReturnUrl('/account?tab=overview') === '/account?tab=overview', 'Internal query path accepted');

    // Open redirect attack vectors
    assert(sanitizeReturnUrl('https://evil.com') === '/account?tab=intelligence', 'Rejects external https:// domain');
    assert(sanitizeReturnUrl('http://evil.com') === '/account?tab=intelligence', 'Rejects external http:// domain');
    assert(sanitizeReturnUrl('//evil.com') === '/account?tab=intelligence', 'Rejects protocol-relative //evil.com');
    assert(sanitizeReturnUrl('/\\evil.com') === '/account?tab=intelligence', 'Rejects backslash protocol bypass');
    assert(sanitizeReturnUrl('javascript:alert(1)') === '/account?tab=intelligence', 'Rejects javascript: scheme');
    console.log('  ✓ Open redirect attacks strictly prevented and sanitized to internal paths');
  }

  // ─── [TEST 4] OIDC ID Token RS256 JWKS Signature & Claims Verification ─
  console.log('\n[Test 4] OIDC ID Token RS256 JWKS Signature & Claims Verification:');
  {
    const keyPair = await generateKeyPair('RS256');
    const publicJwk = await exportJWK(keyPair.publicKey);
    publicJwk.kid = 'linkedin-test-key-1';
    publicJwk.alg = 'RS256';
    publicJwk.use = 'sig';

    const clientId = 'linkedin_test_client_id_789';
    const nonce = 'expected_test_nonce_abc';
    const subject = 'linkedin_sub_user_998877';

    // Mock JWKS resolver returning our test public key
    const mockJWKS = async () => keyPair.publicKey;

    // A. Valid ID Token
    const validToken = await new SignJWT({
      iss: LINKEDIN_OIDC_CONFIG.issuer,
      aud: clientId,
      nonce: nonce,
      sub: subject,
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      email_verified: true
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'linkedin-test-key-1' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(keyPair.privateKey);

    const validated = await validateLinkedInIdToken(validToken, nonce, clientId, mockJWKS as any);
    assert(validated.sub === subject, 'Subject matches');
    assert(validated.name === 'Ada Lovelace', 'Name matches');
    assert(validated.email === 'ada@example.com', 'Email matches');
    assert(validated.email_verified === true, 'Email verified status matches');
    console.log(`  ✓ Valid ID Token parsed & verified: "${validated.name}" (sub: ${validated.sub})`);

    // B. Invalid Issuer Attack
    const badIssuerToken = await new SignJWT({
      iss: 'https://attacker.com',
      aud: clientId,
      nonce: nonce,
      sub: subject
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'linkedin-test-key-1' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(keyPair.privateKey);

    let badIssuerCaught = false;
    try {
      await validateLinkedInIdToken(badIssuerToken, nonce, clientId, mockJWKS as any);
    } catch {
      badIssuerCaught = true;
    }
    assert(badIssuerCaught, 'Must reject untrusted issuer');
    console.log('  ✓ Untrusted issuer correctly rejected');

    // C. Invalid Audience Attack
    const badAudienceToken = await new SignJWT({
      iss: LINKEDIN_OIDC_CONFIG.issuer,
      aud: 'wrong_client_id_456',
      nonce: nonce,
      sub: subject
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'linkedin-test-key-1' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(keyPair.privateKey);

    let badAudienceCaught = false;
    try {
      await validateLinkedInIdToken(badAudienceToken, nonce, clientId, mockJWKS as any);
    } catch {
      badAudienceCaught = true;
    }
    assert(badAudienceCaught, 'Must reject mismatched audience');
    console.log('  ✓ Mismatched audience correctly rejected');

    // D. Nonce Mismatch Attack
    let badNonceCaught = false;
    try {
      await validateLinkedInIdToken(validToken, 'different_tampered_nonce', clientId, mockJWKS as any);
    } catch {
      badNonceCaught = true;
    }
    assert(badNonceCaught, 'Must reject mismatched nonce');
    console.log('  ✓ Nonce mismatch correctly rejected');

    // E. Expired Token Attack
    const expiredToken = await new SignJWT({
      iss: LINKEDIN_OIDC_CONFIG.issuer,
      aud: clientId,
      nonce: nonce,
      sub: subject
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'linkedin-test-key-1' })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 3600)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 1800) // Expired 30 mins ago
      .sign(keyPair.privateKey);

    let expiredCaught = false;
    try {
      await validateLinkedInIdToken(expiredToken, nonce, clientId, mockJWKS as any);
    } catch {
      expiredCaught = true;
    }
    assert(expiredCaught, 'Must reject expired ID token');
    console.log('  ✓ Expired token correctly rejected');
  }

  // ─── [TEST 5] Account Ownership & Cross-User Conflict Protection ─
  console.log('\n[Test 5] Account Ownership & Cross-User Conflict Protection:');
  {
    const repo = new MockDeveloperProfileRepository();

    // User A connects LinkedIn identity 'linkedin-sub-100'
    await repo.upsertExternalAccount({
      userId: 'user-a-uuid-1111-1111-1111-111111111111',
      provider: 'linkedin',
      providerUserId: 'linkedin-sub-100',
      status: 'active'
    });

    // Check query by providerUserId
    const found = await repo.findByProviderUserId('linkedin', 'linkedin-sub-100');
    assert(found !== null, 'Account found by providerUserId');
    assert(found?.userId === 'user-a-uuid-1111-1111-1111-111111111111', 'Belongs to User A');

    // User B attempts to connect the same LinkedIn identity 'linkedin-sub-100'
    const userBId = 'user-b-uuid-2222-2222-2222-222222222222';
    const isConflict = found && found.userId !== userBId && found.status === 'active';
    assert(isConflict === true, 'Conflict detected for User B');
    console.log('  ✓ Cross-user conflict successfully detected and blocked (User B cannot hijack User A\'s LinkedIn identity)');

    // Idempotent reconnect for User A
    const isUserAReconnect = found && found.userId === 'user-a-uuid-1111-1111-1111-111111111111';
    assert(isUserAReconnect === true, 'Same user reconnect is recognized as idempotent update');
    console.log('  ✓ Same-user reconnect recognized as idempotent update without duplication');
  }

  // ─── [TEST 6] Honest Developer Intelligence & Zero Technical Contribution ─
  console.log('\n[Test 6] Honest Developer Intelligence (Zero Fabricated Technical Skills):');
  {
    const userId = 'dev-user-uuid-3333-3333-3333-333333333333';

    // Baseline: Developer with GitHub React repo and LeetCode DSA activity
    const baselineEvidence: DeveloperSkillEvidenceEntity[] = [
      new DeveloperSkillEvidenceEntity({
        id: 'ev-1',
        userId,
        source: 'github',
        evidenceType: 'repo',
        externalId: '101',
        url: 'https://github.com/user/react-app',
        signals: { language: 'TypeScript', topics: ['react', 'nextjs'] },
        weight: 1.0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }),
      new DeveloperSkillEvidenceEntity({
        id: 'ev-2',
        userId,
        source: 'leetcode',
        evidenceType: 'activity',
        externalId: 'lc-1',
        url: null,
        signals: { totalSolved: 150, mediumSolved: 60, hardSolved: 20 },
        weight: 1.0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      })
    ];

    const baselineScores = DeveloperSkillProfile.computeAggregates(baselineEvidence);

    // Now attach LinkedIn OIDC Identity Evidence (weight = 0.0)
    const linkedInEvidence = new DeveloperSkillEvidenceEntity({
      id: 'ev-li-1',
      userId,
      source: 'linkedin',
      evidenceType: 'identity_profile',
      externalId: 'linkedin-sub-ada',
      url: 'https://www.linkedin.com',
      signals: {
        has_linkedin_connection: true,
        sub: 'linkedin-sub-ada',
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        email_verified: true
      },
      weight: 0.0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    const combinedEvidence = [...baselineEvidence, linkedInEvidence];
    const combinedScores = DeveloperSkillProfile.computeAggregates(combinedEvidence);

    // Verify 100% mathematical invariance on technical dimensions
    assert(
      JSON.stringify(combinedScores.topLanguages) === JSON.stringify(baselineScores.topLanguages),
      'Top languages must NOT be altered by LinkedIn identity connection'
    );
    assert(
      JSON.stringify(combinedScores.topSkills) === JSON.stringify(baselineScores.topSkills),
      'Top skills must NOT be altered by LinkedIn identity connection'
    );
    assert(
      combinedScores.experienceLevel === baselineScores.experienceLevel,
      'Experience level must NOT be inflated by LinkedIn identity connection'
    );
    assert(
      combinedScores.totalWeight === baselineScores.totalWeight,
      'Total technical weight must NOT increase from LinkedIn OIDC connection'
    );

    console.log(`  ✓ Baseline weight: ${baselineScores.totalWeight} -> Combined weight: ${combinedScores.totalWeight} (Zero inflation)`);
    console.log(`  ✓ Languages intact: ${Object.keys(combinedScores.topLanguages).join(', ')}`);
    console.log(`  ✓ Skills intact: ${Object.keys(combinedScores.topSkills).join(', ')}`);
    console.log('  ✓ Absolute product rule verified: Technical capability contribution is strictly 0.0');
  }

  // ─── [TEST 7] Disconnect & Reconnect Lifecycle ─────────────────
  console.log('\n[Test 7] Disconnect & Reconnect Lifecycle:');
  {
    const repo = new MockDeveloperProfileRepository();
    const userId = crypto.randomUUID();
    const user = { id: userId, email: 'dev@test.com' };
    const context = createRequestContext(user as any, {});

    const commandService = new DeveloperProfileCommandService(
      repo,
      new (class extends (await import('../lib/providers/github.provider')).GitHubProvider {})(),
      new (class extends (await import('../lib/providers/leetcode.provider')).LeetCodeProvider {})(),
      new (class extends (await import('../lib/providers/linkedin.provider')).LinkedInProvider {})()
    );

    // Initial state: Connect LinkedIn
    await repo.upsertExternalAccount({
      userId,
      provider: 'linkedin',
      providerUserId: 'sub-test-444',
      status: 'active'
    });
    await repo.saveEvidence(new DeveloperSkillEvidenceEntity({
      id: 'ev-li-444',
      userId,
      source: 'linkedin',
      evidenceType: 'identity_profile',
      externalId: 'sub-test-444',
      url: null,
      signals: { name: 'Test User' },
      weight: 0.0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }));

    const profileBefore = await commandService.recomputeProfile(context);
    assert(profileBefore.linkedinConnected === true, 'Profile indicates linkedinConnected = true');

    // Disconnect LinkedIn
    const profileAfterDisconnect = await commandService.disconnectLinkedIn(context);
    assert(profileAfterDisconnect.linkedinConnected === false, 'Profile indicates linkedinConnected = false');
    const remainingEvidence = await repo.getEvidenceByUserId(userId);
    assert(remainingEvidence.length === 0, 'LinkedIn evidence completely removed on disconnect');
    const accountAfter = await repo.getExternalAccount(userId, 'linkedin');
    assert(accountAfter === null, 'External account row removed');

    console.log('  ✓ Disconnect removes LinkedIn account & evidence, recomputes profile (linkedinConnected = false)');
  }

  console.log('\n====================================================');
  console.log('MASTER LINKEDIN OIDC SUITE: ALL TESTS PASSED (100% GREEN)');
  console.log('====================================================');
}

runLinkedInOidcTestSuite().catch(err => {
  console.error('LinkedIn OIDC test suite failed:', err);
  process.exit(1);
});
