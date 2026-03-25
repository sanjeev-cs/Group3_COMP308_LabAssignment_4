import { startAuthService } from './microservices/auth-service/index.js';
import { startGameProgressService } from './microservices/game-progress-service/index.js';

await Promise.all([startAuthService(), startGameProgressService()]);
