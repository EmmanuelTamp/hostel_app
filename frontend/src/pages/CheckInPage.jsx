import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

export default function CheckInPage() {
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

      const response = await api.post("/caretaker/check-in/", {
        code: code.trim().toUpperCase(),
      });

      console.log("CHECK IN RESPONSE:", response.data);
      setResult(response.data);
    } catch (err) {
      console.log("CHECK IN ERROR:", err);
      console.log("CHECK IN ERROR RESPONSE:", err?.response);
      console.log("CHECK IN ERROR DATA:", err?.response?.data);

      setError(
        err?.response?.data?.detail || "Failed to check student in."
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
              to="/caretaker/verify-code"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-muted)]"
            >
              ← Back to Verify Code
            </Link>

            <Link to="/caretaker/bookings" className="btn-secondary">
              Back to Bookings
            </Link>
          </div>

          <section className="panel-card overflow-hidden p-6 md:p-8">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center rounded-full bg-[var(--surface-muted)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                  Check-In Action
                </div>

                <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-[var(--text)] md:text-5xl">
                  Check In Student
                </h1>

                <p className="mt-4 text-sm leading-7 text-[var(--text-soft)] md:text-base">
                  Enter the student access code to complete the arrival process
                  and update the booking to checked-in status.
                </p>
              </div>

              <div className="grid min-w-full gap-4 sm:grid-cols-2 xl:min-w-[340px] xl:grid-cols-1">
                <InfoTile
                  label="Action"
                  value="Final Step"
                  note="Completes student arrival"
                />
                <InfoTile
                  label="Code Input"
                  value="Required"
                  note="Use the verified access code"
                />
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
            <div className="panel-card p-6 md:p-7">
              <h2 className="section-title">Enter Access Code</h2>
              <p className="section-subtitle mt-2">
                Submit the access code to complete the student check-in.
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
                  {loading ? "Checking In..." : "Check In"}
                </button>
              </form>
            </div>

            <div className="panel-card p-6 md:p-7">
              <h2 className="section-title">Check-In Result</h2>
              <p className="section-subtitle mt-2">
                Successful check-in details will appear here after submission.
              </p>

              {result ? (
                <div className="mt-6 space-y-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="status-badge status-success">
                      Check-In Successful
                    </span>
                    <span className="status-badge status-success">
                      Student Arrived
                    </span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <DataItem
                      label="Booking ID"
                      value={result.booking_id || "N/A"}
                    />
                    <DataItem
                      label="Student"
                      value={result.student || "N/A"}
                    />
                    <DataItem
                      label="Hostel"
                      value={result.hostel || "N/A"}
                    />
                    <DataItem
                      label="Room Type"
                      value={result.room_type || "N/A"}
                    />
                    <DataItem
                      label="Booking Status"
                      value={formatStatus(result.booking_status || "N/A")}
                    />
                  </div>

                  {result.detail ? (
                    <div className="rounded-[18px] border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                      {result.detail}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-6 rounded-[20px] border border-dashed border-[var(--border)] bg-[var(--surface-muted)] px-4 py-12 text-center text-sm text-[var(--text-soft)]">
                  No check-in result yet. Submit an access code to continue.
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