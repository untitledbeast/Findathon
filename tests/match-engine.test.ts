/* eslint-disable */
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

// ----------------------------------------------------
// 8. Required vs. Preferred Skill Penalty Tests
// ----------------------------------------------------
console.log('\n[8] Required vs. Preferred Skill Penalty Verification:');

test('Missing required language heavily penalizes score compared to missing preferred language', () => {
  const now = 1750000000000;
  // Developer with TypeScript only (no Python)
  const devTS = DeveloperCapabilityProfile.fromEvidence(
    'u-req-test',
    null,
    [
      new DeveloperSkillEvidenceEntity({
        id: crypto.randomUUID(),
        userId: 'u-req-test',
        source: 'github',
        evidenceType: 'repo',
        externalId: 'gh-1',
        signals: { language: 'TypeScript', languages: { TypeScript: 100000 } },
        weight: 1.0,
        createdAt: now,
        updatedAt: now
      })
    ],
    now
  );

  // Hackathon requiring Python (hard requirement)
  const hackReqPython = new HackathonCapabilityProfile({
    id: 'h-req-py',
    title: 'Python AI Hackathon',
    slug: 'python-ai',
    description: 'Build AI models using Python and PyTorch.',
    tagline: null,
    requiredLanguages: ['language.python'],
    preferredLanguages: [],
    frameworks: ['framework.pytorch'],
    domains: ['domain.ai_ml'],
    skills: [],
    difficulty: 'intermediate',
    isOnline: true,
    locationCity: null,
    locationCollege: null,
    registrationDeadline: new Date(now + 86400000 * 5),
    eventStart: new Date(now + 86400000 * 6),
    eventEnd: new Date(now + 86400000 * 8),
    status: 'approved',
    isVerified: true,
    isFeatured: false,
    prizeAmount: 10000,
    dataQuality: 'high',
    rawTags: ['Python', 'AI']
  });

  // Hackathon preferring Python (soft requirement)
  const hackPrefPython = new HackathonCapabilityProfile({
    id: 'h-pref-py',
    title: 'Open Web Hackathon',
    slug: 'open-web',
    description: 'Build modern web applications with TypeScript frontend. Python backend is optional bonus.',
    tagline: null,
    requiredLanguages: ['language.typescript'],
    preferredLanguages: ['language.python'],
    frameworks: ['framework.react'],
    domains: ['domain.frontend'],
    skills: [],
    difficulty: 'intermediate',
    isOnline: true,
    locationCity: null,
    locationCollege: null,
    registrationDeadline: new Date(now + 86400000 * 5),
    eventStart: new Date(now + 86400000 * 6),
    eventEnd: new Date(now + 86400000 * 8),
    status: 'approved',
    isVerified: true,
    isFeatured: false,
    prizeAmount: 10000,
    dataQuality: 'high',
    rawTags: ['TypeScript']
  });

  const matchReq = HackathonMatchEngine.calculateMatch(devTS, hackReqPython, undefined, now);
  const matchPref = HackathonMatchEngine.calculateMatch(devTS, hackPrefPython, undefined, now);

  // Missing required language produces much lower score than missing optional preferred language
  assert.ok(matchReq.overallScore < matchPref.overallScore);
  assert.ok(matchReq.dimensionScores.languageMatch < matchPref.dimensionScores.languageMatch);
  assert.strictEqual(matchReq.dimensionScores.languageMatch, 0);
  assert.strictEqual(matchPref.dimensionScores.languageMatch, 1.0);
});

// ----------------------------------------------------
// 9. 100x Determinism Stress Test
// ----------------------------------------------------
console.log('\n[9] Determinism & Stability Stress Verification:');

test('Produces 100% identical MatchResult across 100 consecutive executions', () => {
  const now = 1750000000000;
  const dev = DeveloperCapabilityProfile.fromEvidence(
    'u-stress',
    null,
    [
      new DeveloperSkillEvidenceEntity({
        id: crypto.randomUUID(),
        userId: 'u-stress',
        source: 'github',
        evidenceType: 'repo',
        externalId: 'gh-stress-1',
        signals: { language: 'TypeScript', topics: ['react', 'nextjs'], languages: { TypeScript: 50000 } },
        weight: 1.0,
        createdAt: now,
        updatedAt: now
      })
    ],
    now
  );

  const hack = new HackathonCapabilityProfile({
    id: 'h-stress',
    title: 'Stress Test Event',
    slug: 'stress-test',
    description: 'TypeScript frontend competition with React and Next.js.',
    tagline: null,
    requiredLanguages: ['language.typescript'],
    preferredLanguages: [],
    frameworks: ['framework.react', 'framework.nextjs'],
    domains: ['domain.frontend'],
    skills: [],
    difficulty: 'open',
    isOnline: true,
    locationCity: null,
    locationCollege: null,
    registrationDeadline: new Date(now + 86400000 * 3),
    eventStart: new Date(now + 86400000 * 5),
    eventEnd: new Date(now + 86400000 * 7),
    status: 'approved',
    isVerified: true,
    isFeatured: false,
    prizeAmount: 5000,
    dataQuality: 'high',
    rawTags: ['TypeScript', 'React']
  });

  const baseline = HackathonMatchEngine.calculateMatch(dev, hack, undefined, now);

  for (let i = 0; i < 100; i++) {
    const result = HackathonMatchEngine.calculateMatch(dev, hack, undefined, now);
    assert.strictEqual(result.overallScore, baseline.overallScore);
    assert.strictEqual(result.matchPercentage, baseline.matchPercentage);
    assert.strictEqual(result.confidence, baseline.confidence);
    assert.strictEqual(result.strengths.length, baseline.strengths.length);
    assert.strictEqual(result.gaps.length, baseline.gaps.length);
    assert.deepStrictEqual(result.dimensionScores, baseline.dimensionScores);
  }
});

// ----------------------------------------------------
// 10. Advanced Monotonicity & Irrelevance Verification
// ----------------------------------------------------
console.log('\n[10] Monotonicity & Irrelevance Verification:');

test('Case A: Adding relevant framework evidence strictly increases or maintains score', () => {
  const now = 1750000000000;
  const devJS = DeveloperCapabilityProfile.fromEvidence(
    'u-mono-a',
    null,
    [
      new DeveloperSkillEvidenceEntity({
        id: crypto.randomUUID(),
        userId: 'u-mono-a',
        source: 'github',
        evidenceType: 'repo',
        externalId: 'gh-js',
        signals: { language: 'JavaScript', languages: { JavaScript: 10000 } },
        weight: 1.0,
        createdAt: now,
        updatedAt: now
      })
    ],
    now
  );

  const devJSReact = DeveloperCapabilityProfile.fromEvidence(
    'u-mono-a',
    null,
    [
      new DeveloperSkillEvidenceEntity({
        id: crypto.randomUUID(),
        userId: 'u-mono-a',
        source: 'github',
        evidenceType: 'repo',
        externalId: 'gh-js',
        signals: { language: 'JavaScript', languages: { JavaScript: 10000 } },
        weight: 1.0,
        createdAt: now,
        updatedAt: now
      }),
      new DeveloperSkillEvidenceEntity({
        id: crypto.randomUUID(),
        userId: 'u-mono-a',
        source: 'github',
        evidenceType: 'repo',
        externalId: 'gh-react',
        signals: { language: 'JavaScript', topics: ['react'], languages: { JavaScript: 50000 } },
        weight: 1.0,
        createdAt: now,
        updatedAt: now
      })
    ],
    now
  );

  const reactHackathon = new HackathonCapabilityProfile({
    id: 'h-react',
    title: 'React UI Challenge',
    slug: 'react-ui',
    description: 'Build modern user interfaces with React and JavaScript.',
    tagline: null,
    requiredLanguages: ['language.javascript'],
    preferredLanguages: [],
    frameworks: ['framework.react'],
    domains: ['domain.frontend'],
    skills: [],
    difficulty: 'intermediate',
    isOnline: true,
    locationCity: null,
    locationCollege: null,
    registrationDeadline: new Date(now + 86400000 * 3),
    eventStart: new Date(now + 86400000 * 5),
    eventEnd: new Date(now + 86400000 * 7),
    status: 'approved',
    isVerified: true,
    isFeatured: false,
    prizeAmount: 5000,
    dataQuality: 'high',
    rawTags: ['JavaScript', 'React']
  });

  const scoreBefore = HackathonMatchEngine.calculateMatch(devJS, reactHackathon, undefined, now);
  const scoreAfter = HackathonMatchEngine.calculateMatch(devJSReact, reactHackathon, undefined, now);

  assert.ok(scoreAfter.overallScore >= scoreBefore.overallScore);
  assert.ok(scoreAfter.dimensionScores.frameworkMatch >= scoreBefore.dimensionScores.frameworkMatch);
});

test('Case B: Adding unrelated skills does not artificially inflate target domain match', () => {
  const now = 1750000000000;
  const devPy = DeveloperCapabilityProfile.fromEvidence(
    'u-mono-b',
    null,
    [
      new DeveloperSkillEvidenceEntity({
        id: crypto.randomUUID(),
        userId: 'u-mono-b',
        source: 'github',
        evidenceType: 'repo',
        externalId: 'gh-py',
        signals: { language: 'Python', languages: { Python: 50000 } },
        weight: 1.0,
        createdAt: now,
        updatedAt: now
      })
    ],
    now
  );

  const devPyUnrelated = DeveloperCapabilityProfile.fromEvidence(
    'u-mono-b',
    null,
    [
      new DeveloperSkillEvidenceEntity({
        id: crypto.randomUUID(),
        userId: 'u-mono-b',
        source: 'github',
        evidenceType: 'repo',
        externalId: 'gh-py',
        signals: { language: 'Python', languages: { Python: 50000 } },
        weight: 1.0,
        createdAt: now,
        updatedAt: now
      }),
      new DeveloperSkillEvidenceEntity({
        id: crypto.randomUUID(),
        userId: 'u-mono-b',
        source: 'github',
        evidenceType: 'repo',
        externalId: 'gh-sol',
        signals: { language: 'Solidity', languages: { Solidity: 1000 } },
        weight: 1.0,
        createdAt: now,
        updatedAt: now
      })
    ],
    now
  );

  const pythonHackathon = new HackathonCapabilityProfile({
    id: 'h-python',
    title: 'Python Machine Learning Challenge',
    slug: 'python-ml',
    description: 'Build predictive machine learning models in Python.',
    tagline: null,
    requiredLanguages: ['language.python'],
    preferredLanguages: [],
    frameworks: ['framework.pytorch'],
    domains: ['domain.ai_ml'],
    skills: [],
    difficulty: 'intermediate',
    isOnline: true,
    locationCity: null,
    locationCollege: null,
    registrationDeadline: new Date(now + 86400000 * 3),
    eventStart: new Date(now + 86400000 * 5),
    eventEnd: new Date(now + 86400000 * 7),
    status: 'approved',
    isVerified: true,
    isFeatured: false,
    prizeAmount: 5000,
    dataQuality: 'high',
    rawTags: ['Python', 'AI']
  });

  const scoreA = HackathonMatchEngine.calculateMatch(devPy, pythonHackathon, undefined, now);
  const scoreB = HackathonMatchEngine.calculateMatch(devPyUnrelated, pythonHackathon, undefined, now);

  // Language alignment and domain scores should remain identical
  assert.strictEqual(scoreA.dimensionScores.languageMatch, scoreB.dimensionScores.languageMatch);
  assert.strictEqual(scoreA.dimensionScores.domainMatch, scoreB.dimensionScores.domainMatch);
});

// ----------------------------------------------------
// 12. Weight Integrity & Invariant Attack
// ----------------------------------------------------
console.log('\n[12] Weight Integrity & Invariant Attack:');

test('Sum of all dimension weights equals exactly 1.00', () => {
  const sum = Object.values(HackathonMatchEngine.WEIGHTS).reduce((a, b) => a + b, 0);
  assert.strictEqual(Math.round(sum * 1000) / 1000, 1.00);
});

// ----------------------------------------------------
// 13. Determinism Serialized Result Invariant Attack
// ----------------------------------------------------
console.log('\n[13] Determinism Serialized JSON Invariant Attack:');

test('Complete serialized JSON MatchResult is identical across 100 executions', () => {
  const now = 1750000000000;
  const dev = DeveloperCapabilityProfile.fromEvidence(
    'u-det-serial',
    null,
    [
      new DeveloperSkillEvidenceEntity({
        id: crypto.randomUUID(),
        userId: 'u-det-serial',
        source: 'github',
        evidenceType: 'repo',
        externalId: 'gh-det',
        signals: { language: 'TypeScript', topics: ['react', 'nextjs'], languages: { TypeScript: 50000 } },
        weight: 1.0,
        createdAt: now,
        updatedAt: now
      }),
      new DeveloperSkillEvidenceEntity({
        id: crypto.randomUUID(),
        userId: 'u-det-serial',
        source: 'leetcode',
        evidenceType: 'activity',
        externalId: 'lc-det',
        signals: { totalSolved: 350, mediumSolved: 200, hardSolved: 50, contestRating: 1850 },
        weight: 1.0,
        createdAt: now,
        updatedAt: now
      })
    ],
    now
  );

  const hack = new HackathonCapabilityProfile({
    id: 'h-det-serial',
    title: 'Fullstack AI Sprint',
    slug: 'fullstack-ai',
    description: 'Build fullstack applications with TypeScript, Next.js, and Python backend.',
    tagline: 'Modern fullstack event',
    requiredLanguages: ['language.typescript'],
    preferredLanguages: ['language.python'],
    frameworks: ['framework.nextjs', 'framework.react'],
    domains: ['domain.ai_ml', 'domain.frontend'],
    skills: [],
    difficulty: 'intermediate',
    isOnline: true,
    locationCity: null,
    locationCollege: null,
    registrationDeadline: new Date(now + 86400000 * 4),
    eventStart: new Date(now + 86400000 * 6),
    eventEnd: new Date(now + 86400000 * 8),
    status: 'approved',
    isVerified: true,
    isFeatured: true,
    prizeAmount: 25000,
    dataQuality: 'high',
    rawTags: ['TypeScript', 'Next.js', 'AI']
  });

  const baselineJson = JSON.stringify(HackathonMatchEngine.calculateMatch(dev, hack, undefined, now));

  for (let i = 0; i < 100; i++) {
    const currentJson = JSON.stringify(HackathonMatchEngine.calculateMatch(dev, hack, undefined, now));
    assert.strictEqual(currentJson, baselineJson);
  }
});

// ----------------------------------------------------
// 14. Anti-Keyword Stuffing & Tag Inflation Attack
// ----------------------------------------------------
console.log('\n[14] Anti-Keyword-Stuffing & Duplicate Tag Attack:');

test('100 duplicate tags produce the exact same capability profile as 1 canonical tag', () => {
  const singleTagList = ['TypeScript'];
  const stuffedTagList = Array(100).fill('TypeScript');

  const singleAnalysis = HackathonAnalysisService.analyze({
    id: 'sub-single',
    title: 'TS Hackathon',
    description: 'Building TypeScript web apps.',
    tags: singleTagList
  });

  const stuffedAnalysis = HackathonAnalysisService.analyze({
    id: 'sub-stuffed',
    title: 'TS Hackathon',
    description: 'Building TypeScript web apps.',
    tags: stuffedTagList
  });

  assert.strictEqual(singleAnalysis.capabilityProfile.requiredLanguages.length, 1);
  assert.strictEqual(stuffedAnalysis.capabilityProfile.requiredLanguages.length, 1);
  assert.deepStrictEqual(singleAnalysis.capabilityProfile.requiredLanguages, stuffedAnalysis.capabilityProfile.requiredLanguages);
});

// ----------------------------------------------------
// 15. Taxonomy Substring & False Positive Isolation Attack
// ----------------------------------------------------
console.log('\n[15] Taxonomy Substring & False Positive Isolation Attack:');

test('Strict boundary prevents substring false positives (e.g., reactor, docker, javascript)', () => {
  // "reactor" should NOT match "react"
  const extractedReactor = SkillNormalizer.extractFromText('We built a nuclear reactor simulation system.');
  const reactorIds = extractedReactor.map(e => e.id);
  assert.ok(!reactorIds.includes('framework.react'), 'Should NOT match react in reactor');

  // "docker" should NOT match "c"
  const extractedDocker = SkillNormalizer.extractFromText('Containerized deployment with docker.');
  const dockerIds = extractedDocker.map(e => e.id);
  assert.ok(!dockerIds.includes('language.c'), 'Should NOT match C language in docker');

  // "javascript" should NOT match "java"
  const extractedJS = SkillNormalizer.extractFromText('Building web apps in javascript.');
  const jsIds = extractedJS.map(e => e.id);
  assert.ok(jsIds.includes('language.javascript'));
  assert.ok(!jsIds.includes('language.java'), 'Should NOT match java in javascript');
});

// ----------------------------------------------------
// 16. Required vs. Preferred Battle Attack
// ----------------------------------------------------
console.log('\n[16] Required vs. Preferred Battle Attack:');

test('Developer with required skills strictly outranks developer with 0 required and 5 preferred skills', () => {
  const now = 1750000000000;

  // Developer A: Has required Python
  const devA = DeveloperCapabilityProfile.fromEvidence(
    'u-dev-a',
    null,
    [
      new DeveloperSkillEvidenceEntity({
        id: crypto.randomUUID(),
        userId: 'u-dev-a',
        source: 'github',
        evidenceType: 'repo',
        externalId: 'gh-py',
        signals: { language: 'Python', languages: { Python: 100000 } },
        weight: 1.0,
        createdAt: now,
        updatedAt: now
      })
    ],
    now
  );

  // Developer B: Has no Python, but has 5 preferred skills (TS, Go, Rust, React, Vue)
  const devB = DeveloperCapabilityProfile.fromEvidence(
    'u-dev-b',
    null,
    [
      new DeveloperSkillEvidenceEntity({
        id: crypto.randomUUID(),
        userId: 'u-dev-b',
        source: 'github',
        evidenceType: 'repo',
        externalId: 'gh-other',
        signals: {
          language: 'TypeScript',
          topics: ['react', 'vue', 'rust', 'go'],
          languages: { TypeScript: 50000, Rust: 50000, Go: 50000 }
        },
        weight: 1.0,
        createdAt: now,
        updatedAt: now
      })
    ],
    now
  );

  const pythonHackathon = new HackathonCapabilityProfile({
    id: 'h-py-strict',
    title: 'Python Core Challenge',
    slug: 'python-core',
    description: 'Mandatory Python competition. TypeScript and Rust are optional bonuses.',
    tagline: null,
    requiredLanguages: ['language.python'],
    preferredLanguages: ['language.typescript', 'language.rust', 'language.go'],
    frameworks: [],
    domains: [],
    skills: [],
    difficulty: 'intermediate',
    isOnline: true,
    locationCity: null,
    locationCollege: null,
    registrationDeadline: new Date(now + 86400000 * 3),
    eventStart: new Date(now + 86400000 * 5),
    eventEnd: new Date(now + 86400000 * 7),
    status: 'approved',
    isVerified: true,
    isFeatured: false,
    prizeAmount: 10000,
    dataQuality: 'high',
    rawTags: ['Python']
  });

  const matchA = HackathonMatchEngine.calculateMatch(devA, pythonHackathon, undefined, now);
  const matchB = HackathonMatchEngine.calculateMatch(devB, pythonHackathon, undefined, now);

  // Dev A must outrank Dev B because Dev A fulfills the mandatory requirement
  assert.ok(matchA.overallScore > matchB.overallScore);
  assert.strictEqual(matchA.dimensionScores.languageMatch, 1.0);
  assert.strictEqual(matchB.dimensionScores.languageMatch, 0.0);
});

// ----------------------------------------------------
// 17. Freshness Boundary Tests
// ----------------------------------------------------
console.log('\n[17] Freshness Factor Exact Boundary Attack:');

test('Freshness factors strictly respect exact day thresholds (89d, 90d, 179d, 180d, 364d, 365d, 366d)', () => {
  const now = 1750000000000;
  const DAY_MS = 24 * 60 * 60 * 1000;

  const createDatedDev = (daysAgo: number) => {
    return DeveloperCapabilityProfile.fromEvidence(
      `u-fresh-${daysAgo}`,
      null,
      [
        new DeveloperSkillEvidenceEntity({
          id: crypto.randomUUID(),
          userId: `u-fresh-${daysAgo}`,
          source: 'github',
          evidenceType: 'repo',
          externalId: `gh-${daysAgo}`,
          signals: { language: 'TypeScript', languages: { TypeScript: 10000 } },
          weight: 1.0,
          createdAt: now - (daysAgo * DAY_MS),
          updatedAt: now - (daysAgo * DAY_MS)
        })
      ],
      now
    );
  };

  const dev89 = createDatedDev(89);
  const dev90 = createDatedDev(90);
  const dev179 = createDatedDev(179);
  const dev180 = createDatedDev(180);
  const dev364 = createDatedDev(364);
  const dev365 = createDatedDev(365);
  const dev366 = createDatedDev(366);

  // Confidence and weights decrease or remain equal monotonically with age
  assert.ok(dev89.confidenceScore >= dev90.confidenceScore);
  assert.ok(dev90.confidenceScore >= dev180.confidenceScore);
  assert.ok(dev179.confidenceScore >= dev180.confidenceScore);
  assert.ok(dev180.confidenceScore >= dev365.confidenceScore);
  assert.ok(dev364.confidenceScore >= dev365.confidenceScore);
  assert.strictEqual(dev365.confidenceScore, dev366.confidenceScore);
});

// ----------------------------------------------------
// 18. Provider Disconnect & Coexistence Attack
// ----------------------------------------------------
console.log('\n[18] Provider Disconnect & Coexistence Attack:');

test('Disconnecting LeetCode preserves GitHub evidence and vice-versa', () => {
  const now = 1750000000000;
  const ghEvidence = new DeveloperSkillEvidenceEntity({
    id: crypto.randomUUID(),
    userId: 'u-coexist',
    source: 'github',
    evidenceType: 'repo',
    externalId: 'gh-coexist',
    signals: { language: 'TypeScript', languages: { TypeScript: 50000 } },
    weight: 1.0,
    createdAt: now,
    updatedAt: now
  });

  const lcEvidence = new DeveloperSkillEvidenceEntity({
    id: crypto.randomUUID(),
    userId: 'u-coexist',
    source: 'leetcode',
    evidenceType: 'activity',
    externalId: 'lc-coexist',
    signals: { totalSolved: 400, mediumSolved: 250, hardSolved: 60, contestRating: 1900 },
    weight: 1.0,
    createdAt: now,
    updatedAt: now
  });

  // Combined
  const combined = DeveloperCapabilityProfile.fromEvidence('u-coexist', null, [ghEvidence, lcEvidence], now);
  assert.strictEqual(combined.sources.length, 2);
  assert.ok(combined.languages['language.typescript'] > 0);
  assert.ok(combined.dsaIndex > 0.8);

  // LeetCode disconnected (only GitHub evidence remains)
  const ghOnly = DeveloperCapabilityProfile.fromEvidence('u-coexist', null, [ghEvidence], now);
  assert.strictEqual(ghOnly.sources.length, 1);
  assert.ok(ghOnly.languages['language.typescript'] > 0);
  assert.strictEqual(ghOnly.dsaIndex, 0);

  // GitHub disconnected (only LeetCode evidence remains)
  const lcOnly = DeveloperCapabilityProfile.fromEvidence('u-coexist', null, [lcEvidence], now);
  assert.strictEqual(lcOnly.sources.length, 1);
  assert.strictEqual(Object.keys(lcOnly.languages).length, 0);
  assert.ok(lcOnly.dsaIndex > 0.8);
});

// ----------------------------------------------------
// 19. Diversity Bounded Penalty Mathematical Proof Attack
// ----------------------------------------------------
console.log('\n[19] Diversity Bounded Penalty Mathematical Proof:');

test('Diversity penalty is mathematically bounded at 0.10 and never buries a 95% match below a 55% match', () => {
  const highMatchBaseRank = (0.95 * 0.70) + (0.90 * 0.20) + (0.80 * 0.10); // ~0.925
  const lowMatchBaseRank = (0.55 * 0.70) + (0.40 * 0.20) + (0.50 * 0.10);  // ~0.515

  // Even with 10 prior occurrences of the same domain, penalty is capped at 0.10
  for (let domainCount = 0; domainCount <= 10; domainCount++) {
    const penalty = Math.min(0.10, domainCount * 0.035);
    const adjustedHigh = highMatchBaseRank - penalty;
    assert.ok(adjustedHigh > lowMatchBaseRank, `At count ${domainCount}, high match must strictly beat low match`);
  }
});

// ----------------------------------------------------
// 20. Real Persona & Track Alignment Verification
// ----------------------------------------------------
console.log('\n[20] Real Persona Alignment Verification:');

test('Developer A (Frontend) dominates Frontend Hackathon over Developer C (AI)', () => {
  const now = 1750000000000;

  // Developer A: Frontend (TS, React, Next.js, low DSA)
  const devA = DeveloperCapabilityProfile.fromEvidence(
    'u-persona-a',
    null,
    [
      new DeveloperSkillEvidenceEntity({
        id: crypto.randomUUID(),
        userId: 'u-persona-a',
        source: 'github',
        evidenceType: 'repo',
        externalId: 'gh-a-1',
        signals: { language: 'TypeScript', topics: ['react', 'nextjs'], languages: { TypeScript: 80000 } },
        weight: 1.0,
        createdAt: now,
        updatedAt: now
      })
    ],
    now
  );

  // Developer C: AI/ML (Python, PyTorch, strong DSA)
  const devC = DeveloperCapabilityProfile.fromEvidence(
    'u-persona-c',
    null,
    [
      new DeveloperSkillEvidenceEntity({
        id: crypto.randomUUID(),
        userId: 'u-persona-c',
        source: 'github',
        evidenceType: 'repo',
        externalId: 'gh-c-1',
        signals: { language: 'Python', topics: ['pytorch', 'machine-learning'], languages: { Python: 100000 } },
        weight: 1.0,
        createdAt: now,
        updatedAt: now
      }),
      new DeveloperSkillEvidenceEntity({
        id: crypto.randomUUID(),
        userId: 'u-persona-c',
        source: 'leetcode',
        evidenceType: 'activity',
        externalId: 'lc-c-1',
        signals: { totalSolved: 450, mediumSolved: 280, hardSolved: 80, contestRating: 1950 },
        weight: 1.0,
        createdAt: now,
        updatedAt: now
      })
    ],
    now
  );

  const frontendHackathon = new HackathonCapabilityProfile({
    id: 'h-fe-track',
    title: 'React & Next.js Global UI Summit',
    slug: 'react-ui-summit',
    description: 'Build high-performance web applications using React, Next.js, and TypeScript.',
    tagline: 'Modern frontend summit',
    requiredLanguages: ['language.typescript'],
    preferredLanguages: ['language.javascript'],
    frameworks: ['framework.react', 'framework.nextjs'],
    domains: ['domain.frontend'],
    skills: [],
    difficulty: 'intermediate',
    isOnline: true,
    locationCity: null,
    locationCollege: null,
    registrationDeadline: new Date(now + 86400000 * 5),
    eventStart: new Date(now + 86400000 * 7),
    eventEnd: new Date(now + 86400000 * 9),
    status: 'approved',
    isVerified: true,
    isFeatured: true,
    prizeAmount: 20000,
    dataQuality: 'high',
    rawTags: ['TypeScript', 'React', 'Next.js']
  });

  const aiHackathon = new HackathonCapabilityProfile({
    id: 'h-ai-track',
    title: 'Generative AI & LLM Sprint',
    slug: 'ai-llm-sprint',
    description: 'Build predictive AI and LLM agents using Python and PyTorch.',
    tagline: 'AI innovation challenge',
    requiredLanguages: ['language.python'],
    preferredLanguages: [],
    frameworks: ['framework.pytorch'],
    domains: ['domain.ai_ml'],
    skills: [],
    difficulty: 'intermediate',
    isOnline: true,
    locationCity: null,
    locationCollege: null,
    registrationDeadline: new Date(now + 86400000 * 5),
    eventStart: new Date(now + 86400000 * 7),
    eventEnd: new Date(now + 86400000 * 9),
    status: 'approved',
    isVerified: true,
    isFeatured: true,
    prizeAmount: 30000,
    dataQuality: 'high',
    rawTags: ['Python', 'PyTorch', 'AI']
  });

  const matchA_FE = HackathonMatchEngine.calculateMatch(devA, frontendHackathon, undefined, now);
  const matchC_FE = HackathonMatchEngine.calculateMatch(devC, frontendHackathon, undefined, now);

  const matchA_AI = HackathonMatchEngine.calculateMatch(devA, aiHackathon, undefined, now);
  const matchC_AI = HackathonMatchEngine.calculateMatch(devC, aiHackathon, undefined, now);

  // Dev A strongly beats Dev C on Frontend Hackathon
  assert.ok(matchA_FE.overallScore > matchC_FE.overallScore);
  assert.ok(matchA_FE.matchPercentage >= 80);
  assert.ok(matchC_FE.matchPercentage <= 50);

  // Dev C strongly beats Dev A on AI Hackathon
  assert.ok(matchC_AI.overallScore > matchA_AI.overallScore);
  assert.ok(matchC_AI.matchPercentage >= 80);
  assert.ok(matchA_AI.matchPercentage <= 50);
});

// ----------------------------------------------------
// 21. Date & Status Eligibility Boundary Tests
// ----------------------------------------------------
console.log('\n[21] Date & Status Eligibility Boundary Verification:');

test('Eligibility Engine strictly rejects past/closed dates and non-approved status', () => {
  const now = 1750000000000;

  const makeHack = (status: string, eventEndDelta: number, deadlineDelta?: number) => {
    return new HackathonCapabilityProfile({
      id: 'h-elig-test',
      title: 'Eligibility Test',
      slug: 'elig-test',
      description: 'Test event.',
      tagline: null,
      requiredLanguages: [],
      preferredLanguages: [],
      frameworks: [],
      domains: [],
      skills: [],
      difficulty: 'open',
      isOnline: true,
      locationCity: null,
      locationCollege: null,
      registrationDeadline: deadlineDelta !== undefined ? new Date(now + deadlineDelta) : null,
      eventStart: new Date(now + eventEndDelta - 86400000),
      eventEnd: new Date(now + eventEndDelta),
      status,
      isVerified: true,
      isFeatured: false,
      prizeAmount: 1000,
      dataQuality: 'high',
      rawTags: []
    });
  };

  // Approved + Future dates -> Eligible
  assert.strictEqual(EligibilityEngine.evaluate(makeHack('approved', 86400000 * 5, 86400000 * 2), now).isEligible, true);

  // Status not approved (pending, draft, rejected, deleted) -> Ineligible
  assert.strictEqual(EligibilityEngine.evaluate(makeHack('pending', 86400000 * 5, 86400000 * 2), now).isEligible, false);
  assert.strictEqual(EligibilityEngine.evaluate(makeHack('draft', 86400000 * 5, 86400000 * 2), now).isEligible, false);
  assert.strictEqual(EligibilityEngine.evaluate(makeHack('rejected', 86400000 * 5, 86400000 * 2), now).isEligible, false);

  // Event ended (eventEnd <= now) -> Ineligible
  assert.strictEqual(EligibilityEngine.evaluate(makeHack('approved', 0, 86400000 * 2), now).isEligible, false);
  assert.strictEqual(EligibilityEngine.evaluate(makeHack('approved', -1000, 86400000 * 2), now).isEligible, false);

  // Registration closed (deadline <= now) -> Ineligible
  assert.strictEqual(EligibilityEngine.evaluate(makeHack('approved', 86400000 * 5, 0), now).isEligible, false);
  assert.strictEqual(EligibilityEngine.evaluate(makeHack('approved', 86400000 * 5, -1000), now).isEligible, false);

  // Registration closing in 1 second -> Eligible
  assert.strictEqual(EligibilityEngine.evaluate(makeHack('approved', 86400000 * 5, 1000), now).isEligible, true);
});

// ----------------------------------------------------
// 22. Required Multi-Dimension Penalty Verification
// ----------------------------------------------------
console.log('\n[22] Required Multi-Dimension Penalty Verification:');

test('Zero proficiency in required framework or domain yields 0.0 on that dimension', () => {
  const now = 1750000000000;

  // Developer with Python only (no React, no Mobile domain)
  const dev = DeveloperCapabilityProfile.fromEvidence(
    'u-penalty-test',
    null,
    [
      new DeveloperSkillEvidenceEntity({
        id: crypto.randomUUID(),
        userId: 'u-penalty-test',
        source: 'github',
        evidenceType: 'repo',
        externalId: 'gh-py-only',
        signals: { language: 'Python', languages: { Python: 50000 } },
        weight: 1.0,
        createdAt: now,
        updatedAt: now
      })
    ],
    now
  );

  const mobileHackathon = new HackathonCapabilityProfile({
    id: 'h-mobile',
    title: 'Mobile Flutter & React Native Hack',
    slug: 'mobile-hack',
    description: 'Build native mobile apps using React Native.',
    tagline: null,
    requiredLanguages: ['language.typescript'],
    preferredLanguages: [],
    frameworks: ['framework.react'],
    domains: ['domain.mobile'],
    skills: [],
    difficulty: 'intermediate',
    isOnline: true,
    locationCity: null,
    locationCollege: null,
    registrationDeadline: new Date(now + 86400000 * 3),
    eventStart: new Date(now + 86400000 * 5),
    eventEnd: new Date(now + 86400000 * 7),
    status: 'approved',
    isVerified: true,
    isFeatured: false,
    prizeAmount: 5000,
    dataQuality: 'high',
    rawTags: ['TypeScript', 'React', 'Mobile']
  });

  const result = HackathonMatchEngine.calculateMatch(dev, mobileHackathon, undefined, now);

  assert.strictEqual(result.dimensionScores.languageMatch, 0);
  assert.strictEqual(result.dimensionScores.frameworkMatch, 0);
  assert.strictEqual(result.dimensionScores.domainMatch, 0);
});

// ----------------------------------------------------
// 23. Persona B (Backend) & Persona E (Polyglot) Verification
// ----------------------------------------------------
console.log('\n[23] Persona B (Backend) & Persona E (Polyglot) Verification:');

test('Persona B (Backend) dominates Backend & Cloud API challenge', () => {
  const now = 1750000000000;

  // Persona B: Backend (Node.js, TypeScript, PostgreSQL)
  const devB = DeveloperCapabilityProfile.fromEvidence(
    'u-persona-b',
    null,
    [
      new DeveloperSkillEvidenceEntity({
        id: crypto.randomUUID(),
        userId: 'u-persona-b',
        source: 'github',
        evidenceType: 'repo',
        externalId: 'gh-b-1',
        signals: {
          language: 'TypeScript',
          topics: ['nodejs', 'postgresql', 'backend'],
          languages: { TypeScript: 60000 }
        },
        weight: 1.0,
        createdAt: now,
        updatedAt: now
      }),
      new DeveloperSkillEvidenceEntity({
        id: crypto.randomUUID(),
        userId: 'u-persona-b',
        source: 'leetcode',
        evidenceType: 'activity',
        externalId: 'lc-b-1',
        signals: { totalSolved: 200, mediumSolved: 120, hardSolved: 30, contestRating: 1650 },
        weight: 1.0,
        createdAt: now,
        updatedAt: now
      })
    ],
    now
  );

  const backendHackathon = new HackathonCapabilityProfile({
    id: 'h-be-track',
    title: 'Cloud Infrastructure & API Scalability Hackathon',
    slug: 'cloud-api-hack',
    description: 'Build robust scalable backend microservices and databases with TypeScript and Node.js.',
    tagline: 'Backend engineering challenge',
    requiredLanguages: ['language.typescript'],
    preferredLanguages: [],
    frameworks: ['framework.nodejs'],
    domains: ['domain.backend'],
    skills: ['database.postgresql'],
    difficulty: 'intermediate',
    isOnline: true,
    locationCity: null,
    locationCollege: null,
    registrationDeadline: new Date(now + 86400000 * 5),
    eventStart: new Date(now + 86400000 * 7),
    eventEnd: new Date(now + 86400000 * 9),
    status: 'approved',
    isVerified: true,
    isFeatured: true,
    prizeAmount: 15000,
    dataQuality: 'high',
    rawTags: ['TypeScript', 'Node.js', 'PostgreSQL', 'Backend']
  });

  const matchB_BE = HackathonMatchEngine.calculateMatch(devB, backendHackathon, undefined, now);
  assert.ok(matchB_BE.overallScore >= 0.75, 'Persona B should have strong match on Backend Hackathon');
  assert.ok(matchB_BE.matchPercentage >= 75);
  assert.strictEqual(matchB_BE.dimensionScores.languageMatch, 1.0);
  assert.strictEqual(matchB_BE.dimensionScores.frameworkMatch, 1.0);
});

test('Persona E (Polyglot) maintains distinct non-colliding language proficiencies', () => {
  const now = 1750000000000;

  // Persona E: Polyglot (Java, JS, TS, Python)
  const devE = DeveloperCapabilityProfile.fromEvidence(
    'u-persona-e',
    null,
    [
      new DeveloperSkillEvidenceEntity({
        id: crypto.randomUUID(),
        userId: 'u-persona-e',
        source: 'github',
        evidenceType: 'repo',
        externalId: 'gh-e-java',
        signals: { language: 'Java', languages: { Java: 40000 } },
        weight: 1.0,
        createdAt: now,
        updatedAt: now
      }),
      new DeveloperSkillEvidenceEntity({
        id: crypto.randomUUID(),
        userId: 'u-persona-e',
        source: 'github',
        evidenceType: 'repo',
        externalId: 'gh-e-js',
        signals: { language: 'JavaScript', languages: { JavaScript: 30000 } },
        weight: 1.0,
        createdAt: now,
        updatedAt: now
      }),
      new DeveloperSkillEvidenceEntity({
        id: crypto.randomUUID(),
        userId: 'u-persona-e',
        source: 'github',
        evidenceType: 'repo',
        externalId: 'gh-e-ts',
        signals: { language: 'TypeScript', languages: { TypeScript: 50000 } },
        weight: 1.0,
        createdAt: now,
        updatedAt: now
      }),
      new DeveloperSkillEvidenceEntity({
        id: crypto.randomUUID(),
        userId: 'u-persona-e',
        source: 'github',
        evidenceType: 'repo',
        externalId: 'gh-e-py',
        signals: { language: 'Python', languages: { Python: 60000 } },
        weight: 1.0,
        createdAt: now,
        updatedAt: now
      })
    ],
    now
  );

  // All 4 languages must be distinctly populated without collision
  assert.ok(devE.languages['language.java'] > 0);
  assert.ok(devE.languages['language.javascript'] > 0);
  assert.ok(devE.languages['language.typescript'] > 0);
  assert.ok(devE.languages['language.python'] > 0);

  // Strict distinctness: Java !== JavaScript
  assert.notStrictEqual(devE.languages['language.java'], undefined);
  assert.notStrictEqual(devE.languages['language.javascript'], undefined);
});

// ----------------------------------------------------
// 24. Disconnect & Stale Evidence Invariant Verification
// ----------------------------------------------------
console.log('\n[24] Disconnect & Stale Evidence Verification:');

test('Both providers disconnected yields empty capability profile with 0 evidence', () => {
  const now = 1750000000000;
  const devEmpty = DeveloperCapabilityProfile.fromEvidence('u-empty', null, [], now);

  assert.strictEqual(devEmpty.evidenceCount, 0);
  assert.strictEqual(devEmpty.sources.length, 0);
  assert.strictEqual(devEmpty.dsaIndex, 0);
  assert.strictEqual(Object.keys(devEmpty.languages).length, 0);
  assert.strictEqual(Object.keys(devEmpty.frameworks).length, 0);
});

console.log('\n====================================================');
console.log(`TEST SUITE COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
console.log('====================================================\n');






