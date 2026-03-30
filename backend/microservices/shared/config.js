import 'dotenv/config';

const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
];

const splitOrigins = (...originValues) =>
  originValues
    .flatMap((value) => (value ?? '').split(','))
    .map((origin) => origin.trim())
    .filter(Boolean);

const toNumber = (value, fallback) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
};

const config = {
  env: process.env.NODE_ENV ?? 'development',
  mongoUri: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017',
  databaseName: process.env.DB_NAME ?? 'comp308_lab3',
  jwtSecret: process.env.JWT_SECRET ?? 'comp308-lab3-development-secret',
  authServicePort: toNumber(process.env.AUTH_SERVICE_PORT, 4001),
  gameProgressServicePort: toNumber(process.env.GAME_PROGRESS_SERVICE_PORT, 4002),
  frontendOrigins: [
    ...new Set(
      [...defaultOrigins, ...splitOrigins(process.env.FRONTEND_URL, process.env.FRONTEND_URLS)],
    ),
  ],
  geminiApiKey: process.env.GEMINI_API_KEY ?? '',
  groqApiKey: process.env.GROQ_API_KEY ?? '',
};

export default config;
