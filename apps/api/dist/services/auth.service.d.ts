import { AuthTokens, AuthUser, RegisterDto, LoginDto } from '@api-guardian/shared';
export declare class AuthService {
    register(dto: RegisterDto): Promise<{
        user: AuthUser;
        tokens: AuthTokens;
    }>;
    login(dto: LoginDto): Promise<{
        user: AuthUser;
        tokens: AuthTokens;
    }>;
    refreshTokens(refreshToken: string): Promise<AuthTokens>;
    getProfile(userId: string): Promise<AuthUser>;
    updateProfile(userId: string, updates: {
        name?: string;
    }): Promise<AuthUser>;
    changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
}
export declare const authService: AuthService;
//# sourceMappingURL=auth.service.d.ts.map