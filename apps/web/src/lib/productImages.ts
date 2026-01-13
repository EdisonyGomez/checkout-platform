import gorra from './utils/gorra.jpg';
import taza from './utils/taza.jpg';
import camiseta from './utils/blue-t-shirt.jpg';

/**
 * Mapa de imágenes locales por SKU.
 * 
 */
export const PRODUCT_IMAGE_BY_SKU: Record<string, string> = {
  'SKU-CAP-001': gorra,
  'SKU-MUG-001': taza,
  'SKU-TEE-001': camiseta,
};
