export type PublicCatalogStatus = 'published' | 'sold';

export interface PublicCatalogMedia {
  type: 'image' | 'video';
  url: string;
  alt?: string;
}

export interface PublicCatalogItem {
  id: string;
  slug: string;
  code?: string;
  title: string;
  propertyType: string;
  purpose: string;
  city: string;
  location: string;
  price: number | null;
  isLaunch: boolean;
  status: PublicCatalogStatus;
  description?: string;
  bedrooms?: number;
  suites?: number;
  bathrooms?: number;
  parkingSpaces?: number;
  privateAreaM2?: number;
  lifestyleTags?: string[];
  features?: string[];
  media: PublicCatalogMedia[];
  development?: {
    id: string;
    title: string;
    unitLabel?: string;
  };
}

export interface PublicCatalogFilters {
  purpose?: string;
  city?: string;
  location?: string;
  launch?: boolean;
  minPrice?: number;
  maxPrice?: number;
}

export interface PublicCatalogReader {
  listPublished(filters?: PublicCatalogFilters): Promise<PublicCatalogItem[]>;
  getPublishedBySlug(slug: string): Promise<PublicCatalogItem | null>;
}

/**
 * Boundary used by Frente02 until Frente03 exposes the real published-catalog
 * service. It intentionally returns no data instead of populating the UI with
 * fake properties.
 */
export const emptyPublicCatalogReader: PublicCatalogReader = {
  async listPublished() {
    return [];
  },
  async getPublishedBySlug() {
    return null;
  },
};
