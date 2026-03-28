import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchMyBookings = async () => {
      try {
        const response = await api.get("/students/my-bookings/");
        console.log("MY BOOKINGS RESPONSE:", response.data);

        if (Array.isArray(response.data)) {
          setBookings(response.data);
        } else if (Array.isArray(response.data?.results)) {
          setBookings(response.data.results);
        } else {
          setBookings([]);
        }
      } catch (err) {
        console.log("MY BOOKINGS ERROR:", err);
        console.log("MY BOOKINGS ERROR RESPONSE:", err?.response);
        console.log("MY BOOKINGS ERROR DATA:", err?.response?.data);

        setError(
          err?.response?.data?.detail || "Failed to load your bookings."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchMyBookings();
  }, []);

  const summary = useMemo(() => {
    const total = bookings.length;
    const confirmed = bookings.filter(
      (item) => String(getStatus(item)).toUpperCase() === "CONFIRMED"
    ).length;
    const checkedIn = bookings.filter(
      (item) => String(getStatus(item)).toUpperCase() === "CHECKED_IN"
    ).length;
    const pending = bookings.filter(
      (item) => String(getStatus(item)).toUpperCase() === "PENDING"
    ).length;

    return { total, confirmed, checkedIn, pending };
  }, [bookings]);

  const formatPrice = (value) => {
    const amount = Number(value);
    if (Number.isNaN(amount)) return value || "N/A";

    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
    }).format(amount);
  };

  const formatDate = (value) => {
    if (!value) return "N/A";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const getHostelName = (booking) => {
    return (
      booking.hostel_name ||
      booking.hostel?.name ||
      booking.room_type?.hostel?.name ||
      "N/A"
    );
  };

  const getRoomTypeName = (booking) => {
    return (
      booking.room_type_name ||
      booking.room_type?.name ||
      booking.room_type?.room_type ||
      "N/A"
    );
  };

  const getAmount = (booking) => {
    return booking.amount ?? booking.total_amount ?? booking.price ?? "N/A";
  };

  if (loading) {
    return (
      <div className="app-shell">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
          <div className="space-y-6">
            <div className="panel-card p-6 md:p-8">
              <div className="animate-pulse space-y-4">
                <div className="h-4 w-32 rounded-full bg-[var(--surface-muted)]" />
                <div className="h-10 w-72 rounded-full bg-[var(--surface-muted)]" />
                <div className="h-5 w-96 max-w-full rounded-full bg-[var(--surface-muted)]" />
              </div>
            </div>

            <div className="stats-grid">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="dashboard-card h-32 animate-pulse bg-[var(--surface-muted)]"
                />
              ))}
            </div>

            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="panel-card h-56 animate-pulse bg-[var(--surface-muted)]"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-shell">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
          <div className="rounded-[24px] border border-red-200 bg-red-50 px-5 py-4 text-red-700">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
        <div className="space-y-8">
          <div>
            <Link
              to="/hostels"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-muted)]"
            >
              ← Back to Hostels
            </Link>
          </div>

          <section className="panel-card overflow-hidden p-6 md:p-8">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center rounded-full bg-[var(--surface-muted)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                  Booking History
                </div>

                <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-[var(--text)] md:text-5xl">
                  My Bookings
                </h1>

                <p className="mt-4 text-sm leading-7 text-[var(--text-soft)] md:text-base">
                  View your hostel reservations, follow their progress, and review
                  payment and booking details in one place.
                </p>
              </div>

              <div className="grid min-w-full gap-4 sm:grid-cols-2 xl:min-w-[360px] xl:grid-cols-1">
                <InfoTile
                  label="Total Bookings"
                  value={summary.total}
                  note="All hostel reservations"
                />
                <InfoTile
                  label="Current Activity"
                  value={summary.pending > 0 ? "Pending" : "Up to date"}
                  note="Latest booking state"
                />
              </div>
            </div>
          </section>

          <section className="stats-grid">
            <MetricCard
              label="Total"
              value={summary.total}
              note="All bookings"
            />
            <MetricCard
              label="Confirmed"
              value={summary.confirmed}
              note="Approved bookings"
              tone="success"
            />
            <MetricCard
              label="Checked In"
              value={summary.checkedIn}
              note="Already checked in"
              tone="success"
            />
            <MetricCard
              label="Pending"
              value={summary.pending}
              note="Awaiting progress"
              tone="warning"
            />
          </section>

          {bookings.length > 0 ? (
            <section className="space-y-4">
              {bookings.map((booking, index) => (
                <article
                  key={booking.id ?? index}
                  className="panel-card p-6 transition hover:-translate-y-[1px] hover:shadow-[var(--shadow-soft)]"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-2xl font-bold tracking-tight text-[var(--text)]">
                          Booking #{booking.id || "N/A"}
                        </h2>
                        <StatusBadge status={getStatus(booking)} />
                        {booking.payment_status && (
                          <PaymentBadge status={booking.payment_status} />
                        )}
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        <DataItem
                          label="Hostel"
                          value={getHostelName(booking)}
                        />
                        <DataItem
                          label="Room Type"
                          value={getRoomTypeName(booking)}
                        />
                        <DataItem
                          label="Amount"
                          value={formatPrice(getAmount(booking))}
                        />
                        <DataItem
                          label="Created At"
                          value={formatDate(booking.created_at)}
                        />
                        <DataItem
                          label="Booking Status"
                          value={formatStatus(getStatus(booking))}
                        />
                        {booking.reference && (
                          <DataItem
                            label="Reference"
                            value={booking.reference}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </section>
          ) : (
            <section className="panel-card px-6 py-12 text-center">
              <p className="text-lg font-semibold text-[var(--text)]">
                You do not have any bookings yet.
              </p>
              <p className="mt-2 text-sm text-[var(--text-soft)]">
                Browse available hostels to start your first reservation.
              </p>

              <div className="mt-6">
                <Link to="/hostels" className="btn-primary">
                  Browse Hostels
                </Link>
              </div>
            </section>
          )}
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

function MetricCard({ label, value, note, tone = "default" }) {
  const toneClass =
    tone === "success"
      ? "bg-[rgba(31,143,95,0.10)] text-[var(--success)]"
      : tone === "warning"
      ? "bg-[rgba(212,167,44,0.14)] text-[#946d00]"
      : "bg-[rgba(196,154,50,0.16)] text-[var(--accent)]";

  return (
    <div className="dashboard-card p-5 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--text-soft)]">{label}</p>
          <h3 className="mt-3 text-3xl font-extrabold tracking-tight text-[var(--text)]">
            {value}
          </h3>
          <p className="mt-2 text-sm text-[var(--text-soft)]">{note}</p>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-bold ${toneClass}`}
        >
          •
        </div>
      </div>
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

function StatusBadge({ status }) {
  const raw = String(status || "").toUpperCase();

  let className = "status-badge status-neutral";

  if (raw === "CONFIRMED" || raw === "CHECKED_IN") {
    className = "status-badge status-success";
  } else if (raw === "PENDING") {
    className = "status-badge status-warning";
  } else if (raw === "FAILED" || raw === "CANCELLED") {
    className = "status-badge status-danger";
  }

  return <span className={className}>{formatStatus(status)}</span>;
}

function PaymentBadge({ status }) {
  const raw = String(status || "").toUpperCase();

  let className = "status-badge status-neutral";

  if (raw === "SUCCESS" || raw === "PAID") {
    className = "status-badge status-success";
  } else if (raw === "PENDING" || raw === "INITIATED") {
    className = "status-badge status-warning";
  } else if (raw === "FAILED") {
    className = "status-badge status-danger";
  }

  return <span className={className}>{formatStatus(status)}</span>;
}

function getStatus(booking) {
  return booking.status || booking.booking_status || "N/A";
}

function formatStatus(value) {
  if (!value) return "Unknown";

  return String(value)
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}