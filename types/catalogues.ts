export interface CatalogueBrandingSummary {
  bannerColor?: string | null;
  logoUrl?: string | null;
  issuuUrl?: string | null;
  isShared?: boolean | null;
}

export interface CatalogueSummary {
  id: string;
  name: string;
  description?: string | null;
  branding?: CatalogueBrandingSummary | null;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
}

export interface CatalogueSavePayload {
  id?: string;
  name: string;
  description?: string | null;
  branding?: Record<string, any> | null;
  layoutConfig?: Record<string, any> | null;
  items?: any[] | null;
  settings?: Record<string, any> | null;
}

export interface CatalogueDetails extends CatalogueSavePayload {
  id: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

