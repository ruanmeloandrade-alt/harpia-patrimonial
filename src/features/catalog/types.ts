export type CatalogItemKind = 'development' | 'unit' | 'standalone';
export type CatalogItemType = 'property' | 'product' | 'service';
export type CatalogPurpose = 'sale' | 'rent';
export type CatalogStatus = 'draft' | 'published' | 'paused' | 'sold';
export type CatalogMediaType = 'image' | 'video' | 'document' | 'floorplan';
export type CatalogDiscountType = 'percentage' | 'fixed';

export interface ProductCatalog {
  id: string;
  name: string;
  description?: string;
  tags: string[];
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

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
  storagePath?: string;
  label?: string;
  isCover?: boolean;
}

export type PublicCatalogMedia = Omit<CatalogMedia, 'storagePath'>;

export interface CatalogItem {
  id: string;
  code: string;
  name: string;
  catalogId: string | null;
  itemType: CatalogItemType;
  kind: CatalogItemKind;
  parentId?: string;
  typology?: string;
  purpose: CatalogPurpose;
  description: string;
  location: CatalogLocation;
  price: number | null;
  discountType?: CatalogDiscountType;
  discountValue?: number;
  tags: string[];
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
  itemType?: CatalogItemType;
  catalogId?: string | null;
  search?: string;
}

export interface PublicCatalogFilters {
  purpose?: CatalogPurpose;
  itemType?: CatalogItemType;
  city?: string;
  location?: string;
  isLaunch?: boolean;
  minPrice?: number;
  maxPrice?: number;
  lifestyleTag?: string;
  tag?: string;
}

export interface PublicCatalogItem {
  id: string;
  code: string;
  name: string;
  catalogId: string | null;
  itemType: CatalogItemType;
  kind: CatalogItemKind;
  parentId?: string;
  typology?: string;
  purpose: CatalogPurpose;
  description: string;
  location: CatalogLocation;
  price: number | null;
  discountType?: CatalogDiscountType;
  discountValue?: number;
  tags: string[];
  isLaunch: boolean;
  features: string[];
  lifestyleTags: string[];
  developer?: string;
  media: PublicCatalogMedia[];
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
