import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { Document } from '@langchain/core/documents';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatGroq } from '@langchain/groq';
import config from '../../shared/config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MODEL_CATALOG = {
  groq: [
    {
      value: 'llama-3.3-70b-versatile',
      label: 'Llama 3.3 70B Versatile',
    },
    {
      value: 'llama-3.1-8b-instant',
      label: 'Llama 3.1 8B Instant',
    },
  ],
  gemini: [
    {
      value: 'gemini-2.0-flash',
      label: 'Gemini 2.0 Flash',
    },
    {
      value: 'gemini-2.0-flash-lite',
      label: 'Gemini 2.0 Flash Lite',
    },
  ],
};

const DEFAULT_MODELS = {
  groq: MODEL_CATALOG.groq[0].value,
  gemini: MODEL_CATALOG.gemini[0].value,
};

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'any',
  'are',
  'at',
  'be',
  'before',
  'for',
  'from',
  'how',
  'i',
  'if',
  'in',
  'is',
  'it',
  'me',
  'my',
  'of',
  'on',
  'or',
  'the',
  'to',
  'what',
  'with',
]);

class TextLoader {
  constructor(filePath) {
    this.filePath = filePath;
  }

  async load() {
    const text = await fs.readFile(this.filePath, 'utf-8');
    return [
      new Document({
        pageContent: text,
        metadata: {
          source: this.filePath,
        },
      }),
    ];
  }
}

let knowledgeEntries = [];
let isReady = false;

const modelCache = new Map();

const providerKeys = {
  groq: () => config.groqApiKey,
  gemini: () => config.geminiApiKey,
};

const getConfiguredProviders = () =>
  Object.keys(MODEL_CATALOG).filter((provider) => Boolean(providerKeys[provider]?.()));

const getDefaultProvider = () => {
  if (config.groqApiKey) {
    return 'groq';
  }

  if (config.geminiApiKey) {
    return 'gemini';
  }

  return 'groq';
};

const normalizeValue = (value) => (typeof value === 'string' ? value.trim() : '');

const isSupportedProvider = (provider) =>
  Object.prototype.hasOwnProperty.call(MODEL_CATALOG, provider);

const isSupportedModel = (provider, model) =>
  Boolean(MODEL_CATALOG[provider]?.some((option) => option.value === model));

const uniqueValues = (values) => [...new Set(values.filter(Boolean))];

const parseKnowledgeLabel = (pageContent) => {
  const [rawLabel = 'General'] = pageContent.split(':');
  return rawLabel.trim();
};

const tokenize = (value) =>
  normalizeValue(value)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token && !STOP_WORDS.has(token));

const splitKnowledgeEntries = (documents) =>
  documents.flatMap((document) =>
    document.pageContent
      .split(/\r?\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((pageContent, index) => ({
        id: `${document.metadata.source}:${index}`,
        label: parseKnowledgeLabel(pageContent),
        pageContent,
      })),
  );

const scoreKnowledgeEntry = (entry, tokenSet, playerStats) => {
  const level = playerStats.level ?? 1;
  const failCount = playerStats.failCount ?? 0;
  const text = entry.pageContent.toLowerCase();
  const entryTokens = new Set(tokenize(entry.pageContent));

  let score = 0;

  for (const token of tokenSet) {
    if (entryTokens.has(token)) {
      score += 2;
    }
  }

  if (text.includes(`level ${level}`)) {
    score += 10;
  }

  if (entry.label === 'General') {
    score += 2;
  }

  if (entry.label === 'Strategy') {
    score += 3;
  }

  if (entry.label === 'Warning' && (tokenSet.has('warning') || tokenSet.has('avoid'))) {
    score += 5;
  }

  if (
    failCount >= 2 &&
    ['easier', 'grinding', 'over', 'build', 'strategy', 'class'].some((token) =>
      text.includes(token),
    )
  ) {
    score += 6;
  }

  return score;
};

const retrieveKnowledgeContext = (question, playerStats = {}) => {
  const level = playerStats.level ?? 1;
  const queryTokens = tokenize(question);
  const tokenSet = new Set([...queryTokens, 'level', String(level), `level${level}`]);

  if (playerStats.failCount >= 2) {
    ['easier', 'strategy', 'grinding'].forEach((token) => tokenSet.add(token));
  }

  const rankedEntries = knowledgeEntries
    .map((entry) => ({
      ...entry,
      score: scoreKnowledgeEntry(entry, tokenSet, playerStats),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 6);

  const fallbackEntries = knowledgeEntries.filter((entry) => {
    const text = entry.pageContent.toLowerCase();
    return text.includes(`level ${level}`) || entry.label === 'General';
  });

  const selectedEntries = rankedEntries.length > 0 ? rankedEntries : fallbackEntries.slice(0, 6);

  return {
    contextText: selectedEntries.map((entry) => `- ${entry.pageContent}`).join('\n'),
    sources: uniqueValues(selectedEntries.map((entry) => `Hint Data: ${entry.label}`)),
  };
};

const resolveResponseText = (content) => {
  if (typeof content === 'string') {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }

        return item?.text ?? '';
      })
      .join('\n')
      .trim();
  }

  return String(content ?? '').trim();
};

const classifyCategory = (text) => {
  const lower = text.toLowerCase();
  const warningKeywords = [
    'warning',
    'danger',
    'do not',
    'avoid',
    'careful',
    'instant game over',
    'cursed',
  ];
  const strategyKeywords = [
    'strategy',
    'alternative',
    'try instead',
    'easier',
    'build',
    'class',
    'approach',
    'farming',
  ];

  if (warningKeywords.some((keyword) => lower.includes(keyword))) {
    return 'warning';
  }

  if (strategyKeywords.some((keyword) => lower.includes(keyword))) {
    return 'strategy';
  }

  return 'tip';
};

const createModelClient = ({ provider, model, apiKey }) => {
  if (provider === 'gemini') {
    return new ChatGoogleGenerativeAI({
      apiKey,
      model,
      temperature: 0.4,
      maxRetries: 2,
      maxOutputTokens: 512,
    });
  }

  return new ChatGroq({
    apiKey,
    model,
    temperature: 0.4,
    maxRetries: 2,
    maxTokens: 512,
  });
};

const getChatModel = (selection) => {
  const cacheKey = `${selection.provider}:${selection.model}`;

  if (!modelCache.has(cacheKey)) {
    modelCache.set(cacheKey, createModelClient(selection));
  }

  return modelCache.get(cacheKey);
};

export const resolveAgentSelection = ({ provider, model } = {}) => {
  const configuredProviders = getConfiguredProviders();

  if (configuredProviders.length === 0) {
    return {
      error:
        'No AI provider is configured. Set GROQ_API_KEY or GEMINI_API_KEY before using the game guide.',
    };
  }

  const requestedProvider = normalizeValue(provider).toLowerCase();
  const requestedModel = normalizeValue(model);

  let resolvedProvider = isSupportedProvider(requestedProvider)
    ? requestedProvider
    : getDefaultProvider();
  let notice = '';

  if (!configuredProviders.includes(resolvedProvider)) {
    const fallbackProvider = configuredProviders[0];
    if (requestedProvider) {
      notice = `${requestedProvider} is not configured. Using ${fallbackProvider} instead.`;
    }
    resolvedProvider = fallbackProvider;
  }

  let resolvedModel = isSupportedModel(resolvedProvider, requestedModel)
    ? requestedModel
    : DEFAULT_MODELS[resolvedProvider];

  if (requestedModel && requestedModel !== resolvedModel) {
    const modelNotice = `Model "${requestedModel}" is not available for ${resolvedProvider}. Using ${resolvedModel}.`;
    notice = notice ? `${notice} ${modelNotice}` : modelNotice;
  }

  return {
    provider: resolvedProvider,
    model: resolvedModel,
    apiKey: providerKeys[resolvedProvider](),
    notice: notice || null,
  };
};

export const initChain = async () => {
  const configuredProviders = getConfiguredProviders();

  if (configuredProviders.length === 0) {
    console.warn(
      '[AI Agent] No provider configured. Set GROQ_API_KEY or GEMINI_API_KEY to enable AI features.',
    );
    return;
  }

  try {
    const loader = new TextLoader(path.join(__dirname, 'hintData.txt'));
    const documents = await loader.load();
    knowledgeEntries = splitKnowledgeEntries(documents);
    isReady = knowledgeEntries.length > 0;

    if (isReady) {
      console.log(
        `[AI Agent] Knowledge base ready. Enabled providers: ${configuredProviders.join(', ')}.`,
      );
    }
  } catch (error) {
    console.error('[AI Agent] Failed to initialize:', error.message);
  }
};

export const askAgent = async (question, playerStats = {}, history = [], options = {}) => {
  const selection = resolveAgentSelection(options);

  if (selection.error) {
    return {
      answer: selection.error,
      category: 'warning',
      sources: [],
      provider: options.provider ?? getDefaultProvider(),
      model: options.model ?? DEFAULT_MODELS[getDefaultProvider()],
      notice: null,
    };
  }

  if (!isReady) {
    return {
      answer: 'The AI Game Guide is still starting up. Please try again in a moment.',
      category: 'warning',
      sources: [],
      provider: selection.provider,
      model: selection.model,
      notice: selection.notice,
    };
  }

  const level = playerStats.level ?? 1;
  const xp = playerStats.experiencePoints ?? 0;
  const score = playerStats.score ?? 0;
  const failCount = playerStats.failCount ?? 0;

  const { contextText, sources } = retrieveKnowledgeContext(question, playerStats);
  const adaptiveInstruction =
    failCount >= 2
      ? `This player has failed ${failCount} times. Offer an easier backup plan or safer strategy.`
      : 'Give the strongest direct route that matches the player stats.';

  const systemContent = `You are an expert Game Guide AI assistant for an action RPG.
Use the retrieved knowledge snippets to answer with concise, game-specific help.

Retrieved knowledge:
${contextText}

Player state:
- Level: ${level}
- XP: ${xp}
- Score: ${score}
- Failed attempts on the current challenge: ${failCount}

Rules:
- Keep the answer to 2-4 sentences.
- Use actionable steps, not generic advice.
- Mention a specific item, mechanic, route, or tactic when the knowledge base supports it.
- ${adaptiveInstruction}`;

  const messages = [new SystemMessage(systemContent)];

  if (Array.isArray(history)) {
    for (const message of history) {
      const text = normalizeValue(message?.text);
      if (!text) {
        continue;
      }

      if (message.role === 'guide') {
        messages.push(new AIMessage(text));
      } else {
        messages.push(new HumanMessage(text));
      }
    }
  }

  messages.push(
    new HumanMessage(
      `Question: ${question}\nProvide advice that fits Level ${level} and the current player state.`,
    ),
  );

  try {
    const chatModel = getChatModel(selection);
    const response = await chatModel.invoke(messages);
    const answer = resolveResponseText(response.content);

    return {
      answer,
      category: classifyCategory(answer),
      sources,
      provider: selection.provider,
      model: selection.model,
      notice: selection.notice,
    };
  } catch (error) {
    return {
      answer: `The AI Game Guide could not complete this request: ${error.message}`,
      category: 'warning',
      sources,
      provider: selection.provider,
      model: selection.model,
      notice: selection.notice,
    };
  }
};

export const generateHintForLevel = async (level, options = {}) => {
  const result = await askAgent(
    `Give me a level-specific hint for Level ${level}. Focus on combat tactics, hidden items, or boss strategy.`,
    {
      level,
      experiencePoints: 0,
      score: 0,
      failCount: 0,
    },
    [],
    options,
  );

  return {
    hint: result.answer,
    category: result.category,
    provider: result.provider,
    model: result.model,
    notice: result.notice,
  };
};
