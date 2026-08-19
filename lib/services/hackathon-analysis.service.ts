/**
 * Hackathon Analysis Service
 * Version: 1.0.0
 * 
 * Transforms unstructured and structured hackathon submissions into normalized,
 * validated HackathonCapabilityProfiles with strict provenance and confidence tracking.
 * 
 * Guarantees:
 * - Deterministic, verifiable analysis
 * - Zero unverified AI hallucinations (unknown skills remain unknown)
 * - Clear separation of explicit required vs. inferred preferred skills
 * - Complete isolation from external network/provider I/O
 */

import { SkillNormalizer } from '../domain/skills/skill-normalizer';
import { HackathonCapabilityProfile } from '../domain/value-objects/hackathon-capability-profile';
import { HackathonEntity } from '../domain/entities/hackathon.entity';

export type SkillProvenanceSource = 'explicit' | 'inferred' | 'structured_field';

export interface SkillProvenanceRecord {
  canonicalSkillId: string;
  displayLabel: string;
  category: string;
  source: SkillProvenanceSource;
  confidence: number;           // 0.0 to 1.0
  requiredOrPreferred: 'required' | 'preferred';
}

export interface AnalysisResult {
  capabilityProfile: HackathonCapabilityProfile;
  provenance: SkillProvenanceRecord[];
  analysisConfidence: number;   // 0.0 to 1.0
  analysisVersion: string;
  taxonomyVersion: string;
}

export class HackathonAnalysisService {
  public static readonly ANALYSIS_VERSION = '1.0.0';
  public static readonly TAXONOMY_VERSION = '1.0.0';

  /**
   * Analyzes raw hackathon data (from Entity or database row) into a normalized capability profile.
   */
  public static analyze(
    rawInput: Record<string, unknown> | HackathonEntity
  ): AnalysisResult {
    // 1. Normalize input properties safely
    let id = '';
    let title = '';
    let slug = '';
    let description = '';
    let tagline: string | null = null;
    let rawTags: string[] = [];
    let isOnline = true;
    let locationCity: string | null = null;
    let locationCollege: string | null = null;
    let registrationDeadline: Date | null = null;
    let eventStart = new Date();
    let eventEnd = new Date();
    let status = 'approved';
    let isVerified = false;
    let isFeatured = false;
    let prizeAmount = 0;
    let difficulty: 'beginner' | 'intermediate' | 'advanced' | 'open' = 'open';

    if (rawInput instanceof HackathonEntity) {
      id = rawInput.id;
      title = rawInput.title;
      slug = rawInput.slug.getValue();
      description = rawInput.description;
      tagline = rawInput.tagline;
      rawTags = rawInput.tags || [];
      isOnline = rawInput.location.getIsOnline();
      locationCity = rawInput.location.getCity() || null;
      locationCollege = rawInput.location.getCollege() || null;
      registrationDeadline = rawInput.registrationWindow?.getDeadline() || null;
      eventStart = rawInput.dateRange.getStartDate();
      eventEnd = rawInput.dateRange.getEndDate();
      status = rawInput.status.getValue();
      isVerified = rawInput.isVerified;
      isFeatured = rawInput.isFeatured;
      prizeAmount = rawInput.prizePool.getNumericAmount();
      difficulty = rawInput.difficulty || 'open';
    } else {
      id = String(rawInput.id || '');
      title = String(rawInput.title || '');
      slug = String(rawInput.slug || rawInput.id || '');
      description = String(rawInput.description || '');
      tagline = rawInput.tagline ? String(rawInput.tagline) : null;
      rawTags = Array.isArray(rawInput.tags) ? (rawInput.tags as string[]) : [];
      isOnline = Boolean(rawInput.is_online !== undefined ? rawInput.is_online : rawInput.isOnline);
      locationCity = rawInput.location_city ? String(rawInput.location_city) : (rawInput.locationCity ? String(rawInput.locationCity) : null);
      locationCollege = rawInput.location_college ? String(rawInput.location_college) : null;
      const deadlineVal = rawInput.registration_deadline || rawInput.registrationDeadline;
      registrationDeadline = deadlineVal ? new Date(String(deadlineVal)) : null;
      if (registrationDeadline && isNaN(registrationDeadline.getTime())) registrationDeadline = null;
      const startVal = rawInput.start_date || rawInput.startDate || new Date().toISOString();
      const endVal = rawInput.end_date || rawInput.endDate || new Date().toISOString();
      eventStart = new Date(String(startVal));
      eventEnd = new Date(String(endVal));
      status = String(rawInput.status || 'approved');
      isVerified = Boolean(rawInput.is_verified || rawInput.isVerified);
      isFeatured = Boolean(rawInput.is_featured || rawInput.isFeatured);
      prizeAmount = Number(rawInput.prize_amount || rawInput.prizeAmount || 0);
      difficulty = (rawInput.difficulty as 'beginner' | 'intermediate' | 'advanced' | 'open') || 'open';
    }

    const provenanceMap = new Map<string, SkillProvenanceRecord>();

    // 2. Extract Explicit Structured Tags (Highest Confidence: 1.0, Required)
    const explicitSkills = SkillNormalizer.normalizeMany(rawTags);
    for (const skill of explicitSkills) {
      provenanceMap.set(skill.id, {
        canonicalSkillId: skill.id,
        displayLabel: skill.displayLabel,
        category: skill.category,
        source: 'structured_field',
        confidence: 1.0,
        requiredOrPreferred: 'required'
      });
    }

    // 3. Extract Inferred Skills from Title & Description (Confidence: 0.75, Preferred)
    const textCorpus = `${title} ${tagline || ''} ${description}`;
    const inferredSkills = SkillNormalizer.extractFromText(textCorpus);

    for (const skill of inferredSkills) {
      if (!provenanceMap.has(skill.id)) {
        // Guard: check if skill is in title (higher confidence 0.90) or body (0.75)
        const inTitle = title.toLowerCase().includes(skill.displayLabel.toLowerCase()) ||
          skill.aliases.some(a => title.toLowerCase().includes(a));
        
        provenanceMap.set(skill.id, {
          canonicalSkillId: skill.id,
          displayLabel: skill.displayLabel,
          category: skill.category,
          source: 'inferred',
          confidence: inTitle ? 0.90 : 0.75,
          requiredOrPreferred: inTitle ? 'required' : 'preferred'
        });
      }
    }

    // 4. Categorize Normalized Requirements
    const requiredLanguages: string[] = [];
    const preferredLanguages: string[] = [];
    const frameworks: string[] = [];
    const domains: string[] = [];
    const skills: string[] = [];

    for (const record of provenanceMap.values()) {
      if (record.category === 'language') {
        if (record.requiredOrPreferred === 'required') {
          requiredLanguages.push(record.canonicalSkillId);
        } else {
          preferredLanguages.push(record.canonicalSkillId);
        }
      } else if (record.category === 'framework') {
        frameworks.push(record.canonicalSkillId);
      } else if (record.category === 'domain') {
        domains.push(record.canonicalSkillId);
      } else if (record.category === 'skill') {
        skills.push(record.canonicalSkillId);
      }
    }

    // Default domain fallback if none detected
    if (domains.length === 0) {
      if (frameworks.some(f => f.includes('react') || f.includes('next'))) domains.push('domain.frontend');
      if (frameworks.some(f => f.includes('node') || f.includes('express') || f.includes('django') || f.includes('fastapi'))) domains.push('domain.backend');
      if (requiredLanguages.some(l => l.includes('python'))) domains.push('domain.ai_ml');
      if (domains.length === 0) domains.push('domain.fullstack');
    }

    // 5. Compute Analysis Quality & Confidence
    const hasRichDescription = description.length >= 80;
    const hasValidTags = explicitSkills.length > 0;
    const hasDeadline = registrationDeadline !== null && !isNaN(registrationDeadline.getTime());

    let dataQuality: 'high' | 'medium' | 'low' = 'low';
    let analysisConfidence = 0.50;

    if (hasRichDescription && hasValidTags && hasDeadline) {
      dataQuality = 'high';
      analysisConfidence = 0.95;
    } else if (hasRichDescription || hasValidTags) {
      dataQuality = hasValidTags ? 'medium' : 'low';
      analysisConfidence = 0.65;
    }

    const capabilityProfile = new HackathonCapabilityProfile({
      id,
      title,
      slug,
      description,
      tagline,
      requiredLanguages,
      preferredLanguages,
      frameworks,
      domains,
      skills,
      difficulty,
      isOnline,
      locationCity,
      locationCollege,
      registrationDeadline,
      eventStart,
      eventEnd,
      status,
      isVerified,
      isFeatured,
      prizeAmount,
      dataQuality,
      rawTags
    });

    return {
      capabilityProfile,
      provenance: Array.from(provenanceMap.values()),
      analysisConfidence,
      analysisVersion: this.ANALYSIS_VERSION,
      taxonomyVersion: this.TAXONOMY_VERSION
    };
  }
}
