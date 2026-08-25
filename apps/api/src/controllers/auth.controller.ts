import { Request, Response } from 'express';
import { authService } from '../services/auth.service.js';
import { asyncHandler } from '../lib/errors.js';
import { ApiResponse, AuthTokens, AuthUser } from '@api-guardian/shared';

export const authController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const { user, tokens } = await authService.register(req.body);
    res.status(201).json({
      success: true,
      data: { user, tokens },
      message: 'Account created successfully',
    } satisfies ApiResponse<{ user: AuthUser; tokens: AuthTokens }>);
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const { user, tokens } = await authService.login(req.body);
    res.json({
      success: true,
      data: { user, tokens },
      message: 'Logged in successfully',
    } satisfies ApiResponse<{ user: AuthUser; tokens: AuthTokens }>);
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    const tokens = await authService.refreshTokens(refreshToken);
    res.json({ success: true, data: tokens } satisfies ApiResponse<AuthTokens>);
  }),

  getProfile: asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.getProfile(req.user!.id);
    res.json({ success: true, data: user } satisfies ApiResponse<AuthUser>);
  }),

  updateProfile: asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.updateProfile(req.user!.id, req.body);
    res.json({ success: true, data: user } satisfies ApiResponse<AuthUser>);
  }),

  changePassword: asyncHandler(async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user!.id, currentPassword, newPassword);
    res.json({ success: true, data: null, message: 'Password changed successfully' });
  }),
};
