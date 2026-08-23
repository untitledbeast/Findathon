import { DeveloperSkillEvidenceEntity } from '../entities/developer-skill-evidence.entity';
import { ExperienceLevel } from '../entities/developer-profile.entity';
import { SkillScore } from './skill-score';

export interface ComputedSkillAggregates {
  topLanguages: Record<string, number>;
  topSkills: Record<string, number>;
  interests: string[];
  experienceLevel: ExperienceLevel;
  totalWeight: number;
  repoCount: number;
  originalRepoCount: number;
}

// Canonical language map with alias resolution
const LANGUAGE_ALIASES: Record<string, string> = {
  typescript: 'TypeScript',
  ts: 'TypeScript',
  javascript: 'JavaScript',
  js: 'JavaScript',
  python: 'Python',
  py: 'Python',
  java: 'Java',
  cpp: 'C++',
  'c++': 'C++',
  c: 'C',
  csharp: 'C#',
  'c#': 'C#',
  cs: 'C#',
  go: 'Go',
  golang: 'Go',
  rust: 'Rust',
  rs: 'Rust',
  html: 'HTML',
  css: 'CSS',
  solidity: 'Solidity',
  ruby: 'Ruby',
  php: 'PHP',
  swift: 'Swift',
  kotlin: 'Kotlin',
  dart: 'Dart',
  scala: 'Scala',
  r: 'R',
  shell: 'Shell',
  bash: 'Shell'
};

// Skill classification map
const SKILL_MAP: Record<string, string[]> = {
  dsa: [
    'dynamic-programming', 'dp', 'graph', 'tree', 'binary-tree', 'binary-search-tree',
    'trie', 'segment-tree', 'binary-search', 'heap', 'priority-queue', 'backtracking',
    'recursion', 'divide-and-conquer', 'greedy', 'two-pointers', 'sliding-window',
    'stack', 'queue', 'linked-list', 'union-find', 'bit-manipulation', 'dsa',
    'algorithms', 'data-structures'
  ],
  problem_solving: [
    'problem-solving', 'competitive-programming', 'math', 'combinatorics',
    'game-theory', 'simulation', 'brainteaser', 'geometry', 'number-theory'
  ],
  frontend: [
    'react', 'next', 'vue', 'angular', 'svelte', 'html', 'css', 'tailwind',
    'redux', 'zustand', 'web', 'frontend', 'ui', 'ux', 'vite', 'webpack', 'sass'
  ],
  backend: [
    'node', 'express', 'fastapi', 'django', 'spring', 'flask', 'nestjs',
    'graphql', 'rest', 'api', 'trpc', 'grpc', 'microservices', 'backend',
    'auth', 'jwt', 'prisma', 'typeorm'
  ],
  ai_ml: [
    'pytorch', 'tensorflow', 'sklearn', 'llm', 'nlp', 'computer-vision',
    'transformers', 'langchain', 'huggingface', 'openai', 'keras', 'ml', 'ai',
    'deep-learning', 'rag', 'genai', 'gemini', 'pandas', 'numpy'
  ],
  devops: [
    'docker', 'kubernetes', 'k8s', 'ci', 'cd', 'github-actions', 'terraform',
    'aws', 'gcp', 'azure', 'linux', 'helm', 'ansible', 'nginx', 'devops',
    'cloud', 'serverless', 'vercel', 'supabase'
  ],
  data: [
    'sql', 'postgres', 'mongodb', 'mysql', 'redis', 'spark', 'pandas',
    'dbt', 'bigquery', 'cassandra', 'database', 'sqlite', 'elasticsearch'
  ]
};

export class DeveloperSkillProfile {
  /**
   * Deterministic scoring engine to compute language/skill scores and estimated experience level
   * from verified multi-source evidence signals (GitHub + LeetCode).
   */
  public static computeAggregates(evidenceList: DeveloperSkillEvidenceEntity[]): ComputedSkillAggregates {
    if (!evidenceList || evidenceList.length === 0) {
      return {
        topLanguages: {},
        topSkills: {},
        interests: [],
        experienceLevel: 'beginner',
        totalWeight: 0,
        repoCount: 0,
        originalRepoCount: 0
      };
    }

    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;

    const languageAccumulator: Record<string, number> = {};
    const skillAccumulator: Record<string, number> = {};
    const interestAccumulator: Record<string, number> = {};
    let totalComputedWeight = 0;
    let repoCount = 0;
    let originalRepoCount = 0;

    // LeetCode specific metric tracking for experience inference
    let leetcodeTotalSolved = 0;
    let leetcodeMediumHard = 0;
    let leetcodeContestRating: number | null = null;

    for (const evidence of evidenceList) {
      // LinkedIn standard OIDC establishes identity only (zero technical weight contribution)
      if (evidence.source === 'linkedin') {
        continue;
      }

      // 1. Calculate recency factor
      const timestamp = evidence.updatedAt || evidence.createdAt || now;
      const ageDays = Math.max(0, (now - timestamp) / DAY_MS);

      let recencyFactor = 0.2;
      if (ageDays < 90) {
        recencyFactor = 1.0;
      } else if (ageDays < 180) {
        recencyFactor = 0.7;
      } else if (ageDays < 365) {
        recencyFactor = 0.4;
      }

      // 2. Calculate effective weight (LeetCode normalized to 70% of GitHub weight)
      const sourceScale = evidence.source === 'leetcode' ? 0.7 : 1.0;
      const effectiveWeight = (evidence.weight || 1.0) * recencyFactor * sourceScale;
      totalComputedWeight += effectiveWeight;

      const signals = evidence.signals || {};

      // 3. Process GitHub Repositories
      if (evidence.source === 'github') {
        if (evidence.evidenceType === 'repo') {
          repoCount++;
          if (!signals.isFork) {
            originalRepoCount++;
          }
        }

        // Primary language
        if (typeof signals.language === 'string' && signals.language.trim()) {
          const canonical = this.normalizeLanguage(signals.language);
          if (canonical) {
            languageAccumulator[canonical] = (languageAccumulator[canonical] || 0) + effectiveWeight;
          }
        }

        // Language byte breakdown
        if (signals.languages && typeof signals.languages === 'object') {
          for (const [lang, bytes] of Object.entries(signals.languages)) {
            const canonical = this.normalizeLanguage(lang);
            if (canonical) {
              const byteScale = typeof bytes === 'number' && bytes > 0
                ? Math.min(1.5, Math.max(0.5, Math.log10(bytes) / 4))
                : 1;
              languageAccumulator[canonical] = (languageAccumulator[canonical] || 0) + (effectiveWeight * byteScale);
            }
          }
        }
      }

      // 4. Process LeetCode Signals
      if (evidence.source === 'leetcode') {
        if (evidence.evidenceType === 'activity') {
          // Profile summary metrics
          if (typeof signals.totalSolved === 'number') {
            const total = signals.totalSolved;
            const medium = Number(signals.mediumSolved) || 0;
            const hard = Number(signals.hardSolved) || 0;
            leetcodeTotalSolved = Math.max(leetcodeTotalSolved, total);
            leetcodeMediumHard = Math.max(leetcodeMediumHard, medium + hard);

            if (typeof signals.contestRating === 'number' && signals.contestRating > 0) {
              leetcodeContestRating = Math.max(leetcodeContestRating || 0, signals.contestRating);
            }

            // High volume LeetCode achievements strengthen DSA and Problem Solving
            if (total >= 300) {
              skillAccumulator['dsa'] = (skillAccumulator['dsa'] || 0) + 12 * effectiveWeight;
              skillAccumulator['problem_solving'] = (skillAccumulator['problem_solving'] || 0) + 10 * effectiveWeight;
            } else if (total >= 100) {
              skillAccumulator['dsa'] = (skillAccumulator['dsa'] || 0) + 6 * effectiveWeight;
              skillAccumulator['problem_solving'] = (skillAccumulator['problem_solving'] || 0) + 5 * effectiveWeight;
            } else if (total >= 30) {
              skillAccumulator['dsa'] = (skillAccumulator['dsa'] || 0) + 3 * effectiveWeight;
            }

            if (signals.contestRating && Number(signals.contestRating) >= 1600) {
              const ratingBoost = (Number(signals.contestRating) - 1500) / 100;
              skillAccumulator['problem_solving'] = (skillAccumulator['problem_solving'] || 0) + (ratingBoost * effectiveWeight);
              skillAccumulator['dsa'] = (skillAccumulator['dsa'] || 0) + (ratingBoost * 0.8 * effectiveWeight);
            }
          }

          // LeetCode specific language evidence
          if (signals.languageName && typeof signals.problemsSolved === 'number' && signals.problemsSolved > 0) {
            const canonical = this.normalizeLanguage(String(signals.languageName));
            if (canonical) {
              const langScale = Math.min(1.5, Math.max(0.5, Math.log10(signals.problemsSolved + 1)));
              languageAccumulator[canonical] = (languageAccumulator[canonical] || 0) + (effectiveWeight * langScale);
            }
          }
        }

        // LeetCode topic submission evidence
        if (evidence.evidenceType === 'submission' && signals.tagSlug) {
          const cleanTag = this.normalizeTag(String(signals.tagSlug));
          const count = Number(signals.problemsSolved) || 1;
          const topicScale = Math.min(1.5, Math.max(0.5, Math.log10(count + 1)));

          let matchedCategory = false;
          for (const [category, keywords] of Object.entries(SKILL_MAP)) {
            if (keywords.includes(cleanTag) || keywords.some(k => cleanTag.includes(k))) {
              skillAccumulator[category] = (skillAccumulator[category] || 0) + (effectiveWeight * topicScale);
              matchedCategory = true;
            }
          }

          if (!matchedCategory && cleanTag.length >= 3 && cleanTag.length <= 30) {
            const formattedInterest = cleanTag.charAt(0).toUpperCase() + cleanTag.slice(1);
            interestAccumulator[formattedInterest] = (interestAccumulator[formattedInterest] || 0) + effectiveWeight;
          }
        }
      }

      // 5. Process normalized topics and tags (for GitHub & generic sources)
      if (evidence.source !== 'leetcode') {
        const rawTags: string[] = [];
        if (Array.isArray(signals.topics)) rawTags.push(...signals.topics.map(String));
        if (Array.isArray(signals.tags)) rawTags.push(...signals.tags.map(String));

        for (const tag of rawTags) {
          const cleanTag = this.normalizeTag(tag);
          if (!cleanTag) continue;

          // Language check
          const langMatch = this.normalizeLanguage(cleanTag);
          if (langMatch) {
            languageAccumulator[langMatch] = (languageAccumulator[langMatch] || 0) + (effectiveWeight * 0.8);
          }

          // Skill domain check
          let matchedCategory = false;
          for (const [category, keywords] of Object.entries(SKILL_MAP)) {
            if (keywords.includes(cleanTag) || keywords.some(k => cleanTag.includes(k))) {
              skillAccumulator[category] = (skillAccumulator[category] || 0) + effectiveWeight;
              matchedCategory = true;
            }
          }

          // Interest check
          if (!matchedCategory && cleanTag.length >= 3 && cleanTag.length <= 30) {
            const formattedInterest = cleanTag.charAt(0).toUpperCase() + cleanTag.slice(1);
            interestAccumulator[formattedInterest] = (interestAccumulator[formattedInterest] || 0) + effectiveWeight;
          }
        }
      }
    }

    // 6. Normalize and sort top 10 languages
    const maxLangWeight = Math.max(...Object.values(languageAccumulator), 1);
    const topLanguages: Record<string, number> = {};
    Object.entries(languageAccumulator)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .forEach(([lang, w]) => {
        topLanguages[lang] = new SkillScore(w / maxLangWeight).getValue();
      });

    // 7. Normalize and sort top 10 skills
    const maxSkillWeight = Math.max(...Object.values(skillAccumulator), 1);
    const topSkills: Record<string, number> = {};
    Object.entries(skillAccumulator)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .forEach(([skill, w]) => {
        topSkills[skill] = new SkillScore(w / maxSkillWeight).getValue();
      });

    // 8. Sort top 8 interests
    const interests: string[] = Object.entries(interestAccumulator)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([interest]) => interest);

    // 9. Compute Estimated Experience Level
    const distinctLanguages = Object.keys(languageAccumulator).length;
    let experienceLevel: ExperienceLevel = 'beginner';

    // Advanced criteria:
    // A. GitHub strong portfolio (total weight > 40 & >= 3 languages & >= 5 original repos)
    // B. High-volume LeetCode (>= 300 solved with >= 100 Medium/Hard OR contest rating >= 1800)
    // C. Very high combined weight (> 60)
    if (
      (totalComputedWeight > 40 && distinctLanguages >= 3 && originalRepoCount >= 5) ||
      (leetcodeTotalSolved >= 300 && leetcodeMediumHard >= 100) ||
      (leetcodeContestRating !== null && leetcodeContestRating >= 1800) ||
      totalComputedWeight > 60
    ) {
      experienceLevel = 'advanced';
    } else if (
      (totalComputedWeight > 15 && (distinctLanguages >= 2 || originalRepoCount >= 2)) ||
      (leetcodeTotalSolved >= 50 && leetcodeMediumHard >= 15) ||
      (leetcodeContestRating !== null && leetcodeContestRating >= 1500)
    ) {
      experienceLevel = 'intermediate';
    }

    return {
      topLanguages,
      topSkills,
      interests,
      experienceLevel,
      totalWeight: Math.round(totalComputedWeight * 100) / 100,
      repoCount,
      originalRepoCount
    };
  }

  private static normalizeLanguage(raw: string): string | null {
    if (!raw) return null;
    const key = raw.trim().toLowerCase();
    return LANGUAGE_ALIASES[key] || (raw.length <= 20 ? raw.trim() : null);
  }

  private static normalizeTag(rawTag: string): string {
    if (!rawTag) return '';
    const clean = rawTag.trim().toLowerCase();
    const ALIAS_MAP: Record<string, string> = {
      'next.js': 'next',
      nextjs: 'next',
      'react.js': 'react',
      reactjs: 'react',
      'vue.js': 'vue',
      vuejs: 'vue',
      'node.js': 'node',
      nodejs: 'node',
      'express.js': 'express',
      expressjs: 'express',
      'c++': 'cpp',
      'c#': 'csharp',
      csharp: 'csharp',
      golang: 'go',
      postgresql: 'postgres',
      mongodb: 'mongodb',
      tailwindcss: 'tailwind',
      'scikit-learn': 'sklearn',
      'dynamic-programming': 'dynamic-programming',
      dp: 'dynamic-programming',
      'binary-search': 'binary-search',
      'binary-tree': 'tree',
      'depth-first-search': 'graph',
      'breadth-first-search': 'graph',
      'union-find': 'dsa'
    };
    return ALIAS_MAP[clean] || clean;
  }
}
