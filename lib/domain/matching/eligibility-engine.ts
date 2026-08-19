import { HackathonCapabilityProfile } from '../value-objects/hackathon-capability-profile';

export interface EligibilityResult {
  isEligible: boolean;
  status: 'eligible' | 'ineligible' | 'unknown';
  reasons: string[];
  warnings: string[];
  actionability: number; // 0.0 to 1.0 based on registration freshness
}

export class EligibilityEngine {
  /**
   * Evaluates hard eligibility constraints for a hackathon.
   * Pure deterministic calculation based on an explicit reference timestamp.
   */
  public static evaluate(hackathon: HackathonCapabilityProfile, now = Date.now()): EligibilityResult {
    const reasons: string[] = [];
    const warnings: string[] = [];

    // 1. Status check: Only approved events are eligible
    const cleanStatus = (hackathon.status || '').toLowerCase().trim();
    if (cleanStatus !== 'approved') {
      return {
        isEligible: false,
        status: 'ineligible',
        reasons: [cleanStatus ? `Event status is "${cleanStatus}" (requires "approved")` : 'Event status is not approved'],
        warnings: [],
        actionability: 0
      };
    }

    // 2. Event conclusion check
    const eventEndMs = hackathon.eventEnd ? hackathon.eventEnd.getTime() : 0;
    if (isNaN(eventEndMs) || (eventEndMs > 0 && eventEndMs <= now)) {
      return {
        isEligible: false,
        status: 'ineligible',
        reasons: ['Hackathon has already ended or has an invalid end date'],
        warnings: [],
        actionability: 0
      };
    }

    // 3. Registration Deadline check
    const deadlineMs = hackathon.registrationDeadline ? hackathon.registrationDeadline.getTime() : 0;
    if (!isNaN(deadlineMs) && deadlineMs > 0 && deadlineMs <= now) {
      return {
        isEligible: false,
        status: 'ineligible',
        reasons: ['Registration deadline has passed'],
        warnings: [],
        actionability: 0
      };
    }

    // 4. Calculate Actionability (Urgency & Openness)
    let actionability = 0.8;
    if (deadlineMs > 0) {
      const msLeft = deadlineMs - now;
      const daysLeft = msLeft / (1000 * 60 * 60 * 24);

      if (daysLeft <= 3) {
        actionability = 1.0;
        warnings.push(`Registration closes in ${Math.max(1, Math.ceil(daysLeft))} day(s)`);
      } else if (daysLeft <= 14) {
        actionability = 0.9;
      } else {
        actionability = 0.85;
      }
    }

    if (!hackathon.isOnline && hackathon.locationCity) {
      warnings.push(`In-person event in ${hackathon.locationCity}`);
    }

    reasons.push('Registration is active');

    return {
      isEligible: true,
      status: 'eligible',
      reasons,
      warnings,
      actionability
    };
  }
}
