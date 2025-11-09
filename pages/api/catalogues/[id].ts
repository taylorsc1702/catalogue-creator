import type { NextApiRequest, NextApiResponse } from "next";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";
import { CatalogueDetails, CatalogueSavePayload } from "@/types/catalogues";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== "string") {
    res.status(400).json({ message: "Catalogue id is required" });
    return;
  }

  const supabase = createPagesServerClient({ req, res });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("catalogues")
      .select("id, name, description, branding, layout, items, settings, owner_id, created_at, updated_at")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      res.status(500).json({ message: error.message });
      return;
    }

    if (!data) {
      res.status(404).json({ message: "Catalogue not found" });
      return;
    }

    const response: CatalogueDetails = {
      id: data.id,
      name: data.name || "Untitled catalogue",
      description: data.description,
      branding: data.branding ?? {},
      layoutConfig: data.layout ?? {},
      items: data.items ?? [],
      settings: data.settings ?? {},
      ownerId: data.owner_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    res.status(200).json(response);
    return;
  }

  if (req.method === "PUT") {
    const payload = req.body as CatalogueSavePayload | undefined;
    if (!payload || typeof payload.name !== "string") {
      res.status(400).json({ message: "Invalid request body" });
      return;
    }

    const name = payload.name.trim() || "Untitled catalogue";
    const { data, error } = await supabase
      .from("catalogues")
      .update({
        name,
        description: payload.description ?? null,
        branding: payload.branding ?? {},
        layout: payload.layoutConfig ?? {},
        items: payload.items ?? [],
        settings: payload.settings ?? {},
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(
        "id, name, description, branding, layout, items, settings, owner_id, created_at, updated_at"
      )
      .maybeSingle();

    if (error) {
      res.status(500).json({ message: error.message });
      return;
    }

    if (!data) {
      res.status(404).json({ message: "Catalogue not found" });
      return;
    }

    const response: CatalogueDetails = {
      id: data.id,
      name: data.name || "Untitled catalogue",
      description: data.description,
      branding: data.branding ?? {},
      layoutConfig: data.layout ?? {},
      items: data.items ?? [],
      settings: data.settings ?? {},
      ownerId: data.owner_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    res.status(200).json(response);
    return;
  }

  if (req.method === "DELETE") {
    const { error } = await supabase
      .from("catalogues")
      .update({ is_archived: true, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      res.status(500).json({ message: error.message });
      return;
    }

    res.status(204).end();
    return;
  }

  res.setHeader("Allow", "GET,PUT,DELETE");
  res.status(405).end("Method Not Allowed");
}

