import { Pool } from 'pg';
export declare function getPool(): Pool;
export declare function setAppCurrentOrganizationId(orgId: string): Promise<void>;
export declare function clearCurrentOrganizationId(): Promise<void>;
export declare function closePool(): Promise<void>;
//# sourceMappingURL=connection.d.ts.map