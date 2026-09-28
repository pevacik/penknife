export interface Product {
  id: string;
  title: string;
  minOrder: string;
  productionTime: string;
  description: string;
  createdAt: string;
}

export interface CreateProductPayload {
  title?: string;
  minOrder?: string;
  productionTime?: string;
  description?: string;
}

export type UpdateProductPayload = Partial<CreateProductPayload>;

