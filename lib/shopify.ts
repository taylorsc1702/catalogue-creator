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

// include ALL metafields you listed
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
  { namespace: "my_fields", key: "Illlustrations" }, // as provided
  { namespace: "my_fields", key: "Edition" },
] as const;

const query = `
  query CatalogueProducts($query: String!, $first: Int = 100, $after: String) {
    products(first: $first, after: $after, query: $query) {
      edges {
        cursor
        node {
          id title handle vendor tags
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

export async function fetchProductsByQuery(searchQuery: string): Promise<ShopifyProduct[]> {
  if (!STORE || !TOKEN) throw new Error("Missing SHOPIFY env");

  let after: string | null = null;
  const out: ShopifyProduct[] = [];

  while (true) {
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: { "X-Shopify-Access-Token": TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { query: searchQuery, after } }),
    });
    if (!resp.ok) throw new Error(`Shopify GraphQL error ${resp.status}`);
    const data = await resp.json();
    const edges = data?.data?.products?.edges ?? [];

    for (const e of edges) {
      const n = e.node;
      const mf: Record<string, string | undefined> = {};
      for (const m of n.metafields ?? []) mf[m.key] = m.value ?? undefined;

      out.push({
        id: n.id,
        title: n.title,
        handle: n.handle,
        vendor: n.vendor,
        tags: n.tags ?? [],
        featuredImageUrl: n.featuredImage?.url ?? n.images?.edges?.[0]?.node?.url,
        price: n.variants?.edges?.[0]?.node?.price ?? undefined,
        metafields: mf,
      });
    }

    const page = data?.data?.products?.pageInfo;
    after = page?.hasNextPage ? page?.endCursor : null;
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
  return p.join(" AND ") || "status:active";
}
function escapeVal(v: string) { return v.replace(/'/g, "\\'"); }
export const firstDefined = (...vals: (string | undefined)[]) => vals.find(v => v?.trim());
