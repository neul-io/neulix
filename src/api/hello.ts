import type { Request, Response } from 'express';

export function hello(_req: Request, res: Response) {
  res.json({ message: 'Hello, World!' });
}
