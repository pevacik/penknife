export type ProductionCountry = 'china' | 'russia';

export interface ProductComment {
  id: string;
  title: string;
  text: string;
  createdAt: string;
}

export interface ProductImage {
  id: string;
  url: string;
}

export interface Product {
  id: string;
  title: string;
  circulation: string;
  make50: boolean;
  productionCountry: ProductionCountry;
  comments: ProductComment[];
  images: ProductImage[];
  createdAt: string;
}

export type ProductEditableFields = Pick<
  Product,
  'title' | 'circulation' | 'make50' | 'productionCountry'
>;

export type UpdateProductPayload = Partial<ProductEditableFields>;

export interface CreateCommentPayload {
  title: string;
  text: string;
}

export interface CreateImagePayload {
  url: string;
}
