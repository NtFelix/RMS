import { create } from 'zustand';

interface ModalState {
  isTenantModalOpen: boolean;
  tenantInitialData?: any;
  tenantModalWohnungen: any[];
  openTenantModal: (initialData?: any, wohnungen?: any[]) => void;
  closeTenantModal: () => void;

  // House Modal State
  isHouseModalOpen: boolean;
  houseInitialData?: any; // Replace 'any' with a proper 'House' type if available
  openHouseModal: (initialData?: any) => void;
  closeHouseModal: () => void;

  // Finance Modal State
  isFinanceModalOpen: boolean;
  financeInitialData?: any; // Replace 'any' with 'Finanz' type if available
  financeModalWohnungen: any[];
  openFinanceModal: (initialData?: any, wohnungen?: any[]) => void;
  closeFinanceModal: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
  // Tenant Modal
  isTenantModalOpen: false,
  tenantInitialData: undefined,
  tenantModalWohnungen: [],
  openTenantModal: (initialData, wohnungen) => set({ 
    isTenantModalOpen: true, 
    tenantInitialData: initialData, 
    tenantModalWohnungen: wohnungen || [] 
  }),
  closeTenantModal: () => set({ 
    isTenantModalOpen: false, 
    tenantInitialData: undefined, 
    tenantModalWohnungen: [] 
  }),

  // House Modal
  isHouseModalOpen: false,
  houseInitialData: undefined,
  openHouseModal: (initialData) => set({
    isHouseModalOpen: true,
    houseInitialData: initialData,
  }),
  closeHouseModal: () => set({
    isHouseModalOpen: false,
    houseInitialData: undefined,
  }),

  // Finance Modal
  isFinanceModalOpen: false,
  financeInitialData: undefined,
  financeModalWohnungen: [],
  openFinanceModal: (initialData, wohnungen) => set({
    isFinanceModalOpen: true,
    financeInitialData: initialData,
    financeModalWohnungen: wohnungen || [],
  }),
  closeFinanceModal: () => set({
    isFinanceModalOpen: false,
    financeInitialData: undefined,
    financeModalWohnungen: [],
  }),
}));
