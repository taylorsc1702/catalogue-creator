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

