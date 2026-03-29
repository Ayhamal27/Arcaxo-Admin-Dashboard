import { create } from 'zustand';

interface SensorsFilters {
  search?: string;
  filterStatus?: string[];
  filterIsActive?: boolean;
  filterFirmwareVersion?: string;
  filterHardwareVersion?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface SensorsPagination {
  currentPage: number;
  pageSize: number;
  total: number;
}

interface SensorsStore {
  filters: SensorsFilters;
  pagination: SensorsPagination;

  setFilters: (filters: Partial<SensorsFilters>) => void;
  resetFilters: () => void;
  setPage: (page: number) => void;
  setTotal: (total: number) => void;
}

const DEFAULT_FILTERS: SensorsFilters = {
  sortBy: 'serial',
  sortOrder: 'asc',
};

export const useSensorsStore = create<SensorsStore>((set) => ({
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
