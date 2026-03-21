import { create } from 'zustand';

interface StoresFilters {
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filterStatus?: string[];
  filterActive?: boolean | null;
}

interface StoresPagination {
  currentPage: number;
  pageSize: number;
  total: number;
}

interface StoresStore {
  filters: StoresFilters;
  pagination: StoresPagination;

  setFilters: (filters: Partial<StoresFilters>) => void;
  resetFilters: () => void;
  setPage: (page: number) => void;
  setTotal: (total: number) => void;
}

const DEFAULT_PAGINATION: StoresPagination = {
  currentPage: 1,
  pageSize: 10,
  total: 0,
};

const DEFAULT_FILTERS: StoresFilters = {
  search: undefined,
  sortBy: 'name',
  sortOrder: 'asc',
  filterStatus: undefined,
  filterActive: null,
};

export const useStoresStore = create<StoresStore>((set) => ({
  filters: DEFAULT_FILTERS,
  pagination: DEFAULT_PAGINATION,

  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
      pagination: { ...state.pagination, currentPage: 1 },
    })),

  resetFilters: () =>
    set({
      filters: DEFAULT_FILTERS,
      pagination: { ...DEFAULT_PAGINATION },
    }),

  setPage: (page) =>
    set((state) => ({
      pagination: { ...state.pagination, currentPage: page },
    })),

  setTotal: (total) =>
    set((state) => ({
      pagination: { ...state.pagination, total },
    })),
}));
