import { CANONICAL_SKILL_TAXONOMY, CanonicalSkillDefinition } from './skill-taxonomy';

export class SkillNormalizer {
  private static aliasMap: Map<string, CanonicalSkillDefinition> | null = null;

  /**
   * Initializes the fast alias lookup table.
   */
  private static getAliasMap(): Map<string, CanonicalSkillDefinition> {
    if (this.aliasMap) return this.aliasMap;

    const map = new Map<string, CanonicalSkillDefinition>();

    for (const def of Object.values(CANONICAL_SKILL_TAXONOMY)) {
      // 1. Map canonical ID directly
      map.set(def.id.toLowerCase(), def);
      // 2. Map display label
      map.set(def.displayLabel.toLowerCase(), def);
      // 3. Map all registered aliases
      for (const alias of def.aliases) {
        const clean = alias.toLowerCase().trim();
        if (clean) {
          map.set(clean, def);
        }
      }
    }

    this.aliasMap = map;
    return map;
  }

  /**
   * Sanitizes a raw input string into a standard lookup key.
   */
  private static sanitizeKey(raw: string): string {
    if (!raw) return '';
    return raw
      .toLowerCase()
      .trim()
      .replace(/^[@#]/, '') // Strip @ and #
      .replace(/[\s_]+/g, '-'); // Normalize whitespace and underscores to hyphens
  }

  /**
   * Normalizes a raw skill, tag, or language string into a CanonicalSkillDefinition.
   * Returns null if no recognized taxonomy entry matches (no guessing).
   */
  public static normalize(rawInput?: string | null): CanonicalSkillDefinition | null {
    if (!rawInput || typeof rawInput !== 'string') return null;

    const trimmed = rawInput.trim();
    if (!trimmed) return null;

    const lookup = this.getAliasMap();

    // 1. Direct lowercase match (preserves c++, c#)
    const directLower = trimmed.toLowerCase();
    if (lookup.has(directLower)) {
      return lookup.get(directLower)!;
    }

    // 2. Sanitized key lookup
    const sanitized = this.sanitizeKey(trimmed);
    if (lookup.has(sanitized)) {
      return lookup.get(sanitized)!;
    }

    // 3. Edge-case punctuation normalizations
    const noPunctuation = sanitized.replace(/[^a-z0-9]/g, '');
    if (noPunctuation && lookup.has(noPunctuation)) {
      return lookup.get(noPunctuation)!;
    }

    return null;
  }

  /**
   * Normalizes a list of raw strings and returns deduplicated canonical skill definitions.
   */
  public static normalizeMany(rawList?: Array<string | null | undefined>): CanonicalSkillDefinition[] {
    if (!Array.isArray(rawList) || rawList.length === 0) return [];

    const seenIds = new Set<string>();
    const results: CanonicalSkillDefinition[] = [];

    for (const item of rawList) {
      if (!item) continue;
      const canonical = this.normalize(item);
      if (canonical && !seenIds.has(canonical.id)) {
        seenIds.add(canonical.id);
        results.push(canonical);
      }
    }

    return results;
  }

  /**
   * Extracts canonical skills safely from unstructured text (title, tagline, description)
   * using exact word boundary tokens to prevent accidental substring false positives.
   */
  public static extractFromText(text?: string | null): CanonicalSkillDefinition[] {
    if (!text || typeof text !== 'string') return [];

    const results: CanonicalSkillDefinition[] = [];
    const seenIds = new Set<string>();
    const lookup = this.getAliasMap();

    // Tokenize words using punctuation and whitespace boundaries while preserving symbols like +, #
    const tokens = text
      .toLowerCase()
      .split(/[\s,.;:!?()[\]{}"'\/\\]+/)
      .filter(t => t.length > 0);

    for (const token of tokens) {
      const match = lookup.get(token);
      if (match && !seenIds.has(match.id)) {
        // Guard against single-letter false positives (e.g. 'c' or 'r' in natural English text)
        if (token === 'c' || token === 'r') {
          continue;
        }
        seenIds.add(match.id);
        results.push(match);
      }
    }

    return results;
  }
}
