import { create } from 'zustand';

interface ConfirmationModalConfig {
  title: string;
  description: string;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
}

interface CloseModalOptions {
  force?: boolean;
}

interface ModalState {
  // Tenant Modal State
  isTenantModalOpen: boolean;
  tenantInitialData?: any;
  tenantModalWohnungen: any[];
  isTenantModalDirty: boolean;
  openTenantModal: (initialData?: any, wohnungen?: any[]) => void;
  closeTenantModal: (options?: CloseModalOptions) => void;
  setTenantModalDirty: (isDirty: boolean) => void;

  // House Modal State
  isHouseModalOpen: boolean;
  houseInitialData?: any;
  houseModalOnSuccess?: (data: any) => void;
  isHouseModalDirty: boolean;
  openHouseModal: (initialData?: any, onSuccess?: (data: any) => void) => void;
  closeHouseModal: (options?: CloseModalOptions) => void;
  setHouseModalDirty: (isDirty: boolean) => void;

  // Finance Modal State
  isFinanceModalOpen: boolean;
  financeInitialData?: any;
  financeModalWohnungen: any[];
  financeModalOnSuccess?: (data: any) => void;
  isFinanceModalDirty: boolean;
  openFinanceModal: (initialData?: any, wohnungen?: any[], onSuccess?: (data: any) => void) => void;
  closeFinanceModal: (options?: CloseModalOptions) => void;
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
  closeWohnungModal: (options?: CloseModalOptions) => void;
  setWohnungModalDirty: (isDirty: boolean) => void;

  // Aufgabe Modal State
  isAufgabeModalOpen: boolean;
  aufgabeInitialData?: any;
  aufgabeModalOnSuccess?: (data: any) => void;
  isAufgabeModalDirty: boolean;
  openAufgabeModal: (initialData?: any, onSuccess?: (data: any) => void) => void;
  closeAufgabeModal: (options?: CloseModalOptions) => void;
  setAufgabeModalDirty: (isDirty: boolean) => void;

  // Betriebskosten Modal State
  isBetriebskostenModalOpen: boolean;
  betriebskostenInitialData?: any; // Replace 'any' with Nebenkosten | { id: string } | null
  betriebskostenModalHaeuser: any[]; // Replace 'any' with Haus[]
  betriebskostenModalOnSuccess?: () => void; // Adjust if it needs to pass data
  isBetriebskostenModalDirty: boolean;
  openBetriebskostenModal: (initialData?: any, haeuser?: any[], onSuccess?: () => void) => void;
  closeBetriebskostenModal: (options?: CloseModalOptions) => void;
  setBetriebskostenModalDirty: (isDirty: boolean) => void;

  // Confirmation Modal State
  isConfirmationModalOpen: boolean;
  confirmationModalConfig: ConfirmationModalConfig | null;
  openConfirmationModal: (config: ConfirmationModalConfig) => void;
  closeConfirmationModal: () => void;
}

const CONFIRMATION_MODAL_DEFAULTS = {
  title: "Ungespeicherte Änderungen verwerfen?",
  description: "Wenn Sie dieses Formular schließen, gehen Ihre Änderungen verloren. Möchten Sie sie wirklich verwerfen?",
  confirmText: "Verwerfen",
  cancelText: "Abbrechen",
};

const initialTenantModalState = {
  isTenantModalOpen: false,
  tenantInitialData: undefined,
  tenantModalWohnungen: [],
  isTenantModalDirty: false,
};

const initialHouseModalState = {
  isHouseModalOpen: false,
  houseInitialData: undefined,
  houseModalOnSuccess: undefined,
  isHouseModalDirty: false,
};

const initialFinanceModalState = {
  isFinanceModalOpen: false,
  financeInitialData: undefined,
  financeModalWohnungen: [],
  financeModalOnSuccess: undefined,
  isFinanceModalDirty: false,
};

const initialWohnungModalState = {
  isWohnungModalOpen: false,
  wohnungInitialData: undefined,
  wohnungModalHaeuser: [],
  wohnungModalOnSuccess: undefined,
  wohnungApartmentCount: undefined,
  wohnungApartmentLimit: undefined,
  wohnungIsActiveSubscription: undefined,
  isWohnungModalDirty: false,
};

const initialAufgabeModalState = {
  isAufgabeModalOpen: false,
  aufgabeInitialData: undefined,
  aufgabeModalOnSuccess: undefined,
  isAufgabeModalDirty: false,
};

const initialBetriebskostenModalState = {
  isBetriebskostenModalOpen: false,
  betriebskostenInitialData: undefined,
  betriebskostenModalHaeuser: [],
  betriebskostenModalOnSuccess: undefined,
  isBetriebskostenModalDirty: false,
};

export const useModalStore = create<ModalState>((set, get) => {
  const resetTenantModal = () => set(initialTenantModalState);
  const resetHouseModal = () => set(initialHouseModalState);
  const resetFinanceModal = () => set(initialFinanceModalState);
  const resetWohnungModal = () => set(initialWohnungModalState);
  const resetAufgabeModal = () => set(initialAufgabeModalState);
  const resetBetriebskostenModal = () => set(initialBetriebskostenModalState);

  return {
    // Tenant Modal
    ...initialTenantModalState,
    openTenantModal: (initialData, wohnungen) => set({ 
      isTenantModalOpen: true, 
      tenantInitialData: initialData, 
      tenantModalWohnungen: wohnungen || [],
      isTenantModalDirty: false, // Reset dirty state on open
    }),
    closeTenantModal: (options) => {
      if (get().isTenantModalDirty && !options?.force) {
        get().openConfirmationModal({
          ...CONFIRMATION_MODAL_DEFAULTS,
          onConfirm: () => {
            resetTenantModal();
            get().closeConfirmationModal();
          },
        });
      } else {
        resetTenantModal();
      }
    },
    setTenantModalDirty: (isDirty) => set({ isTenantModalDirty: isDirty }),

    // House Modal
    ...initialHouseModalState,
    openHouseModal: (initialData, onSuccess) => set({
      isHouseModalOpen: true,
      houseInitialData: initialData,
      houseModalOnSuccess: onSuccess,
      isHouseModalDirty: false,
    }),
    closeHouseModal: (options) => {
      if (get().isHouseModalDirty && !options?.force) {
        get().openConfirmationModal({
          ...CONFIRMATION_MODAL_DEFAULTS,
          onConfirm: () => {
            resetHouseModal();
            get().closeConfirmationModal();
          },
        });
      } else {
        resetHouseModal();
      }
    },
    setHouseModalDirty: (isDirty) => set({ isHouseModalDirty: isDirty }),

    // Finance Modal
    ...initialFinanceModalState,
    openFinanceModal: (initialData, wohnungen, onSuccess) => set({
      isFinanceModalOpen: true,
      financeInitialData: initialData,
      financeModalWohnungen: wohnungen || [],
      financeModalOnSuccess: onSuccess,
      isFinanceModalDirty: false,
    }),
    closeFinanceModal: (options) => {
      if (get().isFinanceModalDirty && !options?.force) {
        get().openConfirmationModal({
          ...CONFIRMATION_MODAL_DEFAULTS,
          onConfirm: () => {
            resetFinanceModal();
            get().closeConfirmationModal();
          },
        });
      } else {
        resetFinanceModal();
      }
    },
    setFinanceModalDirty: (isDirty) => set({ isFinanceModalDirty: isDirty }),

    // Wohnung Modal
    ...initialWohnungModalState,
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
    closeWohnungModal: (options) => {
      if (get().isWohnungModalDirty && !options?.force) {
        get().openConfirmationModal({
          ...CONFIRMATION_MODAL_DEFAULTS,
          onConfirm: () => {
            resetWohnungModal();
            get().closeConfirmationModal();
          },
        });
      } else {
        resetWohnungModal();
      }
    },
    setWohnungModalDirty: (isDirty) => set({ isWohnungModalDirty: isDirty }),

    // Aufgabe Modal
    ...initialAufgabeModalState,
    openAufgabeModal: (initialData, onSuccess) => set({
      isAufgabeModalOpen: true,
      aufgabeInitialData: initialData,
      aufgabeModalOnSuccess: onSuccess,
      isAufgabeModalDirty: false,
    }),
    closeAufgabeModal: (options) => {
      if (get().isAufgabeModalDirty && !options?.force) {
        get().openConfirmationModal({
          ...CONFIRMATION_MODAL_DEFAULTS,
          onConfirm: () => {
            resetAufgabeModal();
            get().closeConfirmationModal();
          },
        });
      } else {
        resetAufgabeModal();
      }
    },
    setAufgabeModalDirty: (isDirty) => set({ isAufgabeModalDirty: isDirty }),

    // Betriebskosten Modal
    ...initialBetriebskostenModalState,
    openBetriebskostenModal: (initialData, haeuser, onSuccess) => set({
      isBetriebskostenModalOpen: true,
      betriebskostenInitialData: initialData,
      betriebskostenModalHaeuser: haeuser || [],
      betriebskostenModalOnSuccess: onSuccess,
      isBetriebskostenModalDirty: false,
    }),
    closeBetriebskostenModal: (options) => {
      if (get().isBetriebskostenModalDirty && !options?.force) {
        get().openConfirmationModal({
          ...CONFIRMATION_MODAL_DEFAULTS,
          onConfirm: () => {
            resetBetriebskostenModal();
            get().closeConfirmationModal();
          },
        });
      } else {
        resetBetriebskostenModal();
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
  };
});
