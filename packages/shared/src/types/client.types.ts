export interface Client {
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

export interface CreateClientInput {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
}

export interface UpdateClientInput {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
}