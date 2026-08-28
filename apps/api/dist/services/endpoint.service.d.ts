import { CreateEndpointDto, UpdateEndpointDto, Endpoint, CreateAssertionDto, Assertion } from '@api-guardian/shared';
export declare class EndpointService {
    create(userId: string, projectId: string, dto: CreateEndpointDto): Promise<Endpoint>;
    listByProject(userId: string, projectId: string): Promise<Endpoint[]>;
    getById(userId: string, endpointId: string): Promise<Endpoint>;
    update(userId: string, endpointId: string, dto: UpdateEndpointDto): Promise<Endpoint>;
    delete(userId: string, endpointId: string): Promise<void>;
    addAssertion(userId: string, endpointId: string, dto: CreateAssertionDto): Promise<Assertion>;
    updateAssertion(userId: string, endpointId: string, assertionId: string, dto: Partial<CreateAssertionDto>): Promise<Assertion>;
    deleteAssertion(userId: string, endpointId: string, assertionId: string): Promise<void>;
    listAssertions(userId: string, endpointId: string): Promise<Assertion[]>;
}
export declare const endpointService: EndpointService;
//# sourceMappingURL=endpoint.service.d.ts.map