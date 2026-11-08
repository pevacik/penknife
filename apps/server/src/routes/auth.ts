import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { clearSessionCookie, readSessionToken, setSessionCookie } from '../auth/cookies';
import { hashPassword, verifyPassword } from '../auth/password';
import { encryptPassword, rememberPassword } from '../auth/passwordVault';
import {
  createSession,
  deleteOtherSessions,
  deleteSession,
  findSessionUser,
  toAuthUser,
} from '../auth/session';
import { prisma } from '../db';
import { requireAuth } from '../middleware/requireAuth';
import { loginRateLimit } from '../middleware/rateLimit';
import { recordAudit } from '../audit/record';

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
      await recordAudit(req, {
        action: 'auth.login_failed',
        entityType: 'auth',
        actorName: username,
        title: username,
        details: { reason: user ? 'invalid_password' : 'unknown_user' },
      });
      res.status(401).json({ message: 'Неверный логин или пароль' });
      return;
    }

    loginRateLimit.reset(key);
    const session = await createSession(user.id);
    setSessionCookie(res, session.token, session.expiresAt);

    // Сохраняем обратимую копию пароля для админки (если настроен ключ).
    await rememberPassword(
      (encrypted) =>
        prisma.user.update({
          where: { id: user.id },
          data: { passwordEncrypted: encrypted },
        }),
      password,
    );

    await recordAudit(req, {
      action: 'auth.login',
      entityType: 'auth',
      actorId: user.id,
      actorName: user.username,
      title: user.username,
    });

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
    const newPassword =
      typeof body.newPassword === 'string'
        ? body.newPassword
        : typeof body.password === 'string'
          ? body.password
          : '';

    if (!newPassword) {
      res.status(400).json({ message: 'Укажите новый пароль' });
      return;
    }
    if (newPassword.length < 12 || newPassword.length > 200) {
      res.status(400).json({ message: 'Новый пароль должен быть от 12 до 200 символов' });
      return;
    }

    const record = await prisma.user.findUnique({ where: { id: user.id } });
    if (!record) {
      res.status(401).json({ message: 'Требуется вход' });
      return;
    }

    const passwordHash = await hashPassword(newPassword);
    const passwordEncrypted = encryptPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordEncrypted,
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

    await recordAudit(req, {
      action: 'auth.password_change',
      entityType: 'auth',
      actorId: user.id,
      actorName: user.username,
      title: user.username,
    });

    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

authRouter.post('/logout', async (req, res, next) => {
  try {
    const token = readSessionToken(req);
    const user = token ? await findSessionUser(token) : null;
    if (token) {
      await deleteSession(token);
    }
    clearSessionCookie(res);

    if (user) {
      await recordAudit(req, {
        action: 'auth.logout',
        entityType: 'auth',
        actorId: user.id,
        actorName: user.username,
        title: user.username,
      });
    }

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
