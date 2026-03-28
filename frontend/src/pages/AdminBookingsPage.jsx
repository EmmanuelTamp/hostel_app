import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [hostels, setHostels] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [statusFilter, setStatusFilter] = useState("");
  const [hostelFilter, setHostelFilter] = useState("");
  const [studentFilter, setStudentFilter] = useState("");

  useEffect(() => {
    fetchHostels();
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [statusFilter, hostelFilter, studentFilter]);

  const fetchHostels = async () => {
    try {
      const response = await api.get("/admin/hostels/");
      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.results || [];
      setHostels(data);
    } catch (err) {
      console.log("ADMIN HOSTELS LOAD ERROR:", err);
    }
  };

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError("");

      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (hostelFilter) params.hostel = hostelFilter;
      if (studentFilter) params.student = studentFilter;

      const response = await api.get("/admin/bookings/", { params });
      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.results || [];

      setBookings(data);
    } catch (err) {
      console.log("ADMIN BOOKINGS FETCH ERROR:", err);
      console.log("ADMIN BOOKINGS FETCH ERROR RESPONSE:", err?.response);
      console.log("ADMIN BOOKINGS FETCH ERROR DATA:", err?.response?.data);

      setError(err?.response?.data?.detail || "Failed to load bookings.");
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => {
    const total = bookings.length;
    const confirmed = bookings.filter(
      (item) => String(item.status).toUpperCase() === "CONFIRMED"
    ).length;
    const checkedIn = bookings.filter(
      (item) => String(item.status).toUpperCase() === "CHECKED_IN"
    ).length;
    const pending = bookings.filter(
      (item) => String(item.status).toUpperCase() === "PENDING"
    ).length;

    return { total, confirmed, checkedIn, pending };
  }, [bookings]);

  const getHostelName = (booking) => {
    if (booking.room_type?.hostel?.name) return booking.room_type.hostel.name;
    if (booking.hostel?.name) return booking.hostel.name;
    if (booking.hostel_name) return booking.hostel_name;
    return "N/A";
  };

  const getRoomTypeName = (booking) => {
    if (booking.room_type?.name) return booking.room_type.name;
    if (booking.room_type_name) return booking.room_type_name;
    return "N/A";
  };

  const getStudentName = (booking) => {
    if (booking.student?.name) return booking.student.name;
    if (booking.student?.full_name) return booking.student.full_name;
    if (booking.student?.username) return booking.student.username;
    return "N/A";
  };

  const clearFilters = () => {
    setStatusFilter("");
    setHostelFilter("");
    setStudentFilter("");
  };

  return (
    <div className="content-stack">
      <section className="stats-grid">
        <MetricCard
          label="Total Bookings"
          value={summary.total}
          note="All booking records"
        />
        <MetricCard
          label="Confirmed"
          value={summary.confirmed}
          note="Approved reservations"
          tone="success"
        />
        <MetricCard
          label="Checked In"
          value={summary.checkedIn}
          note="Students already checked in"
          tone="success"
        />
        <MetricCard
          label="Pending"
          value={summary.pending}
          note="Awaiting action"
          tone="warning"
        />
      </section>

      <section className="panel-card p-5 md:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="section-title">Filters</h2>
            <p className="section-subtitle mt-1">
              Narrow records by status, hostel, or student ID.
            </p>
          </div>

          <button onClick={clearFilters} className="btn-secondary">
            Clear Filters
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="input-label">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="select-field"
            >
              <option value="">All statuses</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CHECKED_IN">Checked In</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>

          <div>
            <label className="input-label">Hostel</label>
            <select
              value={hostelFilter}
              onChange={(e) => setHostelFilter(e.target.value)}
              className="select-field"
            >
              <option value="">All hostels</option>
              {hostels.map((hostel) => (
                <option key={hostel.id} value={hostel.id}>
                  {hostel.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="input-label">Student ID</label>
            <input
              type="number"
              value={studentFilter}
              onChange={(e) => setStudentFilter(e.target.value)}
              className="input-field"
              placeholder="Filter by student ID"
            />
          </div>
        </div>
      </section>

      <section className="panel-card p-5 md:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="section-title">Bookings List</h2>
            <p className="section-subtitle mt-1">
              Review confirmed, pending, and checked-in reservations.
            </p>
          </div>

          <button onClick={fetchBookings} className="btn-secondary">
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-[18px] bg-[var(--surface-muted)]"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : bookings.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-[var(--border)] bg-[var(--surface-muted)] px-4 py-10 text-center text-sm text-[var(--text-soft)]">
            No bookings found.
          </div>
        ) : (
          <div className="table-shell">
            <div className="overflow-x-auto">
              <table className="table-clean min-w-[980px]">
                <thead>
                  <tr>
                    <th>Booking ID</th>
                    <th>Student</th>
                    <th>Hostel</th>
                    <th>Room Type</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>

                <tbody>
                  {bookings.map((booking) => (
                    <tr key={booking.id}>
                      <td className="font-semibold">#{booking.id}</td>
                      <td>{getStudentName(booking)}</td>
                      <td>{getHostelName(booking)}</td>
                      <td>{getRoomTypeName(booking)}</td>
                      <td>{formatMoney(booking.amount)}</td>
                      <td>
                        <StatusBadge status={booking.status} />
                      </td>
                      <td>{formatDate(booking.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
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