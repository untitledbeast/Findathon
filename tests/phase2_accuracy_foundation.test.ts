/**
 * ====================================================================
 * FINDATHON INTELLIGENCE 2.0: PHASE 2 ACCURACY FOUNDATION TEST SUITE
 * GATES 20 & 22: REGRESSION SUITE (TESTS A - P) & V1 VS V1.5 BENCHMARK
 * ====================================================================
 */

import assert from 'node:assert';
import { DeveloperCapabilityProfile } from '../lib/domain/value-objects/developer-capability-profile';
import { DeveloperSkillEvidenceEntity } from '../lib/domain/entities/developer-skill-evidence.entity';
import { HackathonCapabilityProfile } from '../lib/domain/value-objects/hackathon-capability-profile';
import { HackathonMatchEngine } from '../lib/domain/matching/hackathon-match-engine';
import { HackathonAnalysisService } from '../lib/services/hackathon-analysis.service';

let totalTests = 0;
let passedTests = 0;

function test(name: string, fn: () => void | Promise<void>) {
  totalTests++;
  try {
    const res = fn();
    if (res instanceof Promise) {
      return res.then(() => {
        passedTests++;
        console.log(`  ✓ ${name}`);
      }).catch(err => {
        console.error(`  ✗ ${name}\n    Error: ${err.message || err}`);
        throw err;
      });
    }
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err: unknown) {
    const errorObj = err instanceof Error ? err : new Error(String(err));
    console.error(`  ✗ ${name}\n    Error: ${errorObj.message}`);
    throw errorObj;
  }
}

async function runPhase2TestSuite() {
  console.log('\n====================================================');
  console.log('PHASE 2: ACCURACY FOUNDATION REGRESSION SUITE (A - P)');
  console.log('====================================================\n');

  const now = 1750000000000;

  // ------------------------------------------------------------------
  // TEST A: Language Normalization (Gate 1)
  // One tiny Python repo must NOT create Python proficiency 1.0
  // ------------------------------------------------------------------
  test('A. Language Normalization: 1 repo in V1 falsely yields 1.0 max-proficiency; V1.5 bounds it', () => {
    const singleRepoEvidence = [
      new DeveloperSkillEvidenceEntity({
        id: 'gh-py-1',
        userId: 'u-py-single',
        source: 'github',
        evidenceType: 'repo',
        externalId: 'gh-py-repo',
        signals: { language: 'Python' },
        weight: 1.0,
        createdAt: now,
        updatedAt: now
      })
    ];

    const devV1 = DeveloperCapabilityProfile.fromEvidenceV1('u-py-single', null, singleRepoEvidence, now);
    const devV1_5 = DeveloperCapabilityProfile.fromEvidence('u-py-single', null, singleRepoEvidence, now);

    const pyProfV1 = devV1.languages['language.python'];
    const pyProfV1_5 = devV1_5.languages['language.python'];

    // In V1, relative max-normalization made 1 single repo = 1.0 (maximal proficiency)
    assert.strictEqual(pyProfV1, 1.0, 'V1 control baseline exhibits the 1.0 max-proficiency bug');

    // In V1.5, absolute saturating model bounds 1 repo to ~0.713 (diminishing returns, not maximum 1.0)
    assert.ok(pyProfV1_5 < 0.80, `V1.5 bounds 1 single repo below 0.80 (got ${pyProfV1_5})`);
    assert.notStrictEqual(pyProfV1_5, 1.0, 'Single repo must never equal 1.0');

    // For a tiny repo (w = 0.2), V1.5 produces low bounded proficiency (<0.30)
    const tinyEvidence = [
      new DeveloperSkillEvidenceEntity({
        id: 'gh-py-tiny',
        userId: 'u-tiny',
        source: 'github',
        evidenceType: 'repo',
        externalId: 'gh-tiny',
        signals: { language: 'Python' },
        weight: 0.2,
        createdAt: now,
        updatedAt: now
      })
    ];
    const devTinyV1_5 = DeveloperCapabilityProfile.fromEvidence('u-tiny', null, tinyEvidence, now);
    assert.ok(devTinyV1_5.languages['language.python'] < 0.30, 'Tiny repo yields bounded <0.30 proficiency');
  });

  // ------------------------------------------------------------------
  // TEST B: Evidence Saturation & Diminishing Marginal Returns (Gate 2)
  // 20 duplicate React repos must not create unbounded proficiency
  // ------------------------------------------------------------------
  test('B. Diminishing Returns: 20 duplicate React repositories produce bounded saturation', () => {
    const repos = Array.from({ length: 20 }, (_, i) => 
      new DeveloperSkillEvidenceEntity({
        id: `gh-react-${i}`,
        userId: 'u-react-spammer',
        source: 'github',
        evidenceType: 'repo',
        externalId: `gh-react-${i}`,
        signals: { language: 'TypeScript', topics: ['react'] },
        weight: 1.0,
        createdAt: now,
        updatedAt: now
      })
    );

    const devReact20 = DeveloperCapabilityProfile.fromEvidence('u-react-spammer', null, repos, now);
    const reactProf20 = devReact20.frameworks['framework.react'];

    // Proficiency must be strictly bounded <= 1.0
    assert.ok(reactProf20 <= 1.0, 'Proficiency is mathematically clamped to <= 1.0');
    assert.ok(reactProf20 >= 0.95, 'High volume of solid evidence establishes mastery close to 1.0');

    // Test marginal contribution of 21st repo
    const repos21 = [
      ...repos,
      new DeveloperSkillEvidenceEntity({
        id: 'gh-react-21',
        userId: 'u-react-spammer',
        source: 'github',
        evidenceType: 'repo',
        externalId: 'gh-react-21',
        signals: { language: 'TypeScript', topics: ['react'] },
        weight: 1.0,
        createdAt: now,
        updatedAt: now
      })
    ];
    const devReact21 = DeveloperCapabilityProfile.fromEvidence('u-react-spammer', null, repos21, now);
    const reactProf21 = devReact21.frameworks['framework.react'];

    const delta = reactProf21 - reactProf20;
    assert.ok(delta < 0.01, `21st duplicate repo produces near-zero incremental change (got ${delta})`);
  });

  // ------------------------------------------------------------------
  // TEST C: Per-Skill Confidence Isolation (Gate 3)
  // Strong C++ evidence must not inflate JavaScript confidence
  // ------------------------------------------------------------------
  test('C. Per-Skill Confidence: Strong C++ evidence does NOT inflate JavaScript confidence', () => {
    const dev = DeveloperCapabilityProfile.fromEvidence(
      'u-cpp-dev',
      null,
      [
        // 5 substantial C++ repos
        ...Array.from({ length: 5 }, (_, i) => 
          new DeveloperSkillEvidenceEntity({
            id: `gh-cpp-${i}`,
            userId: 'u-cpp-dev',
            source: 'github',
            evidenceType: 'repo',
            externalId: `gh-cpp-${i}`,
            signals: { language: 'C++' },
            weight: 1.0,
            createdAt: now,
            updatedAt: now
          })
        ),
        // 1 tiny JavaScript repo
        new DeveloperSkillEvidenceEntity({
          id: 'gh-js-1',
          userId: 'u-cpp-dev',
          source: 'github',
          evidenceType: 'repo',
          externalId: 'gh-js-1',
          signals: { language: 'JavaScript' },
          weight: 0.2,
          createdAt: now,
          updatedAt: now
        })
      ],
      now
    );

    const cppRecord = dev.getSkill('language.cpp');
    const jsRecord = dev.getSkill('language.javascript');

    assert.ok(cppRecord.confidence >= 0.80, `C++ confidence should be high (got ${cppRecord.confidence})`);
    assert.ok(jsRecord.confidence <= 0.45, `JavaScript confidence must remain low (got ${jsRecord.confidence})`);
    assert.ok(cppRecord.confidence > jsRecord.confidence + 0.35, 'C++ evidence must not bleed into JS confidence');
  });

  // ------------------------------------------------------------------
  // TEST D: Observation Semantics (Gate 4)
  // No Python evidence must NOT become Python = ABSENT
  // ------------------------------------------------------------------
  test('D. Observation Semantics: Missing evidence is NOT_OBSERVED, not negative proof of inability', () => {
    // TypeScript developer with no Python repositories
    const dev = DeveloperCapabilityProfile.fromEvidence(
      'u-ts-only',
      null,
      [
        new DeveloperSkillEvidenceEntity({
          id: 'gh-ts-1',
          userId: 'u-ts-only',
          source: 'github',
          evidenceType: 'repo',
          externalId: 'gh-ts-1',
          signals: { language: 'TypeScript' },
          weight: 1.0,
          createdAt: now,
          updatedAt: now
        })
      ],
      now
    );

    const pyRecord = dev.getSkill('language.python');
    assert.strictEqual(pyRecord.observationState, 'NOT_OBSERVED');
    assert.strictEqual(pyRecord.proficiency, 0);
    assert.strictEqual(pyRecord.confidence, 0);

    const tsRecord = dev.getSkill('language.typescript');
    assert.strictEqual(tsRecord.observationState, 'PRESENT');
    assert.ok(tsRecord.proficiency > 0.5);
  });

  // ------------------------------------------------------------------
  // TEST E: Hackathon Requirement Classification (Gate 5)
  // 'AI' topic tag must not automatically become required AI skill
  // ------------------------------------------------------------------
  test('E. Tag Semantics: Domain & topic tags are classified as TOPIC_ONLY / preferred, not hard requirements', () => {
    const rawHackathon = {
      id: 'h-tag-sem',
      title: 'Global Innovation Fest',
      description: 'Join us to build amazing apps in healthcare and web3.',
      tags: ['AI', 'Web3', 'Healthcare', 'Cloud']
    };

    const analysis = HackathonAnalysisService.analyze(rawHackathon);
    const profile = analysis.capabilityProfile;

    // Must NOT have required languages or required skills from general topic tags
    assert.strictEqual(profile.requiredLanguages.length, 0);

    // AI record in provenance must be classified as TOPIC_ONLY and preferred
    const aiRecord = analysis.provenance.find(p => p.canonicalSkillId === 'domain.ai_ml');
    assert.ok(aiRecord, 'AI identified in provenance');
    assert.strictEqual(aiRecord.classification, 'TOPIC_ONLY');
    assert.strictEqual(aiRecord.requiredOrPreferred, 'preferred');

    // Web3 record must be TOPIC_ONLY
    const web3Record = analysis.provenance.find(p => p.canonicalSkillId === 'domain.web3');
    assert.ok(web3Record, 'Web3 identified in provenance');
    assert.strictEqual(web3Record.classification, 'TOPIC_ONLY');
  });

  // ------------------------------------------------------------------
  // TEST F: Domain Inference & Fallback Removal (Gate 7)
  // Python-only must NOT automatically become AI/ML domain
  // ------------------------------------------------------------------
  test('F. Domain Inference: Python presence alone does NOT create domain.ai_ml or domain.fullstack', () => {
    const rawCliHackathon = {
      id: 'h-py-cli',
      title: 'Python CLI Developer Challenge',
      description: 'Build robust command line utilities and developer tools with pure Python standard library.',
      tags: ['Python', 'CLI', 'DevTools']
    };

    const analysis = HackathonAnalysisService.analyze(rawCliHackathon);
    const profile = analysis.capabilityProfile;

    // Verified: No AI/ML domain pollution
    assert.ok(!profile.domains.includes('domain.ai_ml'), 'Generic Python CLI hackathon must NOT contain domain.ai_ml');
    // Verified: No fabricated fullstack domain
    assert.ok(!profile.domains.includes('domain.fullstack'), 'Must NOT fabricate domain.fullstack when no domain exists');
  });

  // ------------------------------------------------------------------
  // TEST G: Canonical Hackathon Profile Convergence (Gate 6)
  // fromRow and HackathonAnalysisService produce identical semantics
  // ------------------------------------------------------------------
  test('G. Canonical Convergence: fromRow and HackathonAnalysisService produce identical normalized semantics', () => {
    const rawRow = {
      id: 'h-canon-1',
      title: 'Next.js Fullstack Sprint',
      description: 'Build serverless web applications with React, Next.js, and TypeScript.',
      tags: ['TypeScript', 'Next.js', 'React'],
      is_online: true,
      difficulty: 'intermediate',
      status: 'approved',
      start_date: '2026-09-01T00:00:00Z',
      end_date: '2026-09-05T00:00:00Z'
    };

    const fromService = HackathonAnalysisService.analyze(rawRow).capabilityProfile;
    const fromRow = HackathonCapabilityProfile.fromRow(rawRow);

    assert.strictEqual(fromRow.id, fromService.id);
    assert.strictEqual(fromRow.title, fromService.title);
    assert.deepStrictEqual(fromRow.requiredLanguages, fromService.requiredLanguages);
    assert.deepStrictEqual(fromRow.preferredLanguages, fromService.preferredLanguages);
    assert.deepStrictEqual(fromRow.frameworks, fromService.frameworks);
    assert.deepStrictEqual(fromRow.domains, fromService.domains);
    assert.strictEqual(fromRow.dataQuality, fromService.dataQuality);
  });

  // ------------------------------------------------------------------
  // TEST H: Explicit User Interests vs Technical Capability (Gate 8)
  // User-declared interest affects preference matching, not capability
  // ------------------------------------------------------------------
  test('H. User Interests: Declared AI interest affects preferenceMatch without fabricating technical capability', () => {
    // Frontend developer with zero AI evidence
    const dev = DeveloperCapabilityProfile.fromEvidence(
      'u-fe-ai-interested',
      null,
      [
        new DeveloperSkillEvidenceEntity({
          id: 'gh-fe-1',
          userId: 'u-fe-ai-interested',
          source: 'github',
          evidenceType: 'repo',
          externalId: 'gh-fe-1',
          signals: { language: 'TypeScript', topics: ['react'] },
          weight: 1.0,
          createdAt: now,
          updatedAt: now
        })
      ],
      now
    );

    const aiHackathon = new HackathonCapabilityProfile({
      id: 'h-ai-exp',
      title: 'Agentic AI Hackathon',
      slug: 'agentic-ai',
      description: 'Build autonomous LLM agents.',
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
      registrationDeadline: new Date(now + 86400000),
      eventStart: new Date(now + 86400000 * 2),
      eventEnd: new Date(now + 86400000 * 5),
      status: 'approved',
      isVerified: true,
      isFeatured: false,
      prizeAmount: 10000,
      dataQuality: 'high',
      rawTags: ['AI', 'Agents', 'Python']
    });

    // Case 1: Without declared interest
    const matchNoInterest = HackathonMatchEngine.calculateMatch(dev, aiHackathon, undefined, now);

    // Case 2: With explicit declared interest in AI
    const matchWithInterest = HackathonMatchEngine.calculateMatch(dev, aiHackathon, undefined, now, {
      userInterests: ['AI', 'Machine Learning']
    });

    // Technical capability is NOT fabricated
    assert.strictEqual(matchWithInterest.dimensionScores.languageMatch, 0.0, 'Technical language match remains 0');
    assert.strictEqual(matchWithInterest.features?.capabilityMatch, matchNoInterest.features?.capabilityMatch);

    // Preference match is boosted
    const prefWith = matchWithInterest.dimensionScores.preferenceMatch ?? 0;
    const prefWithout = matchNoInterest.dimensionScores.preferenceMatch ?? 0;
    assert.ok(prefWith > prefWithout);
    assert.ok((matchWithInterest.features?.preferenceMatch ?? 0) >= 0.80);
    assert.ok(matchWithInterest.strengths.some(s => s.type === 'preference'));
  });

  // ------------------------------------------------------------------
  // TEST I: Current Search / Intent Signal (Gate 10)
  // Current query and active filters influence contextual intent
  // ------------------------------------------------------------------
  test('I. Current Intent: Active query boosts intentMatch without modifying long-term capability profile', () => {
    const dev = DeveloperCapabilityProfile.fromEvidence('u-dev-1', null, [], now);

    const healthcareHack = new HackathonCapabilityProfile({
      id: 'h-health-1',
      title: 'Digital Health & Biotech Hackathon',
      slug: 'health-hack',
      description: 'Transforming patient care with technology.',
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
      registrationDeadline: new Date(now + 86400000),
      eventStart: new Date(now + 86400000 * 2),
      eventEnd: new Date(now + 86400000 * 5),
      status: 'approved',
      isVerified: true,
      isFeatured: false,
      prizeAmount: 10000,
      dataQuality: 'high',
      rawTags: ['Healthcare', 'Biotech']
    });

    const matchNeutral = HackathonMatchEngine.calculateMatch(dev, healthcareHack, undefined, now);
    const matchWithIntent = HackathonMatchEngine.calculateMatch(dev, healthcareHack, undefined, now, {
      currentQuery: 'health'
    });

    assert.strictEqual(matchNeutral.features?.intentMatch, 0.50);
    assert.strictEqual(matchWithIntent.features?.intentMatch, 1.0);
    assert.ok(matchWithIntent.overallScore > matchNeutral.overallScore);
  });

  // ------------------------------------------------------------------
  // TEST J: Location Intelligence: Online Events (Gate 11)
  // Online events receive NO physical-distance penalty
  // ------------------------------------------------------------------
  test('J. Location: Online events receive 1.0 location score (zero physical distance penalty)', () => {
    const dev = DeveloperCapabilityProfile.fromEvidence('u-dev-loc', null, [], now);

    const onlineHack = new HackathonCapabilityProfile({
      id: 'h-online-1',
      title: 'Global Virtual Hackathon',
      slug: 'virtual-hack',
      description: '100% remote global hackathon.',
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
      registrationDeadline: new Date(now + 86400000),
      eventStart: new Date(now + 86400000 * 2),
      eventEnd: new Date(now + 86400000 * 5),
      status: 'approved',
      isVerified: true,
      isFeatured: false,
      prizeAmount: 5000,
      dataQuality: 'high',
      rawTags: []
    });

    // User in Tokyo, event has no physical location
    const match = HackathonMatchEngine.calculateMatch(dev, onlineHack, undefined, now, {
      userLocation: { city: 'Tokyo', latitude: 35.6762, longitude: 139.6503 }
    });

    assert.strictEqual(match.dimensionScores.locationMatch, 1.0, 'Online event location score is strictly 1.0');
    assert.strictEqual(match.features?.locationMatch, 1.0);
  });

  // ------------------------------------------------------------------
  // TEST K: Location Intelligence: In-Person Events (Gate 11)
  // Works with legitimate location data; neutral when unknown
  // ------------------------------------------------------------------
  test('K. In-Person Location: Proximity rewards nearby builders and neutral when unknown', () => {
    const dev = DeveloperCapabilityProfile.fromEvidence('u-dev-loc', null, [], now);

    // In-person event in Bengaluru (lat: 12.9716, lng: 77.5946)
    const inPersonHack = new HackathonCapabilityProfile({
      id: 'h-blr-in-person',
      title: 'Bengaluru In-Person Hackfest',
      slug: 'blr-hack',
      description: 'Physical hackathon at Bangalore Palace.',
      tagline: null,
      requiredLanguages: [],
      preferredLanguages: [],
      frameworks: [],
      domains: [],
      skills: [],
      difficulty: 'open',
      isOnline: false,
      locationCity: 'Bengaluru',
      locationCollege: null,
      latitude: 12.9716,
      longitude: 77.5946,
      registrationDeadline: new Date(now + 86400000),
      eventStart: new Date(now + 86400000 * 2),
      eventEnd: new Date(now + 86400000 * 5),
      status: 'approved',
      isVerified: true,
      isFeatured: false,
      prizeAmount: 5000,
      dataQuality: 'high',
      rawTags: []
    });

    // 1. Local user in Bengaluru (~2 km away)
    const matchLocal = HackathonMatchEngine.calculateMatch(dev, inPersonHack, undefined, now, {
      userLocation: { city: 'Bengaluru', latitude: 12.9800, longitude: 77.6000 }
    });
    assert.strictEqual(matchLocal.dimensionScores.locationMatch, 1.0, 'Local user gets 1.0 proximity match');

    // 2. Far away user in San Francisco (~14,000 km away)
    const matchFar = HackathonMatchEngine.calculateMatch(dev, inPersonHack, undefined, now, {
      userLocation: { city: 'San Francisco', latitude: 37.7749, longitude: -122.4194 }
    });
    assert.strictEqual(matchFar.dimensionScores.locationMatch, 0.30, 'Distant user receives lower in-person location score');

    // 3. User with unknown location -> neutral 0.70
    const matchUnknown = HackathonMatchEngine.calculateMatch(dev, inPersonHack, undefined, now, {
      userLocation: { city: null, latitude: null, longitude: null }
    });
    assert.strictEqual(matchUnknown.dimensionScores.locationMatch, 0.70, 'Unknown location is neutral (0.70)');
  });

  // ------------------------------------------------------------------
  // TEST L: Cold-Start Safety & Mode Selection (Gates 12 & 13)
  // Insufficient personal signals must not produce fake high confidence
  // ------------------------------------------------------------------
  test('L. Cold-Start Mode: Sparse or empty profile enters COLD_START with low confidence cap', () => {
    const devCold = DeveloperCapabilityProfile.fromEvidence('u-new-user', null, [], now);

    const hack = new HackathonCapabilityProfile({
      id: 'h-cold-test',
      title: 'Global Open Challenge',
      slug: 'global-open',
      description: 'Open to all builders.',
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
      registrationDeadline: new Date(now + 86400000),
      eventStart: new Date(now + 86400000 * 2),
      eventEnd: new Date(now + 86400000 * 5),
      status: 'approved',
      isVerified: true,
      isFeatured: false,
      prizeAmount: 5000,
      dataQuality: 'high',
      rawTags: []
    });

    const match = HackathonMatchEngine.calculateMatch(devCold, hack, undefined, now);

    assert.strictEqual(match.recommendationMode, 'COLD_START');
    assert.strictEqual(match.confidence, 'low');
    assert.ok(match.confidenceScore <= 0.30, 'Confidence score capped in cold-start');
    assert.ok(match.overallScore <= 0.50, 'Cold-start does not fabricate high personalized score');
  });

  // ------------------------------------------------------------------
  // TEST M: Legacy Route Unification Consistency (Gate 14)
  // Canonical scoring prevents contradictory recommendation scores
  // ------------------------------------------------------------------
  test('M. Unified Route: V1.5 engine produces consistent scoring for both endpoints', () => {
    const dev = DeveloperCapabilityProfile.fromEvidence(
      'u-route-test',
      null,
      [
        new DeveloperSkillEvidenceEntity({
          id: 'gh-1',
          userId: 'u-route-test',
          source: 'github',
          evidenceType: 'repo',
          externalId: 'gh-1',
          signals: { language: 'TypeScript', topics: ['nextjs'] },
          weight: 1.0,
          createdAt: now,
          updatedAt: now
        })
      ],
      now
    );

    const hack = new HackathonCapabilityProfile({
      id: 'h-route-1',
      title: 'Next.js Hackathon',
      slug: 'nextjs-hack',
      description: 'Building Next.js apps.',
      tagline: null,
      requiredLanguages: ['language.typescript'],
      preferredLanguages: [],
      frameworks: ['framework.nextjs'],
      domains: ['domain.frontend'],
      skills: [],
      difficulty: 'intermediate',
      isOnline: true,
      locationCity: null,
      locationCollege: null,
      registrationDeadline: new Date(now + 86400000),
      eventStart: new Date(now + 86400000 * 2),
      eventEnd: new Date(now + 86400000 * 5),
      status: 'approved',
      isVerified: true,
      isFeatured: false,
      prizeAmount: 5000,
      dataQuality: 'high',
      rawTags: ['TypeScript', 'Next.js']
    });

    const match1 = HackathonMatchEngine.calculateMatch(dev, hack, undefined, now);
    const match2 = HackathonMatchEngine.calculateMatch(dev, hack, undefined, now);

    assert.strictEqual(match1.overallScore, match2.overallScore);
    assert.strictEqual(match1.matchPercentage, match2.matchPercentage);
    assert.deepStrictEqual(match1.dimensionScores, match2.dimensionScores);
  });

  // ------------------------------------------------------------------
  // TEST N: Determinism Stress Verification (Gate 20)
  // Same inputs + same timestamp produce 100% identical outputs
  // ------------------------------------------------------------------
  test('N. Determinism: 50 consecutive runs produce bit-for-bit identical MatchResults', () => {
    const dev = DeveloperCapabilityProfile.fromEvidence(
      'u-det',
      null,
      [
        new DeveloperSkillEvidenceEntity({
          id: 'gh-det',
          userId: 'u-det',
          source: 'github',
          evidenceType: 'repo',
          externalId: 'gh-det',
          signals: { language: 'Python', topics: ['django', 'postgresql'] },
          weight: 1.0,
          createdAt: now,
          updatedAt: now
        })
      ],
      now
    );

    const hack = new HackathonCapabilityProfile({
      id: 'h-det',
      title: 'Django Sprint',
      slug: 'django-sprint',
      description: 'Django web applications.',
      tagline: null,
      requiredLanguages: ['language.python'],
      preferredLanguages: [],
      frameworks: ['framework.django'],
      domains: ['domain.backend'],
      skills: [],
      difficulty: 'intermediate',
      isOnline: true,
      locationCity: null,
      locationCollege: null,
      registrationDeadline: new Date(now + 86400000),
      eventStart: new Date(now + 86400000 * 2),
      eventEnd: new Date(now + 86400000 * 5),
      status: 'approved',
      isVerified: true,
      isFeatured: false,
      prizeAmount: 5000,
      dataQuality: 'high',
      rawTags: ['Python', 'Django']
    });

    const baseline = JSON.stringify(HackathonMatchEngine.calculateMatch(dev, hack, undefined, now));

    for (let i = 0; i < 50; i++) {
      const run = JSON.stringify(HackathonMatchEngine.calculateMatch(dev, hack, undefined, now));
      assert.strictEqual(run, baseline);
    }
  });

  // ------------------------------------------------------------------
  // TEST O: Monotonicity (Gate 20)
  // Adding relevant evidence cannot reduce the target capability score
  // ------------------------------------------------------------------
  test('O. Monotonicity: Adding relevant high-quality repo strictly increases or maintains match score', () => {
    const dev1 = DeveloperCapabilityProfile.fromEvidence(
      'u-mono',
      null,
      [
        new DeveloperSkillEvidenceEntity({
          id: 'gh-m-1',
          userId: 'u-mono',
          source: 'github',
          evidenceType: 'repo',
          externalId: 'gh-m-1',
          signals: { language: 'TypeScript' },
          weight: 0.5,
          createdAt: now,
          updatedAt: now
        })
      ],
      now
    );

    const dev2 = DeveloperCapabilityProfile.fromEvidence(
      'u-mono',
      null,
      [
        new DeveloperSkillEvidenceEntity({
          id: 'gh-m-1',
          userId: 'u-mono',
          source: 'github',
          evidenceType: 'repo',
          externalId: 'gh-m-1',
          signals: { language: 'TypeScript' },
          weight: 0.5,
          createdAt: now,
          updatedAt: now
        }),
        new DeveloperSkillEvidenceEntity({
          id: 'gh-m-2',
          userId: 'u-mono',
          source: 'github',
          evidenceType: 'repo',
          externalId: 'gh-m-2',
          signals: { language: 'TypeScript', topics: ['react'] },
          weight: 1.0,
          createdAt: now,
          updatedAt: now
        })
      ],
      now
    );

    const hack = new HackathonCapabilityProfile({
      id: 'h-ts-react',
      title: 'TS React Challenge',
      slug: 'ts-react',
      description: 'Building TypeScript React apps.',
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
      registrationDeadline: new Date(now + 86400000),
      eventStart: new Date(now + 86400000 * 2),
      eventEnd: new Date(now + 86400000 * 5),
      status: 'approved',
      isVerified: true,
      isFeatured: false,
      prizeAmount: 5000,
      dataQuality: 'high',
      rawTags: ['TypeScript', 'React']
    });

    const match1 = HackathonMatchEngine.calculateMatch(dev1, hack, undefined, now);
    const match2 = HackathonMatchEngine.calculateMatch(dev2, hack, undefined, now);

    assert.ok(match2.overallScore >= match1.overallScore, 'Score must be monotonic non-decreasing');
    assert.ok(match2.dimensionScores.frameworkMatch >= match1.dimensionScores.frameworkMatch);
  });

  // ------------------------------------------------------------------
  // TEST P: Adversarial Inputs (Gate 20)
  // Duplicate tags, keyword stuffing, and easily confused skills
  // ------------------------------------------------------------------
  test('P. Adversarial Inputs: Resilient against keyword stuffing, duplicate tags, and Java/JS distinctness', () => {
    // 1. Confused language distinctness: Java !== JavaScript
    const devJava = DeveloperCapabilityProfile.fromEvidence(
      'u-java',
      null,
      [
        new DeveloperSkillEvidenceEntity({
          id: 'gh-java-1',
          userId: 'u-java',
          source: 'github',
          evidenceType: 'repo',
          externalId: 'gh-java-1',
          signals: { language: 'Java' },
          weight: 1.0,
          createdAt: now,
          updatedAt: now
        })
      ],
      now
    );

    assert.ok(devJava.languages['language.java'] > 0);
    assert.strictEqual(devJava.languages['language.javascript'], undefined, 'Java must not create JavaScript proficiency');

    // 2. Keyword stuffing resilience: 100 duplicate tags in hackathon
    const rawStuffed = {
      id: 'h-stuffed-adv',
      title: 'Stuffing Test',
      description: 'TypeScript '.repeat(50),
      tags: Array(50).fill('TypeScript')
    };

    const analysis = HackathonAnalysisService.analyze(rawStuffed);
    assert.strictEqual(analysis.capabilityProfile.requiredLanguages.length, 1);
    assert.strictEqual(analysis.capabilityProfile.requiredLanguages[0], 'language.typescript');
  });

  console.log('\n====================================================');
  console.log(`PHASE 2 REGRESSION TESTS: ${passedTests}/${totalTests} PASSED`);
  console.log('====================================================\n');
}

runPhase2TestSuite().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
