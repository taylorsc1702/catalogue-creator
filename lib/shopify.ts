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
  { namespace: "custom", key: "weight" },
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

// Shopify GraphQL
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

// Minimal shapes
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
    if (trimmed.length > 0) variables.query = trimmed;

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

    console.log("Shopify edges:", edges.length, "so far:", out.length);

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
  collectionId?: string;
  metafieldKey?: string;
  metafieldContains?: string;
  freeText?: string;
}) {
  const p: string[] = [];

  if (opts.tag) {
    const t = escapeVal(opts.tag);
    // OR both forms to be lenient
    p.push(`(tag:${t} OR tag:'${t}')`);
  }

  if (opts.vendor) {
    const v = escapeVal(opts.vendor);
    // OR both forms to be lenient
    p.push(`(vendor:${v} OR vendor:'${v}')`);
  }

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

  if (opts.freeText?.trim()) p.push(opts.freeText.trim());

  return p.join(" AND ");
}

function escapeVal(v: string) {
  return v.replace(/'/g, "\\'");
}

export const firstDefined = (...vals: (string | undefined)[]) =>
  vals.find(v => v?.trim());
