import { create } from 'zustand';
import type { Nebenkosten, Mieter, Wasserzaehler, MeterReadingFormData } from "@/lib/types";
import { MeterModalData } from '@/types/optimized-betriebskosten';
import { Tenant, KautionData } from '@/types/Tenant';
import { Template } from '@/types/template';
import { ConfirmationDialogVariant } from '@/components/ui/confirmation-dialog';
import { TenantBentoItem } from '@/types/tenant-payment';

// Overview Modal Types
interface HausWithWohnungen {
  id: string;
  name: string;
  strasse?: string;
  ort: string;
  size?: string;
  totalArea: number;
  totalRent: number;
  apartmentCount: number;
  tenantCount: number;
  summaryStats: {
    averageRent: number;
    medianRent: number;
    averageSize: number;
    medianSize: number;
    occupancyRate: number;
  };
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

// Apartment-Tenant Details Modal Types
interface ApartmentTenantDetailsData {
  apartment: {
    id: string;
    name: string;
    groesse: number;
    miete: number;
    haus_id?: string; // Add haus_id to the interface
    hausName: string;
    amenities?: string[];
    condition?: string;
    notes?: string;
  };
  tenant?: {
    id: string;
    name: string;
    email?: string;
    telefon?: string;
    einzug?: string;
    auszug?: string;
    leaseTerms?: string;
    paymentHistory?: Array<{
      id: string;
      amount: number;
      date: string;
      status: 'paid' | 'pending' | 'overdue';
      description?: string;
    }>;
    notes?: string;
  };
}

interface ConfirmationModalConfig {
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmationDialogVariant;
}

// Wasser_Zaehler Modal Types
interface WasserZaehlerData {
  id?: string;
  custom_id?: string;
  wohnung_id: string;
  wohnungName?: string;
}

interface WasserZaehlerModalData {
  wohnungId: string;
  wohnungName: string;
  existingZaehler?: WasserZaehlerData[];
}

// AI Assistant Modal Types
interface AIAssistantModalData {
  documentationContext?: any;
  onFallbackToSearch?: () => void;
}

interface CreateFolderModalData {
  currentPath: string;
  onFolderCreated: (folderName: string) => void;
}

interface CreateFileModalData {
  currentPath: string;
  onFileCreated: (fileName: string) => void;
}


interface FileRenameData {
  fileName: string;
  filePath: string;
  onRename: (newName: string) => Promise<void>;
}

interface FolderDeleteConfirmationData {
  folderName: string;
  folderPath: string;
  fileCount: number;
  onConfirm: () => Promise<void>;
}

interface FileMoveData {
  item: any; // StorageObject | VirtualFolder
  itemType: 'file' | 'folder';
  currentPath: string;
  userId: string;
  onMove: (targetPath: string) => Promise<void>;
}

interface ShareDocumentData {
  fileName: string;
  filePath: string;
}

interface MarkdownEditorData {
  filePath?: string;
  fileName?: string;
  initialContent?: string;
  isNewFile?: boolean;
  onSave?: (content: string) => void;
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

interface ApplicantScoreModalData {
  tenant: {
    id: string;
    name: string;
    email?: string;
    bewerbung_score?: number;
    bewerbung_metadaten?: any;
    bewerbung_mail_id?: string;
  };
}

export interface ModalState {
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

  // Tenant Payment Edit Modal State
  isTenantPaymentEditModalOpen: boolean;
  tenantPaymentEditInitialData?: {
    id: string;
    tenant: string;
    apartment: string;
    apartmentId: string;
    mieteRaw: number;
    nebenkostenRaw?: number;
    einzug?: string | null;
  };
  tenantPaymentEditModalOnSuccess?: () => void;
  isTenantPaymentEditModalDirty: boolean;
  openTenantPaymentEditModal: (initialData: {
    id: string;
    tenant: string;
    apartment: string;
    apartmentId: string;
    mieteRaw: number;
    nebenkostenRaw?: number;
    einzug?: string | null;
  }, onSuccess?: () => void) => void;
  closeTenantPaymentEditModal: (options?: CloseModalOptions) => void;
  setTenantPaymentEditModalDirty: (isDirty: boolean) => void;

  // Betriebskosten Modal State
  isBetriebskostenModalOpen: boolean;
  betriebskostenInitialData?: {
    id?: string;
    useTemplate?: 'previous' | 'default';
  } | null;
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
  wasserzaehlerOptimizedData?: MeterModalData[] | null;
  wasserzaehlerOnSave?: (data: MeterReadingFormData) => Promise<{ success: boolean; message?: string }>;
  isWasserzaehlerModalDirty: boolean;
  openWasserzaehlerModal: (nebenkosten?: Nebenkosten, mieterList?: Mieter[], existingReadings?: Wasserzaehler[] | null, onSave?: (data: MeterReadingFormData) => Promise<{ success: boolean; message?: string }>) => void;
  openWasserzaehlerModalOptimized: (nebenkosten?: Nebenkosten, optimizedData?: MeterModalData[] | null, onSave?: (data: MeterReadingFormData) => Promise<{ success: boolean; message?: string }>) => void;
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
  refreshHausOverviewData: () => Promise<void>;

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
  refreshWohnungOverviewData: () => Promise<void>;

  // Tenant Payment Overview Modal State
  isTenantPaymentOverviewModalOpen: boolean;
  tenantPaymentOverviewData?: TenantBentoItem[];
  tenantPaymentOverviewLoading: boolean;
  tenantPaymentOverviewError?: string;
  openTenantPaymentOverviewModal: () => void;
  closeTenantPaymentOverviewModal: (options?: CloseModalOptions) => void;
  setTenantPaymentOverviewLoading: (loading: boolean) => void;
  setTenantPaymentOverviewError: (error?: string) => void;
  setTenantPaymentOverviewData: (data?: TenantBentoItem[]) => void;

  // Apartment-Tenant Details Modal State
  isApartmentTenantDetailsModalOpen: boolean;
  apartmentTenantDetailsData?: ApartmentTenantDetailsData;
  apartmentTenantDetailsLoading: boolean;
  apartmentTenantDetailsError?: string;
  openApartmentTenantDetailsModal: (apartmentId: string, tenantId?: string) => void;
  closeApartmentTenantDetailsModal: (options?: CloseModalOptions) => void;
  setApartmentTenantDetailsLoading: (loading: boolean) => void;
  setApartmentTenantDetailsError: (error?: string) => void;
  setApartmentTenantDetailsData: (data?: ApartmentTenantDetailsData) => void;
  refreshApartmentTenantDetailsData: () => Promise<void>;

  // Upload Modal State
  isUploadModalOpen: boolean;
  uploadModalTargetPath?: string;
  uploadModalOnComplete?: () => void;
  uploadModalFiles?: File[];
  openUploadModal: (targetPath: string, onComplete?: () => void, files?: File[]) => void;
  closeUploadModal: () => void;

  // File Rename Modal State
  isFileRenameModalOpen: boolean;
  fileRenameData?: FileRenameData;
  openFileRenameModal: (fileData: FileRenameData) => void;
  closeFileRenameModal: () => void;

  // AI Assistant Modal State
  isAIAssistantModalOpen: boolean;
  aiAssistantModalData?: AIAssistantModalData;
  openAIAssistantModal: (data?: AIAssistantModalData) => void;
  closeAIAssistantModal: () => void;

  // Create Folder Modal State
  isCreateFolderModalOpen: boolean;
  createFolderModalData?: CreateFolderModalData;
  openCreateFolderModal: (currentPath: string, onFolderCreated: (folderName: string) => void) => void;
  closeCreateFolderModal: () => void;

  // Create File Modal State
  isCreateFileModalOpen: boolean;
  createFileModalData?: CreateFileModalData;
  openCreateFileModal: (currentPath: string, onFileCreated: (fileName: string) => void) => void;
  closeCreateFileModal: () => void;

  // Confirmation Modal State
  isConfirmationModalOpen: boolean;
  confirmationModalConfig: ConfirmationModalConfig | null;
  openConfirmationModal: (config: ConfirmationModalConfig) => void;
  closeConfirmationModal: () => void;

  // Folder Delete Confirmation Modal State
  isFolderDeleteConfirmationModalOpen: boolean;
  folderDeleteConfirmationData?: FolderDeleteConfirmationData;
  openFolderDeleteConfirmationModal: (data: FolderDeleteConfirmationData) => void;
  closeFolderDeleteConfirmationModal: () => void;

  // File Move Modal State
  isFileMoveModalOpen: boolean;
  fileMoveData?: FileMoveData;
  openFileMoveModal: (data: FileMoveData) => void;
  closeFileMoveModal: () => void;

  // Share Document Modal State
  isShareDocumentModalOpen: boolean;
  shareDocumentData?: ShareDocumentData;
  openShareDocumentModal: (data: ShareDocumentData) => void;
  closeShareDocumentModal: () => void;

  // Markdown Editor Modal State
  isMarkdownEditorModalOpen: boolean;
  markdownEditorData?: MarkdownEditorData;
  openMarkdownEditorModal: (data: MarkdownEditorData) => void;
  closeMarkdownEditorModal: () => void;

  // Templates Modal State
  isTemplatesModalOpen: boolean;
  templatesModalInitialCategory?: string;
  isTemplateEditorModalOpen: boolean;
  templateEditorData?: {
    template?: Template;
    onSave: (templateData: Partial<Template>) => void;
  };
  isTemplatesModalDirty: boolean;
  isTemplateEditorModalDirty: boolean;
  openTemplatesModal: (initialCategory?: string) => void;
  closeTemplatesModal: (options?: CloseModalOptions) => void;
  openTemplateEditorModal: (template?: Template, onSave?: (templateData: Partial<Template>) => void) => void;
  closeTemplateEditorModal: (options?: CloseModalOptions) => void;
  setTemplatesModalDirty: (isDirty: boolean) => void;
  setTemplateEditorModalDirty: (isDirty: boolean) => void;

  // Tenant Mail Templates Modal State
  isTenantMailTemplatesModalOpen: boolean;
  tenantMailTemplatesModalData?: {
    tenantName?: string;
    tenantEmail?: string;
  };
  openTenantMailTemplatesModal: (tenantName?: string, tenantEmail?: string) => void;
  closeTenantMailTemplatesModal: () => void;

  // Wasser_Zaehler Modal State
  isWasserZaehlerModalOpen: boolean;
  wasserZaehlerModalData?: WasserZaehlerModalData;
  isWasserZaehlerModalDirty: boolean;
  openWasserZaehlerModal: (wohnungId: string, wohnungName: string) => void;
  closeWasserZaehlerModal: (options?: CloseModalOptions) => void;
  setWasserZaehlerModalDirty: (isDirty: boolean) => void;

  // Ablesungen Modal State
  isAblesungenModalOpen: boolean;
  ablesungenModalData?: {
    zaehlerId: string;
    wohnungName: string;
    customId?: string;
    zaehlerTyp?: string;  // Type of meter (wasser, gas, strom, etc.)
    einheit?: string;     // Unit of measurement (m³, kWh, etc.)
  };
  isAblesungenModalDirty: boolean;
  openAblesungenModal: (zaehlerId: string, wohnungName: string, customId?: string, zaehlerTyp?: string, einheit?: string) => void;
  closeAblesungenModal: (options?: CloseModalOptions) => void;
  setAblesungenModalDirty: (isDirty: boolean) => void;

  // Zaehler Modal State (new multi-meter type modal)
  isZaehlerModalOpen: boolean;
  zaehlerModalData?: {
    wohnungId: string;
    wohnungName: string;
  };
  isZaehlerModalDirty: boolean;
  openZaehlerModal: (wohnungId: string, wohnungName: string) => void;
  closeZaehlerModal: (options?: CloseModalOptions) => void;
  setZaehlerModalDirty: (isDirty: boolean) => void;

  // Applicant Score Modal State
  isApplicantScoreModalOpen: boolean;
  applicantScoreModalData?: ApplicantScoreModalData;
  openApplicantScoreModal: (data: ApplicantScoreModalData) => void;
  closeApplicantScoreModal: () => void;

  // Mail Preview Modal State
  isMailPreviewModalOpen: boolean;
  mailPreviewId?: string;
  openMailPreviewModal: (mailId: string) => void;
  closeMailPreviewModal: () => void;
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

const initialTenantPaymentEditModalState = {
  isTenantPaymentEditModalOpen: false,
  tenantPaymentEditInitialData: undefined,
  tenantPaymentEditModalOnSuccess: undefined,
  isTenantPaymentEditModalDirty: false,
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
  wasserzaehlerOptimizedData: undefined,
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

const initialTenantPaymentOverviewModalState = {
  isTenantPaymentOverviewModalOpen: false,
  tenantPaymentOverviewData: undefined,
  tenantPaymentOverviewLoading: false,
  tenantPaymentOverviewError: undefined,
};

const initialApartmentTenantDetailsModalState = {
  isApartmentTenantDetailsModalOpen: false,
  apartmentTenantDetailsData: undefined,
  apartmentTenantDetailsLoading: false,
  apartmentTenantDetailsError: undefined,
};

const initialUploadModalState = {
  isUploadModalOpen: false,
  uploadModalTargetPath: undefined,
  uploadModalOnComplete: undefined,
  uploadModalFiles: undefined,
};

const initialFileRenameModalState = {
  isFileRenameModalOpen: false,
  fileRenameData: undefined,
};

const initialAIAssistantModalState = {
  isAIAssistantModalOpen: false,
  aiAssistantModalData: undefined,
};

const initialCreateFolderModalState = {
  isCreateFolderModalOpen: false,
  createFolderModalData: undefined,
};

const initialCreateFileModalState = {
  isCreateFileModalOpen: false,
  createFileModalData: undefined,
};

const initialFolderDeleteConfirmationModalState = {
  isFolderDeleteConfirmationModalOpen: false,
  folderDeleteConfirmationData: undefined,
};

const initialFileMoveModalState = {
  isFileMoveModalOpen: false,
  fileMoveData: undefined,
};

const initialShareDocumentModalState = {
  isShareDocumentModalOpen: false,
  shareDocumentData: undefined,
};

const initialMarkdownEditorModalState = {
  isMarkdownEditorModalOpen: false,
  markdownEditorData: undefined,
};

const initialTemplatesModalState = {
  isTemplatesModalOpen: false,
  templatesModalInitialCategory: undefined,
  isTemplateEditorModalOpen: false,
  templateEditorData: undefined,
  isTemplatesModalDirty: false,
  isTemplateEditorModalDirty: false,
};

const initialTenantMailTemplatesModalState = {
  isTenantMailTemplatesModalOpen: false,
  tenantMailTemplatesModalData: undefined,
};

const initialWasserZaehlerModalState = {
  isWasserZaehlerModalOpen: false,
  wasserZaehlerModalData: undefined,
  isWasserZaehlerModalDirty: false,
};

const initialAblesungenModalState = {
  isAblesungenModalOpen: false,
  ablesungenModalData: undefined,
  isAblesungenModalDirty: false,
};

const initialZaehlerModalState = {
  isZaehlerModalOpen: false,
  zaehlerModalData: undefined,
  isZaehlerModalDirty: false,
};

const initialApplicantScoreModalState = {
  isApplicantScoreModalOpen: false,
  applicantScoreModalData: undefined,
};

const initialMailPreviewModalState = {
  isMailPreviewModalOpen: false,
  mailPreviewId: undefined,
};

const createInitialModalState = () => ({
  ...initialTenantModalState,
  ...initialHouseModalState,
  ...initialFinanceModalState,
  ...initialWohnungModalState,
  ...initialAufgabeModalState,
  ...initialTenantPaymentEditModalState,
  ...initialBetriebskostenModalState,
  ...initialWasserzaehlerModalState,
  ...initialKautionModalState,
  ...initialHausOverviewModalState,
  ...initialWohnungOverviewModalState,
  ...initialTenantPaymentOverviewModalState,
  ...initialApartmentTenantDetailsModalState,
  ...initialUploadModalState,
  ...initialFileRenameModalState,
  ...initialAIAssistantModalState,
  ...initialCreateFolderModalState,
  ...initialCreateFileModalState,
  ...initialFolderDeleteConfirmationModalState,
  ...initialFileMoveModalState,
  ...initialShareDocumentModalState,
  ...initialMarkdownEditorModalState,
  ...initialTemplatesModalState,
  ...initialTenantMailTemplatesModalState,
  ...initialWasserZaehlerModalState,
  ...initialAblesungenModalState,
  ...initialZaehlerModalState,
  ...initialApplicantScoreModalState,
  ...initialMailPreviewModalState,
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

    // Tenant Payment Edit Modal
    openTenantPaymentEditModal: (initialData, onSuccess) => set({
      isTenantPaymentEditModalOpen: true,
      tenantPaymentEditInitialData: initialData,
      tenantPaymentEditModalOnSuccess: onSuccess,
      isTenantPaymentEditModalDirty: false
    }),
    closeTenantPaymentEditModal: createCloseHandler('isTenantPaymentEditModalDirty', initialTenantPaymentEditModalState),
    setTenantPaymentEditModalDirty: (isDirty) => set({ isTenantPaymentEditModalDirty: isDirty }),

    // Betriebskosten Modal
    openBetriebskostenModal: (initialData: { id?: string; useTemplate?: 'previous' | 'default' } | null, haeuser, onSuccess) => set({
      isBetriebskostenModalOpen: true,
      betriebskostenInitialData: initialData,
      betriebskostenModalHaeuser: haeuser || [],
      betriebskostenModalOnSuccess: onSuccess,
      isBetriebskostenModalDirty: false
    }),
    closeBetriebskostenModal: createCloseHandler('isBetriebskostenModalDirty', initialBetriebskostenModalState),
    setBetriebskostenModalDirty: (isDirty) => set({ isBetriebskostenModalDirty: isDirty }),

    // Applicant Score Modal
    openApplicantScoreModal: (data) => set({
      isApplicantScoreModalOpen: true,
      applicantScoreModalData: data,
    }),
    closeApplicantScoreModal: () => set(initialApplicantScoreModalState),

    // Mail Preview Modal
    openMailPreviewModal: (mailId: string) => set({
      isMailPreviewModalOpen: true,
      mailPreviewId: mailId,
    }),
    closeMailPreviewModal: () => set(initialMailPreviewModalState),




    // Wasserzähler Modal
    openWasserzaehlerModal: (nebenkosten, mieterList, existingReadings, onSave) => set({
      isWasserzaehlerModalOpen: true,
      wasserzaehlerNebenkosten: nebenkosten,
      wasserzaehlerMieterList: mieterList || [],
      wasserzaehlerExistingReadings: existingReadings,
      wasserzaehlerOptimizedData: undefined, // Clear optimized data when using legacy method
      wasserzaehlerOnSave: onSave,
      isWasserzaehlerModalDirty: false
    }),
    openWasserzaehlerModalOptimized: (nebenkosten, optimizedData, onSave) => set({
      isWasserzaehlerModalOpen: true,
      wasserzaehlerNebenkosten: nebenkosten,
      wasserzaehlerMieterList: [], // Clear legacy data when using optimized method
      wasserzaehlerExistingReadings: undefined, // Clear legacy data when using optimized method
      wasserzaehlerOptimizedData: optimizedData,
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
    refreshHausOverviewData: async () => {
      const state = get();
      if (!state.hausOverviewData?.id) return;

      set({ hausOverviewLoading: true, hausOverviewError: undefined });

      try {
        const response = await fetch(`/api/haeuser/${state.hausOverviewData.id}/overview`);
        if (!response.ok) {
          throw new Error('Failed to refresh Haus overview data');
        }
        const data = await response.json();
        set({ hausOverviewData: data, hausOverviewLoading: false });
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
    refreshWohnungOverviewData: async () => {
      const state = get();
      if (!state.wohnungOverviewData?.id) return;

      set({ wohnungOverviewLoading: true, wohnungOverviewError: undefined });

      try {
        const response = await fetch(`/api/wohnungen/${state.wohnungOverviewData.id}/overview`);
        if (!response.ok) {
          throw new Error('Failed to refresh Wohnung overview data');
        }
        const data = await response.json();
        set({ wohnungOverviewData: data, wohnungOverviewLoading: false });
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

    // Tenant Payment Overview Modal
    openTenantPaymentOverviewModal: () => {
      set({
        isTenantPaymentOverviewModalOpen: true,
        tenantPaymentOverviewLoading: true,
        tenantPaymentOverviewError: undefined,
        tenantPaymentOverviewData: undefined
      });
    },
    closeTenantPaymentOverviewModal: (options?: CloseModalOptions) => {
      set(initialTenantPaymentOverviewModalState);
    },
    setTenantPaymentOverviewLoading: (loading: boolean) => set({ tenantPaymentOverviewLoading: loading }),
    setTenantPaymentOverviewError: (error?: string) => set({ tenantPaymentOverviewError: error }),
    setTenantPaymentOverviewData: (data?: TenantBentoItem[]) => set({ tenantPaymentOverviewData: data }),

    // Apartment-Tenant Details Modal
    openApartmentTenantDetailsModal: async (apartmentId: string, tenantId?: string) => {
      set({
        isApartmentTenantDetailsModalOpen: true,
        apartmentTenantDetailsLoading: true,
        apartmentTenantDetailsError: undefined,
        apartmentTenantDetailsData: undefined
      });

      // Create timeout promise for 2-second limit
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Das Laden dauert länger als erwartet. Bitte versuchen Sie es erneut.'));
        }, 2000);
      });

      try {
        const url = tenantId
          ? `/api/apartments/${apartmentId}/tenant/${tenantId}/details`
          : `/api/apartments/${apartmentId}/details`;

        const fetchPromise = fetch(url).then(async (response) => {
          if (!response.ok) {
            throw new Error('Failed to fetch apartment-tenant details');
          }
          return response.json();
        });

        // Race between fetch and timeout
        const data = await Promise.race([fetchPromise, timeoutPromise]);

        set({
          apartmentTenantDetailsData: data,
          apartmentTenantDetailsLoading: false
        });
      } catch (error) {
        set({
          apartmentTenantDetailsError: error instanceof Error ? error.message : 'An error occurred',
          apartmentTenantDetailsLoading: false
        });
      }
    },
    refreshApartmentTenantDetailsData: async () => {
      const state = get();
      if (!state.apartmentTenantDetailsData?.apartment?.id) return;

      set({ apartmentTenantDetailsLoading: true, apartmentTenantDetailsError: undefined });

      try {
        const url = state.apartmentTenantDetailsData.tenant
          ? `/api/apartments/${state.apartmentTenantDetailsData.apartment.id}/tenant/${state.apartmentTenantDetailsData.tenant.id}/details`
          : `/api/apartments/${state.apartmentTenantDetailsData.apartment.id}/details`;

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to refresh apartment-tenant details');
        }
        const data = await response.json();
        set({ apartmentTenantDetailsData: data, apartmentTenantDetailsLoading: false });
      } catch (error) {
        set({
          apartmentTenantDetailsError: error instanceof Error ? error.message : 'An error occurred',
          apartmentTenantDetailsLoading: false
        });
      }
    },
    closeApartmentTenantDetailsModal: (options?: CloseModalOptions) => {
      set(initialApartmentTenantDetailsModalState);
    },
    setApartmentTenantDetailsLoading: (loading: boolean) => set({ apartmentTenantDetailsLoading: loading }),
    setApartmentTenantDetailsError: (error?: string) => set({ apartmentTenantDetailsError: error }),
    setApartmentTenantDetailsData: (data?: ApartmentTenantDetailsData) => set({ apartmentTenantDetailsData: data }),

    // Upload Modal
    openUploadModal: (targetPath: string, onComplete?: () => void, files?: File[]) => set({
      isUploadModalOpen: true,
      uploadModalTargetPath: targetPath,
      uploadModalOnComplete: onComplete,
      uploadModalFiles: files,
    }),
    closeUploadModal: () => set(initialUploadModalState),

    // File Rename Modal
    openFileRenameModal: (fileData: FileRenameData) => set({
      isFileRenameModalOpen: true,
      fileRenameData: fileData,
    }),
    closeFileRenameModal: () => set(initialFileRenameModalState),

    // AI Assistant Modal
    openAIAssistantModal: (data?: AIAssistantModalData) => set({
      isAIAssistantModalOpen: true,
      aiAssistantModalData: data,
    }),
    closeAIAssistantModal: () => set(initialAIAssistantModalState),

    // Create Folder Modal
    openCreateFolderModal: (currentPath: string, onFolderCreated: (folderName: string) => void) => set({
      isCreateFolderModalOpen: true,
      createFolderModalData: {
        currentPath,
        onFolderCreated,
      },
    }),
    closeCreateFolderModal: () => set(initialCreateFolderModalState),

    // Create File Modal
    openCreateFileModal: (currentPath: string, onFileCreated: (fileName: string) => void) => set({
      isCreateFileModalOpen: true,
      createFileModalData: {
        currentPath,
        onFileCreated,
      },
    }),
    closeCreateFileModal: () => set(initialCreateFileModalState),

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

    // Folder Delete Confirmation Modal
    openFolderDeleteConfirmationModal: (data: FolderDeleteConfirmationData) => set({
      isFolderDeleteConfirmationModalOpen: true,
      folderDeleteConfirmationData: data,
    }),
    closeFolderDeleteConfirmationModal: () => set(initialFolderDeleteConfirmationModalState),

    // File Move Modal
    openFileMoveModal: (data: FileMoveData) => set({
      isFileMoveModalOpen: true,
      fileMoveData: data,
    }),
    closeFileMoveModal: () => set(initialFileMoveModalState),

    // Share Document Modal
    openShareDocumentModal: (data: ShareDocumentData) => set({
      isShareDocumentModalOpen: true,
      shareDocumentData: data,
    }),
    closeShareDocumentModal: () => set(initialShareDocumentModalState),

    // Markdown Editor Modal
    openMarkdownEditorModal: (data: MarkdownEditorData) => set({
      isMarkdownEditorModalOpen: true,
      markdownEditorData: data,
    }),
    closeMarkdownEditorModal: () => set(initialMarkdownEditorModalState),

    // Templates Modal
    openTemplatesModal: (initialCategory) => set({
      isTemplatesModalOpen: true,
      templatesModalInitialCategory: initialCategory,
      isTemplatesModalDirty: false,
    }),
    closeTemplatesModal: createCloseHandler('isTemplatesModalDirty', initialTemplatesModalState),
    setTemplatesModalDirty: (isDirty) => set({ isTemplatesModalDirty: isDirty }),

    // Template Editor Modal (nested within Templates Modal)
    openTemplateEditorModal: (template, onSave) => set({
      isTemplateEditorModalOpen: true,
      templateEditorData: {
        template,
        onSave: onSave || (() => { }),
      },
      isTemplateEditorModalDirty: false,
    }),
    closeTemplateEditorModal: createCloseHandler('isTemplateEditorModalDirty', {
      isTemplateEditorModalOpen: false,
      templateEditorData: undefined,
      isTemplateEditorModalDirty: false,
    }),
    setTemplateEditorModalDirty: (isDirty) => set({ isTemplateEditorModalDirty: isDirty }),

    // Tenant Mail Templates Modal
    openTenantMailTemplatesModal: (tenantName, tenantEmail) => set({
      isTenantMailTemplatesModalOpen: true,
      tenantMailTemplatesModalData: {
        tenantName,
        tenantEmail,
      },
    }),
    closeTenantMailTemplatesModal: () => set(initialTenantMailTemplatesModalState),

    // Wasser_Zaehler Modal
    openWasserZaehlerModal: async (wohnungId: string, wohnungName: string) => {
      set({
        isWasserZaehlerModalOpen: true,
        wasserZaehlerModalData: {
          wohnungId,
          wohnungName,
          existingZaehler: undefined,
        },
        isWasserZaehlerModalDirty: false,
      });

      // Fetch existing Wasserzähler for this Wohnung
      try {
        const response = await fetch(`/api/zaehler?wohnung_id=${wohnungId}`);
        if (response.ok) {
          const data = await response.json();
          set((state) => ({
            wasserZaehlerModalData: state.wasserZaehlerModalData ? {
              ...state.wasserZaehlerModalData,
              existingZaehler: data,
            } : undefined,
          }));
        }
      } catch (error) {
        console.error('Error fetching Wasserzähler:', error);
      }
    },
    closeWasserZaehlerModal: createCloseHandler('isWasserZaehlerModalDirty', initialWasserZaehlerModalState),
    setWasserZaehlerModalDirty: (isDirty) => set({ isWasserZaehlerModalDirty: isDirty }),

    // Wasser_Ablesungen Modal
    openAblesungenModal: (zaehlerId: string, wohnungName: string, customId?: string, zaehlerTyp?: string, einheit?: string) => set({
      isAblesungenModalOpen: true,
      ablesungenModalData: {
        zaehlerId,
        wohnungName,
        customId,
        zaehlerTyp,
        einheit,
      },
      isAblesungenModalDirty: false,
    }),
    closeAblesungenModal: createCloseHandler('isAblesungenModalDirty', initialAblesungenModalState),
    setAblesungenModalDirty: (isDirty) => set({ isAblesungenModalDirty: isDirty }),

    // Zaehler Modal (new multi-meter type modal)
    openZaehlerModal: (wohnungId: string, wohnungName: string) => set({
      isZaehlerModalOpen: true,
      zaehlerModalData: {
        wohnungId,
        wohnungName,
      },
      isZaehlerModalDirty: false,
    }),
    closeZaehlerModal: createCloseHandler('isZaehlerModalDirty', initialZaehlerModalState),
    setZaehlerModalDirty: (isDirty) => set({ isZaehlerModalDirty: isDirty }),
  };
});