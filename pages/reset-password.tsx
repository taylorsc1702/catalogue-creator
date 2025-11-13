import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";

const MIN_PASSWORD_LENGTH = 8;

export default function ResetPasswordPage() {
  const session = useSession();
  const supabaseClient = useSupabaseClient();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!session) {
      setMessage({ type: "error", text: "Your reset link has expired or is invalid. Please request a new reset email." });
      return;
    }

    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      setMessage({ type: "error", text: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.` });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match." });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const { error } = await supabaseClient.auth.updateUser({ password });
      if (error) throw error;

      setMessage({ type: "success", text: "Password updated. You can now sign in with your new password." });
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to update password. Try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Reset Password | Catalogue Creator</title>
      </Head>
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8f9fa", padding: "24px" }}>
        <div style={{ width: "100%", maxWidth: "420px", background: "#ffffff", borderRadius: "12px", boxShadow: "0 10px 30px rgba(15, 23, 42, 0.12)", padding: "32px" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem", color: "#1f2937" }}>Reset Password</h1>
          <p style={{ marginBottom: "1.5rem", fontSize: "0.95rem", color: "#4b5563" }}>
            {session
              ? "Enter a new password below."
              : "The reset link is invalid or expired. Request a new password reset email and try again."}
          </p>

          {message && (
            <div
              style={{
                marginBottom: "1.25rem",
                padding: "0.75rem 1rem",
                borderRadius: "10px",
                fontSize: "0.95rem",
                fontWeight: 500,
                color: message.type === "success" ? "#065f46" : "#991b1b",
                backgroundColor: message.type === "success" ? "#d1fae5" : "#fee2e2",
              }}
            >
              {message.text}
            </div>
          )}

          {session ? (
            <form onSubmit={handleSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <label style={{ display: "flex", flexDirection: "column", fontSize: "0.9rem", color: "#1f2937" }}>
                  New password
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                    minLength={MIN_PASSWORD_LENGTH}
                    required
                    style={{
                      marginTop: "0.35rem",
                      padding: "0.65rem 0.75rem",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "1rem",
                    }}
                  />
                </label>
                <label style={{ display: "flex", flexDirection: "column", fontSize: "0.9rem", color: "#1f2937" }}>
                  Confirm password
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Retype password"
                    minLength={MIN_PASSWORD_LENGTH}
                    required
                    style={{
                      marginTop: "0.35rem",
                      padding: "0.65rem 0.75rem",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "1rem",
                    }}
                  />
                </label>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    marginTop: "0.5rem",
                    padding: "0.75rem 1rem",
                    backgroundColor: "#2563eb",
                    color: "#ffffff",
                    borderRadius: "8px",
                    border: "none",
                    fontSize: "1rem",
                    fontWeight: 600,
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                    opacity: isSubmitting ? 0.7 : 1,
                  }}
                >
                  {isSubmitting ? "Updating..." : "Set new password"}
                </button>
              </div>
            </form>
          ) : (
            <div style={{ marginTop: "1rem", fontSize: "0.95rem", color: "#4b5563" }}>
              <p style={{ marginBottom: "0.75rem" }}>Return to the sign-in page and request another reset email.</p>
              <Link href="/" style={{ color: "#2563eb", fontWeight: 600 }}>Back to sign-in</Link>
            </div>
          )}

          <div style={{ marginTop: "1.5rem", fontSize: "0.85rem", color: "#6b7280" }}>
            <p style={{ marginBottom: "0.35rem" }}>Need help?</p>
            <p style={{ margin: 0 }}>
              Contact your administrator or email <a href="mailto:info@woodslane.com.au" style={{ color: "#2563eb" }}>info@woodslane.com.au</a>.
            </p>
            {message?.type === "success" && (
              <p style={{ marginTop: "1rem" }}>
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#2563eb",
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  Return to sign-in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
