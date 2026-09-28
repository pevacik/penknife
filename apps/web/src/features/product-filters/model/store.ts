import { create } from 'zustand';
import type { CountryFilter, Make50Filter } from '@/entities/product';

interface FilterState {
  country: CountryFilter;
  circulation: string;
  maxBudget: string;
  make50: Make50Filter;
  setCountry: (country: CountryFilter) => void;
  setCirculation: (value: string) => void;
  setMaxBudget: (value: string) => void;
  setMake50: (value: Make50Filter) => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  country: 'all',
  circulation: '',
  maxBudget: '',
  make50: 'all',
  setCountry: (country) => set({ country }),
  setCirculation: (circulation) => set({ circulation }),
  setMaxBudget: (maxBudget) => set({ maxBudget }),
  setMake50: (make50) => set({ make50 }),
}));
