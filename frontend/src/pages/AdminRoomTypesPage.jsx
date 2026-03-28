import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";

const initialForm = {
  hostel: "",
  name: "",
  price: "",
  capacity: "",
  booking_mode: "PER_BED",
  total_units: "",
  is_active: true,
};

const bookingModeOptions = [
  { value: "PER_BED", label: "Per Bed" },
  { value: "WHOLE_ROOM", label: "Whole Room" },
];

export default function AdminRoomTypesPage() {
  const [roomTypes, setRoomTypes] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState(initialForm);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingRoomType, setEditingRoomType] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      const [roomTypesRes, hostelsRes] = await Promise.all([
        api.get("/admin/room-types/"),
        api.get("/admin/hostels/"),
      ]);

      setRoomTypes(
        Array.isArray(roomTypesRes.data)
          ? roomTypesRes.data
          : roomTypesRes.data?.results || []
      );

      setHostels(
        Array.isArray(hostelsRes.data)
          ? hostelsRes.data
          : hostelsRes.data?.results || []
      );
    } catch (err) {
      console.log("ADMIN ROOM TYPES FETCH ERROR:", err);
      console.log("ADMIN ROOM TYPES FETCH ERROR RESPONSE:", err?.response);
      console.log("ADMIN ROOM TYPES FETCH ERROR DATA:", err?.response?.data);

      setError(err?.response?.data?.detail || "Failed to load room types.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const hostelOptions = useMemo(() => {
    return hostels.map((hostel) => ({
      id: hostel.id,
      name: hostel.name,
    }));
  }, [hostels]);

  const stats = useMemo(() => {
    const total = roomTypes.length;
    const active = roomTypes.filter((item) => item.is_active).length;
    const inactive = total - active;
    const wholeRoom = roomTypes.filter(
      (item) => String(item.booking_mode).toUpperCase() === "WHOLE_ROOM"
    ).length;

    return { total, active, inactive, wholeRoom };
  }, [roomTypes]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleEdit = (roomType) => {
    setEditingRoomType(roomType);
    setFormError("");

    setFormData({
      hostel: String(
        roomType.hostel?.id ?? roomType.hostel ?? roomType.hostel_id ?? ""
      ),
      name: roomType.name || "",
      price: roomType.price || "",
      capacity: roomType.capacity || "",
      booking_mode: roomType.booking_mode || "PER_BED",
      total_units:
        roomType.total_units ??
        roomType.total_rooms ??
        roomType.total_beds ??
        "",
      is_active:
        typeof roomType.is_active === "boolean" ? roomType.is_active : true,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingRoomType(null);
    setFormError("");
    setFormData(initialForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.hostel) {
      setFormError("Please select a hostel.");
      return;
    }

    try {
      setFormLoading(true);
      setFormError("");

      const payload = {
        hostel: Number(formData.hostel),
        name: formData.name,
        price: formData.price,
        capacity: Number(formData.capacity),
        booking_mode: formData.booking_mode,
        total_units: Number(formData.total_units),
        is_active: formData.is_active,
      };

      if (editingRoomType) {
        await api.put(`/admin/room-types/${editingRoomType.id}/`, payload);
      } else {
        await api.post("/admin/room-types/", payload);
      }

      await fetchData();
      handleCancelEdit();
    } catch (err) {
      console.log("ADMIN ROOM TYPE SAVE ERROR:", err);
      console.log("ADMIN ROOM TYPE SAVE ERROR RESPONSE:", err?.response);
      console.log("ADMIN ROOM TYPE SAVE ERROR DATA:", err?.response?.data);

      if (typeof err?.response?.data === "object") {
        const firstError = Object.values(err.response.data)?.[0];
        setFormError(
          Array.isArray(firstError)
            ? firstError[0]
            : "Failed to save room type."
        );
      } else {
        setFormError(
          err?.response?.data?.detail || "Failed to save room type."
        );
      }
    } finally {
      setFormLoading(false);
    }
  };

  const getHostelName = (roomType) => {
    if (roomType.hostel?.name) return roomType.hostel.name;

    const hostelId =
      roomType.hostel?.id ?? roomType.hostel ?? roomType.hostel_id;
    const match = hostels.find((item) => String(item.id) === String(hostelId));
    return match?.name || "N/A";
  };

  return (
    <div className="content-stack">
      <section className="stats-grid">
        <MetricCard
          label="Total Room Types"
          value={stats.total}
          note="All configured room categories"
        />
        <MetricCard
          label="Active"
          value={stats.active}
          note="Available for booking"
          tone="success"
        />
        <MetricCard
          label="Inactive"
          value={stats.inactive}
          note="Currently disabled"
          tone="neutral"
        />
        <MetricCard
          label="Whole Room"
          value={stats.wholeRoom}
          note="Configured as whole-room booking"
          tone="warning"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[440px_minmax(0,1fr)]">
        <div className="panel-card p-5 md:p-6">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
              Room type form
            </p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[var(--text)]">
              {editingRoomType ? "Edit Room Type" : "Add New Room Type"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
              Create and manage room categories, pricing, capacity, and booking mode.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="input-label">Hostel</label>
              <select
                name="hostel"
                value={formData.hostel}
                onChange={handleChange}
                className="select-field"
                required
              >
                <option value="">Select hostel</option>
                {hostelOptions.map((hostel) => (
                  <option key={hostel.id} value={hostel.id}>
                    {hostel.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="input-label">Room Type Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="input-field"
                placeholder="Enter room type name"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="input-label">Price</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Enter price"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label className="input-label">Capacity</label>
                <input
                  type="number"
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Enter capacity"
                  min="1"
                  required
                />
              </div>
            </div>

            <div>
              <label className="input-label">Booking Mode</label>
              <select
                name="booking_mode"
                value={formData.booking_mode}
                onChange={handleChange}
                className="select-field"
                required
              >
                {bookingModeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="input-label">Total Units</label>
              <input
                type="number"
                name="total_units"
                value={formData.total_units}
                onChange={handleChange}
                className="input-field"
                placeholder="Enter total units"
                min="1"
                required
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
                  Active room type
                </p>
                <p className="text-xs text-[var(--text-soft)]">
                  Enable this room type for booking and allocation.
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
                  ? editingRoomType
                    ? "Updating..."
                    : "Creating..."
                  : editingRoomType
                  ? "Update Room Type"
                  : "Create Room Type"}
              </button>

              {editingRoomType && (
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
              <h2 className="section-title">Room Types List</h2>
              <p className="section-subtitle mt-1">
                Review and update available room categories across hostels.
              </p>
            </div>

            <div className="inline-flex items-center rounded-full bg-[var(--surface-muted)] px-4 py-2 text-sm font-semibold text-[var(--text-soft)]">
              {roomTypes.length} room type{roomTypes.length === 1 ? "" : "s"}
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
          ) : roomTypes.length === 0 ? (
            <div className="rounded-[20px] border border-dashed border-[var(--border)] bg-[var(--surface-muted)] px-4 py-10 text-center text-sm text-[var(--text-soft)]">
              No room types found.
            </div>
          ) : (
            <div className="space-y-4">
              {roomTypes.map((roomType) => (
                <div
                  key={roomType.id}
                  className="soft-panel p-5 transition hover:-translate-y-[1px]"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-bold text-[var(--text)]">
                          {roomType.name || "Unnamed Room Type"}
                        </h3>
                        <span
                          className={
                            roomType.is_active
                              ? "status-badge status-success"
                              : "status-badge status-neutral"
                          }
                        >
                          {roomType.is_active ? "Active" : "Inactive"}
                        </span>
                        <span className="status-badge status-warning">
                          {formatBookingMode(roomType.booking_mode)}
                        </span>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        <DataItem
                          label="Hostel"
                          value={getHostelName(roomType)}
                        />
                        <DataItem
                          label="Price"
                          value={formatMoney(roomType.price)}
                        />
                        <DataItem
                          label="Capacity"
                          value={roomType.capacity || "N/A"}
                        />
                        <DataItem
                          label="Booking Mode"
                          value={formatBookingMode(roomType.booking_mode)}
                        />
                        <DataItem
                          label="Total Units"
                          value={
                            roomType.total_units ??
                            roomType.total_rooms ??
                            roomType.total_beds ??
                            "N/A"
                          }
                        />
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <button
                        onClick={() => handleEdit(roomType)}
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

function formatBookingMode(value) {
  if (!value) return "N/A";
  return String(value).toUpperCase() === "WHOLE_ROOM" ? "Whole Room" : "Per Bed";
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