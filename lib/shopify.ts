// lib/shopify.ts

export type ShopifyProduct = {
  id: string;
  title: string;
  handle: string;
  vendor: string;
  tags: string[];
  description?: string;
  featuredImageUrl?: string;
  additionalImages?: string[];
  price?: string;
  sku?: string;
  metafields: Record<string, string | undefined>;
};

const STORE = process.env.SHOPIFY_STORE_DOMAIN!;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN!;
const API_URL = `https://${STORE}/admin/api/2024-07/graphql.json`;

// Metafields you listed
// const IDENTIFIERS = [
//   { namespace: "custom", key: "weight" },
//   { namespace: "my_fields", key: "Dimensions" },
//   { namespace: "my_fields", key: "Author_Bio" },
//   { namespace: "my_fields", key: "Subtitle" },
//   { namespace: "my_fields", key: "Imprint" },
//   { namespace: "my_fields", key: "Release_date" },
//   { namespace: "my_fields", key: "Binding" },
//   { namespace: "my_fields", key: "pages" },
//   { namespace: "my_fields", key: "author" },
//   { namespace: "my_fields", key: "ICRKDT" },
//   { namespace: "my_fields", key: "icillus" },
//   { namespace: "my_fields", key: "ICAUTH" },
//   { namespace: "my_fields", key: "Illlustrations" },
//   { namespace: "my_fields", key: "Edition" },
// ] as const;

// Shopify GraphQL - with essential metafields for book catalogues
const query = `
  query CatalogueProducts($query: String, $first: Int = 250, $after: String) {
    products(first: $first, after: $after, query: $query) {
      edges {
        cursor
        node {
          id
          title
          handle
          vendor
          tags
          featuredImage { url altText }
          images(first: 5) { edges { node { url altText } } }
          variants(first: 1) { edges { node { price sku } } }
          description
          metafields(first: 50) { 
            edges { 
              node { 
                key 
                namespace 
                value 
              } 
            } 
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

// Minimal shapes
type ProductNode = {
  id: string;
  title: string;
  handle: string;
  vendor: string;
  tags?: string[] | null;
  description?: string | null;
  featuredImage?: { url?: string | null } | null;
  images?: { edges?: Array<{ node?: { url?: string | null; altText?: string | null } | null }> | null } | null;
  variants?: { edges?: Array<{ node?: { price?: string | null; sku?: string | null } | null }> | null } | null;
  metafields?: { 
    edges?: Array<{ 
      node?: { 
        key?: string | null; 
        namespace?: string | null; 
        value?: string | null; 
      } | null; 
    }> | null; 
  } | null;
};
type Edge = { cursor: string; node: ProductNode };
type Gql = {
  data?: {
    products?: {
      edges?: Edge[];
      pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
    };
  };
};

// Fetch with pagination + safety cutoff
export async function fetchProductsByQuery(searchQuery: string): Promise<ShopifyProduct[]> {
  if (!STORE || !TOKEN) throw new Error("Missing SHOPIFY env");

  let after: string | null = null;
  const out: ShopifyProduct[] = [];
  const trimmed = (searchQuery ?? "").trim();

  // Safety limit (don’t fetch >2000 per request cycle)
  const MAX_PRODUCTS = 2000;

  while (true) {
    const variables: Record<string, unknown> = { first: 250, after };
    // Always provide a query - if none specified, get all products
    variables.query = trimmed.length > 0 ? trimmed : "*";

    const init: RequestInit = {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    };

    const response: Response = await fetch(API_URL, init);
    if (!response.ok) {
      const t = await response.text();
      throw new Error(`Shopify GraphQL error: ${response.status} ${t}`);
    }

    const data = (await response.json()) as Gql;
    const edges: Edge[] = data?.data?.products?.edges ?? [];

    // Debug logging (can be removed in production)
    // console.log("Shopify query:", variables.query);
    // console.log("Shopify edges:", edges.length, "so far:", out.length);

    for (const e of edges) {
      const n = e.node;
      const mf: Record<string, string | undefined> = {};
      
      // Process metafields
      for (const edge of n.metafields?.edges ?? []) {
        const node = edge?.node;
        if (node?.key) {
          // Store by both key alone and namespace.key combination for flexibility
          mf[node.key] = node.value ?? undefined;
          if (node.namespace) {
            mf[`${node.namespace}.${node.key}`] = node.value ?? undefined;
          }
        }
      }

      out.push({
        id: n.id,
        title: n.title,
        handle: n.handle,
        vendor: n.vendor,
        tags: n.tags ?? [],
        description: n.description ?? undefined,
        featuredImageUrl: n.featuredImage?.url ?? n.images?.edges?.[0]?.node?.url ?? undefined,
        additionalImages: n.images?.edges?.slice(1).map(edge => edge?.node?.url).filter((url): url is string => Boolean(url)) ?? [],
        price: n.variants?.edges?.[0]?.node?.price ?? undefined,
        sku: n.variants?.edges?.[0]?.node?.sku ?? undefined,
        metafields: mf,
      });
    }

    // Break if we hit either Shopify’s end OR our cutoff
    const page = data?.data?.products?.pageInfo;
    after = page?.hasNextPage ? page?.endCursor ?? null : null;

    if (!after || out.length >= MAX_PRODUCTS) {
      break;
    }
  }

  return out;
}

// Build Shopify query strings (tries quoted + unquoted for vendor/tag)
export function buildShopifyQuery(opts: {
  tag?: string;
  vendor?: string;
  vendors?: string[];
  collectionId?: string;
  publishingStatus?: "Active" | "Draft" | "All";
  handleList?: string[];
}) {
  // Handle list takes priority
  if (opts.handleList && opts.handleList.length > 0) {
    const parts = opts.handleList.map((rawValue) => {
      const v = escapeVal(rawValue.trim());
      const digits = v.replace(/[^0-9Xx]/g, "");
      const terms: string[] = [];
      // Always try handle by original value
      terms.push(`handle:'${v}'`);
      // If it resembles an ISBN/UPC, also try SKU variants
      if (digits.length >= 10 && digits.length <= 13) {
        const clean = digits.toUpperCase();
        const asSku = clean.replace(/X$/,'');
        // Try across product and variant search fields often used for ISBN storage
        terms.push(`sku:'${asSku}'`);
        terms.push(`variants.sku:'${asSku}'`);
        terms.push(`barcode:'${asSku}'`);
        terms.push(`variants.barcode:'${asSku}'`);
        if (clean.length === 10) {
          const as13 = isbn10To13(clean);
          if (as13) {
            terms.push(`sku:'${as13}'`);
            terms.push(`variants.sku:'${as13}'`);
            terms.push(`barcode:'${as13}'`);
            terms.push(`variants.barcode:'${as13}'`);
          }
        }
        if (clean.length === 12) {
          // Some feeds store 12-digit UPC with a leading 0 as 13-digit EAN
          const upc13 = `0${clean}`;
          terms.push(`sku:'${upc13}'`);
          terms.push(`variants.sku:'${upc13}'`);
          terms.push(`barcode:'${upc13}'`);
          terms.push(`variants.barcode:'${upc13}'`);
        }
      }
      return `(${terms.join(' OR ')})`;
    });
    return `(${parts.join(' OR ')})`;
  }

  const p: string[] = [];

  if (opts.tag) {
    const t = escapeVal(opts.tag);
    // OR both forms to be lenient
    p.push(`(tag:${t} OR tag:'${t}')`);
  }

  if (opts.vendors && opts.vendors.length > 0) {
    const vendorTerms = opts.vendors.map((raw) => {
      const v = escapeVal(raw);
      return `(vendor:${v} OR vendor:'${v}')`;
    });
    p.push(`(${vendorTerms.join(" OR ")})`);
  } else if (opts.vendor) {
    const v = escapeVal(opts.vendor);
    // OR both forms to be lenient
    p.push(`(vendor:${v} OR vendor:'${v}')`);
  }

  if (opts.collectionId) p.push(`collection_id:${opts.collectionId}`);

  if (opts.publishingStatus && opts.publishingStatus !== "All") {
    p.push(`status:${opts.publishingStatus.toLowerCase()}`);
  }

  // If no filters provided, return a default query to get all products
  return p.length > 0 ? p.join(" AND ") : "*";
}

function escapeVal(v: string) {
  return v.replace(/'/g, "\\'");
}

export const firstDefined = (...vals: (string | undefined)[]) =>
  vals.find(v => v?.trim());

// Convert ISBN-10 to ISBN-13 (prefix 978 and recompute check digit)
function isbn10To13(isbn10: string): string | null {
  const d = isbn10.replace(/[^0-9X]/gi, '').toUpperCase();
  if (d.length !== 10) return null;
  const core9 = d.slice(0, 9);
  if (!/^\d{9}$/.test(core9)) return null;
  const pref = '978' + core9;
  const digits = pref.split('').map(n => parseInt(n, 10));
  const sum = digits.reduce((acc, n, i) => acc + n * (i % 2 === 0 ? 1 : 3), 0);
  const check = (10 - (sum % 10)) % 10;
  return pref + String(check);
}
