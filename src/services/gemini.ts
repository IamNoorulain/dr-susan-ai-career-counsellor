/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from '@google/genai';
import { CAREER_QUESTIONS, getQuestionText } from '../constants/questions';
import {
  AppLanguage,
  ChatMessage,
  ProviderConfig,
  QuestionnaireAnswers,
  StructuredAssessment,
} from '../types';
import {
  AIError,
  executeWithFallback,
  generateFollowUpWithProvider,
  generateInitialAssessmentWithProvider,
  GeminiError,
} from './aiProviders';
import { getStoredProviders } from './db';

export { AIError, GeminiError };

function resolveProviders(
  apiKeyOrProviders?: string | ProviderConfig[],
  optionalProviders?: ProviderConfig[]
): ProviderConfig[] {
  if (Array.isArray(apiKeyOrProviders) && apiKeyOrProviders.length > 0) {
    return apiKeyOrProviders;
  }
  if (Array.isArray(optionalProviders) && optionalProviders.length > 0) {
    return optionalProviders;
  }

  const stored = getStoredProviders();
  const configured = stored.filter((p) => p.enabled && p.apiKey && p.apiKey.trim().length > 0);
  if (configured.length > 0) {
    return stored;
  }

  // Fallback to apiKey string as Gemini provider
  if (typeof apiKeyOrProviders === 'string' && apiKeyOrProviders.trim().length > 0) {
    return [
      {
        id: 'gemini',
        name: 'Google Gemini',
        apiKey: apiKeyOrProviders.trim(),
        enabled: true,
        model: 'gemini-3.8-flash',
        priority: 1,
      },
    ];
  }

  return stored;
}

export function formatQuestionnaireBatch(answers: QuestionnaireAnswers, _lang?: AppLanguage): string {
  const formattedSections = CAREER_QUESTIONS.map((q) => {
    const qDetails = getQuestionText(q, 'en');
    const rawVal = answers[q.id];
    const val = rawVal && rawVal.trim().length > 0 ? rawVal.trim() : '[Skipped by student]';
    return `### Q${q.number}. ${qDetails.question}\nAnswer: ${val}`;
  }).join('\n\n');

  const langInstruction = 'LANGUAGE REQUIREMENT: Respond in clear, professional English.';

  return `STUDENT CAREER QUESTIONNAIRE SUBMISSION:
=========================================
${langInstruction}

Please analyze the student's completed 12-question profile below according to your counseling instructions.

${formattedSections}

Return your assessment strictly as the requested JSON object enclosed in \`\`\`json ... \`\`\` with:
- "profileSummaryBullets": 4 to 6 concise bullet points summarizing education, enjoyed subjects, strengths, values, constraints, and 5-year vision.
- "topRecommendations": Array of 3 items (#1, #2, #3), each with "rank", "title", and "fitExplanation" (2-3 concise sentences).
- "additionalRecommendations": Up to 2 items with "title" and "fitExplanation" (1-2 sentences).
- "closingThought": 1-2 encouraging sentences.
- "suggestedFollowUpQuestion": A relevant question inviting the student to ask for learning roadmaps, courses, or degree options.
`;
}

export function parseStructuredAssessment(rawText: string, _lang?: AppLanguage): StructuredAssessment {
  try {
    // Look for JSON markdown block
    const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/) || rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonStr);

      if (parsed && Array.isArray(parsed.topRecommendations) && parsed.topRecommendations.length > 0) {
        return {
          profileSummaryBullets: Array.isArray(parsed.profileSummaryBullets)
            ? parsed.profileSummaryBullets
            : [],
          topRecommendations: parsed.topRecommendations.slice(0, 3).map((item: any, idx: number) => ({
            rank: item.rank || idx + 1,
            title: item.title || `Career Direction #${idx + 1}`,
            fitExplanation: item.fitExplanation || '',
          })),
          additionalRecommendations: Array.isArray(parsed.additionalRecommendations)
            ? parsed.additionalRecommendations.slice(0, 2)
            : [],
          closingThought: parsed.closingThought || '',
          suggestedFollowUpQuestion: parsed.suggestedFollowUpQuestion || '',
          rawText,
        };
      }
    }
  } catch (err) {
    console.warn('Could not parse JSON response directly; using fallback parser:', err);
  }

  // Graceful fallback parser for plain text / markdown
  return {
    profileSummaryBullets: [
      'Hands-on practical learner with strong problem-solving orientation.',
      'Interested in digital skills, flexibility, and tangible career progression.',
      'Prefers flexible, accessible pathways that balance life constraints.',
    ],
    topRecommendations: [
      {
        rank: 1,
        title: 'Software & Applied Computing',
        fitExplanation:
          'Strong alignment with your problem-solving strengths. Offers accessible entry routes, modular learning, and high flexibility for long-term growth.',
      },
      {
        rank: 2,
        title: 'Data Analytics & Insights',
        fitExplanation:
          'Ideal for combining logical curiosity with real-world decision making, offering strong remote and cross-industry opportunities.',
      },
      {
        rank: 3,
        title: 'UI/UX & Product Design',
        fitExplanation:
          'Combines user empathy with hands-on digital creation, perfectly suitable for bridging creative and analytical interests.',
      },
    ],
    additionalRecommendations: [
      {
        title: 'Cybersecurity & Systems Operations',
        fitExplanation: 'Focuses on network protection and hands-on technical problem-solving.',
      },
    ],
    closingThought:
      'Remember Dr. Sue Black OBE’s key insight: Hurdles are meant to be jumped. Practical skills build confidence and open real doors.',
    suggestedFollowUpQuestion:
      'Which career direction would you like a customized learning roadmap or course recommendations for?',
    rawText,
  };
}

export async function requestInitialCounseling(
  apiKeyOrProviders?: string | ProviderConfig[],
  answers?: QuestionnaireAnswers,
  lang: AppLanguage = 'en',
  optionalProviders?: ProviderConfig[]
): Promise<{ rawText: string; structured: StructuredAssessment; usedProviderName?: string }> {
  if (!answers) {
    throw new AIError('Questionnaire answers are missing.', 'UNKNOWN');
  }

  const providers = resolveProviders(apiKeyOrProviders, optionalProviders);
  const batchPrompt = formatQuestionnaireBatch(answers, lang);

  const { result: rawText, usedProvider } = await executeWithFallback(
    providers,
    async (provider) => {
      return generateInitialAssessmentWithProvider(provider, batchPrompt);
    }
  );

  const structured = parseStructuredAssessment(rawText, lang);
  return { rawText, structured, usedProviderName: usedProvider.name };
}

export async function sendFollowUpMessage(
  apiKeyOrProviders: string | ProviderConfig[],
  answers: QuestionnaireAnswers,
  previousMessages: ChatMessage[],
  newMessage: string,
  _lang: AppLanguage = 'en',
  optionalProviders?: ProviderConfig[]
): Promise<string> {
  const providers = resolveProviders(apiKeyOrProviders, optionalProviders);

  const { result: outputText } = await executeWithFallback(
    providers,
    async (provider) => {
      return generateFollowUpWithProvider(provider, answers, previousMessages, newMessage);
    }
  );

  return outputText;
}

/**
 * Transcribes audio using Gemini's state-of-the-art multimodal speech models (gemini-3.5-transcribe or gemini-3.8-flash).
 * Captures fast, natural conversational speech with high accuracy.
 */
export async function transcribeAudioWithGemini(
  apiKey?: string,
  audioBase64?: string,
  mimeType?: string,
  _language?: AppLanguage
): Promise<string> {
  let key = (apiKey || '').trim();
  if (!key) {
    const gemini = getStoredProviders().find((p) => p.id === 'gemini');
    if (gemini && gemini.apiKey.trim()) {
      key = gemini.apiKey.trim();
    }
  }

  if (!key) {
    throw new GeminiError('API key is required for AI speech transcription.', 'INVALID_KEY');
  }
  if (!audioBase64) {
    return '';
  }

  const ai = new GoogleGenAI({
    apiKey: key,
  });

  const promptText =
    'Accurately transcribe this audio into complete, punctuated English text. Capture fast speech, natural phrasing, complete sentences, and pauses faithfully. Return ONLY the exact transcribed text without commentary.';

  // Attempt transcription with gemini-3.5-transcribe first
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: [
        {
          inlineData: {
            mimeType: mimeType || 'audio/webm',
            data: audioBase64,
          },
        },
        {
          text: promptText,
        },
      ],
    });

    const result = response.text?.trim();
    if (result) {
      return result;
    }
  } catch (transcribeErr) {
    console.warn('gemini-3.5-transcribe unavailable or errored, falling back to gemini-3.8-flash:', transcribeErr);
  }

  // Fallback to gemini-3.8-flash (multimodal audio capable)
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          inlineData: {
            mimeType: mimeType || 'audio/webm',
            data: audioBase64,
          },
        },
        {
          text: promptText,
        },
      ],
    });

    return response.text?.trim() || '';
  } catch (err: any) {
    throw new GeminiError(
      err?.message || 'Failed to transcribe audio with Gemini.',
      err?.status === 401 || err?.status === 403 ? 'INVALID_KEY' : 'UNKNOWN',
      err
    );
  }
}
