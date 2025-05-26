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
  houseModalOnSuccess?: (data: any) => void;
  openHouseModal: (initialData?: any, onSuccess?: (data: any) => void) => void;
  closeHouseModal: () => void;

  // Finance Modal State
  isFinanceModalOpen: boolean;
  financeInitialData?: any; // Replace 'any' with 'Finanz' type if available
  financeModalWohnungen: any[];
  financeModalOnSuccess?: (data: any) => void;
  openFinanceModal: (initialData?: any, wohnungen?: any[], onSuccess?: (data: any) => void) => void;
  closeFinanceModal: () => void;

  // Wohnung Modal State
  isWohnungModalOpen: boolean;
  wohnungInitialData?: any; // Replace 'any' with actual Wohnung type
  wohnungModalHaeuser: any[]; // Replace 'any' with actual Haus type
  openWohnungModal: (initialData?: any, haeuser?: any[]) => void;
  closeWohnungModal: () => void;

  // Aufgabe Modal State
  isAufgabeModalOpen: boolean;
  aufgabeInitialData?: any; // Replace 'any' with actual Aufgabe/Task type
  openAufgabeModal: (initialData?: any) => void;
  closeAufgabeModal: () => void;
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
  houseModalOnSuccess: undefined,
  openHouseModal: (initialData, onSuccess) => set({
    isHouseModalOpen: true,
    houseInitialData: initialData,
    houseModalOnSuccess: onSuccess,
  }),
  closeHouseModal: () => set({
    isHouseModalOpen: false,
    houseInitialData: undefined,
    houseModalOnSuccess: undefined,
  }),

  // Finance Modal
  isFinanceModalOpen: false,
  financeInitialData: undefined,
  financeModalWohnungen: [],
  financeModalOnSuccess: undefined,
  openFinanceModal: (initialData, wohnungen, onSuccess) => set({
    isFinanceModalOpen: true,
    financeInitialData: initialData,
    financeModalWohnungen: wohnungen || [],
    financeModalOnSuccess: onSuccess,
  }),
  closeFinanceModal: () => set({
    isFinanceModalOpen: false,
    financeInitialData: undefined,
    financeModalWohnungen: [],
    financeModalOnSuccess: undefined,
  }),

  // Wohnung Modal
  isWohnungModalOpen: false,
  wohnungInitialData: undefined,
  wohnungModalHaeuser: [],
  openWohnungModal: (initialData, haeuser) => set({
    isWohnungModalOpen: true,
    wohnungInitialData: initialData,
    wohnungModalHaeuser: haeuser || [],
  }),
  closeWohnungModal: () => set({
    isWohnungModalOpen: false,
    wohnungInitialData: undefined,
    wohnungModalHaeuser: [],
  }),

  // Aufgabe Modal
  isAufgabeModalOpen: false,
  aufgabeInitialData: undefined,
  openAufgabeModal: (initialData) => set({
    isAufgabeModalOpen: true,
    aufgabeInitialData: initialData,
  }),
  closeAufgabeModal: () => set({
    isAufgabeModalOpen: false,
    aufgabeInitialData: undefined,
  }),
}));
