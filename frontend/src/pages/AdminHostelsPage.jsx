import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";

const initialForm = {
  name: "",
  description: "",
  location_area: "",
  address: "",
  is_active: true,
};

export default function AdminHostelsPage() {
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState(initialForm);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingHostel, setEditingHostel] = useState(null);

  const fetchHostels = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/admin/hostels/");
      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.results || [];

      setHostels(data);
    } catch (err) {
      console.log("ADMIN HOSTELS FETCH ERROR:", err);
      console.log("ADMIN HOSTELS FETCH ERROR RESPONSE:", err?.response);
      console.log("ADMIN HOSTELS FETCH ERROR DATA:", err?.response?.data);

      setError(err?.response?.data?.detail || "Failed to load hostels.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHostels();
  }, []);

  const stats = useMemo(() => {
    const total = hostels.length;
    const active = hostels.filter((item) => item.is_active).length;
    const inactive = total - active;

    return { total, active, inactive };
  }, [hostels]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleEdit = (hostel) => {
    setEditingHostel(hostel);
    setFormError("");
    setFormData({
      name: hostel.name || "",
      description: hostel.description || "",
      location_area: hostel.location_area || "",
      address: hostel.address || "",
      is_active:
        typeof hostel.is_active === "boolean" ? hostel.is_active : true,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingHostel(null);
    setFormError("");
    setFormData(initialForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setFormLoading(true);
      setFormError("");

      if (editingHostel) {
        await api.put(`/admin/hostels/${editingHostel.id}/`, formData);
      } else {
        await api.post("/admin/hostels/", formData);
      }

      await fetchHostels();
      handleCancelEdit();
    } catch (err) {
      console.log("ADMIN HOSTEL SAVE ERROR:", err);
      console.log("ADMIN HOSTEL SAVE ERROR RESPONSE:", err?.response);
      console.log("ADMIN HOSTEL SAVE ERROR DATA:", err?.response?.data);

      if (typeof err?.response?.data === "object") {
        const firstError = Object.values(err.response.data)?.[0];
        setFormError(
          Array.isArray(firstError) ? firstError[0] : "Failed to save hostel."
        );
      } else {
        setFormError(err?.response?.data?.detail || "Failed to save hostel.");
      }
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="content-stack">
      <section className="stats-grid">
        <MetricCard
          label="Total Hostels"
          value={stats.total}
          note="All hostel records"
        />
        <MetricCard
          label="Active"
          value={stats.active}
          note="Visible and available"
          tone="success"
        />
        <MetricCard
          label="Inactive"
          value={stats.inactive}
          note="Currently disabled"
          tone="neutral"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="panel-card p-5 md:p-6">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
              Hostel form
            </p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[var(--text)]">
              {editingHostel ? "Edit Hostel" : "Add New Hostel"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
              Create new hostel records or update existing property details.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="input-label">Hostel Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="input-field"
                placeholder="Enter hostel name"
                required
              />
            </div>

            <div>
              <label className="input-label">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="textarea-field"
                placeholder="Enter hostel description"
              />
            </div>

            <div>
              <label className="input-label">Location Area</label>
              <input
                type="text"
                name="location_area"
                value={formData.location_area}
                onChange={handleChange}
                className="input-field"
                placeholder="Enter location area"
                required
              />
            </div>

            <div>
              <label className="input-label">Address</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="input-field"
                placeholder="Enter address"
              />
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
                  Active hostel
                </p>
                <p className="text-xs text-[var(--text-soft)]">
                  Enable this hostel for current operations.
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
                  ? editingHostel
                    ? "Updating..."
                    : "Creating..."
                  : editingHostel
                  ? "Update Hostel"
                  : "Create Hostel"}
              </button>

              {editingHostel && (
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
              <h2 className="section-title">Hostel List</h2>
              <p className="section-subtitle mt-1">
                Review, inspect, and update all hostel records.
              </p>
            </div>

            <div className="inline-flex items-center rounded-full bg-[var(--surface-muted)] px-4 py-2 text-sm font-semibold text-[var(--text-soft)]">
              {hostels.length} hostel{hostels.length === 1 ? "" : "s"}
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="soft-panel h-36 animate-pulse bg-[var(--surface-muted)]"
                />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : hostels.length === 0 ? (
            <div className="rounded-[20px] border border-dashed border-[var(--border)] bg-[var(--surface-muted)] px-4 py-10 text-center text-sm text-[var(--text-soft)]">
              No hostels found.
            </div>
          ) : (
            <div className="space-y-4">
              {hostels.map((hostel) => (
                <div
                  key={hostel.id}
                  className="soft-panel p-5 transition hover:-translate-y-[1px]"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-bold text-[var(--text)]">
                          {hostel.name || "Unnamed Hostel"}
                        </h3>
                        <span
                          className={
                            hostel.is_active
                              ? "status-badge status-success"
                              : "status-badge status-neutral"
                          }
                        >
                          {hostel.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <DataItem
                          label="Location Area"
                          value={hostel.location_area || "N/A"}
                        />
                        <DataItem
                          label="Address"
                          value={hostel.address || "N/A"}
                        />
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                          Description
                        </p>
                        <p className="mt-2 text-sm leading-7 text-[var(--text)]">
                          {hostel.description || "No description available."}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <button
                        onClick={() => handleEdit(hostel)}
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
      <p className="mt-1 text-sm font-medium text-[var(--text)] break-words">
        {value}
      </p>
    </div>
  );
}