export interface MemberBerechtigungen {
  module?: Record<string, string[]>;
  objekte?: {
    haeuser?: string[] | null;
    wohnungen?: string[] | null;
  };
}

export interface MemberPermissions {
  rolle: 'owner' | 'admin' | 'mitarbeiter';
  status: 'eingeladen' | 'aktiv' | 'deaktiviert';
  module: Record<string, string[]> | null;
  objekte: {
    haeuser: string[] | null;
    wohnungen: string[] | null;
  };
  is_restricted: boolean;
}

export interface HausWithWohnungen {
  id: string;
  name: string;
  wohnungen: { id: string; name: string }[];
}
