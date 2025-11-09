import { useCallback, useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";

type Role = "admin" | "general";

type ProfileRecord = {
  id: string;
  full_name: string | null;
  role: Role;
  can_domain_woodslane: boolean;
  can_domain_press: boolean;
  can_domain_health: boolean;
  can_domain_education: boolean;
  allowed_vendors: string[] | null;
  discount_code_setting: string | null;
  updated_at?: string;
  created_at?: string;
};

type ProfileBaseline = {
  role: Role;
  can_domain_woodslane: boolean;
  can_domain_press: boolean;
  can_domain_health: boolean;
  can_domain_education: boolean;
  allowedVendorsText: string;
  allowedVendorsList: string[] | null;
  discountCodeInput: string;
};

type EditableProfile = ProfileRecord & {
  allowedVendorsText: string;
  discountCodeInput: string;
  hasChanges: boolean;
  saving: boolean;
  errorMessage?: string | null;
  successMessage?: string | null;
  original: ProfileBaseline;
};

const DOMAIN_FIELDS = [
  { key: "can_domain_woodslane", label: "woodslane.com.au" },
  { key: "can_domain_press", label: "woodslanepress.com.au" },
  { key: "can_domain_health", label: "woodslanehealth.com.au" },
  { key: "can_domain_education", label: "woodslaneeducation.com.au" },
] as const;

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "admin", label: "Admin (full access)" },
  { value: "general", label: "Publisher (restricted)" },
];

const normalizeVendorList = (text: string): string[] => {
  const unique: string[] = [];
  text
    .split(/[\n,]+/)
    .map((value) => value.trim())
    .filter(Boolean)
    .forEach((value) => {
      if (!unique.includes(value)) unique.push(value);
    });
  return unique;
};

const formatVendorList = (list: string[] | null): string =>
  list && list.length ? list.join("\n") : "";

const discountInputFromValue = (value: string | null): string => value ?? "";

const discountValueFromInput = (input: string): string | null => {
  const trimmed = input.trim();
  return trimmed.length ? trimmed : null;
};

const arraysEqual = (a: string[], b: string[]) =>
  a.length === b.length && a.every((value, index) => value === b[index]);

const computeHasChanges = (profile: EditableProfile): boolean => {
  const vendorList = normalizeVendorList(profile.allowedVendorsText);
  const originalVendorList = normalizeVendorList(profile.original.allowedVendorsText);
  const discountCurrent = profile.discountCodeInput.trim();
  const discountOriginal = profile.original.discountCodeInput.trim();

  return (
    profile.role !== profile.original.role ||
    profile.can_domain_woodslane !== profile.original.can_domain_woodslane ||
    profile.can_domain_press !== profile.original.can_domain_press ||
    profile.can_domain_health !== profile.original.can_domain_health ||
    profile.can_domain_education !== profile.original.can_domain_education ||
    discountCurrent !== discountOriginal ||
    !arraysEqual(vendorList, originalVendorList)
  );
};

export default function AdminUsersPage() {
  const session = useSession();
  const supabase = useSupabaseClient();

  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [profiles, setProfiles] = useState<EditableProfile[]>([]);
  const [profilesError, setProfilesError] = useState<string | null>(null);

  useEffect(() => {
    const verifyAccess = async () => {
      if (!session) {
        setIsAuthorized(false);
        setAuthChecked(true);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle();

        if (error) throw error;
        if (!data || data.role !== "admin") {
          setIsAuthorized(false);
        } else {
          setIsAuthorized(true);
        }
      } catch (error) {
        setAuthError(error instanceof Error ? error.message : "Unable to verify permissions.");
        setIsAuthorized(false);
      } finally {
        setAuthChecked(true);
      }
    };
    verifyAccess();
  }, [session, supabase]);

  const loadProfiles = useCallback(async () => {
    if (!isAuthorized) return;
    setLoadingProfiles(true);
    setProfilesError(null);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, full_name, role, can_domain_woodslane, can_domain_press, can_domain_health, can_domain_education, allowed_vendors, discount_code_setting, updated_at, created_at"
        )
        .order("created_at", { ascending: true });

      if (error) throw error;

      const editable = (data ?? []).map<EditableProfile>((row) => {
        const vendorText = formatVendorList(row.allowed_vendors);
        const discountInput = discountInputFromValue(row.discount_code_setting);
        const baseline: ProfileBaseline = {
          role: row.role,
          can_domain_woodslane: row.can_domain_woodslane,
          can_domain_press: row.can_domain_press,
          can_domain_health: row.can_domain_health,
          can_domain_education: row.can_domain_education,
          allowedVendorsText: vendorText,
          allowedVendorsList: row.allowed_vendors ?? null,
          discountCodeInput: discountInput,
        };

        return {
          ...row,
          allowedVendorsText: vendorText,
          discountCodeInput: discountInput,
          hasChanges: false,
          saving: false,
          original: baseline,
        };
      });

      setProfiles(editable);
    } catch (error) {
      setProfilesError(error instanceof Error ? error.message : "Failed to load profiles.");
    } finally {
      setLoadingProfiles(false);
    }
  }, [isAuthorized, supabase]);

  useEffect(() => {
    if (isAuthorized) {
      loadProfiles();
    }
  }, [isAuthorized, loadProfiles]);

  const updateProfileField = (id: string, changes: Partial<EditableProfile>) => {
    setProfiles((previous) =>
      previous.map((profile) => {
        if (profile.id !== id) return profile;
        const next: EditableProfile = {
          ...profile,
          ...changes,
          errorMessage: undefined,
          successMessage: undefined,
        };
        next.hasChanges = computeHasChanges(next);
        return next;
      })
    );
  };

  const resetProfile = (id: string) => {
    setProfiles((previous) =>
      previous.map((profile) => {
        if (profile.id !== id) return profile;
        const restored: EditableProfile = {
          ...profile,
          role: profile.original.role,
          can_domain_woodslane: profile.original.can_domain_woodslane,
          can_domain_press: profile.original.can_domain_press,
          can_domain_health: profile.original.can_domain_health,
          can_domain_education: profile.original.can_domain_education,
          allowedVendorsText: profile.original.allowedVendorsText,
          allowed_vendors: profile.original.allowedVendorsList,
          discountCodeInput: profile.original.discountCodeInput,
          discount_code_setting: discountValueFromInput(profile.original.discountCodeInput),
          saving: false,
          successMessage: undefined,
          errorMessage: undefined,
        };
        restored.hasChanges = computeHasChanges(restored);
        return restored;
      })
    );
  };

  const saveProfile = async (profile: EditableProfile) => {
    const normalizedVendors = normalizeVendorList(profile.allowedVendorsText);
    const allowed_vendors = normalizedVendors.length ? normalizedVendors : null;
    const discountValue = discountValueFromInput(profile.discountCodeInput);

    setProfiles((previous) =>
      previous.map((item) =>
        item.id === profile.id
          ? { ...item, saving: true, errorMessage: undefined, successMessage: undefined }
          : item
      )
    );

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          role: profile.role,
          can_domain_woodslane: profile.can_domain_woodslane,
          can_domain_press: profile.can_domain_press,
          can_domain_health: profile.can_domain_health,
          can_domain_education: profile.can_domain_education,
          allowed_vendors,
          discount_code_setting: discountValue,
        })
        .eq("id", profile.id);

      if (error) throw error;

      const savedVendorText = formatVendorList(allowed_vendors);
      const savedDiscountInput = discountInputFromValue(discountValue);

      setProfiles((previous) =>
        previous.map((item) => {
          if (item.id !== profile.id) return item;
          const updated: EditableProfile = {
            ...item,
            allowed_vendors,
            allowedVendorsText: savedVendorText,
            discount_code_setting: discountValue,
            discountCodeInput: savedDiscountInput,
            saving: false,
            successMessage: "Saved changes.",
            errorMessage: undefined,
            original: {
              role: profile.role,
              can_domain_woodslane: profile.can_domain_woodslane,
              can_domain_press: profile.can_domain_press,
              can_domain_health: profile.can_domain_health,
              can_domain_education: profile.can_domain_education,
              allowedVendorsText: savedVendorText,
              allowedVendorsList: allowed_vendors,
              discountCodeInput: savedDiscountInput,
            },
          };
          updated.hasChanges = computeHasChanges(updated);
          return updated;
        })
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save profile.";
      setProfiles((previous) =>
        previous.map((item) =>
          item.id === profile.id
            ? { ...item, saving: false, errorMessage: message, successMessage: undefined }
            : item
        )
      );
    }
  };

  const pageState = useMemo(() => {
    if (!authChecked) return "checking";
    if (authError) return "error";
    if (!session) return "unauthenticated";
    if (!isAuthorized) return "forbidden";
    return "ready";
  }, [authChecked, authError, session, isAuthorized]);

  return (
    <>
      <Head>
        <title>Admin · User Access Controls</title>
      </Head>
      <main
        style={{
          minHeight: "100vh",
          background: "#f3f4f6",
          padding: "32px 20px 48px",
          fontFamily:
            "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        }}
      >
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <header style={{ marginBottom: 28, display: "flex", justifyContent: "space-between" }}>
            <div>
              <h1
                style={{
                  fontSize: "28px",
                  margin: 0,
                  color: "#111827",
                  fontWeight: 700,
                }}
              >
                Admin · User Access Controls
              </h1>
              <p style={{ marginTop: 8, color: "#4b5563", fontSize: 15 }}>
                Manage catalogue permissions, allowed domains, and vendor restrictions for each
                invite-only account.
              </p>
            </div>
            <Link
              href="/"
              style={{
                alignSelf: "center",
                padding: "10px 16px",
                borderRadius: 10,
                border: "1px solid #d1d5db",
                background: "white",
                color: "#1f2937",
                fontSize: 14,
                textDecoration: "none",
              }}
            >
              ← Back to builder
            </Link>
          </header>

          {pageState === "checking" && (
            <div style={{ padding: 24, borderRadius: 12, background: "white", boxShadow: "0 10px 30px rgba(15,23,42,0.08)" }}>
              <p style={{ margin: 0, color: "#4b5563" }}>Verifying permissions…</p>
            </div>
          )}

          {pageState === "unauthenticated" && (
            <div style={{ padding: 24, borderRadius: 12, background: "white", boxShadow: "0 10px 30px rgba(15,23,42,0.08)" }}>
              <p style={{ margin: 0, color: "#b91c1c" }}>
                You must sign in as an administrator to manage user access.
              </p>
            </div>
          )}

          {pageState === "forbidden" && (
            <div style={{ padding: 24, borderRadius: 12, background: "white", boxShadow: "0 10px 30px rgba(15,23,42,0.08)" }}>
              <p style={{ margin: 0, color: "#b91c1c" }}>
                Only admin accounts can access this page. Ask an existing admin to elevate your
                user role if required.
              </p>
            </div>
          )}

          {pageState === "error" && (
            <div style={{ padding: 24, borderRadius: 12, background: "white", boxShadow: "0 10px 30px rgba(15,23,42,0.08)" }}>
              <p style={{ margin: 0, color: "#b91c1c" }}>{authError}</p>
            </div>
          )}

          {pageState === "ready" && (
            <section style={{ display: "grid", gap: 24 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderRadius: 12,
                  background: "white",
                  padding: 20,
                  boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
                }}
              >
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, color: "#1f2937" }}>Account directory</h2>
                  <p style={{ marginTop: 6, marginBottom: 0, color: "#6b7280", fontSize: 13 }}>
                    Toggle domains, update vendor restrictions, and configure discount messaging.
                    Leave vendors blank to allow all vendors for that user.
                  </p>
                </div>
                <button
                  onClick={loadProfiles}
                  disabled={loadingProfiles}
                  style={{
                    padding: "10px 16px",
                    borderRadius: 10,
                    border: "1px solid #2563eb",
                    background: loadingProfiles ? "#93c5fd" : "#2563eb",
                    color: "white",
                    fontSize: 14,
                    cursor: loadingProfiles ? "wait" : "pointer",
                  }}
                >
                  {loadingProfiles ? "Refreshing…" : "Refresh list"}
                </button>
              </div>

              {profilesError && (
                <div
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    background: "#fff1f2",
                    border: "1px solid #fecdd3",
                    color: "#b91c1c",
                    fontSize: 14,
                  }}
                >
                  {profilesError}
                </div>
              )}

              {profiles.length === 0 && !loadingProfiles && (
                <div
                  style={{
                    padding: 24,
                    borderRadius: 12,
                    background: "white",
                    border: "1px dashed #d1d5db",
                    color: "#6b7280",
                    textAlign: "center",
                    fontSize: 14,
                  }}
                >
                  No profiles found. Invite a user through Supabase Auth to populate this list.
                </div>
              )}

              {profiles.map((profile) => {
                const vendorTokens = normalizeVendorList(profile.allowedVendorsText);
                const displayName =
                  profile.full_name && profile.full_name.trim()
                    ? profile.full_name
                    : `User ${profile.id.slice(0, 8)}…`;

                return (
                  <section
                    key={profile.id}
                    style={{
                      background: "white",
                      borderRadius: 16,
                      padding: 24,
                      boxShadow: "0 10px 30px rgba(15,23,42,0.05)",
                      border: profile.hasChanges ? "1px solid #2563eb" : "1px solid #e5e7eb",
                      transition: "border-color 0.2s ease",
                    }}
                  >
                    <header
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 16,
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div>
                        <h3 style={{ margin: 0, fontSize: 20, color: "#111827" }}>{displayName}</h3>
                        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280" }}>
                          ID: <code>{profile.id}</code>
                        </p>
                        {profile.updated_at && (
                          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#9ca3af" }}>
                            Last updated {new Date(profile.updated_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Role</span>
                        <select
                          value={profile.role}
                          onChange={(event) =>
                            updateProfileField(profile.id, {
                              role: event.target.value as Role,
                            })
                          }
                          disabled={profile.saving}
                          style={{
                            border: "1px solid #d1d5db",
                            borderRadius: 8,
                            padding: "8px 12px",
                            fontSize: 13,
                            background: profile.saving ? "#f3f4f6" : "white",
                            cursor: profile.saving ? "not-allowed" : "pointer",
                          }}
                        >
                          {ROLE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </header>

                    <hr style={{ margin: "20px 0", border: "none", height: 1, background: "#e5e7eb" }} />

                    <div style={{ display: "grid", gap: 18 }}>
                      <div>
                        <h4 style={{ margin: "0 0 8px", fontSize: 15, color: "#111827" }}>
                          Domain access
                        </h4>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                          {DOMAIN_FIELDS.map((field) => (
                            <label
                              key={field.key}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                background: "#f9fafb",
                                border: "1px solid #e5e7eb",
                                borderRadius: 999,
                                padding: "6px 12px",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={profile[field.key]}
                                disabled={profile.saving}
                                onChange={() =>
                                  updateProfileField(profile.id, {
                                    [field.key]: !profile[field.key],
                                  } as Partial<EditableProfile>)
                                }
                                style={{ width: 16, height: 16 }}
                              />
                              <span style={{ fontSize: 13, color: "#374151" }}>{field.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 style={{ margin: "0 0 8px", fontSize: 15, color: "#111827" }}>
                          Allowed vendors
                        </h4>
                        <p style={{ margin: "0 0 8px", fontSize: 12, color: "#6b7280" }}>
                          One vendor per line. Leave blank to allow this user to view all vendors.
                        </p>
                        <textarea
                          value={profile.allowedVendorsText}
                          disabled={profile.saving}
                          onChange={(event) =>
                            updateProfileField(profile.id, {
                              allowedVendorsText: event.target.value.replace(/\r/g, ""),
                            })
                          }
                          placeholder={"Woodslane Press\nWoodslane Education"}
                          rows={4}
                          style={{
                            width: "100%",
                            border: "1px solid #d1d5db",
                            borderRadius: 10,
                            padding: "10px 12px",
                            fontSize: 13,
                            fontFamily: "monospace",
                            background: profile.saving ? "#f3f4f6" : "white",
                          }}
                        />
                        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                          {vendorTokens.length === 0 ? (
                            <span style={{ fontSize: 12, color: "#6b7280" }}>All vendors allowed.</span>
                          ) : (
                            vendorTokens.map((vendor) => (
                              <span
                                key={vendor}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 6,
                                  background: "#e0f2fe",
                                  color: "#0369a1",
                                  borderRadius: 999,
                                  padding: "4px 10px",
                                  fontSize: 12,
                                }}
                              >
                                {vendor}
                                <button
                                  type="button"
                                  aria-label={`Remove ${vendor}`}
                                  onClick={() => {
                                    const remaining = vendorTokens.filter(
                                      (value) => value !== vendor
                                    );
                                    updateProfileField(profile.id, {
                                      allowedVendorsText: formatVendorList(
                                        remaining.length ? remaining : null
                                      ),
                                    });
                                  }}
                                  disabled={profile.saving}
                                  style={{
                                    border: "none",
                                    background: "transparent",
                                    color: "inherit",
                                    cursor: profile.saving ? "not-allowed" : "pointer",
                                    fontSize: 12,
                                  }}
                                >
                                  ×
                                </button>
                              </span>
                            ))
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              const value = window.prompt("Add vendor name");
                              if (!value) return;
                              const trimmed = value.trim();
                              if (!trimmed) return;
                              const tokens = normalizeVendorList(profile.allowedVendorsText);
                              if (tokens.includes(trimmed)) return;
                              tokens.push(trimmed);
                              updateProfileField(profile.id, {
                                allowedVendorsText: tokens.join("\n"),
                              });
                            }}
                            disabled={profile.saving}
                            style={{
                              padding: "4px 10px",
                              borderRadius: 999,
                              border: "1px solid #93c5fd",
                              background: "white",
                              color: "#1d4ed8",
                              fontSize: 12,
                              cursor: profile.saving ? "not-allowed" : "pointer",
                            }}
                          >
                            + Add vendor
                          </button>
                        </div>
                      </div>

                      <div>
                        <h4 style={{ margin: "0 0 8px", fontSize: 15, color: "#111827" }}>
                          Discount message
                        </h4>
                        <p style={{ margin: "0 0 8px", fontSize: 12, color: "#6b7280" }}>
                          Optional. Set a discount code to show a banner message in the email
                          builder. Leave blank for no discount message.
                        </p>
                        <input
                          type="text"
                          value={profile.discountCodeInput}
                          placeholder="SAVE15"
                          disabled={profile.saving}
                          onChange={(event) =>
                            updateProfileField(profile.id, {
                              discountCodeInput: event.target.value,
                            })
                          }
                          style={{
                            width: "100%",
                            border: "1px solid #d1d5db",
                            borderRadius: 10,
                            padding: "10px 12px",
                            fontSize: 13,
                            background: profile.saving ? "#f3f4f6" : "white",
                          }}
                        />
                      </div>
                    </div>

                    <hr style={{ margin: "20px 0", border: "none", height: 1, background: "#e5e7eb" }} />

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        onClick={() => saveProfile(profile)}
                        disabled={!profile.hasChanges || profile.saving}
                        style={{
                          padding: "10px 16px",
                          borderRadius: 10,
                          border: "none",
                          background:
                            !profile.hasChanges || profile.saving ? "#93c5fd" : "#2563eb",
                          color: "white",
                          fontSize: 14,
                          cursor:
                            !profile.hasChanges || profile.saving ? "not-allowed" : "pointer",
                        }}
                      >
                        {profile.saving ? "Saving…" : "Save changes"}
                      </button>
                      <button
                        onClick={() => resetProfile(profile.id)}
                        disabled={!profile.hasChanges || profile.saving}
                        style={{
                          padding: "10px 16px",
                          borderRadius: 10,
                          border: "1px solid #d1d5db",
                          background: "white",
                          color: "#1f2937",
                          fontSize: 14,
                          cursor:
                            !profile.hasChanges || profile.saving ? "not-allowed" : "pointer",
                        }}
                      >
                        Reset
                      </button>
                      {profile.successMessage && (
                        <span style={{ fontSize: 13, color: "#16a34a" }}>
                          {profile.successMessage}
                        </span>
                      )}
                      {profile.errorMessage && (
                        <span style={{ fontSize: 13, color: "#dc2626" }}>
                          {profile.errorMessage}
                        </span>
                      )}
                    </div>
                  </section>
                );
              })}
            </section>
          )}

        </div>
      </main>
    </>
  );
}

