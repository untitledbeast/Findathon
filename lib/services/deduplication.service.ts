import { Hackathon } from '@/lib/supabase';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicateOfId?: string;
  duplicateOfTitle?: string;
  similarityScore: number;
  reason?: string;
}

export class DeduplicationService {
  /**
   * Normalizes a string by converting to lowercase, removing punctuation, and stripping common noise words.
   */
  public static normalizeTitle(title: string): string[] {
    const stopWords = new Set(['hackathon', 'hack', '2024', '2025', '2026', '2027', 'the', 'an', 'a', 'of', 'in', 'at', 'for', 'and', 'ed', 'st', 'nd', 'rd', 'th']);
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 1 && !stopWords.has(word));
  }

  /**
   * Computes Jaccard similarity between two arrays of words (0 to 1).
   */
  public static computeWordSimilarity(wordsA: string[], wordsB: string[]): number {
    if (wordsA.length === 0 && wordsB.length === 0) return 1;
    if (wordsA.length === 0 || wordsB.length === 0) return 0;

    const setA = new Set(wordsA);
    const setB = new Set(wordsB);
    let intersection = 0;

    for (const word of setA) {
      if (setB.has(word)) {
        intersection++;
      }
    }

    const union = new Set([...wordsA, ...wordsB]).size;
    return union === 0 ? 0 : intersection / union;
  }

  /**
   * Computes Levenshtein similarity between two normalized strings (0 to 1).
   */
  public static computeLevenshteinSimilarity(str1: string, str2: string): number {
    const s1 = str1.trim().toLowerCase();
    const s2 = str2.trim().toLowerCase();
    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;

    const matrix: number[][] = [];
    for (let i = 0; i <= s1.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= s2.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= s1.length; i++) {
      for (let j = 1; j <= s2.length; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    const distance = matrix[s1.length][s2.length];
    const maxLen = Math.max(s1.length, s2.length);
    return 1 - distance / maxLen;
  }

  /**
   * Checks if two dates are within a given number of days (default 14 days).
   */
  public static areDatesProximate(dateStr1?: string | null, dateStr2?: string | null, maxDaysDiff = 14): boolean {
    if (!dateStr1 || !dateStr2) return true;
    try {
      const d1 = new Date(dateStr1).getTime();
      const d2 = new Date(dateStr2).getTime();
      if (isNaN(d1) || isNaN(d2)) return true;
      const diffDays = Math.abs(d1 - d2) / (1000 * 60 * 60 * 24);
      return diffDays <= maxDaysDiff;
    } catch {
      return true;
    }
  }

  /**
   * Evaluates a candidate title and dates against an array of existing hackathons.
   */
  public static checkDuplicate(
    candidateTitle: string,
    candidateStartDate?: string | null,
    existingHackathons: Pick<Hackathon, 'id' | 'title' | 'start_date' | 'end_date' | 'status'>[] = []
  ): DuplicateCheckResult {
    if (!candidateTitle || candidateTitle.trim().length < 3) {
      return { isDuplicate: false, similarityScore: 0 };
    }

    const normCandidateWords = this.normalizeTitle(candidateTitle);
    const normCandidateStr = normCandidateWords.join(' ');

    let bestMatch: { id: string; title: string; score: number; reason: string } | null = null;

    for (const existing of existingHackathons) {
      if (existing.title.trim().toLowerCase() === candidateTitle.trim().toLowerCase()) {
        return {
          isDuplicate: true,
          duplicateOfId: existing.id,
          duplicateOfTitle: existing.title,
          similarityScore: 1.0,
          reason: `Exact title match with existing hackathon "${existing.title}"`
        };
      }

      const normExistingWords = this.normalizeTitle(existing.title);
      const normExistingStr = normExistingWords.join(' ');

      const jaccard = this.computeWordSimilarity(normCandidateWords, normExistingWords);
      const levenshtein = this.computeLevenshteinSimilarity(normCandidateStr, normExistingStr);
      const combinedScore = Math.max(jaccard, levenshtein);

      const dateMatch = this.areDatesProximate(candidateStartDate, existing.start_date, 14);

      if (combinedScore >= 0.8 && dateMatch) {
        if (!bestMatch || combinedScore > bestMatch.score) {
          bestMatch = {
            id: existing.id,
            title: existing.title,
            score: Math.round(combinedScore * 100) / 100,
            reason: `High title similarity (${Math.round(combinedScore * 100)}%) and overlapping event dates`
          };
        }
      }
    }

    if (bestMatch) {
      return {
        isDuplicate: true,
        duplicateOfId: bestMatch.id,
        duplicateOfTitle: bestMatch.title,
        similarityScore: bestMatch.score,
        reason: bestMatch.reason
      };
    }

    return { isDuplicate: false, similarityScore: 0 };
  }
}
