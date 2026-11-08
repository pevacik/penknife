export type ProductionCountry = 'china' | 'russia';

export interface ProductComment {
  id: string;
  title: string;
  text: string;
  authorId: string | null;
  authorName: string;
  updatedById: string | null;
  updatedByName: string | null;
  images: ProductImage[];
  createdAt: string;
  updatedAt: string | null;
}

export interface ProductImage {
  id: string;
  url: string;
}

export interface Product {
  id: string;
  title: string;
  price: number;
  circulation: string;
  make50: boolean;
  productionCountry: ProductionCountry;
  tags: string[];
  createdById: string | null;
  createdByName: string | null;
  updatedById: string | null;
  updatedByName: string | null;
  comments: ProductComment[];
  images: ProductImage[];
  createdAt: string;
  updatedAt: string;
}

export type ProductEditableFields = Pick<
  Product,
  'title' | 'price' | 'circulation' | 'make50' | 'productionCountry' | 'tags'
>;

export type UpdateProductPayload = Partial<ProductEditableFields>;

export interface CreateCommentPayload {
  title: string;
  text: string;
  images?: string[];
}

export interface UpdateCommentPayload {
  title: string;
  text: string;
}

export interface CreateImagePayload {
  url: string;
}

export interface ListProductsQuery {
  query?: string;
  country?: 'all' | ProductionCountry;
  circulation?: string;
  maxBudget?: string;
  make50?: 'all' | 'yes';
  page?: number;
  limit?: number;
}

export interface ProductListResult {
  items: Product[];
  total: number;
}
