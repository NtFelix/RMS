import { create } from 'zustand';

interface ConfirmationModalConfig {
  title: string;
  description: string;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
}

interface ModalState {
  // Tenant Modal State
  isTenantModalOpen: boolean;
  tenantInitialData?: any;
  tenantModalWohnungen: any[];
  isTenantModalDirty: boolean;
  openTenantModal: (initialData?: any, wohnungen?: any[]) => void;
  closeTenantModal: () => void;
  setTenantModalDirty: (isDirty: boolean) => void;

  // House Modal State
  isHouseModalOpen: boolean;
  houseInitialData?: any;
  houseModalOnSuccess?: (data: any) => void;
  isHouseModalDirty: boolean;
  openHouseModal: (initialData?: any, onSuccess?: (data: any) => void) => void;
  closeHouseModal: () => void;
  setHouseModalDirty: (isDirty: boolean) => void;

  // Finance Modal State
  isFinanceModalOpen: boolean;
  financeInitialData?: any;
  financeModalWohnungen: any[];
  financeModalOnSuccess?: (data: any) => void;
  isFinanceModalDirty: boolean;
  openFinanceModal: (initialData?: any, wohnungen?: any[], onSuccess?: (data: any) => void) => void;
  closeFinanceModal: () => void;
  setFinanceModalDirty: (isDirty: boolean) => void;

  // Wohnung Modal State
  isWohnungModalOpen: boolean;
  wohnungInitialData?: any;
  wohnungModalHaeuser: any[];
  wohnungModalOnSuccess?: (data: any) => void;
  wohnungApartmentCount?: number;
  wohnungApartmentLimit?: number | typeof Infinity;
  wohnungIsActiveSubscription?: boolean;
  isWohnungModalDirty: boolean;
  openWohnungModal: (
    initialData?: any,
    haeuser?: any[],
    onSuccess?: (data: any) => void,
    apartmentCount?: number,
    apartmentLimit?: number,
    isActiveSubscription?: boolean
  ) => void;
  closeWohnungModal: () => void;
  setWohnungModalDirty: (isDirty: boolean) => void;

  // Aufgabe Modal State
  isAufgabeModalOpen: boolean;
  aufgabeInitialData?: any;
  aufgabeModalOnSuccess?: (data: any) => void;
  isAufgabeModalDirty: boolean;
  openAufgabeModal: (initialData?: any, onSuccess?: (data: any) => void) => void;
  closeAufgabeModal: () => void;
  setAufgabeModalDirty: (isDirty: boolean) => void;

  // Betriebskosten Modal State
  isBetriebskostenModalOpen: boolean;
  betriebskostenInitialData?: any; // Replace 'any' with Nebenkosten | { id: string } | null
  betriebskostenModalHaeuser: any[]; // Replace 'any' with Haus[]
  betriebskostenModalOnSuccess?: () => void; // Adjust if it needs to pass data
  isBetriebskostenModalDirty: boolean;
  openBetriebskostenModal: (initialData?: any, haeuser?: any[], onSuccess?: () => void) => void;
  closeBetriebskostenModal: () => void;
  setBetriebskostenModalDirty: (isDirty: boolean) => void;

  // Confirmation Modal State
  isConfirmationModalOpen: boolean;
  confirmationModalConfig: ConfirmationModalConfig | null;
  openConfirmationModal: (config: ConfirmationModalConfig) => void;
  closeConfirmationModal: () => void;
}

const CONFIRMATION_MODAL_DEFAULTS = {
  title: "Discard unsaved changes?",
  description: "If you close this form, your changes will be lost. Are you sure you want to discard them?",
  confirmText: "Discard",
  cancelText: "Cancel",
};

export const useModalStore = create<ModalState>((set, get) => ({
  // Tenant Modal
  isTenantModalOpen: false,
  tenantInitialData: undefined,
  tenantModalWohnungen: [],
  isTenantModalDirty: false,
  openTenantModal: (initialData, wohnungen) => set({ 
    isTenantModalOpen: true, 
    tenantInitialData: initialData, 
    tenantModalWohnungen: wohnungen || [],
    isTenantModalDirty: false, // Reset dirty state on open
  }),
  closeTenantModal: () => {
    if (get().isTenantModalDirty) {
      get().openConfirmationModal({
        ...CONFIRMATION_MODAL_DEFAULTS,
        onConfirm: () => {
          set({
            isTenantModalOpen: false,
            tenantInitialData: undefined,
            tenantModalWohnungen: [],
            isTenantModalDirty: false,
          });
          get().closeConfirmationModal();
        },
      });
    } else {
      set({
        isTenantModalOpen: false,
        tenantInitialData: undefined,
        tenantModalWohnungen: [],
        isTenantModalDirty: false,
      });
    }
  },
  setTenantModalDirty: (isDirty) => set({ isTenantModalDirty: isDirty }),

  // House Modal
  isHouseModalOpen: false,
  houseInitialData: undefined,
  houseModalOnSuccess: undefined,
  isHouseModalDirty: false,
  openHouseModal: (initialData, onSuccess) => set({
    isHouseModalOpen: true,
    houseInitialData: initialData,
    houseModalOnSuccess: onSuccess,
    isHouseModalDirty: false,
  }),
  closeHouseModal: () => {
    if (get().isHouseModalDirty) {
      get().openConfirmationModal({
        ...CONFIRMATION_MODAL_DEFAULTS,
        onConfirm: () => {
          set({
            isHouseModalOpen: false,
            houseInitialData: undefined,
            houseModalOnSuccess: undefined,
            isHouseModalDirty: false,
          });
          get().closeConfirmationModal();
        },
      });
    } else {
      set({
        isHouseModalOpen: false,
        houseInitialData: undefined,
        houseModalOnSuccess: undefined,
        isHouseModalDirty: false,
      });
    }
  },
  setHouseModalDirty: (isDirty) => set({ isHouseModalDirty: isDirty }),

  // Finance Modal
  isFinanceModalOpen: false,
  financeInitialData: undefined,
  financeModalWohnungen: [],
  financeModalOnSuccess: undefined,
  isFinanceModalDirty: false,
  openFinanceModal: (initialData, wohnungen, onSuccess) => set({
    isFinanceModalOpen: true,
    financeInitialData: initialData,
    financeModalWohnungen: wohnungen || [],
    financeModalOnSuccess: onSuccess,
    isFinanceModalDirty: false,
  }),
  closeFinanceModal: () => {
    if (get().isFinanceModalDirty) {
      get().openConfirmationModal({
        ...CONFIRMATION_MODAL_DEFAULTS,
        onConfirm: () => {
          set({
            isFinanceModalOpen: false,
            financeInitialData: undefined,
            financeModalWohnungen: [],
            financeModalOnSuccess: undefined,
            isFinanceModalDirty: false,
          });
          get().closeConfirmationModal();
        },
      });
    } else {
      set({
        isFinanceModalOpen: false,
        financeInitialData: undefined,
        financeModalWohnungen: [],
        financeModalOnSuccess: undefined,
        isFinanceModalDirty: false,
      });
    }
  },
  setFinanceModalDirty: (isDirty) => set({ isFinanceModalDirty: isDirty }),

  // Wohnung Modal
  isWohnungModalOpen: false,
  wohnungInitialData: undefined,
  wohnungModalHaeuser: [],
  wohnungModalOnSuccess: undefined,
  wohnungApartmentCount: undefined,
  wohnungApartmentLimit: undefined,
  wohnungIsActiveSubscription: undefined,
  isWohnungModalDirty: false,
  openWohnungModal: (
    initialData,
    haeuser,
    onSuccess,
    apartmentCount,
    apartmentLimit,
    isActiveSubscription
  ) => set({
    isWohnungModalOpen: true,
    wohnungInitialData: initialData,
    wohnungModalHaeuser: haeuser || [],
    wohnungModalOnSuccess: onSuccess,
    wohnungApartmentCount: apartmentCount,
    wohnungApartmentLimit: apartmentLimit,
    wohnungIsActiveSubscription: isActiveSubscription,
    isWohnungModalDirty: false,
  }),
  closeWohnungModal: () => {
    if (get().isWohnungModalDirty) {
      get().openConfirmationModal({
        ...CONFIRMATION_MODAL_DEFAULTS,
        onConfirm: () => {
          set({
            isWohnungModalOpen: false,
            wohnungInitialData: undefined,
            wohnungModalHaeuser: [],
            wohnungModalOnSuccess: undefined,
            wohnungApartmentCount: undefined,
            wohnungApartmentLimit: undefined,
            wohnungIsActiveSubscription: undefined,
            isWohnungModalDirty: false,
          });
          get().closeConfirmationModal();
        },
      });
    } else {
      set({
        isWohnungModalOpen: false,
        wohnungInitialData: undefined,
        wohnungModalHaeuser: [],
        wohnungModalOnSuccess: undefined,
        wohnungApartmentCount: undefined,
        wohnungApartmentLimit: undefined,
        wohnungIsActiveSubscription: undefined,
        isWohnungModalDirty: false,
      });
    }
  },
  setWohnungModalDirty: (isDirty) => set({ isWohnungModalDirty: isDirty }),

  // Aufgabe Modal
  isAufgabeModalOpen: false,
  aufgabeInitialData: undefined,
  aufgabeModalOnSuccess: undefined,
  isAufgabeModalDirty: false,
  openAufgabeModal: (initialData, onSuccess) => set({
    isAufgabeModalOpen: true,
    aufgabeInitialData: initialData,
    aufgabeModalOnSuccess: onSuccess,
    isAufgabeModalDirty: false,
  }),
  closeAufgabeModal: () => {
    if (get().isAufgabeModalDirty) {
      get().openConfirmationModal({
        ...CONFIRMATION_MODAL_DEFAULTS,
        onConfirm: () => {
          set({
            isAufgabeModalOpen: false,
            aufgabeInitialData: undefined,
            aufgabeModalOnSuccess: undefined,
            isAufgabeModalDirty: false,
          });
          get().closeConfirmationModal();
        },
      });
    } else {
      set({
        isAufgabeModalOpen: false,
        aufgabeInitialData: undefined,
        aufgabeModalOnSuccess: undefined,
        isAufgabeModalDirty: false,
      });
    }
  },
  setAufgabeModalDirty: (isDirty) => set({ isAufgabeModalDirty: isDirty }),

  // Betriebskosten Modal
  isBetriebskostenModalOpen: false,
  betriebskostenInitialData: undefined,
  betriebskostenModalHaeuser: [],
  betriebskostenModalOnSuccess: undefined,
  isBetriebskostenModalDirty: false,
  openBetriebskostenModal: (initialData, haeuser, onSuccess) => set({
    isBetriebskostenModalOpen: true,
    betriebskostenInitialData: initialData,
    betriebskostenModalHaeuser: haeuser || [],
    betriebskostenModalOnSuccess: onSuccess,
    isBetriebskostenModalDirty: false,
  }),
  closeBetriebskostenModal: () => {
    if (get().isBetriebskostenModalDirty) {
      get().openConfirmationModal({
        ...CONFIRMATION_MODAL_DEFAULTS,
        onConfirm: () => {
          set({
            isBetriebskostenModalOpen: false,
            betriebskostenInitialData: undefined,
            betriebskostenModalHaeuser: [],
            betriebskostenModalOnSuccess: undefined,
            isBetriebskostenModalDirty: false,
          });
          get().closeConfirmationModal();
        },
      });
    } else {
      set({
        isBetriebskostenModalOpen: false,
        betriebskostenInitialData: undefined,
        betriebskostenModalHaeuser: [],
        betriebskostenModalOnSuccess: undefined,
        isBetriebskostenModalDirty: false,
      });
    }
  },
  setBetriebskostenModalDirty: (isDirty) => set({ isBetriebskostenModalDirty: isDirty }),

  // Confirmation Modal
  isConfirmationModalOpen: false,
  confirmationModalConfig: null,
  openConfirmationModal: (config) => set({
    isConfirmationModalOpen: true,
    confirmationModalConfig: config,
  }),
  closeConfirmationModal: () => set({
    isConfirmationModalOpen: false,
    // Keep config around for a moment to avoid flicker if content relies on it during closing animation
    // It will be overwritten on next open. Or set to null after a timeout if needed.
    // For now, simply setting to null.
    confirmationModalConfig: null,
  }),
}));
