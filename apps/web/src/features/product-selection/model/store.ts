import { create } from 'zustand';

interface SelectionState {
  selectedIds: string[];
  toggle: (id: string) => void;
  clear: () => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedIds: [],
  toggle: (id) =>
    set((state) => ({
      selectedIds: state.selectedIds.includes(id)
        ? state.selectedIds.filter((selectedId) => selectedId !== id)
        : [...state.selectedIds, id],
    })),
  clear: () => set({ selectedIds: [] }),
}));
