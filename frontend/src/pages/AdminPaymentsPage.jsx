import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [statusFilter, setStatusFilter] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const [referenceFilter, setReferenceFilter] = useState("");

  useEffect(() => {
    fetchPayments();
  }, [statusFilter, providerFilter, referenceFilter]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError("");

      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (providerFilter) params.provider = providerFilter;
      if (referenceFilter) params.reference = referenceFilter;

      const response = await api.get("/admin/payments/", { params });
      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.results || [];

      setPayments(data);
    } catch (err) {
      console.log("ADMIN PAYMENTS FETCH ERROR:", err);
      console.log("ADMIN PAYMENTS FETCH ERROR RESPONSE:", err?.response);
      console.log("ADMIN PAYMENTS FETCH ERROR DATA:", err?.response?.data);

      setError(err?.response?.data?.detail || "Failed to load payments.");
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => {
    const total = payments.length;
    const success = payments.filter(
      (item) => String(item.status).toUpperCase() === "SUCCESS"
    ).length;
    const failed = payments.filter(
      (item) => String(item.status).toUpperCase() === "FAILED"
    ).length;
    const pending = payments.filter((item) =>
      ["INITIATED", "PENDING"].includes(String(item.status).toUpperCase())
    ).length;

    return { total, success, failed, pending };
  }, [payments]);

  const getStudentName = (payment) => {
    if (payment.student?.name) return payment.student.name;
    if (payment.student?.full_name) return payment.student.full_name;
    if (payment.student?.username) return payment.student.username;
    if (payment.student_name) return payment.student_name;
    return "N/A";
  };

  const getHostelName = (payment) => {
    if (payment.hostel?.name) return payment.hostel.name;
    if (payment.hostel_name) return payment.hostel_name;
    return "N/A";
  };

  const getRoomTypeName = (payment) => {
    if (payment.room_type?.name) return payment.room_type.name;
    if (payment.room_type_name) return payment.room_type_name;
    return "N/A";
  };

  const clearFilters = () => {
    setStatusFilter("");
    setProviderFilter("");
    setReferenceFilter("");
  };

  return (
    <div className="content-stack">
      <section className="stats-grid">
        <MetricCard
          label="Total Payments"
          value={summary.total}
          note="All payment records"
        />
        <MetricCard
          label="Successful"
          value={summary.success}
          note="Completed transactions"
          tone="success"
        />
        <MetricCard
          label="Pending"
          value={summary.pending}
          note="Awaiting confirmation"
          tone="warning"
        />
        <MetricCard
          label="Failed"
          value={summary.failed}
          note="Unsuccessful transactions"
          tone="danger"
        />
      </section>

      <section className="panel-card p-5 md:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="section-title">Filters</h2>
            <p className="section-subtitle mt-1">
              Narrow payment records by status, provider, or reference.
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
              <option value="INITIATED">Initiated</option>
              <option value="PENDING">Pending</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          <div>
            <label className="input-label">Provider</label>
            <input
              type="text"
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              className="input-field"
              placeholder="e.g. PAYSTACK"
            />
          </div>

          <div>
            <label className="input-label">Reference</label>
            <input
              type="text"
              value={referenceFilter}
              onChange={(e) => setReferenceFilter(e.target.value)}
              className="input-field"
              placeholder="Search by reference"
            />
          </div>
        </div>
      </section>

      <section className="panel-card p-5 md:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="section-title">Payments List</h2>
            <p className="section-subtitle mt-1">
              Review transaction references, providers, amounts, and payment outcomes.
            </p>
          </div>

          <button onClick={fetchPayments} className="btn-secondary">
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
        ) : payments.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-[var(--border)] bg-[var(--surface-muted)] px-4 py-10 text-center text-sm text-[var(--text-soft)]">
            No payments found.
          </div>
        ) : (
          <div className="table-shell">
            <div className="overflow-x-auto">
              <table className="table-clean min-w-[1180px]">
                <thead>
                  <tr>
                    <th>Payment ID</th>
                    <th>Reference</th>
                    <th>Student</th>
                    <th>Hostel</th>
                    <th>Room Type</th>
                    <th>Provider</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Paid At</th>
                  </tr>
                </thead>

                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="font-semibold">#{payment.id}</td>
                      <td className="max-w-[220px] break-all">
                        {payment.reference || "N/A"}
                      </td>
                      <td>{getStudentName(payment)}</td>
                      <td>{getHostelName(payment)}</td>
                      <td>{getRoomTypeName(payment)}</td>
                      <td>{payment.provider || "N/A"}</td>
                      <td>{formatMoney(payment.amount)}</td>
                      <td>
                        <StatusBadge status={payment.status} />
                      </td>
                      <td>{formatDate(payment.paid_at || payment.created_at)}</td>
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
      : tone === "danger"
      ? "bg-[rgba(199,75,75,0.12)] text-[var(--danger)]"
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

  if (raw === "SUCCESS") {
    className = "status-badge status-success";
  } else if (raw === "INITIATED" || raw === "PENDING") {
    className = "status-badge status-warning";
  } else if (raw === "FAILED") {
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