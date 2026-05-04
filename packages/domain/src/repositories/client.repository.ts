export interface ClientEntity {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  taxId: string | null;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientRepository {
  findById(id: string): Promise<ClientEntity | null>;
  findMany(
    organizationId: string,
    options?: { skip?: number; take?: number; search?: string }
  ): Promise<{ items: ClientEntity[]; total: number }>;
  create(data: Omit<ClientEntity, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<ClientEntity>;
  update(id: string, data: Partial<ClientEntity>): Promise<void>;
  delete(id: string): Promise<void>;
}