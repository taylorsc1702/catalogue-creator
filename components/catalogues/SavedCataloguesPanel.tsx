import React, { useEffect, useMemo, useState } from "react";
import { CatalogueSummary } from "@/types/catalogues";

type FetchState =
  | { status: "idle" | "loading" }
  | { status: "error"; message: string }
  | { status: "success" }
  | { status: "unauthorized" };

type SavedCataloguesPanelProps = {
  onOpenCatalogue?: (catalogueId: string) => void;
  onStartNewCatalogue?: () => void;
  refreshToken?: number;
};

const sectionStyle: React.CSSProperties = {
  marginTop: "32px",
  border: "1px solid #dee2e6",
  borderRadius: 12,
  background: "#ffffff",
  padding: "24px",
  boxShadow: "0 12px 24px rgba(15, 23, 42, 0.08)",
};

const headerRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "20px",
  gap: "12px",
  flexWrap: "wrap",
};

const cardsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  gap: "16px",
};

const buttonStyle: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 8,
  border: "1px solid #dee2e6",
  background: "#f1f5f9",
  color: "#1f2937",
  cursor: "pointer",
  fontSize: 13,
  transition: "all 0.15s ease",
};

const disabledButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  opacity: 0.6,
  cursor: "not-allowed",
};

const metaItemStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#6c757d",
  display: "flex",
  alignItems: "center",
  gap: "6px",
};

const formatRelativeTime = (isoDate: string) => {
  if (!isoDate) return "unknown";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "unknown";

  const diffMs = Date.now() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} min${diffMinutes === 1 ? "" : "s"} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const SavedCataloguesPanel: React.FC<SavedCataloguesPanelProps> = ({
  onOpenCatalogue,
  onStartNewCatalogue,
  refreshToken = 0,
}) => {
  const [catalogues, setCatalogues] = useState<CatalogueSummary[]>([]);
  const [loadState, setLoadState] = useState<FetchState>({ status: "idle" });
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchCatalogues = async () => {
      setLoadState({ status: "loading" });
      try {
        const response = await fetch("/api/catalogues");
        if (response.status === 401) {
          if (isMounted) {
            setCatalogues([]);
            setLoadState({ status: "unauthorized" });
          }
          return;
        }
        if (!response.ok) {
          throw new Error(await response.text());
        }
        const data: CatalogueSummary[] = await response.json();
        if (isMounted) {
          setCatalogues(data);
          setLoadState({ status: "success" });
        }
      } catch (err) {
        if (isMounted) {
          setLoadState({
            status: "error",
            message: err instanceof Error ? err.message : "Failed to load catalogues",
          });
        }
      }
    };

    fetchCatalogues();

    return () => {
      isMounted = false;
    };
  }, [refreshToken]);

  const headerLabel = useMemo(() => {
    if (loadState.status === "loading") return "Loading saved catalogues…";
    if (loadState.status === "error") return "Saved catalogues";
    if (loadState.status === "unauthorized") return "Saved catalogues";
    return `Saved catalogues (${catalogues.length})`;
  }, [loadState.status, catalogues.length]);

  const handleArchive = async (catalogue: CatalogueSummary) => {
    if (archivingId) return;
    const confirmed = typeof window === "undefined" ? true : window.confirm(`Archive "${catalogue.name}"? It will no longer appear in this list.`);
    if (!confirmed) return;

    setArchivingId(catalogue.id);
    setActionFeedback(null);

    try {
      const response = await fetch(`/api/catalogues/${catalogue.id}`, { method: "DELETE" });
      if (response.status === 401) {
        setActionFeedback({ type: "error", text: "You are not authorized to archive this catalogue." });
        return;
      }
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to archive catalogue.");
      }
      setCatalogues((prev) => prev.filter((item) => item.id !== catalogue.id));
      setActionFeedback({ type: "success", text: `Archived catalogue${catalogue.name ? `: ${catalogue.name}` : ""}.` });
    } catch (error) {
      setActionFeedback({
        type: "error",
        text: error instanceof Error ? error.message : "Unexpected error while archiving catalogue.",
      });
    } finally {
      setArchivingId(null);
    }
  };

  return (
    <section style={sectionStyle}>
      <div style={headerRowStyle}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, color: "#212529" }}>{headerLabel}</h2>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#6c757d" }}>
            Resume in-progress work, share with teammates, or archive catalogues once you are done.
          </p>
        </div>
        <button
          style={{
            ...buttonStyle,
            background: onStartNewCatalogue ? "#2563eb" : "#94a3b8",
            color: "#ffffff",
            borderColor: onStartNewCatalogue ? "#2563eb" : "#94a3b8",
          }}
          onClick={onStartNewCatalogue ?? undefined}
          disabled={!onStartNewCatalogue}
        >
          + New catalogue
        </button>
      </div>

      {loadState.status === "error" && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 8,
            background: "#fff4e5",
            color: "#b25e09",
            border: "1px solid #ffd89c",
            marginBottom: 16,
          }}
        >
          Failed to load saved catalogues. {loadState.message}
        </div>
      )}

      {actionFeedback && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 8,
            marginBottom: 16,
            border: `1px solid ${actionFeedback.type === "success" ? "#86efac" : "#fecaca"}`,
            background: actionFeedback.type === "success" ? "#dcfce7" : "#fee2e2",
            color: actionFeedback.type === "success" ? "#166534" : "#b91c1c",
            fontSize: 13,
          }}
        >
          {actionFeedback.text}
        </div>
      )}

      {loadState.status === "unauthorized" && (
        <div
          style={{
            border: "1px dashed #cbd5f5",
            borderRadius: 12,
            padding: "24px",
            textAlign: "center",
            background: "#f8fafc",
            color: "#475569",
            fontSize: 14,
          }}
        >
          Sign in to view and manage your saved catalogues.
        </div>
      )}

      {loadState.status !== "loading" && loadState.status !== "unauthorized" && catalogues.length === 0 && (
        <div
          style={{
            border: "1px dashed #cbd5f5",
            borderRadius: 12,
            padding: "24px",
            textAlign: "center",
            background: "#f8fafc",
            color: "#475569",
            fontSize: 14,
          }}
        >
          No catalogues saved yet. Start by configuring a layout and then choose “Save catalogue” to store your work.
        </div>
      )}

      {loadState.status === "loading" && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={`catalogue-skeleton-${idx}`}
              style={{
                borderRadius: 12,
                border: "1px solid #e9ecef",
                background: "#f1f5f9",
                height: 160,
                flex: "1 1 280px",
              }}
            />
          ))}
        </div>
      )}

      <div style={cardsGridStyle}>
        {catalogues.map((catalogue) => {
          const { branding } = catalogue;
          const isShared = Boolean(branding?.isShared);
          const bannerColor = branding?.bannerColor || "#E2E8F0";
          const logoUrl = branding?.logoUrl || null;

          return (
            <div
              key={catalogue.id}
              style={{
                border: "1px solid #e9ecef",
                borderRadius: 12,
                background: "#ffffff",
                padding: "18px 20px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                minHeight: 170,
                boxShadow: "0 8px 16px rgba(15, 23, 42, 0.05)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, color: "#1f2937" }}>{catalogue.name}</h3>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                    Updated {formatRelativeTime(catalogue.updatedAt)}
                  </div>
                </div>
                <div
                  style={{
                    alignSelf: "flex-start",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: bannerColor,
                      border: "1px solid rgba(15, 23, 42, 0.08)",
                    }}
                    title={`Banner color ${bannerColor}`}
                  />
                  {logoUrl && (
                    <img
                      src={logoUrl}
                      alt="Catalogue logo"
                      style={{
                        width: 32,
                        height: 32,
                        objectFit: "contain",
                        borderRadius: 6,
                        border: "1px solid #e2e8f0",
                        background: "#ffffff",
                      }}
                    />
                  )}
                </div>
              </div>

              {catalogue.description ? (
                <p style={{ margin: 0, color: "#475569", fontSize: 13, lineHeight: 1.4 }}>
                  {catalogue.description}
                </p>
              ) : (
                <p style={{ margin: 0, color: "#94a3b8", fontSize: 13, fontStyle: "italic" }}>
                  No description provided
                </p>
              )}

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <div style={metaItemStyle}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: isShared ? "#22c55e" : "#94a3b8",
                      display: "inline-block",
                    }}
                  />
                  {isShared ? "Shared with team" : "Personal"}
                </div>
                {branding?.issuuUrl && (
                  <div style={metaItemStyle}>
                    <span role="img" aria-label="ISSUU link">
                      🔗
                    </span>
                    ISSUU link attached
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: "auto" }}>
                <button
                  style={onOpenCatalogue ? buttonStyle : disabledButtonStyle}
                  onClick={onOpenCatalogue ? () => onOpenCatalogue(catalogue.id) : undefined}
                  disabled={!onOpenCatalogue}
                >
                  Open
                </button>
                <button style={disabledButtonStyle} disabled title="Sharing coming soon">
                  Share
                </button>
                <button
                  style={archivingId === catalogue.id ? disabledButtonStyle : buttonStyle}
                  onClick={() => handleArchive(catalogue)}
                  disabled={archivingId === catalogue.id}
                >
                  {archivingId === catalogue.id ? "Archiving…" : "Archive"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default SavedCataloguesPanel;

