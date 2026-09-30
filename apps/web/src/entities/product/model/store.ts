import { create } from 'zustand';
import { productApi } from '../api/productApi';
import { normalizeProduct } from '../lib/normalize';
import type {
  CreateCommentPayload,
  CreateImagePayload,
  CreateProductPayload,
  Product,
  UpdateProductPayload,
} from './types';

interface ProductState {
  products: Product[];
  loading: boolean;
  error: string | null;
  loadProducts: () => Promise<void>;
  addProduct: (payload?: CreateProductPayload) => Promise<Product>;
  updateProduct: (id: string, payload: UpdateProductPayload) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addComment: (id: string, payload: CreateCommentPayload) => Promise<void>;
  deleteComment: (id: string, commentId: string) => Promise<void>;
  deleteCommentImage: (id: string, commentId: string, imageId: string) => Promise<void>;
  addImage: (id: string, payload: CreateImagePayload) => Promise<void>;
  deleteImage: (id: string, imageId: string) => Promise<void>;
}

export const useProductStore = create<ProductState>((set) => ({
  products: [],
  loading: false,
  error: null,

  loadProducts: async () => {
    set({ loading: true, error: null });
    try {
      const products = (await productApi.list()).map(normalizeProduct);
      set({ products, loading: false });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Не удалось загрузить данные',
      });
    }
  },

  addProduct: async (payload) => {
    const created = await productApi.create(payload);
    set((state) => ({ products: [...state.products, created] }));
    return created;
  },

  updateProduct: async (id, payload) => {
    const updated = await productApi.update(id, payload);
    set((state) => ({
      products: state.products.map((product) => (product.id === id ? updated : product)),
    }));
  },

  deleteProduct: async (id) => {
    await productApi.remove(id);
    set((state) => ({ products: state.products.filter((product) => product.id !== id) }));
  },

  addComment: async (id, payload) => {
    const updated = await productApi.addComment(id, payload);
    set((state) => ({
      products: state.products.map((product) => (product.id === id ? updated : product)),
    }));
  },

  deleteComment: async (id, commentId) => {
    const updated = await productApi.deleteComment(id, commentId);
    set((state) => ({
      products: state.products.map((product) => (product.id === id ? updated : product)),
    }));
  },

  deleteCommentImage: async (id, commentId, imageId) => {
    const updated = await productApi.deleteCommentImage(id, commentId, imageId);
    set((state) => ({
      products: state.products.map((product) => (product.id === id ? updated : product)),
    }));
  },

  addImage: async (id, payload) => {
    const updated = await productApi.addImage(id, payload);
    set((state) => ({
      products: state.products.map((product) => (product.id === id ? updated : product)),
    }));
  },

  deleteImage: async (id, imageId) => {
    const updated = await productApi.deleteImage(id, imageId);
    set((state) => ({
      products: state.products.map((product) => (product.id === id ? updated : product)),
    }));
  },
}));



