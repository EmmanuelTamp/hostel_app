import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

export default function VerifyCodePage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);

    if (!code.trim()) {
      setError("Please enter an access code.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/caretaker/verify-code/", {
        code: code.trim().toUpperCase(),
      });

      console.log("VERIFY CODE RESPONSE:", response.data);
      setResult(response.data);
    } catch (err) {
      console.log("VERIFY CODE ERROR:", err);
      console.log("VERIFY CODE ERROR RESPONSE:", err?.response);
      console.log("VERIFY CODE ERROR DATA:", err?.response?.data);

      setError(
        err?.response?.data?.detail || "Failed to verify access code."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 lg:px-8">
        <div className="space-y-8">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/caretaker/bookings"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-muted)]"
            >
              ← Back to Caretaker Bookings
            </Link>

            <Link to="/caretaker/check-in" className="btn-secondary">
              Go to Check-In
            </Link>
          </div>

          <section className="panel-card overflow-hidden p-6 md:p-8">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center rounded-full bg-[var(--surface-muted)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                  Verification Tool
                </div>

                <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-[var(--text)] md:text-5xl">
                  Verify Access Code
                </h1>

                <p className="mt-4 text-sm leading-7 text-[var(--text-soft)] md:text-base">
                  Enter the student access code to validate booking details before
                  proceeding with hostel arrival handling.
                </p>
              </div>

              <div className="grid min-w-full gap-4 sm:grid-cols-2 xl:min-w-[340px] xl:grid-cols-1">
                <InfoTile
                  label="Task"
                  value="Code Check"
                  note="Confirm booking validity"
                />
                <InfoTile
                  label="Input Format"
                  value="Uppercase"
                  note="Codes are normalized before verification"
                />
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
            <div className="panel-card p-6 md:p-7">
              <h2 className="section-title">Enter Access Code</h2>
              <p className="section-subtitle mt-2">
                Submit a student access code to fetch booking and identity details.
              </p>

              {error ? (
                <div className="mt-5 rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <div>
                  <label className="input-label">Access Code</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="input-field uppercase"
                    placeholder="Enter access code"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full"
                >
                  {loading ? "Verifying..." : "Verify Code"}
                </button>
              </form>
            </div>

            <div className="panel-card p-6 md:p-7">
              <h2 className="section-title">Verification Result</h2>
              <p className="section-subtitle mt-2">
                Verified booking and student details will appear here.
              </p>

              {result ? (
                <div className="mt-6 space-y-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="status-badge status-success">
                      Booking Verified
                    </span>
                    <span className="status-badge status-warning">
                      Code Checked
                    </span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <DataItem
                      label="Booking ID"
                      value={result.booking_id || "N/A"}
                    />
                    <DataItem
                      label="Student Name"
                      value={result.student?.name || "N/A"}
                    />
                    <DataItem
                      label="Student Email"
                      value={result.student?.email || "N/A"}
                    />
                    <DataItem
                      label="Student Phone"
                      value={result.student?.phone || "N/A"}
                    />
                    <DataItem
                      label="Hostel"
                      value={result.hostel?.name || "N/A"}
                    />
                    <DataItem
                      label="Location"
                      value={result.hostel?.location_area || "N/A"}
                    />
                    <DataItem
                      label="Room Type"
                      value={result.room_type?.name || "N/A"}
                    />
                    <DataItem
                      label="Booking Status"
                      value={formatStatus(result.status?.booking || "N/A")}
                    />
                    <DataItem
                      label="Code Status"
                      value={formatStatus(result.status?.code || "N/A")}
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-[20px] border border-dashed border-[var(--border)] bg-[var(--surface-muted)] px-4 py-12 text-center text-sm text-[var(--text-soft)]">
                  No verification result yet. Submit an access code to continue.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function InfoTile({ label, value, note }) {
  return (
    <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] px-5 py-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
        {label}
      </p>
      <p className="mt-3 text-2xl font-extrabold tracking-tight text-[var(--text)]">
        {value}
      </p>
      <p className="mt-2 text-sm text-[var(--text-soft)]">{note}</p>
    </div>
  );
}

function DataItem({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium text-[var(--text)]">
        {value}
      </p>
    </div>
  );
}

function formatStatus(value) {
  if (!value) return "Unknown";

  return String(value)
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}