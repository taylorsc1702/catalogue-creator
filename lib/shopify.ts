// lib/shopify.ts

export type ShopifyProduct = {
  id: string;
  title: string;
  handle: string;
  vendor: string;
  tags: string[];
  featuredImageUrl?: string;
  price?: string;
  metafields: Record<string, string | undefined>;
};

const STORE = process.env.SHOPIFY_STORE_DOMAIN!;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN!;
const API_URL = `https://${STORE}/admin/api/2024-07/graphql.json`;

// Metafields you listed
const IDENTIFIERS = [
  { namespace: "custom",    key: "weight" },
  { namespace: "my_fields", key: "Dimensions" },
  { namespace: "my_fields", key: "Author_Bio" },
  { namespace: "my_fields", key: "Subtitle" },
  { namespace: "my_fields", key: "Imprint" },
  { namespace: "my_fields", key: "Release_date" },
  { namespace: "my_fields", key: "Binding" },
  { namespace: "my_fields", key: "pages" },
  { namespace: "my_fields", key: "author" },
  { namespace: "my_fields", key: "ICRKDT" },
  { namespace: "my_fields", key: "icillus" },
  { namespace: "my_fields", key: "ICAUTH" },
  { namespace: "my_fields", key: "Illlustrations" },
  { namespace: "my_fields", key: "Edition" },
] as const;

// NOTE: $query is OPTIONAL now (String, not String!)
const query = `
  query CatalogueProducts($query: String, $first: Int = 100, $after: String) {
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
          images(first: 1) { edges { node { url altText } } }
          variants(first: 1) { edges { node { price } } }
          metafields(identifiers: [
            ${IDENTIFIERS.map(i => `{namespace:"${i.namespace}", key:"${i.key}"}`).join(",")}
          ]) { key namespace value }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

// Minimal shapes to satisfy TS + ESLint
type ProductNode = {
  id: string;
  title: string;
  handle: string;
  vendor: string;
  tags?: string[] | null;
  featuredImage?: { url?: string | null } | null;
  images?: { edges?: Array<{ node?: { url?: string | null } | null }> | null } | null;
  variants?: { edges?: Array<{ node?: { price?: string | null } | null }> | null } | null;
  metafields?: Array<{ key: string; value?: string | null }> | null;
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

export async function fetchProductsByQuery(searchQuery: string): Promise<ShopifyProduct[]> {
  if (!STORE || !TOKEN) throw new Error("Missing SHOPIFY env");

  let after: string | null = null;
  const out: ShopifyProduct[] = [];

  while (true) {
    const init: RequestInit = {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": TOKEN,
        "Content-Type": "application/json",
      },
      // send null when empty to fetch ALL products
      body: JSON.stringify({ query, variables: { query: searchQuery || null, after } }),
    };

    const response: Response = await fetch(API_URL, init);
    if (!response.ok) {
      const t = await response.text();
      throw new Error(`Shopify GraphQL error: ${response.status} ${t}`);
    }

    const data: Gql = await response.json();
    const edges: Edge[] = data?.data?.products?.edges ?? [];

    for (const e of edges) {
      const n = e.node;
      const mf: Record<string, string | undefined> = {};
      for (const m of n.metafields ?? []) {
        mf[m.key] = m.value ?? undefined;
      }

      out.push({
        id: n.id,
        title: n.title,
        handle: n.handle,
        vendor: n.vendor,
        tags: n.tags ?? [],
        featuredImageUrl: n.featuredImage?.url ?? n.images?.edges?.[0]?.node?.url ?? undefined,
        price: n.variants?.edges?.[0]?.node?.price ?? undefined,
        metafields: mf,
      });
    }

    const page = data?.data?.products?.pageInfo;
    after = page?.hasNextPage ? (page?.endCursor ?? null) : null;
    if (!after) break;
  }

  return out;
}

export function buildShopifyQuery(opts: {
  tag?: string;
  vendor?: string;
  collectionId?: string;
  metafieldKey?: string;       // e.g. "my_fields.author"
  metafieldContains?: string;  // value fragment
  freeText?: string;
}) {
  const p: string[] = [];
  if (opts.tag) p.push(`tag:'${escapeVal(opts.tag)}'`);
  if (opts.vendor) p.push(`vendor:'${escapeVal(opts.vendor)}'`);
  if (opts.collectionId) p.push(`collection_id:${opts.collectionId}`);
  if (opts.metafieldKey) {
    const [ns, key] = opts.metafieldKey.split(".");
    if (ns && key) {
      if (opts.metafieldContains?.trim()) {
        p.push(`metafield:'${ns}.${key}:${escapeVal(opts.metafieldContains)}*'`);
      } else {
        p.push(`metafield:'${ns}.${key}:*'`);
      }
    }
  }
  if (opts.freeText) p.push(opts.freeText);

  // Return empty string when there are no filters
  return p.join(" AND ");
}

function escapeVal(v: string) {
  return v.replace(/'/g, "\\'");
}

// Handy helper used by the API route
export const firstDefined = (...vals: (string | undefined)[]) =>
  vals.find(v => v?.trim());
