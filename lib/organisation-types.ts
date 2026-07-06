export interface MemberBerechtigungen {
  module?: Record<string, string[]>;
  objekte?: {
    haeuser?: string[] | null;
  };
}

export interface MemberPermissions {
  rolle: 'owner' | 'admin' | 'mitarbeiter';
  status: 'eingeladen' | 'aktiv' | 'deaktiviert';
  module: Record<string, string[]> | null;
  objekte: {
    haeuser: string[] | null;
  };
  is_restricted: boolean;
  policy_ids: string[];
}

export interface HausWithWohnungen {
  id: string;
  name: string;
  wohnungen: { id: string; name: string }[];
}

export interface PolicyBerechtigungen {
  module?: Record<string, string[]>;
  objekte?: { haeuser?: string[] | null };
}

export interface OrganisationPolicy {
  id: string;
  organisation_id: string;
  name: string;
  berechtigungen: PolicyBerechtigungen;
  erstellt_am: string;
}

