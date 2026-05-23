/**
 * Job Matcher - Core matching logic
 *
 * Calculates compatibility scores between resumes and job descriptions
 */

import type {
  MatchResult,
  SkillMatch,
  CategoryScore,
  ResumeMatchInput,
  JDMatchInput,
} from './types.js';

// Similarity thresholds
const EXACT_MATCH_THRESHOLD = 0.95;
const PARTIAL_MATCH_THRESHOLD = 0.7;

/**
 * Calculate string similarity (Levenshtein distance based)
 */
function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  if (s1 === s2) return 1.0;

  const len1 = s1.length;
  const len2 = s2.length;

  if (len1 === 0) return len2 === 0 ? 1.0 : 0.0;
  if (len2 === 0) return 0.0;

  const matrix: number[][] = [];

  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  const distance = matrix[len2][len1];
  const maxLen = Math.max(len1, len2);
  return 1 - distance / maxLen;
}

/**
 * Match skills between resume and JD
 */
function matchSkills(
  resumeSkills: string[],
  jdSkills: Array<{ name: string; required: boolean }>
): SkillMatch[] {
  const matches: SkillMatch[] = [];
  const matchedResumeIndices = new Set<number>();

  for (const jdSkill of jdSkills) {
    let bestMatch = -1;
    let bestSimilarity = 0;

    for (let i = 0; i < resumeSkills.length; i++) {
      if (matchedResumeIndices.has(i)) continue;

      const similarity = stringSimilarity(jdSkill.name, resumeSkills[i]);
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = i;
      }
    }

    if (bestMatch >= 0 && bestSimilarity >= PARTIAL_MATCH_THRESHOLD) {
      matchedResumeIndices.add(bestMatch);
      matches.push({
        skill: jdSkill.name,
        hasSkill: true,
        required: jdSkill.required,
        matchQuality: bestSimilarity >= EXACT_MATCH_THRESHOLD ? 'exact' : 'partial',
      });
    } else {
      matches.push({
        skill: jdSkill.name,
        hasSkill: false,
        required: jdSkill.required,
        matchQuality: 'missing',
      });
    }
  }

  return matches;
}

/**
 * Calculate category score
 */
function calculateCategoryScore(
  earnedPoints: number,
  maxPoints: number,
  details: string[]
): CategoryScore {
  const score = Math.min(earnedPoints, maxPoints);
  const percentage = maxPoints > 0 ? (score / maxPoints) * 100 : 0;

  return {
    category: '',
    score,
    maxScore: maxPoints,
    percentage,
    details,
  };
}

/**
 * Calculate hard skills score
 */
function calculateHardSkillsScore(
  skillMatches: SkillMatch[]
): CategoryScore {
  let earned = 0;
  const maxPoints = skillMatches.length * 10;
  const details: string[] = [];

  for (const match of skillMatches) {
    if (match.matchQuality === 'exact') {
      earned += 10;
    } else if (match.matchQuality === 'partial') {
      earned += 7;
    } else if (match.required) {
      details.push(`Missing required skill: ${match.skill}`);
    }
  }

  const matched = skillMatches.filter(m => m.hasSkill).length;
  details.push(`Matched ${matched}/${skillMatches.length} skills`);

  return calculateCategoryScore(earned, maxPoints, details);
}

/**
 * Calculate soft skills score
 */
function calculateSoftSkillsScore(
  resumeSoftSkills: string[],
  jdSoftSkills: Array<{ name: string; required: boolean }>
): CategoryScore {
  const matches = matchSkills(resumeSoftSkills, jdSoftSkills);
  let earned = 0;
  const maxPoints = matches.length * 5;
  const details: string[] = [];

  for (const match of matches) {
    if (match.hasSkill) {
      earned += 5;
    } else if (match.required) {
      details.push(`Missing: ${match.skill}`);
    }
  }

  return calculateCategoryScore(earned, maxPoints, details);
}

/**
 * Calculate experience score
 */
function calculateExperienceScore(
  resumeYears: number,
  resumeLevel: string,
  jdLevel: string,
  jdMinYears?: number
): CategoryScore {
  let earned = 0;
  const maxPoints = 20;
  const details: string[] = [];

  // Years of experience
  if (jdMinYears !== undefined) {
    if (resumeYears >= jdMinYears) {
      earned += 10;
      details.push(`Has ${resumeYears} years experience (required: ${jdMinYears}+)`);
    } else {
      const diff = jdMinYears - resumeYears;
      earned += Math.max(0, 10 - diff * 2);
      details.push(`Has ${resumeYears} years experience, ${diff} years short`);
    }
  } else {
    earned += 10;
  }

  // Career level matching
  const levelWeights: Record<string, number> = {
    entry: 1,
    mid: 2,
    senior: 3,
    lead: 4,
    executive: 5,
  };

  const resumeLevelWeight = levelWeights[resumeLevel] || 2;
  const jdLevelWeight = levelWeights[jdLevel] || 2;

  if (resumeLevelWeight >= jdLevelWeight) {
    earned += 10;
    details.push(`Career level "${resumeLevel}" meets "${jdLevel}" requirement`);
  } else if (resumeLevelWeight === jdLevelWeight - 1) {
    earned += 7;
    details.push(`Career level "${resumeLevel}" slightly below "${jdLevel}"`);
  } else {
    earned += 3;
    details.push(`Career level "${resumeLevel}" significantly below "${jdLevel}"`);
  }

  return calculateCategoryScore(earned, maxPoints, details);
}

/**
 * Calculate education score
 */
function calculateEducationScore(
  resumeEducation: Array<{ degree: string; institution: string }>,
  jdRequirements: Array<{ type: string; description: string; required: boolean }>
): CategoryScore {
  let earned = 0;
  const maxPoints = 10;
  const details: string[] = [];

  const hasDegree = resumeEducation.some(edu =>
    edu.degree.toLowerCase().includes('bachelor') ||
    edu.degree.toLowerCase().includes('master') ||
    edu.degree.toLowerCase().includes('phd')
  );

  const eduRequirement = jdRequirements.find(r => r.type === 'education');

  if (!eduRequirement) {
    earned = 10;
    details.push('No specific education requirements');
  } else if (hasDegree) {
    earned = 10;
    details.push('Meets education requirements');
  } else if (eduRequirement.required) {
    earned = 2;
    details.push('Missing required degree');
  } else {
    earned = 7;
    details.push('Education preferred but not required');
  }

  return calculateCategoryScore(earned, maxPoints, details);
}

/**
 * Calculate overall match score
 */
export function calculateMatch(
  resume: ResumeMatchInput,
  jd: JDMatchInput
): MatchResult {
  // Extract skill names
  const resumeSkillNames = resume.skills.map(s => s.name);
  const jdSoftSkills = jd.softSkills;

  // Match skills
  const skillMatches = matchSkills(resumeSkillNames, jd.allSkills);

  // Calculate category scores
  const hardSkillsScore = calculateHardSkillsScore(
    skillMatches.filter(m => {
      const jdSkill = jd.allSkills.find(s => s.name === m.skill);
      return jdSkill?.category === 'technical';
    })
  );
  hardSkillsScore.category = 'Hard Skills';

  const softSkillsScore = calculateSoftSkillsScore(
    resume.skills.filter(s => s.category === 'soft').map(s => s.name),
    jdSoftSkills
  );
  softSkillsScore.category = 'Soft Skills';

  const experienceScore = calculateExperienceScore(
    resume.totalYearsExperience,
    resume.careerLevel,
    jd.experienceLevel.level,
    jd.experienceLevel.minYears
  );
  experienceScore.category = 'Experience';

  const educationScore = calculateEducationScore(
    resume.education,
    jd.requirements
  );
  educationScore.category = 'Education';

  // Calculate overall score
  const weights = {
    hardSkills: 0.35,
    softSkills: 0.15,
    experience: 0.35,
    education: 0.15,
  };

  const overallScore =
    (hardSkillsScore.score * weights.hardSkills +
      softSkillsScore.score * weights.softSkills +
      experienceScore.score * weights.experience +
      educationScore.score * weights.education);

  const maxOverallScore =
    (hardSkillsScore.maxScore * weights.hardSkills +
      softSkillsScore.maxScore * weights.softSkills +
      experienceScore.maxScore * weights.experience +
      educationScore.maxScore * weights.education);

  const overallPercentage = maxOverallScore > 0
    ? (overallScore / maxOverallScore) * 100
    : 0;

  const matchLevel =
    overallPercentage >= 80 ? 'excellent' :
    overallPercentage >= 60 ? 'good' :
    overallPercentage >= 40 ? 'fair' : 'poor';

  // Analyze gaps
  const missingSkills = skillMatches
    .filter(m => !m.hasSkill)
    .map(m => m.skill);

  const missingRequiredSkills = skillMatches
    .filter(m => !m.hasSkill && m.required)
    .map(m => m.skill);

  const additionalSkills = resumeSkillNames.filter(
    rs => !jd.allSkills.some(js => stringSimilarity(rs, js.name) >= PARTIAL_MATCH_THRESHOLD)
  );

  // Generate recommendations
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];

  if (hardSkillsScore.percentage >= 80) {
    strengths.push(`Strong technical skills match (${hardSkillsScore.percentage.toFixed(0)}%)`);
  } else if (hardSkillsScore.percentage < 50) {
    weaknesses.push(`Technical skills gap (${hardSkillsScore.percentage.toFixed(0)}% match)`);
    recommendations.push('Focus on acquiring missing required skills');
  }

  if (experienceScore.percentage >= 80) {
    strengths.push('Experience level meets or exceeds requirements');
  } else if (experienceScore.percentage < 50) {
    weaknesses.push('Experience level below requirements');
    recommendations.push('Consider roles that better match current experience level');
  }

  if (missingRequiredSkills.length > 0) {
    recommendations.push(`Required skills to develop: ${missingRequiredSkills.join(', ')}`);
  }

  if (additionalSkills.length > 0) {
    strengths.push(`Brings additional expertise: ${additionalSkills.slice(0, 3).join(', ')}`);
  }

  // Radar chart data
  const radarChartData = [
    { category: 'Hard Skills', score: hardSkillsScore.percentage, maxScore: 100 },
    { category: 'Soft Skills', score: softSkillsScore.percentage, maxScore: 100 },
    { category: 'Experience', score: experienceScore.percentage, maxScore: 100 },
    { category: 'Education', score: educationScore.percentage, maxScore: 100 },
  ];

  return {
    overallScore: Math.round(overallScore * 10) / 10,
    overallPercentage: Math.round(overallPercentage * 10) / 10,
    matchLevel,
    hardSkillsScore,
    softSkillsScore,
    experienceScore,
    educationScore,
    skillMatches,
    missingSkills,
    missingRequiredSkills,
    additionalSkills,
    strengths,
    weaknesses,
    recommendations,
    radarChartData,
    calculatedAt: new Date().toISOString(),
    confidence: jd.experienceLevel.confidence,
  };
}
