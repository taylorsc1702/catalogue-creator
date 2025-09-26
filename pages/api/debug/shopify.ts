// pages/api/debug/shopify.ts
import type { NextApiRequest, NextApiResponse } from "next";

const STORE = process.env.SHOPIFY_STORE_DOMAIN!;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN!;
const API_URL = `https://${STORE}/admin/api/2024-07/graphql.json`;

const PROBE = `
  query Probe($first: Int = 3) {
    shop { name }
    products(first: $first) {
      edges { node { id title vendor tags } }
    }
  }
`;

type ProbeData = {
  data?: {
    shop?: { name?: string | null } | null;
    products?: { edges?: Array<{ node?: { id?: string | null; title?: string | null; vendor?: string | null; tags?: string[] | null } | null }> | null } | null;
  };
  errors?: unknown;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const r = await fetch(API_URL, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: PROBE, variables: { first: 3 } }),
    });

    const data = (await r.json()) as ProbeData;
    res.status(r.ok ? 200 : 400).json(data);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "probe failed";
    res.status(500).json({ error: message });
  }
}
