import assert from 'node:assert';
import { CANONICAL_SKILL_TAXONOMY } from '../lib/domain/skills/skill-taxonomy';
import { SkillNormalizer } from '../lib/domain/skills/skill-normalizer';
import { DeveloperSkillEvidenceEntity } from '../lib/domain/entities/developer-skill-evidence.entity';
import { DeveloperProfileEntity } from '../lib/domain/entities/developer-profile.entity';
import { DeveloperCapabilityProfile } from '../lib/domain/value-objects/developer-capability-profile';
import { HackathonCapabilityProfile } from '../lib/domain/value-objects/hackathon-capability-profile';
import { EligibilityEngine } from '../lib/domain/matching/eligibility-engine';
import { HackathonMatchEngine } from '../lib/domain/matching/hackathon-match-engine';
import { HackathonAnalysisService } from '../lib/services/hackathon-analysis.service';
import { isValidUUID } from '../lib/domain/mappers/developer-profile.mapper';

console.log('====================================================');
console.log('RUNNING FINDATHON INTELLIGENCE & MATCH TEST SUITE');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function test(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err: unknown) {
    console.error(`  ✗ ${name}`);
    const message = err instanceof Error ? err.message : String(err);
    console.error(`    Error: ${message}`);
    throw err;
  }
}

// ----------------------------------------------------
// 1. Taxonomy & Normalization Tests
// ----------------------------------------------------
console.log('[1] Taxonomy & Skill Normalizer Verification:');

test('Taxonomy contains canonical definitions with aliases', () => {
  assert.ok(Object.keys(CANONICAL_SKILL_TAXONOMY).length >= 25);
  assert.strictEqual(CANONICAL_SKILL_TAXONOMY['language.typescript'].displayLabel, 'TypeScript');
  assert.strictEqual(CANONICAL_SKILL_TAXONOMY['language.javascript'].displayLabel, 'JavaScript');
});

test('Normalizes canonical languages correctly', () => {
  assert.strictEqual(SkillNormalizer.normalize('typescript')?.id, 'language.typescript');
  assert.strictEqual(SkillNormalizer.normalize('TS')?.id, 'language.typescript');
  assert.strictEqual(SkillNormalizer.normalize('javascript')?.id, 'language.javascript');
  assert.strictEqual(SkillNormalizer.normalize('js')?.id, 'language.javascript');
  assert.strictEqual(SkillNormalizer.normalize('python')?.id, 'language.python');
  assert.strictEqual(SkillNormalizer.normalize('python3')?.id, 'language.python');
});

test('Guarantees strict distinctness between easily confused skills', () => {
  // Java != JavaScript
  const java = SkillNormalizer.normalize('java');
  const js = SkillNormalizer.normalize('javascript');
  assert.notStrictEqual(java?.id, js?.id);
  assert.strictEqual(java?.id, 'language.java');
  assert.strictEqual(js?.id, 'language.javascript');

  // C != C++ != C#
  const c = SkillNormalizer.normalize('c');
  const cpp = SkillNormalizer.normalize('c++');
  const csharp = SkillNormalizer.normalize('c#');
  assert.strictEqual(c?.id, 'language.c');
  assert.strictEqual(cpp?.id, 'language.cpp');
  assert.strictEqual(csharp?.id, 'language.csharp');

  // React != React Native
  const react = SkillNormalizer.normalize('react');
  const rn = SkillNormalizer.normalize('react-native');
  assert.strictEqual(react?.id, 'framework.react');
  assert.strictEqual(rn?.id, 'domain.mobile');

  // Node != JS
  const node = SkillNormalizer.normalize('node');
  assert.strictEqual(node?.id, 'framework.nodejs');
  assert.notStrictEqual(node?.id, js?.id);

  // Next.js != React
  const next = SkillNormalizer.normalize('next.js');
  assert.strictEqual(next?.id, 'framework.nextjs');
  assert.notStrictEqual(next?.id, react?.id);
});

test('Normalizes array of messy tags into clean canonical list without duplicates', () => {
  const rawTags = ['TypeScript', 'TS', 'reactjs', 'React.js', 'PostgreSQL', 'postgres', 'unknown_tag_12345'];
  const normalized = SkillNormalizer.normalizeMany(rawTags);
  assert.strictEqual(normalized.length, 3); // ts, react, postgres
  const ids = normalized.map(n => n.id);
  assert.ok(ids.includes('language.typescript'));
  assert.ok(ids.includes('framework.react'));
  assert.ok(ids.includes('database.postgresql'));
});

test('Safely extracts skills from unstructured text without substring false positives', () => {
  const corpus = 'Join our Web3 AI hackathon building on PyTorch and Ethereum with Next.js frontend.';
  const extracted = SkillNormalizer.extractFromText(corpus);
  const ids = extracted.map(e => e.id);
  assert.ok(ids.includes('domain.web3'));
  assert.ok(ids.includes('domain.ai_ml'));
  assert.ok(ids.includes('framework.pytorch'));
  assert.ok(ids.includes('framework.nextjs'));
});

// ----------------------------------------------------
// 2. Developer Capability Profile Tests
// ----------------------------------------------------
console.log('\n[2] Developer Capability Profile Verification:');

const testUserId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

test('Builds capability profile with empty evidence gracefully', () => {
  const emptyCap = DeveloperCapabilityProfile.fromEvidence(testUserId, null, []);
  assert.strictEqual(emptyCap.userId, testUserId);
  assert.strictEqual(emptyCap.confidence, 'low');
  assert.strictEqual(emptyCap.confidenceScore, 0);
  assert.strictEqual(emptyCap.evidenceCount, 0);
  assert.strictEqual(emptyCap.dsaIndex, 0);
});

test('Builds combined GitHub + LeetCode capability profile', () => {
  const now = Date.now();
  const evidenceList: DeveloperSkillEvidenceEntity[] = [
    // GitHub Repo 1: TypeScript + React
    new DeveloperSkillEvidenceEntity({
      id: crypto.randomUUID(),
      userId: testUserId,
      source: 'github',
      evidenceType: 'repo',
      externalId: 'gh-101',
      url: 'https://github.com/user/ts-app',
      signals: {
        language: 'TypeScript',
        topics: ['react', 'nextjs', 'tailwindcss'],
        languages: { TypeScript: 50000, JavaScript: 2000 }
      },
      weight: 1.0,
      createdAt: now - (5 * 24 * 60 * 60 * 1000),
      updatedAt: now - (5 * 24 * 60 * 60 * 1000)
    }),
    // GitHub Repo 2: Python Backend
    new DeveloperSkillEvidenceEntity({
      id: crypto.randomUUID(),
      userId: testUserId,
      source: 'github',
      evidenceType: 'repo',
      externalId: 'gh-102',
      url: 'https://github.com/user/py-api',
      signals: {
        language: 'Python',
        topics: ['fastapi', 'ai', 'machine-learning']
      },
      weight: 0.9,
      createdAt: now - (10 * 24 * 60 * 60 * 1000),
      updatedAt: now - (10 * 24 * 60 * 60 * 1000)
    }),
    // LeetCode Activity
    new DeveloperSkillEvidenceEntity({
      id: crypto.randomUUID(),
      userId: testUserId,
      source: 'leetcode',
      evidenceType: 'activity',
      externalId: 'lc-act',
      url: 'https://leetcode.com/testdev',
      signals: {
        totalSolved: 450,
        mediumSolved: 280,
        hardSolved: 70,
        contestRating: 1850,
        languageName: 'TypeScript',
        problemsSolved: 200
      },
      weight: 0.85,
      createdAt: now,
      updatedAt: now
    })
  ];

  const profileEntity = new DeveloperProfileEntity({
    id: crypto.randomUUID(),
    userId: testUserId,
    topLanguages: { TypeScript: 80, Python: 60 },
    topSkills: { React: 85, Nextjs: 80 },
    interests: ['AI', 'Web Development'],
    experienceLevel: 'advanced',
    githubConnected: true,
    leetcodeConnected: true,
    linkedinConnected: false,
    lastComputedAt: now,
    createdAt: now,
    updatedAt: now
  });

  const cap = DeveloperCapabilityProfile.fromEvidence(testUserId, profileEntity, evidenceList, now);

  assert.strictEqual(cap.userId, testUserId);
  assert.ok(cap.languages['language.typescript'] > 0.5);
  assert.ok(cap.frameworks['framework.react'] > 0.3);
  assert.ok(cap.dsaIndex >= 0.85);
  assert.strictEqual(cap.confidence, 'medium'); // 3 items = medium confidence
  assert.strictEqual(cap.technicalLevel, 'advanced');
  assert.strictEqual(cap.sources.length, 2);
});

// ----------------------------------------------------
// 3. Eligibility Engine Tests
// ----------------------------------------------------
console.log('\n[3] Hard Eligibility Engine Verification:');

const testNow = new Date('2026-08-19T12:00:00Z').getTime();

test('Marks active upcoming hackathon as eligible', () => {
  const hack = new HackathonCapabilityProfile({
    id: 'hack-001',
    title: 'AI Global Hackathon 2026',
    slug: 'ai-global-hackathon-2026',
    description: 'Build cutting edge AI agents.',
    tagline: 'AI Future',
    requiredLanguages: ['language.python'],
    preferredLanguages: [],
    frameworks: ['framework.pytorch'],
    domains: ['domain.ai_ml'],
    skills: [],
    difficulty: 'open',
    isOnline: true,
    locationCity: null,
    locationCollege: null,
    registrationDeadline: new Date('2026-08-25T12:00:00Z'),
    eventStart: new Date('2026-08-26T12:00:00Z'),
    eventEnd: new Date('2026-08-30T12:00:00Z'),
    status: 'approved',
    isVerified: true,
    isFeatured: true,
    prizeAmount: 25000,
    dataQuality: 'high',
    rawTags: ['ai', 'python', 'pytorch']
  });

  const eligibility = EligibilityEngine.evaluate(hack, testNow);
  assert.strictEqual(eligibility.isEligible, true);
  assert.strictEqual(eligibility.status, 'eligible');
  assert.ok(eligibility.actionability > 0.8);
});

test('Marks expired hackathon as ineligible', () => {
  const expiredHack = new HackathonCapabilityProfile({
    id: 'hack-002',
    title: 'Past Hackathon 2025',
    slug: 'past-hackathon-2025',
    description: 'Concluded event.',
    tagline: null,
    requiredLanguages: [],
    preferredLanguages: [],
    frameworks: [],
    domains: ['domain.fullstack'],
    skills: [],
    difficulty: 'open',
    isOnline: true,
    locationCity: null,
    locationCollege: null,
    registrationDeadline: new Date('2025-01-01T00:00:00Z'),
    eventStart: new Date('2025-01-02T00:00:00Z'),
    eventEnd: new Date('2025-01-05T00:00:00Z'),
    status: 'approved',
    isVerified: false,
    isFeatured: false,
    prizeAmount: 5000,
    dataQuality: 'medium',
    rawTags: []
  });

  const eligibility = EligibilityEngine.evaluate(expiredHack, testNow);
  assert.strictEqual(eligibility.isEligible, false);
  assert.strictEqual(eligibility.status, 'ineligible');
  assert.strictEqual(eligibility.actionability, 0);
});

// ----------------------------------------------------
// 4. Pure Hackathon Match Engine Tests
// ----------------------------------------------------
console.log('\n[4] Pure Hackathon Match Engine Verification:');

test('Calculates deterministic match score and explainable reasons for AI hackathon', () => {
  const now = testNow;
  const dev = DeveloperCapabilityProfile.fromEvidence(
    testUserId,
    null,
    [
      new DeveloperSkillEvidenceEntity({
        id: crypto.randomUUID(),
        userId: testUserId,
        source: 'github',
        evidenceType: 'repo',
        externalId: 'gh-ai',
        url: 'https://github.com/user/ai-app',
        signals: {
          language: 'Python',
          topics: ['pytorch', 'ai', 'deep-learning']
        },
        weight: 1.0,
        createdAt: now,
        updatedAt: now
      })
    ],
    now
  );

  const aiHack = new HackathonCapabilityProfile({
    id: 'ai-hack-01',
    title: 'PyTorch Agent World',
    slug: 'pytorch-agent-world',
    description: 'Develop PyTorch LLM agent systems with Python.',
    tagline: 'PyTorch Agents',
    requiredLanguages: ['language.python'],
    preferredLanguages: [],
    frameworks: ['framework.pytorch'],
    domains: ['domain.ai_ml'],
    skills: [],
    difficulty: 'intermediate',
    isOnline: true,
    locationCity: null,
    locationCollege: null,
    registrationDeadline: new Date('2026-08-25T12:00:00Z'),
    eventStart: new Date('2026-08-26T12:00:00Z'),
    eventEnd: new Date('2026-08-30T12:00:00Z'),
    status: 'approved',
    isVerified: true,
    isFeatured: true,
    prizeAmount: 30000,
    dataQuality: 'high',
    rawTags: ['python', 'pytorch', 'ai']
  });

  const match = HackathonMatchEngine.calculateMatch(dev, aiHack, undefined, now);

  assert.ok(match.overallScore >= 0.70, `Expected score >= 0.70, got ${match.overallScore}`);
  assert.ok(match.matchPercentage >= 70);
  assert.strictEqual(typeof match.confidence, 'string');
  assert.ok(match.strengths.length > 0);
  assert.ok(match.strengths.some(s => s.label === 'Python' || s.label === 'PyTorch' || s.label.includes('AI')));
});

test('Matches are strictly deterministic and reproducible across 10 executions', () => {
  const now = testNow;
  const dev = DeveloperCapabilityProfile.fromEvidence(testUserId, null, [], now);
  const hack = HackathonCapabilityProfile.fromRow({
    id: 'h-det-100',
    title: 'Deterministic Event',
    tags: ['typescript', 'react']
  });

  const result1 = HackathonMatchEngine.calculateMatch(dev, hack, undefined, now);
  for (let i = 0; i < 10; i++) {
    const resultN = HackathonMatchEngine.calculateMatch(dev, hack, undefined, now);
    assert.strictEqual(resultN.overallScore, result1.overallScore);
    assert.strictEqual(resultN.matchPercentage, result1.matchPercentage);
    assert.strictEqual(resultN.confidenceScore, result1.confidenceScore);
    assert.strictEqual(resultN.strengths.length, result1.strengths.length);
  }
});

test('Score is mathematically clamped without NaN or Infinity', () => {
  const dev = DeveloperCapabilityProfile.fromEvidence('u1', null, [], testNow);
  const hack = HackathonCapabilityProfile.fromRow({ id: 'h-clamp', title: 'Clamp Test' });
  const match = HackathonMatchEngine.calculateMatch(dev, hack, undefined, testNow);

  assert.ok(!isNaN(match.overallScore));
  assert.ok(!isNaN(match.matchPercentage));
  assert.ok(!isNaN(match.confidenceScore));
  assert.ok(match.overallScore >= 0.05 && match.overallScore <= 1.0);
  assert.ok(match.matchPercentage >= 5 && match.matchPercentage <= 100);
});

// ----------------------------------------------------
// 5. Property-Based & Edge-Case Tests
// ----------------------------------------------------
console.log('\n[5] Property-Based & Monotonicity Verification:');

test('Anti-keyword-stuffing: Topic tag soup produces balanced, non-inflated scores', () => {
  const now = testNow;
  const stuffedDev = DeveloperCapabilityProfile.fromEvidence(
    'stuffed-user',
    null,
    [
      new DeveloperSkillEvidenceEntity({
        id: crypto.randomUUID(),
        userId: 'stuffed-user',
        source: 'github',
        evidenceType: 'repo',
        externalId: 'gh-stuffed',
        url: 'https://github.com/user/tag-soup',
        signals: {
          topics: ['ai', 'ml', 'blockchain', 'react', 'python', 'rust', 'flutter', 'docker']
        },
        weight: 0.5,
        createdAt: now,
        updatedAt: now
      })
    ],
    now
  );

  // Confidence should be low for single tag-soup repo
  assert.strictEqual(stuffedDev.confidence, 'low');
  assert.ok(stuffedDev.confidenceScore <= 0.45);
});

test('Adding relevant verified evidence strictly improves or maintains match score', () => {
  const now = testNow;
  const hack = new HackathonCapabilityProfile({
    id: 'h-mono',
    title: 'TypeScript FullStack Challenge',
    slug: 'typescript-fullstack-challenge',
    description: 'React and TypeScript hackathon.',
    tagline: null,
    requiredLanguages: ['language.typescript'],
    preferredLanguages: [],
    frameworks: ['framework.react'],
    domains: ['domain.frontend'],
    skills: [],
    difficulty: 'intermediate',
    isOnline: true,
    locationCity: null,
    locationCollege: null,
    registrationDeadline: new Date('2026-09-01T00:00:00Z'),
    eventStart: new Date('2026-09-02T00:00:00Z'),
    eventEnd: new Date('2026-09-05T00:00:00Z'),
    status: 'approved',
    isVerified: true,
    isFeatured: true,
    prizeAmount: 10000,
    dataQuality: 'high',
    rawTags: ['typescript', 'react']
  });

  const devBase = DeveloperCapabilityProfile.fromEvidence('u-mono', null, [], now);
  const matchBase = HackathonMatchEngine.calculateMatch(devBase, hack, undefined, now);

  const devStrong = DeveloperCapabilityProfile.fromEvidence(
    'u-mono',
    null,
    [
      new DeveloperSkillEvidenceEntity({
        id: crypto.randomUUID(),
        userId: 'u-mono',
        source: 'github',
        evidenceType: 'repo',
        externalId: 'gh-ts',
        url: 'https://github.com/user/ts-repo',
        signals: {
          language: 'TypeScript',
          topics: ['react', 'nextjs'],
          languages: { TypeScript: 80000 }
        },
        weight: 1.0,
        createdAt: now,
        updatedAt: now
      })
    ],
    now
  );
  const matchStrong = HackathonMatchEngine.calculateMatch(devStrong, hack, undefined, now);

  assert.ok(
    matchStrong.overallScore >= matchBase.overallScore,
    `Expected matchStrong (${matchStrong.overallScore}) >= matchBase (${matchBase.overallScore})`
  );
  assert.ok(matchStrong.matchPercentage >= matchBase.matchPercentage);
});

// ----------------------------------------------------
// 6. Security & Boundary Tests
// ----------------------------------------------------
console.log('\n[6] Security & UUID Boundary Verification:');

test('Validates UUID format strictly and rejects fake synthetic strings', () => {
  assert.strictEqual(isValidUUID('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'), true);
  assert.strictEqual(isValidUUID('f3653a99-685c-4dad-84ab-7a63bcd1206b'), true);
  // Rejects fake IDs
  assert.strictEqual(isValidUUID('gh-user-12345'), false);
  assert.strictEqual(isValidUUID('leetcode-user-999'), false);
  assert.strictEqual(isValidUUID('random_string'), false);
  assert.strictEqual(isValidUUID(null), false);
  assert.strictEqual(isValidUUID(undefined), false);
});

// ----------------------------------------------------
// 7. Hackathon Analysis & Provenance Tests
// ----------------------------------------------------
console.log('\n[7] Hackathon Intelligence Analysis Verification:');

test('Analyzes explicit tags vs inferred skills with accurate provenance & confidence', () => {
  const rawSubmission = {
    id: 'sub-900',
    title: 'Solana Global Web3 Sprint',
    tagline: 'Build next-gen DeFi smart contracts',
    description: 'We are looking for builders who know Rust and React to construct decentralized protocols.',
    tags: ['Solidity', 'Web3'],
    registration_deadline: '2026-09-10T00:00:00Z',
    start_date: '2026-09-12T00:00:00Z',
    end_date: '2026-09-15T00:00:00Z',
    is_online: true,
    prize_amount: 50000
  };

  const analysis = HackathonAnalysisService.analyze(rawSubmission);
  assert.strictEqual(analysis.analysisVersion, '1.0.0');
  assert.ok(analysis.analysisConfidence >= 0.90);
  assert.strictEqual(analysis.capabilityProfile.dataQuality, 'high');

  const provenance = analysis.provenance;
  // Explicit tag: Solidity
  const solRecord = provenance.find(p => p.canonicalSkillId === 'language.solidity');
  assert.ok(solRecord, 'Expected Solidity in provenance');
  assert.strictEqual(solRecord.source, 'structured_field');
  assert.strictEqual(solRecord.confidence, 1.0);
  assert.strictEqual(solRecord.requiredOrPreferred, 'required');

  // Inferred text: Rust
  const rustRecord = provenance.find(p => p.canonicalSkillId === 'language.rust');
  assert.ok(rustRecord, 'Expected Rust inferred in provenance');
  assert.strictEqual(rustRecord.source, 'inferred');
  assert.strictEqual(rustRecord.requiredOrPreferred, 'preferred');

  // Inferred text: React
  const reactRecord = provenance.find(p => p.canonicalSkillId === 'framework.react');
  assert.ok(reactRecord, 'Expected React inferred in provenance');
  assert.strictEqual(reactRecord.source, 'inferred');
});

test('Rejects hallucinated skills and safely ignores unrecognized buzzwords', () => {
  const messySubmission = {
    id: 'sub-901',
    title: 'Random Event',
    description: 'Come build XYZ_unsupported_framework with ABC_unknown_tooling.',
    tags: ['unknown_tag_xyz', 'fake_skill_123']
  };

  const analysis = HackathonAnalysisService.analyze(messySubmission);
  assert.strictEqual(analysis.capabilityProfile.requiredLanguages.length, 0);
  assert.strictEqual(analysis.capabilityProfile.frameworks.length, 0);
  assert.strictEqual(analysis.capabilityProfile.dataQuality, 'low');
});

console.log('\n====================================================');
console.log(`TEST SUITE COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
console.log('====================================================\n');

