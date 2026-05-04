export type UserRole = 'ADMIN' | 'MEMBER';

export interface UserEntity {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRepository {
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findMany(
    organizationId: string,
    options?: { skip?: number; take?: number; search?: string }
  ): Promise<{ items: UserEntity[]; total: number }>;
  create(data: Omit<UserEntity, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<UserEntity>;
  update(id: string, data: Partial<UserEntity>): Promise<void>;
  delete(id: string): Promise<void>;
}