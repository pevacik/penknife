export type ProductionCountry = 'china' | 'russia';

export type CountryFilter = 'all' | ProductionCountry;

export type Make50Filter = 'all' | 'yes';

export interface ProductComment {
  id: string;
  title: string;
  text: string;
  images: ProductImage[];
  createdAt: string;
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
  comments: ProductComment[];
  images: ProductImage[];
  createdAt: string;
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

export interface CreateImagePayload {
  url: string;
}


