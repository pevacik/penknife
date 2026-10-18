import { httpClient } from '@/shared/api/httpClient';
import type {
  CreateCommentPayload,
  CreateImagePayload,
  CreateProductPayload,
  Product,
  ProductListParams,
  ProductListResponse,
  UpdateProductPayload,
} from '../model/types';

export const productApi = {
  list(params: ProductListParams = {}): Promise<ProductListResponse> {
    const search = new URLSearchParams();
    if (params.page !== undefined) search.set('page', String(params.page));
    if (params.limit !== undefined) search.set('limit', String(params.limit));
    if (params.query) search.set('query', params.query);
    if (params.country && params.country !== 'all') search.set('country', params.country);
    if (params.circulation) search.set('circulation', params.circulation);
    if (params.maxBudget) search.set('maxBudget', params.maxBudget);
    if (params.make50 && params.make50 !== 'all') search.set('make50', params.make50);
    const query = search.toString();
    return httpClient.get<ProductListResponse>(`/products${query ? `?${query}` : ''}`);
  },

  listAll(): Promise<Product[]> {
    return httpClient.get<Product[]>('/products/all');
  },

  get(id: string): Promise<Product | null> {
    return httpClient.get<Product>(`/products/${id}`).catch((error) => {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    });
  },

  exportPdf(items: Array<{ id: string; comment: string }>): Promise<Blob> {
    return httpClient.postBlob('/products/export-pdf', { items });
  },

  create(payload: CreateProductPayload = {}): Promise<Product> {
    return httpClient.post<Product>('/products', payload);
  },

  update(id: string, payload: UpdateProductPayload): Promise<Product> {
    return httpClient.patch<Product>(`/products/${id}`, payload);
  },

  remove(id: string): Promise<void> {
    return httpClient.delete<void>(`/products/${id}`);
  },

  addComment(id: string, payload: CreateCommentPayload): Promise<Product> {
    return httpClient.post<Product>(`/products/${id}/comments`, payload);
  },

  deleteComment(id: string, commentId: string): Promise<Product> {
    return httpClient.delete<Product>(`/products/${id}/comments/${commentId}`);
  },

  deleteCommentImage(id: string, commentId: string, imageId: string): Promise<Product> {
    return httpClient.delete<Product>(`/products/${id}/comments/${commentId}/images/${imageId}`);
  },

  addImage(id: string, payload: CreateImagePayload): Promise<Product> {
    return httpClient.post<Product>(`/products/${id}/images`, payload);
  },

  deleteImage(id: string, imageId: string): Promise<Product> {
    return httpClient.delete<Product>(`/products/${id}/images/${imageId}`);
  },
};


