import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError, ForbiddenError } from '../lib/errors.js';
import prisma from '../prisma/client.js';

export interface JwtPayload {
  sub: string; // userId
  email: string;
  iat?: number;
  exp?: number;
}

// Extend Express Request to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
      };
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid Authorization header');
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET ?? 'change-me-in-production',
    ) as JwtPayload;

    req.user = { id: payload.sub, email: payload.email, name: '' };
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token expired');
    }
    throw new UnauthorizedError('Invalid token');
  }
}

// Middleware that also loads full user from DB (for routes needing name etc.)
export async function authenticateWithUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  authenticate(req, res, async () => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { id: true, email: true, name: true },
      });
      if (!user) {
        next(new UnauthorizedError('User not found'));
        return;
      }
      req.user = user;
      next();
    } catch (err) {
      next(err);
    }
  });
}

/**
 * Verifies that the authenticated user owns the given project.
 */
export async function requireProjectOwnership(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const projectId = req.params.projectId ?? req.params.id;
    if (!projectId) {
      next(new ForbiddenError('Project ID required'));
      return;
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    });

    if (!project) {
      // Don't reveal existence — return 403
      next(new ForbiddenError('Access denied'));
      return;
    }

    if (project.userId !== req.user!.id) {
      next(new ForbiddenError('Access denied'));
      return;
    }

    next();
  } catch (err) {
    next(err);
  }
}
