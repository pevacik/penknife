import { create } from 'zustand';
import { productApi } from '../api/productApi';
import { normalizeProduct } from '../lib/normalize';
import type {
  CreateCommentPayload,
  CreateImagePayload,
  CreateProductPayload,
  Product,
  ProductListParams,
  UpdateProductPayload,
} from './types';

interface ProductState {
  products: Product[];
  total: number;
  page: number;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  productsById: Record<string, Product>;
  currentParams: ProductListParams;
  loadProducts: (params?: ProductListParams) => Promise<void>;
  loadMore: () => Promise<void>;
  getProduct: (id: string) => Promise<Product | null>;
  addProduct: (payload?: CreateProductPayload) => Promise<Product>;
  updateProduct: (id: string, payload: UpdateProductPayload) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addComment: (id: string, payload: CreateCommentPayload) => Promise<void>;
  deleteComment: (id: string, commentId: string) => Promise<void>;
  deleteCommentImage: (id: string, commentId: string, imageId: string) => Promise<void>;
  addImage: (id: string, payload: CreateImagePayload) => Promise<void>;
  deleteImage: (id: string, imageId: string) => Promise<void>;
}

function mergeById(existing: Record<string, Product>, items: Product[]): Record<string, Product> {
  const next = { ...existing };
  for (const item of items) {
    next[item.id] = item;
  }
  return next;
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  total: 0,
  page: 0,
  hasMore: false,
  loading: false,
  loadingMore: false,
  error: null,
  productsById: {},
  currentParams: {},

  loadProducts: async (params) => {
    const nextParams = params ?? {};
    set({
      loading: true,
      error: null,
      currentParams: nextParams,
      products: [],
      total: 0,
      page: 0,
      hasMore: false,
    });
    try {
      const response = await productApi.list(nextParams);
      const items = response.items.map(normalizeProduct);
      set((state) => ({
        products: items,
        total: response.total,
        page: response.page,
        hasMore: response.hasMore,
        loading: false,
        productsById: mergeById(state.productsById, items),
      }));
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Не удалось загрузить данные',
      });
    }
  },

  loadMore: async () => {
    const { loadingMore, hasMore, page, currentParams } = get();
    if (loadingMore || !hasMore) {
      return;
    }
    set({ loadingMore: true });
    try {
      const response = await productApi.list({ ...currentParams, page: page + 1 });
      const items = response.items.map(normalizeProduct);
      set((state) => ({
        products: [...state.products, ...items],
        total: response.total,
        page: response.page,
        hasMore: response.hasMore,
        loadingMore: false,
        productsById: mergeById(state.productsById, items),
      }));
    } catch (err) {
      set({
        loadingMore: false,
        error: err instanceof Error ? err.message : 'Не удалось загрузить данные',
      });
    }
  },

  getProduct: async (id) => {
    const cached = get().productsById[id];
    if (cached) {
      return cached;
    }
    const product = await productApi.get(id);
    if (!product) {
      return null;
    }
    const normalized = normalizeProduct(product);
    set((state) => ({
      productsById: { ...state.productsById, [normalized.id]: normalized },
    }));
    return normalized;
  },

  addProduct: async (payload) => {
    const created = await productApi.create(payload);
    const normalized = normalizeProduct(created);
    set((state) => ({
      productsById: { ...state.productsById, [normalized.id]: normalized },
    }));
    return normalized;
  },

  updateProduct: async (id, payload) => {
    const updated = normalizeProduct(await productApi.update(id, payload));
    set((state) => ({
      products: state.products.map((product) => (product.id === id ? updated : product)),
      productsById: { ...state.productsById, [id]: updated },
    }));
  },

  deleteProduct: async (id) => {
    await productApi.remove(id);
    set((state) => {
      const productsById = { ...state.productsById };
      delete productsById[id];
      return {
        products: state.products.filter((product) => product.id !== id),
        productsById,
      };
    });
  },

  addComment: async (id, payload) => {
    const updated = normalizeProduct(await productApi.addComment(id, payload));
    set((state) => ({
      products: state.products.map((product) => (product.id === id ? updated : product)),
      productsById: { ...state.productsById, [id]: updated },
    }));
  },

  deleteComment: async (id, commentId) => {
    const updated = normalizeProduct(await productApi.deleteComment(id, commentId));
    set((state) => ({
      products: state.products.map((product) => (product.id === id ? updated : product)),
      productsById: { ...state.productsById, [id]: updated },
    }));
  },

  deleteCommentImage: async (id, commentId, imageId) => {
    const updated = normalizeProduct(await productApi.deleteCommentImage(id, commentId, imageId));
    set((state) => ({
      products: state.products.map((product) => (product.id === id ? updated : product)),
      productsById: { ...state.productsById, [id]: updated },
    }));
  },

  addImage: async (id, payload) => {
    const updated = normalizeProduct(await productApi.addImage(id, payload));
    set((state) => ({
      products: state.products.map((product) => (product.id === id ? updated : product)),
      productsById: { ...state.productsById, [id]: updated },
    }));
  },

  deleteImage: async (id, imageId) => {
    const updated = normalizeProduct(await productApi.deleteImage(id, imageId));
    set((state) => ({
      products: state.products.map((product) => (product.id === id ? updated : product)),
      productsById: { ...state.productsById, [id]: updated },
    }));
  },
}));



