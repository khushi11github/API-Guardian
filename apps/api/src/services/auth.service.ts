import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import prisma from '../prisma/client.js';
import { ConflictError, UnauthorizedError } from '../lib/errors.js';
import { AuthTokens, AuthUser, RegisterDto, LoginDto } from '@api-guardian/shared';

const JWT_SECRET = process.env.JWT_SECRET ?? 'change-me-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'change-me-refresh';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d';

function signAccessToken(userId: string, email: string): string {
  return jwt.sign({ sub: userId, email }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN as string,
  });
}

function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN as string,
  });
}

export class AuthService {
  async register(dto: RegisterDto): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const existing = await prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictError('An account with this email already exists');
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });

    const user = await prisma.user.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        name: dto.name.trim(),
        passwordHash,
      },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    const tokens: AuthTokens = {
      accessToken: signAccessToken(user.id, user.email),
      refreshToken: signRefreshToken(user.id),
    };

    return { user, tokens };
  }

  async login(dto: LoginDto): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const user = await prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user) {
      // Prevent timing attacks — always hash even if user not found
      await argon2.hash('dummy-password');
      throw new UnauthorizedError('Invalid email or password');
    }

    const validPassword = await argon2.verify(user.passwordHash, dto.password);
    if (!validPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const tokens: AuthTokens = {
      accessToken: signAccessToken(user.id, user.email),
      refreshToken: signRefreshToken(user.id),
    };

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
      tokens,
    };
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    try {
      const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { sub: string };
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true },
      });

      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      return {
        accessToken: signAccessToken(user.id, user.email),
        refreshToken: signRefreshToken(user.id),
      };
    } catch (err) {
      if (err instanceof UnauthorizedError) throw err;
      throw new UnauthorizedError('Invalid refresh token');
    }
  }

  async getProfile(userId: string): Promise<AuthUser> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    if (!user) throw new UnauthorizedError('User not found');
    return user;
  }

  async updateProfile(userId: string, updates: { name?: string }): Promise<AuthUser> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(updates.name && { name: updates.name.trim() }),
      },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    return user;
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedError('User not found');

    const valid = await argon2.verify(user.passwordHash, currentPassword);
    if (!valid) throw new UnauthorizedError('Current password is incorrect');

    const newHash = await argon2.hash(newPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });
  }
}

export const authService = new AuthService();
