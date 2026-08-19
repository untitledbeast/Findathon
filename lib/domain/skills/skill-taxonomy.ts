/**
 * Canonical Skill Taxonomy for Findathon
 * Version: 1.0.0
 * 
 * Provides centralized, immutable taxonomy definitions across languages, frameworks, domains, and skills.
 * Guarantees distinct identification (e.g. Java !== JavaScript, C !== C++, React !== React Native).
 */

export type TaxonomyCategory = 'language' | 'framework' | 'domain' | 'skill' | 'database' | 'cloud_devops';

export interface CanonicalSkillDefinition {
  id: string;
  category: TaxonomyCategory;
  displayLabel: string;
  aliases: string[];
  parentDomain?: string;
  relatedSkills?: string[];
}

export const CANONICAL_SKILL_TAXONOMY: Record<string, CanonicalSkillDefinition> = {
  // --- Programming Languages ---
  'language.typescript': {
    id: 'language.typescript',
    category: 'language',
    displayLabel: 'TypeScript',
    aliases: ['typescript', 'ts'],
    parentDomain: 'domain.frontend',
    relatedSkills: ['framework.react', 'framework.nextjs', 'framework.nodejs']
  },
  'language.javascript': {
    id: 'language.javascript',
    category: 'language',
    displayLabel: 'JavaScript',
    aliases: ['javascript', 'js', 'es6', 'es2020', 'ecmascript'],
    parentDomain: 'domain.frontend',
    relatedSkills: ['framework.react', 'framework.nodejs']
  },
  'language.python': {
    id: 'language.python',
    category: 'language',
    displayLabel: 'Python',
    aliases: ['python', 'py', 'python3'],
    parentDomain: 'domain.ai_ml',
    relatedSkills: ['framework.django', 'framework.fastapi', 'framework.pytorch', 'framework.tensorflow']
  },
  'language.java': {
    id: 'language.java',
    category: 'language',
    displayLabel: 'Java',
    aliases: ['java', 'java8', 'java17', 'java21', 'jdk'],
    parentDomain: 'domain.backend',
    relatedSkills: ['framework.spring', 'framework.springboot']
  },
  'language.cpp': {
    id: 'language.cpp',
    category: 'language',
    displayLabel: 'C++',
    aliases: ['c++', 'cpp', 'cplusplus', 'cxx'],
    parentDomain: 'domain.backend',
    relatedSkills: ['skill.dsa', 'skill.problem_solving']
  },
  'language.c': {
    id: 'language.c',
    category: 'language',
    displayLabel: 'C',
    aliases: ['c', 'clang'],
    parentDomain: 'domain.backend',
    relatedSkills: ['skill.dsa']
  },
  'language.csharp': {
    id: 'language.csharp',
    category: 'language',
    displayLabel: 'C#',
    aliases: ['c#', 'csharp', 'cs', 'dotnet', '.net'],
    parentDomain: 'domain.backend',
    relatedSkills: ['framework.dotnet']
  },
  'language.go': {
    id: 'language.go',
    category: 'language',
    displayLabel: 'Go',
    aliases: ['go', 'golang'],
    parentDomain: 'domain.backend',
    relatedSkills: ['domain.cloud_devops']
  },
  'language.rust': {
    id: 'language.rust',
    category: 'language',
    displayLabel: 'Rust',
    aliases: ['rust', 'rs', 'rustlang'],
    parentDomain: 'domain.backend',
    relatedSkills: ['domain.web3', 'domain.cybersecurity']
  },
  'language.solidity': {
    id: 'language.solidity',
    category: 'language',
    displayLabel: 'Solidity',
    aliases: ['solidity', 'sol', 'evm', 'smart-contracts', 'smartcontracts'],
    parentDomain: 'domain.web3',
    relatedSkills: ['domain.web3']
  },
  'language.kotlin': {
    id: 'language.kotlin',
    category: 'language',
    displayLabel: 'Kotlin',
    aliases: ['kotlin', 'kt'],
    parentDomain: 'domain.mobile',
    relatedSkills: ['domain.mobile']
  },
  'language.swift': {
    id: 'language.swift',
    category: 'language',
    displayLabel: 'Swift',
    aliases: ['swift', 'swiftui', 'ios'],
    parentDomain: 'domain.mobile',
    relatedSkills: ['domain.mobile']
  },
  'language.dart': {
    id: 'language.dart',
    category: 'language',
    displayLabel: 'Dart',
    aliases: ['dart', 'flutter'],
    parentDomain: 'domain.mobile',
    relatedSkills: ['domain.mobile']
  },
  'language.php': {
    id: 'language.php',
    category: 'language',
    displayLabel: 'PHP',
    aliases: ['php', 'php8', 'laravel'],
    parentDomain: 'domain.backend',
    relatedSkills: ['framework.laravel']
  },
  'language.ruby': {
    id: 'language.ruby',
    category: 'language',
    displayLabel: 'Ruby',
    aliases: ['ruby', 'rb', 'rails', 'ruby-on-rails'],
    parentDomain: 'domain.backend',
    relatedSkills: ['framework.rails']
  },
  'language.sql': {
    id: 'language.sql',
    category: 'language',
    displayLabel: 'SQL',
    aliases: ['sql', 'rdbms', 'relational-database'],
    parentDomain: 'domain.data',
    relatedSkills: ['database.postgresql', 'database.mysql']
  },

  // --- Frameworks & Libraries ---
  'framework.react': {
    id: 'framework.react',
    category: 'framework',
    displayLabel: 'React',
    aliases: ['react', 'react.js', 'reactjs'],
    parentDomain: 'domain.frontend',
    relatedSkills: ['framework.nextjs', 'language.typescript', 'language.javascript']
  },
  'framework.nextjs': {
    id: 'framework.nextjs',
    category: 'framework',
    displayLabel: 'Next.js',
    aliases: ['next', 'next.js', 'nextjs', 'app-router'],
    parentDomain: 'domain.frontend',
    relatedSkills: ['framework.react', 'language.typescript', 'domain.fullstack']
  },
  'framework.vue': {
    id: 'framework.vue',
    category: 'framework',
    displayLabel: 'Vue.js',
    aliases: ['vue', 'vue.js', 'vuejs', 'nuxt', 'nuxtjs'],
    parentDomain: 'domain.frontend',
    relatedSkills: ['language.javascript', 'language.typescript']
  },
  'framework.angular': {
    id: 'framework.angular',
    category: 'framework',
    displayLabel: 'Angular',
    aliases: ['angular', 'angularjs', 'angular.js'],
    parentDomain: 'domain.frontend',
    relatedSkills: ['language.typescript']
  },
  'framework.svelte': {
    id: 'framework.svelte',
    category: 'framework',
    displayLabel: 'Svelte',
    aliases: ['svelte', 'sveltekit', 'svelte.js'],
    parentDomain: 'domain.frontend',
    relatedSkills: ['language.typescript', 'language.javascript']
  },
  'framework.nodejs': {
    id: 'framework.nodejs',
    category: 'framework',
    displayLabel: 'Node.js',
    aliases: ['node', 'node.js', 'nodejs'],
    parentDomain: 'domain.backend',
    relatedSkills: ['framework.express', 'framework.nestjs', 'domain.backend']
  },
  'framework.express': {
    id: 'framework.express',
    category: 'framework',
    displayLabel: 'Express.js',
    aliases: ['express', 'express.js', 'expressjs'],
    parentDomain: 'domain.backend',
    relatedSkills: ['framework.nodejs']
  },
  'framework.nestjs': {
    id: 'framework.nestjs',
    category: 'framework',
    displayLabel: 'NestJS',
    aliases: ['nestjs', 'nest.js', 'nest'],
    parentDomain: 'domain.backend',
    relatedSkills: ['framework.nodejs', 'language.typescript']
  },
  'framework.fastapi': {
    id: 'framework.fastapi',
    category: 'framework',
    displayLabel: 'FastAPI',
    aliases: ['fastapi', 'fast-api'],
    parentDomain: 'domain.backend',
    relatedSkills: ['language.python']
  },
  'framework.django': {
    id: 'framework.django',
    category: 'framework',
    displayLabel: 'Django',
    aliases: ['django', 'django-rest-framework', 'drf'],
    parentDomain: 'domain.backend',
    relatedSkills: ['language.python']
  },
  'framework.flask': {
    id: 'framework.flask',
    category: 'framework',
    displayLabel: 'Flask',
    aliases: ['flask'],
    parentDomain: 'domain.backend',
    relatedSkills: ['language.python']
  },
  'framework.spring': {
    id: 'framework.spring',
    category: 'framework',
    displayLabel: 'Spring Boot',
    aliases: ['spring', 'spring-boot', 'springboot', 'spring-framework'],
    parentDomain: 'domain.backend',
    relatedSkills: ['language.java']
  },
  'framework.pytorch': {
    id: 'framework.pytorch',
    category: 'framework',
    displayLabel: 'PyTorch',
    aliases: ['pytorch', 'torch'],
    parentDomain: 'domain.ai_ml',
    relatedSkills: ['language.python', 'domain.ai_ml']
  },
  'framework.tensorflow': {
    id: 'framework.tensorflow',
    category: 'framework',
    displayLabel: 'TensorFlow',
    aliases: ['tensorflow', 'tf', 'keras'],
    parentDomain: 'domain.ai_ml',
    relatedSkills: ['language.python', 'domain.ai_ml']
  },
  'framework.tailwind': {
    id: 'framework.tailwind',
    category: 'framework',
    displayLabel: 'Tailwind CSS',
    aliases: ['tailwind', 'tailwindcss', 'tailwind-css'],
    parentDomain: 'domain.frontend',
    relatedSkills: ['domain.frontend']
  },

  // --- Databases ---
  'database.postgresql': {
    id: 'database.postgresql',
    category: 'database',
    displayLabel: 'PostgreSQL',
    aliases: ['postgresql', 'postgres', 'psql', 'supabase'],
    parentDomain: 'domain.data',
    relatedSkills: ['language.sql']
  },
  'database.mongodb': {
    id: 'database.mongodb',
    category: 'database',
    displayLabel: 'MongoDB',
    aliases: ['mongodb', 'mongo', 'nosql', 'mongoose'],
    parentDomain: 'domain.data',
    relatedSkills: ['domain.data']
  },
  'database.mysql': {
    id: 'database.mysql',
    category: 'database',
    displayLabel: 'MySQL',
    aliases: ['mysql', 'mariadb'],
    parentDomain: 'domain.data',
    relatedSkills: ['language.sql']
  },
  'database.redis': {
    id: 'database.redis',
    category: 'database',
    displayLabel: 'Redis',
    aliases: ['redis', 'caching', 'in-memory-db'],
    parentDomain: 'domain.data',
    relatedSkills: ['domain.backend']
  },

  // --- Cloud & DevOps ---
  'cloud_devops.docker': {
    id: 'cloud_devops.docker',
    category: 'cloud_devops',
    displayLabel: 'Docker & Containers',
    aliases: ['docker', 'containers', 'containerization', 'docker-compose'],
    parentDomain: 'domain.devops',
    relatedSkills: ['cloud_devops.kubernetes']
  },
  'cloud_devops.kubernetes': {
    id: 'cloud_devops.kubernetes',
    category: 'cloud_devops',
    displayLabel: 'Kubernetes',
    aliases: ['kubernetes', 'k8s', 'helm'],
    parentDomain: 'domain.devops',
    relatedSkills: ['cloud_devops.docker']
  },
  'cloud_devops.aws': {
    id: 'cloud_devops.aws',
    category: 'cloud_devops',
    displayLabel: 'AWS',
    aliases: ['aws', 'amazon-web-services', 's3', 'lambda', 'ec2'],
    parentDomain: 'domain.cloud',
    relatedSkills: ['domain.cloud']
  },
  'cloud_devops.gcp': {
    id: 'cloud_devops.gcp',
    category: 'cloud_devops',
    displayLabel: 'Google Cloud Platform',
    aliases: ['gcp', 'google-cloud', 'google-cloud-platform', 'bigquery'],
    parentDomain: 'domain.cloud',
    relatedSkills: ['domain.cloud']
  },
  'cloud_devops.ci_cd': {
    id: 'cloud_devops.ci_cd',
    category: 'cloud_devops',
    displayLabel: 'CI/CD & GitHub Actions',
    aliases: ['ci', 'cd', 'ci/cd', 'github-actions', 'gitlab-ci'],
    parentDomain: 'domain.devops',
    relatedSkills: ['domain.devops']
  },

  // --- Technical Domains ---
  'domain.frontend': {
    id: 'domain.frontend',
    category: 'domain',
    displayLabel: 'Frontend & UI Engineering',
    aliases: ['frontend', 'front-end', 'ui', 'ux', 'web', 'web-development', 'client-side'],
    parentDomain: 'domain.frontend'
  },
  'domain.backend': {
    id: 'domain.backend',
    category: 'domain',
    displayLabel: 'Backend & APIs',
    aliases: ['backend', 'back-end', 'api', 'apis', 'rest', 'graphql', 'grpc', 'microservices', 'server-side'],
    parentDomain: 'domain.backend'
  },
  'domain.fullstack': {
    id: 'domain.fullstack',
    category: 'domain',
    displayLabel: 'Full-Stack Development',
    aliases: ['fullstack', 'full-stack', 'mern', 'mean', 't3-stack'],
    parentDomain: 'domain.fullstack'
  },
  'domain.ai_ml': {
    id: 'domain.ai_ml',
    category: 'domain',
    displayLabel: 'AI & Machine Learning',
    aliases: [
      'ai', 'ml', 'ai/ml', 'machine-learning', 'artificial-intelligence',
      'deep-learning', 'llm', 'llms', 'genai', 'generative-ai', 'nlp',
      'computer-vision', 'transformers', 'rag', 'langchain', 'openai', 'gemini'
    ],
    parentDomain: 'domain.ai_ml'
  },
  'domain.data': {
    id: 'domain.data',
    category: 'domain',
    displayLabel: 'Data Science & Databases',
    aliases: ['data', 'data-science', 'analytics', 'data-engineering', 'spark', 'pandas', 'numpy', 'etl'],
    parentDomain: 'domain.data'
  },
  'domain.devops': {
    id: 'domain.devops',
    category: 'domain',
    displayLabel: 'DevOps & SRE',
    aliases: ['devops', 'sre', 'infrastructure', 'terraform', 'ansible', 'linux'],
    parentDomain: 'domain.devops'
  },
  'domain.cloud': {
    id: 'domain.cloud',
    category: 'domain',
    displayLabel: 'Cloud Computing & Serverless',
    aliases: ['cloud', 'serverless', 'cloud-native', 'edge-computing'],
    parentDomain: 'domain.cloud'
  },
  'domain.mobile': {
    id: 'domain.mobile',
    category: 'domain',
    displayLabel: 'Mobile App Development',
    aliases: ['mobile', 'android', 'ios', 'react-native', 'flutter', 'cross-platform'],
    parentDomain: 'domain.mobile'
  },
  'domain.web3': {
    id: 'domain.web3',
    category: 'domain',
    displayLabel: 'Web3 & Blockchain',
    aliases: ['web3', 'blockchain', 'crypto', 'defi', 'nft', 'ethereum', 'solana', 'polygon', 'smart-contract'],
    parentDomain: 'domain.web3'
  },
  'domain.cybersecurity': {
    id: 'domain.cybersecurity',
    category: 'domain',
    displayLabel: 'Cybersecurity & Infosec',
    aliases: ['cybersecurity', 'security', 'infosec', 'pentesting', 'ctf', 'cryptography', 'auth', 'oauth'],
    parentDomain: 'domain.cybersecurity'
  },

  // --- Algorithmic & Problem Solving Skills ---
  'skill.dsa': {
    id: 'skill.dsa',
    category: 'skill',
    displayLabel: 'Data Structures & Algorithms',
    aliases: [
      'dsa', 'algorithms', 'data-structures', 'dynamic-programming', 'dp',
      'graph', 'tree', 'trees', 'binary-tree', 'binary-search-tree', 'trie',
      'binary-search', 'heap', 'backtracking', 'recursion', 'divide-and-conquer',
      'greedy', 'two-pointers', 'sliding-window', 'stack', 'queue', 'linked-list',
      'union-find', 'bit-manipulation'
    ],
    parentDomain: 'domain.backend'
  },
  'skill.problem_solving': {
    id: 'skill.problem_solving',
    category: 'skill',
    displayLabel: 'Competitive Problem Solving & Math',
    aliases: [
      'problem-solving', 'problem_solving', 'competitive-programming', 'cp',
      'math', 'combinatorics', 'game-theory', 'simulation', 'brainteaser',
      'number-theory', 'geometry'
    ],
    parentDomain: 'domain.backend'
  }
};
