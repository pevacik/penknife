import type { RequestHandler } from 'express';
import { readSessionToken } from '../auth/cookies';
import { findSessionUser } from '../auth/session';

export const requireAuth: RequestHandler = async (req, res, next) => {
  try {
    const token = readSessionToken(req);
    const user = token ? await findSessionUser(token) : null;

    if (!user) {
      res.status(401).json({ message: 'Требуется вход' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
