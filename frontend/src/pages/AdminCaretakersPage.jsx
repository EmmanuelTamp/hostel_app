import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";

const initialForm = {
  username: "",
  full_name: "",
  email: "",
  phone: "",
  password: "",
  hostel_id: "",
  is_active: true,
};

export default function AdminCaretakersPage() {
  const [caretakers, setCaretakers] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState(initialForm);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingCaretaker, setEditingCaretaker] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      const [caretakersRes, hostelsRes] = await Promise.all([
        api.get("/admin/caretakers/"),
        api.get("/admin/hostels/"),
      ]);

      setCaretakers(
        Array.isArray(caretakersRes.data)
          ? caretakersRes.data
          : caretakersRes.data?.results || []
      );

      setHostels(
        Array.isArray(hostelsRes.data)
          ? hostelsRes.data
          : hostelsRes.data?.results || []
      );
    } catch (err) {
      console.log("ADMIN CARETAKERS FETCH ERROR:", err);
      console.log("ADMIN CARETAKERS FETCH ERROR RESPONSE:", err?.response);
      console.log("ADMIN CARETAKERS FETCH ERROR DATA:", err?.response?.data);

      setError(err?.response?.data?.detail || "Failed to load caretakers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const stats = useMemo(() => {
    const total = caretakers.length;
    const active = caretakers.filter((item) => item.is_active).length;
    const inactive = total - active;

    const assigned = caretakers.filter((item) => {
      const hostelId = item.hostel?.id ?? item.hostel_id ?? item.hostel;
      return Boolean(hostelId);
    }).length;

    return { total, active, inactive, assigned };
  }, [caretakers]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleEdit = (caretaker) => {
    setEditingCaretaker(caretaker);
    setFormError("");

    setFormData({
      username: caretaker.username || "",
      full_name:
        caretaker.full_name ||
        caretaker.name ||
        caretaker.get_full_name ||
        "",
      email: caretaker.email || "",
      phone: caretaker.phone || "",
      password: "",
      hostel_id: String(
        caretaker.hostel?.id ??
          caretaker.hostel_id ??
          caretaker.hostel ??
          ""
      ),
      is_active:
        typeof caretaker.is_active === "boolean" ? caretaker.is_active : true,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingCaretaker(null);
    setFormError("");
    setFormData(initialForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.hostel_id) {
      setFormError("Please assign the caretaker to a hostel.");
      return;
    }

    try {
      setFormLoading(true);
      setFormError("");

      const payload = {
        username: formData.username,
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        hostel_id: Number(formData.hostel_id),
        is_active: formData.is_active,
      };

      if (!editingCaretaker) {
        payload.password = formData.password;
      } else if (formData.password.trim()) {
        payload.password = formData.password;
      }

      if (editingCaretaker) {
        await api.put(`/admin/caretakers/${editingCaretaker.id}/`, payload);
      } else {
        await api.post("/admin/caretakers/", payload);
      }

      await fetchData();
      handleCancelEdit();
    } catch (err) {
      console.log("ADMIN CARETAKER SAVE ERROR:", err);
      console.log("ADMIN CARETAKER SAVE ERROR RESPONSE:", err?.response);
      console.log("ADMIN CARETAKER SAVE ERROR DATA:", err?.response?.data);

      if (typeof err?.response?.data === "object") {
        const firstError = Object.values(err.response.data)?.[0];
        setFormError(
          Array.isArray(firstError)
            ? firstError[0]
            : "Failed to save caretaker."
        );
      } else {
        setFormError(
          err?.response?.data?.detail || "Failed to save caretaker."
        );
      }
    } finally {
      setFormLoading(false);
    }
  };

  const getHostelName = (caretaker) => {
    if (caretaker.hostel?.name) return caretaker.hostel.name;

    const hostelId =
      caretaker.hostel?.id ?? caretaker.hostel_id ?? caretaker.hostel;
    const match = hostels.find((item) => String(item.id) === String(hostelId));
    return match?.name || "N/A";
  };

  return (
    <div className="content-stack">
      <section className="stats-grid">
        <MetricCard
          label="Total Caretakers"
          value={stats.total}
          note="All caretaker accounts"
        />
        <MetricCard
          label="Active"
          value={stats.active}
          note="Operational accounts"
          tone="success"
        />
        <MetricCard
          label="Inactive"
          value={stats.inactive}
          note="Disabled accounts"
          tone="neutral"
        />
        <MetricCard
          label="Assigned"
          value={stats.assigned}
          note="Linked to hostels"
          tone="warning"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[440px_minmax(0,1fr)]">
        <div className="panel-card p-5 md:p-6">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
              Caretaker form
            </p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[var(--text)]">
              {editingCaretaker ? "Edit Caretaker" : "Add New Caretaker"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
              Create and manage caretaker accounts, contact details, and hostel assignments.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="input-label">Username</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="input-field"
                placeholder="Enter username"
                required
              />
            </div>

            <div>
              <label className="input-label">Full Name</label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                className="input-field"
                placeholder="Enter full name"
              />
            </div>

            <div>
              <label className="input-label">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="input-field"
                placeholder="Enter email"
                required
              />
            </div>

            <div>
              <label className="input-label">Phone</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="input-field"
                placeholder="Enter phone number"
              />
            </div>

            <div>
              <label className="input-label">
                {editingCaretaker ? "Password (optional)" : "Password"}
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="input-field"
                placeholder={
                  editingCaretaker
                    ? "Leave blank to keep current password"
                    : "Enter password"
                }
                required={!editingCaretaker}
              />
            </div>

            <div>
              <label className="input-label">Assigned Hostel</label>
              <select
                name="hostel_id"
                value={formData.hostel_id}
                onChange={handleChange}
                className="select-field"
                required
              >
                <option value="">Select hostel</option>
                {hostels.map((hostel) => (
                  <option key={hostel.id} value={hostel.id}>
                    {hostel.name}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-3 rounded-[18px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                className="h-4 w-4"
              />
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">
                  Active caretaker
                </p>
                <p className="text-xs text-[var(--text-soft)]">
                  Allow this account to sign in and manage assigned operations.
                </p>
              </div>
            </label>

            {formError && (
              <div className="rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              <button type="submit" disabled={formLoading} className="btn-primary">
                {formLoading
                  ? editingCaretaker
                    ? "Updating..."
                    : "Creating..."
                  : editingCaretaker
                  ? "Update Caretaker"
                  : "Create Caretaker"}
              </button>

              {editingCaretaker && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="panel-card p-5 md:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="section-title">Caretakers List</h2>
              <p className="section-subtitle mt-1">
                Review and update caretaker accounts and hostel assignments.
              </p>
            </div>

            <div className="inline-flex items-center rounded-full bg-[var(--surface-muted)] px-4 py-2 text-sm font-semibold text-[var(--text-soft)]">
              {caretakers.length} caretaker{caretakers.length === 1 ? "" : "s"}
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="soft-panel h-40 animate-pulse bg-[var(--surface-muted)]"
                />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : caretakers.length === 0 ? (
            <div className="rounded-[20px] border border-dashed border-[var(--border)] bg-[var(--surface-muted)] px-4 py-10 text-center text-sm text-[var(--text-soft)]">
              No caretakers found.
            </div>
          ) : (
            <div className="space-y-4">
              {caretakers.map((caretaker) => (
                <div
                  key={caretaker.id}
                  className="soft-panel p-5 transition hover:-translate-y-[1px]"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-bold text-[var(--text)]">
                          {caretaker.full_name ||
                            caretaker.name ||
                            caretaker.username ||
                            "Unnamed Caretaker"}
                        </h3>
                        <span
                          className={
                            caretaker.is_active
                              ? "status-badge status-success"
                              : "status-badge status-neutral"
                          }
                        >
                          {caretaker.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        <DataItem
                          label="Username"
                          value={caretaker.username || "N/A"}
                        />
                        <DataItem
                          label="Email"
                          value={caretaker.email || "N/A"}
                        />
                        <DataItem
                          label="Phone"
                          value={caretaker.phone || "N/A"}
                        />
                        <DataItem
                          label="Assigned Hostel"
                          value={getHostelName(caretaker)}
                        />
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <button
                        onClick={() => handleEdit(caretaker)}
                        className="btn-secondary"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value, note, tone = "default" }) {
  const toneClass =
    tone === "success"
      ? "bg-[rgba(31,143,95,0.10)] text-[var(--success)]"
      : tone === "neutral"
      ? "bg-[rgba(102,112,133,0.12)] text-[var(--text-soft)]"
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