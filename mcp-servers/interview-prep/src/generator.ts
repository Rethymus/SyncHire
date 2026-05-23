/**
 * Interview Prep Generator
 *
 * Generates interview questions, templates, and preparation materials
 * based on resume and job description analysis.
 */

import type {
  InterviewPrep,
  InterviewQuestion,
  SelfIntroTemplate,
  ReverseQuestion,
  ResumePrepInput,
  JDPrepInput,
} from './types.js';

/**
 * Generate HR screening questions
 */
function generateHRQuestions(
  resume: ResumePrepInput,
  _jd: JDPrepInput
): InterviewQuestion[] {
  const questions: InterviewQuestion[] = [];

  // Basic HR questions
  questions.push({
    question: 'Tell me about yourself.',
    category: 'hr',
    priority: 'high',
    talkingPoints: [
      'Current role and background',
      'Key achievements',
      'Why you\'re interested in this role',
    ],
  });

  questions.push({
    question: 'Walk me through your resume.',
    category: 'hr',
    priority: 'high',
    talkingPoints: [
      'Career progression',
      'Key transitions',
      'Gaps or career changes',
    ],
  });

  // Check for employment gaps
  if (resume.experience.length > 1) {
    questions.push({
      question: 'I notice there\'s a gap between [previous role] and [current role]. Can you tell me about that?',
      category: 'hr',
      priority: 'medium',
      talkingPoints: [
        'Be honest and brief',
        'Focus on what you learned or did during that time',
        'Connect back to your readiness for this role',
      ],
    });
  }

  // Job hopper check
  const recentJobs = resume.experience.slice(0, 3);
  if (recentJobs.length >= 2) {
    const avgTenure = resume.totalYearsExperience / recentJobs.length;
    if (avgTenure < 2) {
      questions.push({
        question: 'You\'ve had several roles in the past few years. What are you looking for in terms of longevity?',
        category: 'hr',
        priority: 'high',
        talkingPoints: [
          'What you learned in each role',
          'Why this role is different',
          'Your long-term career goals',
        ],
      });
    }
  }

  // Career change questions
  if (resume.experience.length > 0) {
    const firstRole = resume.experience[0];
    const lastRole = resume.experience[resume.experience.length - 1];
    if (firstRole.title !== lastRole.title) {
      questions.push({
        question: `What made you transition from ${firstRole.title} to ${lastRole.title}?`,
        category: 'hr',
        priority: 'medium',
        talkingPoints: [
          'The motivation behind the change',
          'Transferable skills you brought',
          'Success in the new direction',
        ],
      });
    }
  }

  return questions;
}

/**
 * Generate technical deep-dive questions
 */
function generateTechnicalQuestions(
  resume: ResumePrepInput,
  jd: JDPrepInput
): InterviewQuestion[] {
  const questions: InterviewQuestion[] = [];

  // Questions for each key skill in the JD
  const requiredSkills = jd.hardSkills.filter(s => s.required).slice(0, 5);

  for (const skill of requiredSkills) {
    const hasSkill = resume.skills.some(
      rs => rs.name.toLowerCase() === skill.name.toLowerCase()
    );

    if (hasSkill) {
      // Find projects/experience with this skill
      const relevantExperience = resume.experience.filter(exp =>
        exp.technologies.some(tech =>
          tech.toLowerCase() === skill.name.toLowerCase()
        )
      );

      if (relevantExperience.length > 0) {
        const exp = relevantExperience[0];
        questions.push({
          question: `Tell me about your experience with ${skill.name} at ${exp.company}.`,
          category: 'technical',
          priority: 'high',
          talkingPoints: [
            'Specific project or problem solved',
            'Your role and contributions',
            'Challenges faced and how you overcame them',
            'Results and impact',
          ],
        });
      } else {
        questions.push({
          question: `How would you rate your proficiency in ${skill.name}? Can you give an example of a project where you used it?`,
          category: 'technical',
          priority: 'high',
          talkingPoints: [
            'Honest assessment of your level',
            'Concrete example',
            'What you\'ve learned recently',
          ],
        });
      }
    } else {
      questions.push({
        question: `${skill.name} is listed as a required skill. How would you approach learning it if hired?`,
        category: 'technical',
        priority: 'high',
        talkingPoints: [
          'Relevant transferable skills',
          'Learning plan or approach',
          'Examples of learning new technologies quickly',
        ],
      });
    }
  }

  // Project deep-dives
  if (resume.projects && resume.projects.length > 0) {
    const flagshipProject = resume.projects[0];
    questions.push({
      question: `Tell me about your ${flagshipProject.title} project. What was your role and what made it challenging?`,
      category: 'technical',
      priority: 'high',
      talkingPoints: [
        'Your specific contributions',
        'Technical challenges',
        'Decisions made and trade-offs',
        'Results and impact',
      ],
    });
  }

  return questions;
}

/**
 * Generate behavioral questions
 */
function generateBehavioralQuestions(
  resume: ResumePrepInput,
  _jd: JDPrepInput
): InterviewQuestion[] {
  const questions: InterviewQuestion[] = [];

  // Leadership questions
  if (resume.careerLevel === 'senior' || resume.careerLevel === 'lead') {
    questions.push({
      question: 'Tell me about a time you had to lead a team through a difficult technical challenge.',
      category: 'behavioral',
      priority: 'high',
      talkingPoints: [
        'The situation and stakes',
        'Your leadership approach',
        'How you motivated the team',
        'The outcome',
      ],
    });
  }

  // Conflict resolution
  questions.push({
    question: 'Tell me about a time you disagreed with a team member or stakeholder. How did you handle it?',
    category: 'behavioral',
    priority: 'high',
    talkingPoints: [
      'The context of the disagreement',
      'Your approach to resolution',
      'What you learned',
      'How you apply that learning',
    ],
  });

  // Failure/learning
  questions.push({
    question: 'Tell me about a time a project you worked on didn\'t go as planned. What happened and what did you learn?',
    category: 'behavioral',
    priority: 'medium',
    talkingPoints: [
      'The situation and what went wrong',
      'Your role in it',
      'What you learned',
      'How you\'ve applied those lessons',
    ],
  });

  // Tight deadline
  questions.push({
    question: 'Describe a time you had to deliver under a tight deadline.',
    category: 'behavioral',
    priority: 'medium',
    talkingPoints: [
      'The constraints',
      'How you prioritized',
      'The outcome',
      'What you\'d do differently',
    ],
  });

  // Innovation
  questions.push({
    question: 'Tell me about a time you identified a process improvement opportunity and implemented it.',
    category: 'behavioral',
    priority: 'medium',
    talkingPoints: [
      'How you identified the opportunity',
      'Your proposed solution',
      'Implementation approach',
      'Measurable impact',
    ],
  });

  return questions;
}

/**
 * Generate self-introduction template
 */
function generateSelfIntro(
  resume: ResumePrepInput,
  jd: JDPrepInput
): SelfIntroTemplate {
  const highlightFromResume: string[] = [];

  // Top achievements
  const topAchievements = resume.experience
    .flatMap(exp => exp.achievements)
    .slice(0, 3);
  highlightFromResume.push(...topAchievements);

  // Key skills matching JD
  const matchingSkills = resume.skills.filter(rs =>
    jd.hardSkills.some(jdSkill =>
      jdSkill.name.toLowerCase() === rs.name.toLowerCase()
    )
  ).slice(0, 5);

  highlightFromResume.push(...matchingSkills.map(s => s.name));

  const connectToJD: string[] = [];

  if (jd.responsibilities.length > 0) {
    const topResponsibility = jd.responsibilities[0];
    connectToJD.push(`Focus on your experience with ${topResponsibility.title}`);
  }

  const requiredSkills = jd.hardSkills.filter(s => s.required).slice(0, 3);
  connectToJD.push(...requiredSkills.map(s => `Mention your ${s.name} experience`));

  const demonstrateCulturalFit: string[] = [
    'Show enthusiasm for the company mission',
    'Mention collaborative experiences',
    'Highlight adaptability and learning agility',
  ];

  const example = `"Hi, I'm ${resume.personalInfo.name || '[Your Name]'}. I'm a ${resume.careerLevel} ${resume.experience[resume.experience.length - 1]?.title || 'professional'} with ${resume.totalYearsExperience} years of experience, primarily working with ${matchingSkills.map(s => s.name).slice(0, 3).join(', ')}.

Currently, I'm most excited about [recent project or achievement]. What drew me to this ${jd.title} role at ${jd.company || 'your company'} is [specific aspect of the role or company]. I believe my experience with [top matching skill] would allow me to contribute to [key responsibility] right away.

I'm particularly motivated by [company mission/value that resonates], and I'd love to help the team [specific goal or outcome]."`;

  return {
    hook: 'Start with your current role + one impressive achievement',
    structure: [
      'Who you are + current role',
      'Key achievement or project',
      'Why you\'re interested in THIS role',
      'What you\'ll bring to the role',
    ],
    customization: {
      highlightFromResume,
      connectToJD,
      demonstrateCulturalFit,
    },
    example,
  };
}

/**
 * Generate reverse questions (for candidate to ask)
 */
function generateReverseQuestions(
  _resume: ResumePrepInput,
  jd: JDPrepInput
): ReverseQuestion[] {
  return [
    {
      question: `What does success look like in the first 90 days for this ${jd.title} role?`,
      category: 'role',
      whenToAsk: 'When asked about your goals or timeline',
    },
    {
      question: 'Can you tell me about the team I\'d be working with and how this role collaborates with other departments?',
      category: 'team',
      whenToAsk: 'When discussing team dynamics or culture',
    },
    {
      question: 'What are the biggest challenges the team is currently facing?',
      category: 'role',
      whenToAsk: 'When discussing responsibilities or expectations',
    },
    {
      question: 'How does the company approach professional development and growth for this role?',
      category: 'growth',
      whenToAsk: 'When discussing career progression',
    },
    {
      question: 'What do you enjoy most about working here?',
      category: 'culture',
      whenToAsk: 'When discussing culture or work environment',
    },
    {
      question: 'How would you describe the company\'s culture and values in action?',
      category: 'culture',
      whenToAsk: 'When discussing culture fit',
    },
    {
      question: `What are the top priorities for the ${jd.title} role in the next 6-12 months?`,
      category: 'role',
      whenToAsk: 'When discussing role expectations',
    },
  ];
}

/**
 * Generate preparation checklist
 */
function generateChecklist(
  _resume: ResumePrepInput,
  _jd: JDPrepInput
): InterviewPrep['checklist'] {
  return [
    {
      category: 'Research',
      items: [
        'Research the company and its products/services',
        'Review the company\'s recent news or announcements',
        'Research your interviewer(s) on LinkedIn',
        'Understand the company culture and values',
      ],
      completed: false,
    },
    {
      category: 'Preparation',
      items: [
        'Practice your self-introduction',
        'Prepare stories for behavioral questions (STAR method)',
        'Review your technical skills and projects',
        'Prepare questions to ask the interviewer',
        'Review the job description in detail',
      ],
      completed: false,
    },
    {
      category: 'Logistics',
      items: [
        'Test your technology (if virtual)',
        'Prepare your environment (quiet, professional)',
        'Have your resume and notes ready',
        'Plan to arrive 10-15 minutes early (if in person)',
      ],
      completed: false,
    },
    {
      category: 'Follow-up',
      items: [
        'Send a thank-you note within 24 hours',
        'Connect with interviewers on LinkedIn',
        'Reflect on what went well and what to improve',
      ],
      completed: false,
    },
  ];
}

/**
 * Generate complete interview prep
 */
export function generateInterviewPrep(
  resume: ResumePrepInput,
  jd: JDPrepInput
): InterviewPrep {
  return {
    hrQuestions: generateHRQuestions(resume, jd),
    technicalQuestions: generateTechnicalQuestions(resume, jd),
    behavioralQuestions: generateBehavioralQuestions(resume, jd),
    selfIntroduction: generateSelfIntro(resume, jd),
    reverseQuestions: generateReverseQuestions(resume, jd),
    checklist: generateChecklist(resume, jd),
    generatedAt: new Date().toISOString(),
    targetRole: jd.title,
    targetCompany: jd.company,
  };
}
