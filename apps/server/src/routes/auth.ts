import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { clearSessionCookie, readSessionToken, setSessionCookie } from '../auth/cookies';
import { hashPassword, verifyPassword } from '../auth/password';
import {
  createSession,
  deleteOtherSessions,
  deleteSession,
  findSessionUser,
  toAuthUser,
} from '../auth/session';
import { prisma } from '../db';
import { requireAuth } from '../middleware/requireAuth';
import { loginRateLimit, passwordChangeRateLimit } from '../middleware/rateLimit';

let dummyHashPromise: Promise<string> | null = null;

function getDummyHash(): Promise<string> {
  dummyHashPromise ??= hashPassword(randomBytes(24).toString('hex'));
  return dummyHashPromise;
}

export const authRouter = Router();

authRouter.post('/login', async (req, res, next) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!username || !password) {
      res.status(400).json({ message: 'Введите логин и пароль' });
      return;
    }

    const key = `${req.ip ?? 'unknown'}:${username.toLowerCase()}`;
    const retryAfterMs = loginRateLimit.retryAfterMs(key);
    if (retryAfterMs > 0) {
      res.setHeader('Retry-After', String(Math.ceil(retryAfterMs / 1000)));
      res.status(429).json({ message: 'Слишком много попыток. Попробуйте позже.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { username } });

    let valid = false;
    if (user) {
      valid = await verifyPassword(password, user.passwordHash);
    } else {
      // Выравниваем время ответа, чтобы нельзя было перебирать существующие логины.
      await verifyPassword(password, await getDummyHash());
    }

    if (!user || !valid) {
      loginRateLimit.fail(key);
      res.status(401).json({ message: 'Неверный логин или пароль' });
      return;
    }

    loginRateLimit.reset(key);
    const session = await createSession(user.id);
    setSessionCookie(res, session.token, session.expiresAt);

    res.json({ user: toAuthUser(user) });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/password', requireAuth, async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ message: 'Требуется вход' });
      return;
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const currentPassword =
      typeof body.currentPassword === 'string' ? body.currentPassword : '';
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';

    if (!currentPassword || !newPassword) {
      res.status(400).json({ message: 'Укажите текущий и новый пароль' });
      return;
    }
    if (newPassword.length < 12 || newPassword.length > 200) {
      res.status(400).json({ message: 'Новый пароль должен быть от 12 до 200 символов' });
      return;
    }
    if (newPassword === currentPassword) {
      res.status(400).json({ message: 'Новый пароль должен отличаться от текущего' });
      return;
    }

    const key = `${req.ip ?? 'unknown'}:${user.id}`;
    const retryAfterMs = passwordChangeRateLimit.retryAfterMs(key);
    if (retryAfterMs > 0) {
      res.setHeader('Retry-After', String(Math.ceil(retryAfterMs / 1000)));
      res.status(429).json({ message: 'Слишком много попыток. Попробуйте позже.' });
      return;
    }

    const record = await prisma.user.findUnique({ where: { id: user.id } });
    if (!record) {
      res.status(401).json({ message: 'Требуется вход' });
      return;
    }

    const valid = await verifyPassword(currentPassword, record.passwordHash);
    if (!valid) {
      passwordChangeRateLimit.fail(key);
      res.status(400).json({ message: 'Текущий пароль неверен' });
      return;
    }

    passwordChangeRateLimit.reset(key);
    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
        passwordChangedById: user.id,
        passwordChangedByName: user.username,
      },
    });

    // Остальные устройства разлогиниваем, текущую сессию оставляем.
    const token = readSessionToken(req);
    if (token) {
      await deleteOtherSessions(user.id, token);
    }

    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

authRouter.post('/logout', async (req, res, next) => {
  try {
    const token = readSessionToken(req);
    if (token) {
      await deleteSession(token);
    }
    clearSessionCookie(res);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

authRouter.get('/me', async (req, res, next) => {
  try {
    const token = readSessionToken(req);
    const user = token ? await findSessionUser(token) : null;

    if (!user) {
      res.status(401).json({ message: 'Требуется вход' });
      return;
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
});
