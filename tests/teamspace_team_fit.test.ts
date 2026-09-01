import { computeTeamFit, recommendTeammates } from '../lib/teamspace/team-fit';
import { DeveloperSkillSnapshot } from '../lib/teamspace/types';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('PASS:', msg);
}

async function runTests() {
  console.log('====================================================');
  console.log('TESTING TEAMSPACE TEAM FIT & RECOMMENDATION ALGORITHMS');
  console.log('====================================================');

  const member1: DeveloperSkillSnapshot = {
    user_id: 'user-1',
    full_name: 'Alice Frontend',
    avatar_url: null,
    experience_level: 'intermediate',
    top_languages: ['TypeScript', 'React', 'Next.js'],
    competencies: {
      Frontend: 85,
      'Web Development': 90
    },
    interests: ['AI', 'Web3'],
    overall_score: 80
  };

  const member2: DeveloperSkillSnapshot = {
    user_id: 'user-2',
    full_name: 'Bob Backend',
    avatar_url: null,
    experience_level: 'advanced',
    top_languages: ['Python', 'PostgreSQL', 'FastAPI'],
    competencies: {
      Backend: 88,
      'Data Engineering': 60
    },
    interests: ['Cloud', 'AI'],
    overall_score: 85
  };

  // 1. Test computeTeamFit with required skills
  const teamConfig = {
    required_skills: ['Frontend', 'Backend', 'ML/AI', 'DevOps'],
    max_members: 4
  };

  const fitResult = computeTeamFit(teamConfig, [member1, member2]);

  assert(fitResult.covered_skills.includes('Frontend'), 'Covered skills includes Frontend');
  assert(fitResult.covered_skills.includes('Backend'), 'Covered skills includes Backend');
  assert(fitResult.gap_skills.includes('ML/AI'), 'Gap skills includes ML/AI');
  assert(fitResult.gap_skills.includes('DevOps'), 'Gap skills includes DevOps');
  assert(fitResult.score > 0 && fitResult.score <= 100, `Team fit score computed: ${fitResult.score}%`);
  assert(fitResult.reasons.length > 0, 'Reasons generated for covered and gap skills');

  // 2. Test candidate recommendations
  const aiCandidate: DeveloperSkillSnapshot = {
    user_id: 'user-3',
    full_name: 'Charlie AI',
    avatar_url: null,
    experience_level: 'advanced',
    top_languages: ['Python', 'PyTorch', 'ML/AI'],
    competencies: {
      'Machine Learning': 92,
      'ML/AI': 90
    },
    interests: ['AI', 'Robotics'],
    overall_score: 90
  };

  const devopsCandidate: DeveloperSkillSnapshot = {
    user_id: 'user-4',
    full_name: 'Diana DevOps',
    avatar_url: null,
    experience_level: 'intermediate',
    top_languages: ['Docker', 'Kubernetes', 'DevOps'],
    competencies: {
      DevOps: 85,
      Cloud: 80
    },
    interests: ['Infrastructure'],
    overall_score: 78
  };

  const irrelevantCandidate: DeveloperSkillSnapshot = {
    user_id: 'user-5',
    full_name: 'Evan General',
    avatar_url: null,
    experience_level: 'beginner',
    top_languages: ['HTML', 'CSS'],
    competencies: {},
    interests: ['Gaming'],
    overall_score: 30
  };

  const recommendations = recommendTeammates(member1, fitResult, [
    aiCandidate,
    devopsCandidate,
    irrelevantCandidate
  ]);

  assert(recommendations.length >= 2, `Recommendations returned: ${recommendations.length}`);
  assert(recommendations[0].match_score >= recommendations[1].match_score, 'Recommendations sorted descending by match score');
  assert(recommendations[0].fills_gaps.length > 0, 'Top recommendation fills detected gaps');
  assert(recommendations[0].match_label.includes('% match'), 'Match label formatted properly');

  console.log('====================================================');
  console.log('ALL TEAMSPACE TEAM FIT TESTS PASSED (100% GREEN)');
  console.log('====================================================');
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
