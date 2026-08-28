import { CreateProjectDto, UpdateProjectDto, Project } from '@api-guardian/shared';
export declare class ProjectService {
    create(userId: string, dto: CreateProjectDto): Promise<Project>;
    list(userId: string): Promise<Project[]>;
    getById(userId: string, projectId: string): Promise<Project>;
    update(userId: string, projectId: string, dto: UpdateProjectDto): Promise<Project>;
    delete(userId: string, projectId: string): Promise<void>;
    verifyOwnership(userId: string, projectId: string): Promise<void>;
}
export declare const projectService: ProjectService;
//# sourceMappingURL=project.service.d.ts.map