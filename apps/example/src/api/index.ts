import { Router } from 'express';
import { health } from './health';

const api = Router();

api.get('/health', health);

export { api };
