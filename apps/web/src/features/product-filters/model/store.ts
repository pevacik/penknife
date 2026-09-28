import { create } from 'zustand';
import type { CountryFilter } from '@/entities/product';

interface FilterState {
  country: CountryFilter;
  circulation: string;
  maxBudget: string;
  setCountry: (country: CountryFilter) => void;
  setCirculation: (value: string) => void;
  setMaxBudget: (value: string) => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  country: 'all',
  circulation: '',
  maxBudget: '',
  setCountry: (country) => set({ country }),
  setCirculation: (circulation) => set({ circulation }),
  setMaxBudget: (maxBudget) => set({ maxBudget }),
}));
