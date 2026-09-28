import { create } from 'zustand';
import { productApi } from '../api/productApi';
import { normalizeProduct } from '../lib/normalize';
import type { CreateProductPayload, Product, UpdateProductPayload } from './types';

interface ProductState {
  products: Product[];
  loading: boolean;
  error: string | null;
  loadProducts: () => Promise<void>;
  addProduct: (payload?: CreateProductPayload) => Promise<void>;
  updateProduct: (id: string, payload: UpdateProductPayload) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
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
}));


