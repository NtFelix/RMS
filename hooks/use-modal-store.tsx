import { create } from 'zustand';
import { Nebenkosten, Mieter, Wasserzaehler, WasserzaehlerFormData } from '@/lib/data-fetching';
import { Tenant, KautionData } from '@/types/Tenant';

// Overview Modal Types
interface HausWithWohnungen {
  id: string;
  name: string;
  strasse?: string;
  ort: string;
  size?: number;
  wohnungen: WohnungOverviewData[];
}

interface WohnungOverviewData {
  id: string;
  name: string;
  groesse: number;
  miete: number;
  status: 'frei' | 'vermietet';
  currentTenant?: {
    id: string;
    name: string;
    einzug?: string;
  };
}

interface WohnungWithMieter {
  id: string;
  name: string;
  groesse: number;
  miete: number;
  hausName: string;
  mieter: MieterOverviewData[];
}

interface MieterOverviewData {
  id: string;
  name: string;
  email?: string;
  telefon?: string;
  einzug?: string;
  auszug?: string;
  status: 'active' | 'moved_out';
}

interface ConfirmationModalConfig {
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}

interface CloseModalOptions {
  force?: boolean;
}

interface KautionModalData {
  tenant: {
    id: string;
    name: string;
    wohnung_id?: string;
  };
  existingKaution?: {
    amount: number;
    paymentDate: string;
    status: 'Erhalten' | 'Ausstehend' | 'Zurückgezahlt';
    createdAt?: string;
    updatedAt?: string;
  };
  suggestedAmount?: number;
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

  // Wasserzähler Modal State
  isWasserzaehlerModalOpen: boolean;
  wasserzaehlerNebenkosten?: Nebenkosten;
  wasserzaehlerMieterList: Mieter[];
  wasserzaehlerExistingReadings?: Wasserzaehler[] | null;
  wasserzaehlerOnSave?: (data: WasserzaehlerFormData) => Promise<void>;
  isWasserzaehlerModalDirty: boolean;
  openWasserzaehlerModal: (nebenkosten?: Nebenkosten, mieterList?: Mieter[], existingReadings?: Wasserzaehler[] | null, onSave?: (data: WasserzaehlerFormData) => Promise<void>) => void;
  closeWasserzaehlerModal: (options?: CloseModalOptions) => void;
  setWasserzaehlerModalDirty: (isDirty: boolean) => void;

  // Kaution Modal State
  isKautionModalOpen: boolean;
  kautionInitialData?: KautionModalData;
  isKautionModalDirty: boolean;
  openKautionModal: (tenant: Tenant, existingKaution?: KautionData) => void;
  closeKautionModal: (options?: CloseModalOptions) => void;
  setKautionModalDirty: (isDirty: boolean) => void;

  // Haus Overview Modal State
  isHausOverviewModalOpen: boolean;
  hausOverviewData?: HausWithWohnungen;
  hausOverviewLoading: boolean;
  hausOverviewError?: string;
  openHausOverviewModal: (hausId: string) => void;
  closeHausOverviewModal: (options?: CloseModalOptions) => void;
  setHausOverviewLoading: (loading: boolean) => void;
  setHausOverviewError: (error?: string) => void;
  setHausOverviewData: (data?: HausWithWohnungen) => void;

  // Wohnung Overview Modal State
  isWohnungOverviewModalOpen: boolean;
  wohnungOverviewData?: WohnungWithMieter;
  wohnungOverviewLoading: boolean;
  wohnungOverviewError?: string;
  openWohnungOverviewModal: (wohnungId: string) => void;
  closeWohnungOverviewModal: (options?: CloseModalOptions) => void;
  setWohnungOverviewLoading: (loading: boolean) => void;
  setWohnungOverviewError: (error?: string) => void;
  setWohnungOverviewData: (data?: WohnungWithMieter) => void;

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

const initialWasserzaehlerModalState = {
  isWasserzaehlerModalOpen: false,
  wasserzaehlerNebenkosten: undefined,
  wasserzaehlerMieterList: [],
  wasserzaehlerExistingReadings: undefined,
  wasserzaehlerOnSave: undefined,
  isWasserzaehlerModalDirty: false,
};

const initialKautionModalState = {
  isKautionModalOpen: false,
  kautionInitialData: undefined,
  isKautionModalDirty: false,
};

const initialHausOverviewModalState = {
  isHausOverviewModalOpen: false,
  hausOverviewData: undefined,
  hausOverviewLoading: false,
  hausOverviewError: undefined,
};

const initialWohnungOverviewModalState = {
  isWohnungOverviewModalOpen: false,
  wohnungOverviewData: undefined,
  wohnungOverviewLoading: false,
  wohnungOverviewError: undefined,
};

const createInitialModalState = () => ({
  ...initialTenantModalState,
  ...initialHouseModalState,
  ...initialFinanceModalState,
  ...initialWohnungModalState,
  ...initialAufgabeModalState,
  ...initialBetriebskostenModalState,
  ...initialWasserzaehlerModalState,
  ...initialKautionModalState,
  ...initialHausOverviewModalState,
  ...initialWohnungOverviewModalState,
  isConfirmationModalOpen: false,
  confirmationModalConfig: null,
});

type DirtyFlagKey = {
  [K in keyof ModalState]: K extends `${string}ModalDirty` ? K : never;
}[keyof ModalState];

const MODAL_ANIMATION_DURATION = 300; // ms

export const useModalStore = create<ModalState>((set, get) => {
  let confirmationModalTimeoutId: NodeJS.Timeout | null = null;

  

  const createCloseHandler = (
    isDirtyFlag: DirtyFlagKey,
    initialState: Partial<ModalState>
  ) => (options?: CloseModalOptions) => {
    const state = get();
    const resetModal = () => set(initialState);

    if (isDirtyFlag && state[isDirtyFlag] && !options?.force) {
      state.openConfirmationModal({
        ...CONFIRMATION_MODAL_DEFAULTS,
        onConfirm: () => {
          resetModal();
          get().closeConfirmationModal();
        },
        onCancel: () => {
          get().closeConfirmationModal();
        }
      });
    } else {
      resetModal();
    }
  };

  return {
    ...createInitialModalState(),
    openTenantModal: (initialData, wohnungen) => set({ 
      isTenantModalOpen: true, 
      tenantInitialData: initialData, 
      tenantModalWohnungen: wohnungen || [],
      isTenantModalDirty: false, // Reset dirty state on open
    }),
    closeTenantModal: createCloseHandler('isTenantModalDirty', initialTenantModalState),
    setTenantModalDirty: (isDirty) => set({ isTenantModalDirty: isDirty }),

    // House Modal
    openHouseModal: (initialData, onSuccess) => set({
      isHouseModalOpen: true,
      houseInitialData: initialData,
      houseModalOnSuccess: onSuccess,
      isHouseModalDirty: false
    }),
    closeHouseModal: createCloseHandler('isHouseModalDirty', initialHouseModalState),
    setHouseModalDirty: (isDirty) => set({ isHouseModalDirty: isDirty }),

    // Finance Modal
    openFinanceModal: (initialData, wohnungen, onSuccess) => set({
      isFinanceModalOpen: true,
      financeInitialData: initialData,
      financeModalWohnungen: wohnungen || [],
      financeModalOnSuccess: onSuccess,
      isFinanceModalDirty: false
    }),
    closeFinanceModal: createCloseHandler('isFinanceModalDirty', initialFinanceModalState),
    setFinanceModalDirty: (isDirty) => set({ isFinanceModalDirty: isDirty }),

    // Wohnung Modal
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
      isWohnungModalDirty: false
    }),
    closeWohnungModal: createCloseHandler('isWohnungModalDirty', initialWohnungModalState),
    setWohnungModalDirty: (isDirty) => set({ isWohnungModalDirty: isDirty }),

    // Aufgabe Modal
    openAufgabeModal: (initialData, onSuccess) => set({
      isAufgabeModalOpen: true,
      aufgabeInitialData: initialData,
      aufgabeModalOnSuccess: onSuccess,
      isAufgabeModalDirty: false
    }),
    closeAufgabeModal: createCloseHandler('isAufgabeModalDirty', initialAufgabeModalState),
    setAufgabeModalDirty: (isDirty) => set({ isAufgabeModalDirty: isDirty }),

    // Betriebskosten Modal
    openBetriebskostenModal: (initialData, haeuser, onSuccess) => set({
      isBetriebskostenModalOpen: true,
      betriebskostenInitialData: initialData,
      betriebskostenModalHaeuser: haeuser || [],
      betriebskostenModalOnSuccess: onSuccess,
      isBetriebskostenModalDirty: false
    }),
    closeBetriebskostenModal: createCloseHandler('isBetriebskostenModalDirty', initialBetriebskostenModalState),
    setBetriebskostenModalDirty: (isDirty) => set({ isBetriebskostenModalDirty: isDirty }),

    // Wasserzähler Modal
    openWasserzaehlerModal: (nebenkosten, mieterList, existingReadings, onSave) => set({
      isWasserzaehlerModalOpen: true,
      wasserzaehlerNebenkosten: nebenkosten,
      wasserzaehlerMieterList: mieterList || [],
      wasserzaehlerExistingReadings: existingReadings,
      wasserzaehlerOnSave: onSave,
      isWasserzaehlerModalDirty: false
    }),
    closeWasserzaehlerModal: createCloseHandler('isWasserzaehlerModalDirty', initialWasserzaehlerModalState),
    setWasserzaehlerModalDirty: (isDirty) => set({ isWasserzaehlerModalDirty: isDirty }),

    // Kaution Modal
    openKautionModal: (tenant, existingKaution) => set({
      isKautionModalOpen: true,
      kautionInitialData: {
        tenant,
        existingKaution,
        suggestedAmount: undefined, // Will be calculated in the modal component
      },
      isKautionModalDirty: false
    }),
    closeKautionModal: createCloseHandler('isKautionModalDirty', initialKautionModalState),
    setKautionModalDirty: (isDirty) => set({ isKautionModalDirty: isDirty }),

    // Haus Overview Modal
    openHausOverviewModal: async (hausId: string) => {
      set({ 
        isHausOverviewModalOpen: true,
        hausOverviewLoading: true,
        hausOverviewError: undefined,
        hausOverviewData: undefined
      });

      // Create timeout promise for 2-second limit
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Das Laden dauert länger als erwartet. Bitte versuchen Sie es erneut.'));
        }, 2000);
      });

      try {
        const fetchPromise = fetch(`/api/haeuser/${hausId}/overview`).then(async (response) => {
          if (!response.ok) {
            throw new Error('Failed to fetch Haus overview data');
          }
          return response.json();
        });

        // Race between fetch and timeout
        const data = await Promise.race([fetchPromise, timeoutPromise]);
        
        set({ 
          hausOverviewData: data,
          hausOverviewLoading: false 
        });
      } catch (error) {
        set({ 
          hausOverviewError: error instanceof Error ? error.message : 'An error occurred',
          hausOverviewLoading: false 
        });
      }
    },
    closeHausOverviewModal: (options?: CloseModalOptions) => {
      set(initialHausOverviewModalState);
    },
    setHausOverviewLoading: (loading: boolean) => set({ hausOverviewLoading: loading }),
    setHausOverviewError: (error?: string) => set({ hausOverviewError: error }),
    setHausOverviewData: (data?: HausWithWohnungen) => set({ hausOverviewData: data }),

    // Wohnung Overview Modal
    openWohnungOverviewModal: async (wohnungId: string) => {
      set({ 
        isWohnungOverviewModalOpen: true,
        wohnungOverviewLoading: true,
        wohnungOverviewError: undefined,
        wohnungOverviewData: undefined
      });

      // Create timeout promise for 2-second limit
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Das Laden dauert länger als erwartet. Bitte versuchen Sie es erneut.'));
        }, 2000);
      });

      try {
        const fetchPromise = fetch(`/api/wohnungen/${wohnungId}/overview`).then(async (response) => {
          if (!response.ok) {
            throw new Error('Failed to fetch Wohnung overview data');
          }
          return response.json();
        });

        // Race between fetch and timeout
        const data = await Promise.race([fetchPromise, timeoutPromise]);
        
        set({ 
          wohnungOverviewData: data,
          wohnungOverviewLoading: false 
        });
      } catch (error) {
        set({ 
          wohnungOverviewError: error instanceof Error ? error.message : 'An error occurred',
          wohnungOverviewLoading: false 
        });
      }
    },
    closeWohnungOverviewModal: (options?: CloseModalOptions) => {
      set(initialWohnungOverviewModalState);
    },
    setWohnungOverviewLoading: (loading: boolean) => set({ wohnungOverviewLoading: loading }),
    setWohnungOverviewError: (error?: string) => set({ wohnungOverviewError: error }),
    setWohnungOverviewData: (data?: WohnungWithMieter) => set({ wohnungOverviewData: data }),

    // Confirmation Modal
    isConfirmationModalOpen: false,
    confirmationModalConfig: null,
    openConfirmationModal: (config) => {
      if (confirmationModalTimeoutId) {
        clearTimeout(confirmationModalTimeoutId);
        confirmationModalTimeoutId = null;
      }
      set({
        isConfirmationModalOpen: true,
        confirmationModalConfig: config,
      });
    },
    closeConfirmationModal: () => {
      set({ isConfirmationModalOpen: false });
      // Delay nullifying the config to allow for closing animations to complete
      confirmationModalTimeoutId = setTimeout(() => {
        set({ confirmationModalConfig: null });
        confirmationModalTimeoutId = null;
      }, MODAL_ANIMATION_DURATION); 
    },
  };
});