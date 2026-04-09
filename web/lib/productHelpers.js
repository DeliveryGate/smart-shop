import { shopifyGraphQL, GET_PRODUCTS } from "../shopify.js";

/**
 * Fetch all products from Shopify (auto-paginates up to 500).
 */
export async function fetchAllProducts(shop, accessToken, limit = 250) {
  let products = [];
  let hasNextPage = true;
  let after = null;

  while (hasNextPage && products.length < limit) {
    const batchSize = Math.min(250, limit - products.length);
    const data = await shopifyGraphQL(shop, accessToken, GET_PRODUCTS, {
      first: batchSize,
      after,
    });

    const edges = data?.data?.products?.edges || [];
    products = products.concat(
      edges.map((e) => ({
        id: e.node.id,
        title: e.node.title,
        productType: e.node.productType,
        status: e.node.status,
        featuredImage: e.node.featuredImage,
        tags: e.node.tags || [],
        variants: (e.node.variants?.edges || []).map((v) => ({
          id: v.node.id,
          title: v.node.title,
          price: v.node.price,
          availableForSale: v.node.availableForSale,
        })),
      }))
    );

    hasNextPage = data?.data?.products?.pageInfo?.hasNextPage || false;
    after = data?.data?.products?.pageInfo?.endCursor || null;
  }

  return products;
}

/**
 * Merge Shopify products with locally stored ProductMeta rows.
 */
export function mergeWithMeta(shopifyProducts, metaRows) {
  const metaByProductId = {};
  for (const row of metaRows) {
    metaByProductId[row.productId] = row;
  }

  return shopifyProducts.map((p) => {
    const meta = metaByProductId[p.id];
    return {
      ...p,
      categories: meta ? JSON.parse(meta.categories || "[]") : [],
      dietaryTags: meta ? JSON.parse(meta.dietaryTags || "[]") : [],
      portionSizes: meta ? JSON.parse(meta.portionSizes || "[]") : [],
      metaId: meta?.id || null,
    };
  });
}

/**
 * Default product categories (generalised from VK Kitchen theme).
 */
export const DEFAULT_CATEGORIES = [
  { id: "breakfast",     label: "Breakfast",     emoji: "🍳", active: true },
  { id: "sandwiches",    label: "Sandwiches",     emoji: "🥪", active: true },
  { id: "salads",        label: "Salads",         emoji: "🥗", active: true },
  { id: "hot-meals",     label: "Hot Meals",      emoji: "🍲", active: true },
  { id: "sweet-treats",  label: "Sweet Treats",   emoji: "🧁", active: true },
  { id: "drinks",        label: "Drinks",         emoji: "🥤", active: true },
  { id: "snacks",        label: "Snacks",         emoji: "🍪", active: true },
  { id: "platters",      label: "Platters",       emoji: "🍱", active: true },
];

/**
 * Default dietary filters (exclusion-based, "without X" style).
 */
export const DEFAULT_DIETARY_FILTERS = [
  { id: "gluten-free",  label: "Without gluten", icon: "🌾🚫", active: true },
  { id: "nut-free",     label: "Without nuts",   icon: "🥜🚫", active: true },
  { id: "dairy-free",   label: "Without dairy",  icon: "🥛🚫", active: true },
  { id: "egg-free",     label: "Without egg",    icon: "🥚🚫", active: true },
  { id: "soya-free",    label: "Without soya",   icon: "🌱🚫", active: true },
  { id: "vegan",        label: "Vegan",          icon: "🌿",   active: true },
  { id: "halal",        label: "Halal",          icon: "☪️",   active: true },
  { id: "sugar-free",   label: "Without refined sugar", icon: "🍬🚫", active: false },
];
