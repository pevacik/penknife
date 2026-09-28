export interface Product {
  id: string;
  title: string;
  minOrder: string;
  productionTime: string;
  description: string;
  createdAt: string;
}

export type ProductEditableFields = Pick<
  Product,
  'title' | 'minOrder' | 'productionTime' | 'description'
>;

export type UpdateProductPayload = Partial<ProductEditableFields>;
