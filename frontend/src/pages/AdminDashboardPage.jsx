import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";

export default function AdminDashboardPage() {
  const [hostels, setHostels] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [caretakers, setCaretakers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError("");

        const [hostelsRes, bookingsRes, paymentsRes, caretakersRes] =
          await Promise.all([
            api.get("/admin/hostels/"),
            api.get("/admin/bookings/"),
            api.get("/admin/payments/"),
            api.get("/admin/caretakers/"),
          ]);

        setHostels(
          Array.isArray(hostelsRes.data)
            ? hostelsRes.data
            : hostelsRes.data?.results || []
        );

        setBookings(
          Array.isArray(bookingsRes.data)
            ? bookingsRes.data
            : bookingsRes.data?.results || []
        );

        setPayments(
          Array.isArray(paymentsRes.data)
            ? paymentsRes.data
            : paymentsRes.data?.results || []
        );

        setCaretakers(
          Array.isArray(caretakersRes.data)
            ? caretakersRes.data
            : caretakersRes.data?.results || []
        );
      } catch (err) {
        console.log("ADMIN DASHBOARD ERROR:", err);
        console.log("ADMIN DASHBOARD ERROR RESPONSE:", err?.response);
        console.log("ADMIN DASHBOARD ERROR DATA:", err?.response?.data);

        setError(
          err?.response?.data?.detail || "Failed to load admin dashboard."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const stats = useMemo(() => {
    const totalHostels = hostels.length;
    const totalBookings = bookings.length;
    const totalPayments = payments.length;
    const totalCaretakers = caretakers.length;

    const confirmedBookings = bookings.filter(
      (item) => String(item.status).toUpperCase() === "CONFIRMED"
    ).length;

    const checkedInBookings = bookings.filter(
      (item) => String(item.status).toUpperCase() === "CHECKED_IN"
    ).length;

    const successfulPayments = payments.filter(
      (item) => String(item.status).toUpperCase() === "SUCCESS"
    ).length;

    const pendingPayments = payments.filter(
      (item) =>
        String(item.status).toUpperCase() === "INITIATED" ||
        String(item.status).toUpperCase() === "PENDING"
    ).length;

    return {
      totalHostels,
      totalBookings,
      totalPayments,
      totalCaretakers,
      confirmedBookings,
      checkedInBookings,
      successfulPayments,
      pendingPayments,
    };
  }, [hostels, bookings, payments, caretakers]);

  const recentBookings = useMemo(() => bookings.slice(0, 5), [bookings]);
  const recentPayments = useMemo(() => payments.slice(0, 5), [payments]);

  if (loading) {
    return (
      <div className="panel-card p-6 md:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-6 w-48 rounded-full bg-[var(--surface-muted)]" />
          <div className="stats-grid">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="dashboard-card h-32 bg-[var(--surface-muted)]"
              />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="dashboard-card h-72 bg-[var(--surface-muted)]" />
            <div className="dashboard-card h-72 bg-[var(--surface-muted)]" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[24px] border border-red-200 bg-red-50 p-5 text-red-700 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em]">
          Dashboard error
        </p>
        <p className="mt-2 text-base">{error}</p>
      </div>
    );
  }

  return (
    <div className="content-stack">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_380px]">
        <div className="panel-card p-6 md:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
            Overview
          </p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[var(--text)] md:text-4xl">
            Welcome back, {firstName(caretakers?.[0]?.full_name) ? "Admin" : "Admin"}.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-soft)] md:text-base">
            This dashboard gives you a live operational snapshot of hostels,
            bookings, payments, and caretaker activity across the platform.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/admin/hostels" className="btn-primary">
              Manage Hostels
            </Link>
            <Link to="/admin/bookings" className="btn-secondary">
              Review Bookings
            </Link>
          </div>
        </div>

        <div className="panel-card p-6 md:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
            Performance
          </p>

          <div className="mt-5 space-y-5">
            <ProgressMetric
              label="Confirmed bookings"
              value={stats.confirmedBookings}
              total={Math.max(stats.totalBookings, 1)}
            />
            <ProgressMetric
              label="Checked-in bookings"
              value={stats.checkedInBookings}
              total={Math.max(stats.totalBookings, 1)}
            />
            <ProgressMetric
              label="Successful payments"
              value={stats.successfulPayments}
              total={Math.max(stats.totalPayments, 1)}
            />
          </div>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard
          title="Total Hostels"
          value={stats.totalHostels}
          subtitle="Listed properties"
        />
        <StatCard
          title="Total Caretakers"
          value={stats.totalCaretakers}
          subtitle="Active operational accounts"
        />
        <StatCard
          title="Total Bookings"
          value={stats.totalBookings}
          subtitle="All booking records"
        />
        <StatCard
          title="Total Payments"
          value={stats.totalPayments}
          subtitle="All payment entries"
        />
      </section>

      <section className="stats-grid">
        <StatCard
          title="Confirmed"
          value={stats.confirmedBookings}
          subtitle="Bookings approved"
          accent="success"
        />
        <StatCard
          title="Checked In"
          value={stats.checkedInBookings}
          subtitle="Students already checked in"
          accent="success"
        />
        <StatCard
          title="Successful"
          value={stats.successfulPayments}
          subtitle="Completed payments"
          accent="success"
        />
        <StatCard
          title="Pending"
          value={stats.pendingPayments}
          subtitle="Awaiting completion"
          accent="warning"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="panel-card p-5 md:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="section-title">Recent Bookings</h2>
              <p className="section-subtitle mt-1">
                Latest reservation activity on the platform.
              </p>
            </div>

            <Link to="/admin/bookings" className="btn-secondary">
              View all
            </Link>
          </div>

          {recentBookings.length > 0 ? (
            <div className="space-y-3">
              {recentBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="soft-panel p-4 transition hover:-translate-y-[1px]"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-base font-bold text-[var(--text)]">
                        Booking #{booking.id}
                      </p>
                      <p className="mt-1 text-sm text-[var(--text-soft)]">
                        Created {formatDate(booking.created_at)}
                      </p>
                    </div>

                    <StatusBadge status={booking.status} type="booking" />
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <DataItem
                      label="Student"
                      value={
                        booking.student_name ||
                        booking.student?.full_name ||
                        booking.student?.username ||
                        "N/A"
                      }
                    />
                    <DataItem
                      label="Hostel"
                      value={booking.hostel_name || booking.hostel || "N/A"}
                    />
                    <DataItem
                      label="Amount"
                      value={formatMoney(booking.amount)}
                    />
                    <DataItem
                      label="Room"
                      value={booking.room_type_name || booking.room_type || "N/A"}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No bookings found yet." />
          )}
        </div>

        <div className="panel-card p-5 md:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="section-title">Recent Payments</h2>
              <p className="section-subtitle mt-1">
                Latest payment transactions and their status.
              </p>
            </div>

            <Link to="/admin/payments" className="btn-secondary">
              View all
            </Link>
          </div>

          {recentPayments.length > 0 ? (
            <div className="space-y-3">
              {recentPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="soft-panel p-4 transition hover:-translate-y-[1px]"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-base font-bold text-[var(--text)]">
                        Payment #{payment.id}
                      </p>
                      <p className="mt-1 break-all text-sm text-[var(--text-soft)]">
                        Ref: {payment.reference || "N/A"}
                      </p>
                    </div>

                    <StatusBadge status={payment.status} type="payment" />
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <DataItem
                      label="Amount"
                      value={formatMoney(payment.amount)}
                    />
                    <DataItem
                      label="Provider"
                      value={payment.provider || "N/A"}
                    />
                    <DataItem
                      label="Reservation"
                      value={payment.reservation_id || "N/A"}
                    />
                    <DataItem
                      label="Paid At"
                      value={formatDate(payment.paid_at || payment.created_at)}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No payments found yet." />
          )}
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="section-title">Quick Actions</h2>
          <p className="section-subtitle mt-1">
            Jump directly into the main operational sections.
          </p>
        </div>

        <div className="cards-grid cards-grid-4">
          <QuickLinkCard
            title="Manage Hostels"
            description="Create, update, and organize hostel records."
            to="/admin/hostels"
          />
          <QuickLinkCard
            title="Room Types"
            description="Control room categories, pricing, and capacity."
            to="/admin/room-types"
          />
          <QuickLinkCard
            title="Caretakers"
            description="Manage staff accounts and responsibilities."
            to="/admin/caretakers"
          />
          <QuickLinkCard
            title="Payments"
            description="Monitor payment activity and transaction status."
            to="/admin/payments"
          />
        </div>
      </section>
    </div>
  );
}

function StatCard({ title, value, subtitle, accent = "default" }) {
  const accentClasses =
    accent === "success"
      ? "bg-[rgba(31,143,95,0.10)] text-[var(--success)]"
      : accent === "warning"
      ? "bg-[rgba(212,167,44,0.14)] text-[#946d00]"
      : "bg-[rgba(196,154,50,0.16)] text-[var(--accent)]";

  return (
    <div className="dashboard-card p-5 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--text-soft)]">{title}</p>
          <h3 className="mt-3 text-3xl font-extrabold tracking-tight text-[var(--text)]">
            {value}
          </h3>
          <p className="mt-2 text-sm text-[var(--text-soft)]">{subtitle}</p>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-bold ${accentClasses}`}
        >
          •
        </div>
      </div>
    </div>
  );
}

function QuickLinkCard({ title, description, to }) {
  return (
    <Link
      to={to}
      className="dashboard-card block p-5 transition hover:-translate-y-[2px] hover:shadow-[var(--shadow-soft)]"
    >
      <div className="flex h-full flex-col">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(196,154,50,0.16)] text-lg font-bold text-[var(--accent)]">
          →
        </div>
        <h3 className="text-lg font-bold text-[var(--text)]">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
          {description}
        </p>
      </div>
    </Link>
  );
}

function ProgressMetric({ label, value, total }) {
  const percentage = Math.min(100, Math.round((value / total) * 100));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[var(--text)]">{label}</p>
        <p className="text-sm font-bold text-[var(--text-soft)]">
          {value}/{total}
        </p>
      </div>
      <div className="h-3 rounded-full bg-[var(--surface-muted)]">
        <div
          className="h-3 rounded-full bg-[var(--accent)] transition-all"
          style={{ width: `${percentage}%` }}
        />
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
      <p className="mt-1 text-sm font-medium text-[var(--text)]">{value}</p>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="rounded-[20px] border border-dashed border-[var(--border)] bg-[var(--surface-muted)] px-4 py-8 text-center text-sm text-[var(--text-soft)]">
      {message}
    </div>
  );
}

function StatusBadge({ status, type }) {
  const raw = String(status || "").toUpperCase();

  let className = "status-badge status-neutral";

  if (type === "booking") {
    if (raw === "CONFIRMED" || raw === "CHECKED_IN") {
      className = "status-badge status-success";
    } else if (raw === "PENDING") {
      className = "status-badge status-warning";
    } else if (raw === "CANCELLED" || raw === "FAILED") {
      className = "status-badge status-danger";
    }
  }

  if (type === "payment") {
    if (raw === "SUCCESS") {
      className = "status-badge status-success";
    } else if (raw === "INITIATED" || raw === "PENDING") {
      className = "status-badge status-warning";
    } else if (raw === "FAILED") {
      className = "status-badge status-danger";
    }
  }

  return <span className={className}>{formatStatus(status)}</span>;
}

function formatStatus(value) {
  if (!value) return "Unknown";

  return String(value)
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatMoney(value) {
  if (value === null || value === undefined || value === "") return "N/A";

  const number = Number(value);
  if (Number.isNaN(number)) return value;

  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    maximumFractionDigits: 2,
  }).format(number);
}

function formatDate(value) {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function firstName(value) {
  if (!value) return "";
  return String(value).trim().split(" ")[0];
}