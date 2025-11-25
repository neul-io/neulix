import { Router } from 'express';
import { hello } from './hello';

const api = Router();

api.get('/hello', hello);

export { api };
