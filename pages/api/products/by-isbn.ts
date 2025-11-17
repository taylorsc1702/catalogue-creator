// pages/api/products/by-isbn.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { buildShopifyQuery, fetchProductsByQuery } from "@/lib/shopify";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const supabase = createPagesServerClient({ req, res });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { isbn } = req.body;
    if (!isbn || typeof isbn !== 'string') {
      res.status(400).json({ error: 'ISBN is required' });
      return;
    }

    // Search for product by handle (ISBN) or SKU
    const cleanIsbn = isbn.trim();
    const query = buildShopifyQuery({ handleList: [cleanIsbn] });
    const products = await fetchProductsByQuery(query);

    // Try to find exact match by handle or SKU
    const product = products.find(p => 
      p.handle.toLowerCase() === cleanIsbn.toLowerCase() || 
      p.sku?.toLowerCase() === cleanIsbn.toLowerCase()
    );

    if (!product || !product.featuredImageUrl) {
      res.status(404).json({ error: 'Product not found or has no image' });
      return;
    }

    res.status(200).json({ 
      imageUrl: product.featuredImageUrl,
      title: product.title,
      handle: product.handle
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch product";
    res.status(500).json({ error: message });
  }
}

