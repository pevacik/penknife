export type ProductionCountry = 'china' | 'russia';

export type CountryFilter = 'all' | ProductionCountry;

export type Make50Filter = 'all' | 'yes';

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

export interface CreateProductPayload {
  title?: string;
  price?: number;
  circulation?: string;
  make50?: boolean;
  productionCountry?: ProductionCountry;
  tags?: string[];
}

export type UpdateProductPayload = Partial<CreateProductPayload>;

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

export interface ProductListParams {
  page?: number;
  limit?: number;
  query?: string;
  country?: CountryFilter;
  circulation?: string;
  maxBudget?: string;
  make50?: Make50Filter;
}

export interface ProductListResponse {
  items: Product[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}


