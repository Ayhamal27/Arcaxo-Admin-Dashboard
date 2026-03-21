import { create } from 'zustand';

interface UsersFilters {
  search?: string;
  filterRole?: string;
  filterStatus?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface UsersPagination {
  currentPage: number;
  pageSize: number;
  total: number;
}

interface UsersStore {
  filters: UsersFilters;
  pagination: UsersPagination;

  setFilters: (filters: Partial<UsersFilters>) => void;
  resetFilters: () => void;
  setPage: (page: number) => void;
  setTotal: (total: number) => void;
}

const DEFAULT_FILTERS: UsersFilters = {
  sortBy: 'first_name',
  sortOrder: 'asc',
};

export const useUsersStore = create<UsersStore>((set) => ({
  filters: DEFAULT_FILTERS,
  pagination: { currentPage: 1, pageSize: 10, total: 0 },

  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
      pagination: { ...state.pagination, currentPage: 1 },
    })),

  resetFilters: () =>
    set({ filters: DEFAULT_FILTERS, pagination: { currentPage: 1, pageSize: 10, total: 0 } }),

  setPage: (page) =>
    set((state) => ({ pagination: { ...state.pagination, currentPage: page } })),

  setTotal: (total) =>
    set((state) => ({ pagination: { ...state.pagination, total } })),
}));
