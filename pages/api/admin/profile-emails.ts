import type { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type EmailLookupResponse = {
  emails: Record<string, { email: string | null; lastSignInAt: string | null }>;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<EmailLookupResponse | { error: string }>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabase = createServerSupabaseClient({ req, res });
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    return res.status(500).json({ error: sessionError.message });
  }

  if (!session) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .maybeSingle();

  if (profileError) {
    return res.status(500).json({ error: profileError.message });
  }

  if (!profile || profile.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }

  const { ids } = req.body as { ids?: unknown };
  if (!Array.isArray(ids) || !ids.every((value) => typeof value === "string")) {
    return res.status(400).json({ error: "Invalid request payload" });
  }

  if (ids.length === 0) {
    return res.status(200).json({ emails: {} });
  }

  const uniqueIds = Array.from(new Set(ids));
  const emailEntries = await Promise.all(
    uniqueIds.map(async (userId) => {
      const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (error || !data) {
        return [userId, { email: null, lastSignInAt: null }] as const;
      }
      const { email, last_sign_in_at } = data.user;
      return [userId, { email: email ?? null, lastSignInAt: last_sign_in_at ?? null }] as const;
    })
  );

  return res.status(200).json({
    emails: Object.fromEntries(emailEntries),
  });
}


