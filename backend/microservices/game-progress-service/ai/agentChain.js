/**
 * AI Game Guide Agent — Uses Groq (Llama 3.3 70B) for generous free-tier limits.
 *
 * Groq free tier: 14,400 requests/day, 6,000 tokens/min.
 * API key: https://console.groq.com/keys
 */

import config from '../../shared/config.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let knowledgeBase = '';
let isReady = false;

// Groq Chat Completion

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant';

const groqChat = async (systemPrompt, userMessage) => {
  const apiKey = config.groqApiKey || config.geminiApiKey;

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 512,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[AI Agent] Groq HTTP ${response.status}:`, errorBody);
    throw new Error(`Groq API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
};

// Initialization

export const initChain = async () => {
  const apiKey = config.groqApiKey || config.geminiApiKey;

  if (!apiKey) {
    console.warn('[AI Agent] GROQ_API_KEY is not set — AI features will be disabled.');
    return;
  }

  try {
    // Load the hint knowledge base
    knowledgeBase = fs.readFileSync(path.join(__dirname, 'hintData.txt'), 'utf-8');
    isReady = true;
    console.log('[AI Agent] RAG chain initialized — knowledge base loaded (Groq/Llama 3.3).');
  } catch (error) {
    console.error('[AI Agent] Failed to initialize:', error.message);
  }
};

// Category Classification

const classifyCategory = (text) => {
  const lower = text.toLowerCase();

  const warningKeywords = ['warning', 'danger', 'do not', 'avoid', 'careful', 'instant game over', 'cursed'];
  const strategyKeywords = ['strategy', 'alternative', 'try instead', 'easier', 'build', 'class', 'approach', 'farming'];

  if (warningKeywords.some((kw) => lower.includes(kw))) return 'warning';
  if (strategyKeywords.some((kw) => lower.includes(kw))) return 'strategy';
  return 'tip';
};

// Core Agent Function

export const askAgent = async (question, playerStats = {}) => {
  if (!isReady) {
    return {
      answer: 'The AI Game Guide is currently unavailable. Please ensure a valid GROQ_API_KEY is configured.',
      category: 'warning',
      sources: [],
    };
  }

  const level = playerStats.level ?? 1;
  const xp = playerStats.experiencePoints ?? 0;
  const score = playerStats.score ?? 0;
  const failCount = playerStats.failCount ?? 0;

  const adaptiveInstruction = failCount >= 2
    ? `IMPORTANT: This player has failed ${failCount} times. Suggest an easier, alternative strategy. Be encouraging and supportive.`
    : '';

  const systemPrompt = `You are an expert Game Guide AI assistant for an action RPG game.
You analyze player progress and provide helpful, context-aware hints.
Use the Game Knowledge Base below to provide accurate, specific answers.

Game Knowledge Base:
${knowledgeBase}

${adaptiveInstruction}

Rules:
- Be concise, friendly, and actionable (2-4 sentences max).
- Include specific tips relevant to the player's current level.
- If the player has failed multiple times, be encouraging.`;

  const userMessage = `My stats: Level ${level}, XP: ${xp}, Score: ${score}, Failed: ${failCount} times.

Question: ${question}`;

  const maxRetries = 2;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const answer = await groqChat(systemPrompt, userMessage);
      const category = classifyCategory(answer);

      return {
        answer,
        category,
        sources: ['Game Knowledge Base'],
      };
    } catch (error) {
      const isRateLimit = error.message?.includes('429') || error.message?.includes('rate');

      if (isRateLimit && attempt < maxRetries) {
        const waitMs = (attempt + 1) * 5000;
        console.warn(`[AI Agent] Rate limited, retrying in ${waitMs / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }

      console.error('[AI Agent] Query failed:', error.message);

      return {
        answer: isRateLimit
          ? 'The AI Game Guide is temporarily busy. Please wait a moment and try again.'
          : `Sorry, I couldn't process that. Please try again later.`,
        category: 'warning',
        sources: [],
      };
    }
  }
};

/**
 * Generate a hint specifically for a given game level.
 */
export const generateHintForLevel = async (level) => {
  const result = await askAgent(
    `Give me a helpful gameplay hint for Level ${level}. Focus on combat tips, hidden items, or boss strategies.`,
    { level, experiencePoints: 0, score: 0, failCount: 0 },
  );

  return { hint: result.answer, category: result.category };
};
