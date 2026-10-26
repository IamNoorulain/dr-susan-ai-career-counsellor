/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface QuestionnaireAnswers {
  educationLevel: string; // Q1
  matricResults: string; // Q2
  intermediateResults: string; // Q3
  enjoyedSubjects: string; // Q4
  dislikedSubjects: string; // Q5
  hobbies: string; // Q6
  strengths: string; // Q7
  futureJobActivities: string; // Q8
  existingSkills: string; // Q9
  careerValues: string; // Q10 (income, stability, etc.)
  practicalConstraints: string; // Q11 (finances, location, family)
  fiveYearVision: string; // Q12
}

export interface CareerRecommendationItem {
  rank: number;
  title: string;
  fitExplanation: string;
}

export interface AdditionalCareerItem {
  title: string;
  fitExplanation: string;
}

export interface StructuredAssessment {
  profileSummaryBullets: string[];
  topRecommendations: CareerRecommendationItem[];
  additionalRecommendations?: AdditionalCareerItem[];
  closingThought?: string;
  suggestedFollowUpQuestion?: string;
  rawText?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  structuredAssessment?: StructuredAssessment;
  isInitialAssessment?: boolean;
}

export interface ConversationSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  answers: QuestionnaireAnswers;
  messages: ChatMessage[];
  language?: AppLanguage;
  structuredAssessment?: StructuredAssessment;
}

export type VoiceMode = 'text' | 'voice-auto';
export type AppLanguage = 'en';

export type AIProviderId = 'gemini' | 'openai' | 'grok' | 'deepseek';

export interface ProviderConfig {
  id: AIProviderId;
  name: string;
  apiKey: string;
  enabled: boolean;
  model: string;
  priority: number;
}

export type AIErrorCode =
  | 'INVALID_KEY'
  | 'QUOTA_EXCEEDED'
  | 'RATE_LIMIT'
  | 'MODEL_UNAVAILABLE'
  | 'NETWORK_ERROR'
  | 'PROVIDER_ERROR'
  | 'UNKNOWN';

export interface AppSettings {
  apiKey: string;
  providers: ProviderConfig[];
  theme: 'light' | 'dark' | 'system';
  language: AppLanguage;
  autoSpeakAssistant: boolean;
}
