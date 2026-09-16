export type CatalogItemKind = 'development' | 'unit' | 'standalone';
export type CatalogPurpose = 'sale' | 'rent';
export type CatalogStatus = 'draft' | 'published' | 'paused' | 'sold';
export type CatalogMediaType = 'image' | 'video' | 'document' | 'floorplan';

export interface CatalogLocation {
  city: string;
  neighborhood: string;
  condominium?: string;
  address?: string;
}

export interface CatalogMedia {
  id: string;
  type: CatalogMediaType;
  url: string;
  label?: string;
  isCover?: boolean;
}

export interface CatalogItem {
  id: string;
  code: string;
  name: string;
  kind: CatalogItemKind;
  parentId?: string;
  typology?: string;
  purpose: CatalogPurpose;
  description: string;
  location: CatalogLocation;
  price: number | null;
  isLaunch: boolean;
  features: string[];
  lifestyleTags: string[];
  developer?: string;
  media: CatalogMedia[];
  status: CatalogStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  soldAt?: string;
  deletedAt?: string;
}

export type CatalogItemDraft = Omit<
  CatalogItem,
  'id' | 'status' | 'createdAt' | 'updatedAt' | 'publishedAt' | 'soldAt' | 'deletedAt'
>;

export interface CatalogQuery {
  includeDeleted?: boolean;
  status?: CatalogStatus;
  kind?: CatalogItemKind;
  search?: string;
}

export interface PublicCatalogFilters {
  purpose?: CatalogPurpose;
  city?: string;
  location?: string;
  isLaunch?: boolean;
  minPrice?: number;
  maxPrice?: number;
  lifestyleTag?: string;
}

export interface PublicCatalogItem {
  id: string;
  code: string;
  name: string;
  kind: CatalogItemKind;
  parentId?: string;
  typology?: string;
  purpose: CatalogPurpose;
  description: string;
  location: CatalogLocation;
  price: number | null;
  isLaunch: boolean;
  features: string[];
  lifestyleTags: string[];
  developer?: string;
  media: CatalogMedia[];
  status: 'published';
}

export interface PublicCatalogPriceRange {
  min: number;
  max: number;
}

export interface PublicCatalogDevelopmentBundle {
  development: PublicCatalogItem;
  units: PublicCatalogItem[];
  priceRange: PublicCatalogPriceRange | null;
}
