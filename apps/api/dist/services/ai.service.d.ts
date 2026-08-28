import { AiAnalysisInput, AiAnalysisOutput } from '@api-guardian/shared';
declare class AIService {
    private readonly providerInstance;
    readonly providerName: string;
    constructor();
    analyze(input: AiAnalysisInput): Promise<AiAnalysisOutput>;
}
export declare const aiService: AIService;
export {};
//# sourceMappingURL=ai.service.d.ts.map