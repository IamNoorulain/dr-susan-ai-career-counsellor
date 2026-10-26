/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { QuestionnaireAnswers, AppLanguage } from '../types';

export interface QuestionDef {
  id: keyof QuestionnaireAnswers;
  number: number;
  question: string;
  subtitle: string;
  placeholder: string;
  chipSuggestions: string[];
  helperText?: string;
}

export const CAREER_QUESTIONS: QuestionDef[] = [
  {
    id: 'educationLevel',
    number: 1,
    question: 'What is your current education level and academic track?',
    subtitle: 'Share where you are currently studying or your highest completed level.',
    placeholder: 'e.g., Currently in 2nd year Intermediate (ICS Computer Science), or Bachelor’s student, or High School...',
    chipSuggestions: [
      'Intermediate (ICS / Computer Science)',
      'Intermediate (Pre-Engineering)',
      'Intermediate (Pre-Medical)',
      'Intermediate (Commerce / I.Com)',
      'A-Levels (Sciences/Maths)',
      'High School / Matriculation',
      'Undergraduate (1st/2nd Year)',
      'Vocational / Technical Diploma',
      'Career Changer / Returning to Study',
    ],
  },
  {
    id: 'matricResults',
    number: 2,
    question: 'What were your Matric or equivalent results?',
    subtitle: 'Share your key subjects (Science, Computer Science, Arts) and approximate percentages or grades.',
    placeholder: 'e.g., 82% in Science with Computer Science (A-One Grade); or O-Levels (6 As, 2 Bs)...',
    chipSuggestions: [
      'Science with Computer Science (>80%)',
      'Science with Biology (>75%)',
      'O-Levels (Mostly A/A* grades)',
      'O-Levels (Mix of A & B grades)',
      'General Science / Arts Group',
      'Results pending / Currently preparing',
    ],
    helperText: 'Remember: grades never define your ceiling. We focus on real aptitude and potential.',
  },
  {
    id: 'intermediateResults',
    number: 3,
    question: 'What are your Intermediate (or A-Levels) results or expected track?',
    subtitle: 'Include your group (Pre-Engineering, ICS, Pre-Medical, Commerce, Humanities) and your scores or current performance.',
    placeholder: 'e.g., ICS Part 1 (76%), currently preparing for Part 2; or Pre-Medical student pivoting to Tech...',
    chipSuggestions: [
      'ICS (Physics / Maths / Computer Science)',
      'ICS (Stats / Maths / Computer Science)',
      'FSc Pre-Engineering',
      'FSc Pre-Medical (exploring tech pivots)',
      'I.Com / Commerce Track',
      'A-Levels (Maths, Physics, Computing)',
      'DAE / Technical 3-Year Diploma',
      'Awaiting results / Taking improvement exam',
    ],
    helperText: 'A non-linear path is common and valid: students transition across disciplines successfully every day.',
  },
  {
    id: 'enjoyedSubjects',
    number: 4,
    question: 'Which subjects or academic topics do you enjoy the most?',
    subtitle: 'Think about classes where time passes quickly and you feel genuinely curious or energized.',
    placeholder: 'e.g., Computer programming, logical maths problems, English creative writing, physics labs...',
    chipSuggestions: [
      'Computer Science & Programming',
      'Mathematics & Logical Puzzles',
      'Physics & How Things Work Mechanics',
      'Design, Visual Arts & Creativity',
      'English, Writing & Communication',
      'Business, Economics & Finance',
      'Psychology & Human Behavior',
      'Biology & Life Sciences',
    ],
  },
  {
    id: 'dislikedSubjects',
    number: 5,
    question: 'Which subjects do you struggle with, find boring, or strongly dislike?',
    subtitle: 'Knowing what drains your energy is just as important to avoid dead-end career paths.',
    placeholder: 'e.g., Pure rote-memorization theory, abstract organic chemistry, repetitive accounting...',
    chipSuggestions: [
      'Heavy Rote Memorization (Ratta)',
      'Pure Abstract Mathematics',
      'Chemistry / Organic Reactions',
      'Biology / Anatomy Diagrams',
      'Accounting & Ledger Bookkeeping',
      'History / Memorizing Dates & Chronology',
      'High-pressure Public Speaking',
    ],
  },
  {
    id: 'hobbies',
    number: 6,
    question: 'What are your hobbies, leisure interests, or creative outlets?',
    subtitle: 'What do you love doing when you have completely free time with no exam pressure?',
    placeholder: 'e.g., PC gaming, editing reels, writing stories, tinkering with computers, building Discord bots...',
    chipSuggestions: [
      'Coding & Building Web Apps',
      'Gaming & Understanding Game Mechanics',
      'Video Editing & Graphic Design',
      'Reading Tech Blogs & Sci-Fi',
      'Fixing Gadgets, Hardware & Electronics',
      'Content Creation & Social Media Management',
      'Drawing, Sketching & Digital Illustration',
      'Playing Sports & Team Games',
    ],
  },
  {
    id: 'strengths',
    number: 7,
    question: 'What do you consider your greatest personal strengths or natural talents?',
    subtitle: 'Think about what friends ask your help with, or problems you solve faster than average.',
    placeholder: 'e.g., Breaking complex problems into steps, staying calm under pressure, organizing people...',
    chipSuggestions: [
      'Logical Problem Solving & Troubleshooting',
      'Fast Self-Learner (via YouTube/docs)',
      'Creative Design & Aesthetic Eye',
      'Clear Written & Spoken Communication',
      'Attention to Detail & Precision',
      'Leadership & Guiding Team Members',
      'Empathy, Patience & Listening to Others',
      'Resourcefulness & Getting Things Done',
    ],
  },
  {
    id: 'futureJobActivities',
    number: 8,
    question: 'What daily work activities would you find most fulfilling?',
    subtitle: 'Imagine your ideal workday: what kind of practical tasks do you want on your screen or desk?',
    placeholder: 'e.g., Writing code to solve problems, analyzing data dashboards, designing UI mockups...',
    chipSuggestions: [
      'Writing Code & Building Software',
      'Analyzing Data & Spotting Trends',
      'Designing User Interfaces (UI/UX)',
      'Protecting Systems & Cybersecurity',
      'Managing Tech Projects & Roadmaps',
      'Consulting & Teaching Others',
      'Creating Digital Marketing Campaigns',
      'Automating Repetitive Manual Work',
    ],
  },
  {
    id: 'existingSkills',
    number: 9,
    question: 'What existing skills, projects, or self-taught experience do you have?',
    subtitle: 'Include small personal projects, beginner tutorials, freelance experiments, or say beginner if starting fresh!',
    placeholder: 'e.g., Completed Python basics on Coursera, built a simple portfolio site in HTML/CSS, beginner...',
    chipSuggestions: [
      'Beginner (No coding experience yet, eager to learn)',
      'HTML, CSS & Basic Web Design',
      'Python Basics / Scripting',
      'C++ / OOP from College Coursework',
      'Figma / UI/UX Design Basics',
      'Video Editing (Premiere, CapCut, DaVinci)',
      'WordPress & Basic Freelancing',
      'Excel & Data Analysis Basics',
    ],
  },
  {
    id: 'careerValues',
    number: 10,
    question: 'What matters most to you in your future career?',
    subtitle: 'Balance salary potential, job security, creative freedom, remote flexibility, and purpose.',
    placeholder: 'e.g., Financial stability and high earning potential first, with ability to work remotely...',
    chipSuggestions: [
      'High Earning Potential & Financial Independence',
      'Remote Work & Global Flexibility',
      'Job Stability & Consistent Industry Demand',
      'Creative Freedom & Innovation',
      'Continuous Learning & Cutting-edge Tech',
      'Positive Social Impact & Helping People',
      'Work-Life Balance & Predictable Hours',
      'Entrepreneurship & Building My Own Business',
    ],
  },
  {
    id: 'practicalConstraints',
    number: 11,
    question: 'What practical constraints should we consider?',
    subtitle: 'Include budget limitations, family commitments, relocation preferences, or time constraints.',
    placeholder: 'e.g., Need affordable degree options or scholarships, cannot relocate outside my city...',
    chipSuggestions: [
      'Need Affordable Tuition / Scholarships',
      'Prefer Self-Paced Online Learning / Certifications',
      'Cannot Relocate to Another City',
      'Need to Start Earning Within 1–2 Years',
      'Balancing Family Care / Part-Time Study',
      'No Strict Constraints / Completely Open',
    ],
  },
  {
    id: 'fiveYearVision',
    number: 12,
    question: 'Where do you see yourself in 5 years?',
    subtitle: 'Envision where you are working, how you live, and what achievement would make you proud.',
    placeholder: 'e.g., Working as a software engineer at a good tech company, earning well, supporting my family...',
    chipSuggestions: [
      'Working in Tech (Software, Data, Cloud, AI)',
      'Working Remotely for International Clients',
      'Financially Independent & Supporting Family',
      'Starting My Own Tech Agency or Startup',
      'Graduating with Strong Portfolio & In-Demand Skills',
      'Confident Specialist Mentoring Others',
    ],
  },
];

export function getQuestionText(q: QuestionDef, _lang?: AppLanguage): {
  question: string;
  subtitle: string;
  placeholder: string;
  chips: string[];
  helperText?: string;
} {
  return {
    question: q.question,
    subtitle: q.subtitle,
    placeholder: q.placeholder,
    chips: q.chipSuggestions,
    helperText: q.helperText,
  };
}

export const INITIAL_ANSWERS: QuestionnaireAnswers = {
  educationLevel: '',
  matricResults: '',
  intermediateResults: '',
  enjoyedSubjects: '',
  dislikedSubjects: '',
  hobbies: '',
  strengths: '',
  futureJobActivities: '',
  existingSkills: '',
  careerValues: '',
  practicalConstraints: '',
  fiveYearVision: '',
};
