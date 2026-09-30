import { httpClient } from '@/shared/api/httpClient';
import type {
  CreateCommentPayload,
  CreateImagePayload,
  CreateProductPayload,
  Product,
  UpdateProductPayload,
} from '../model/types';

export const productApi = {
  list(): Promise<Product[]> {
    return httpClient.get<Product[]>('/products');
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


