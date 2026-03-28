import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/axios";

export default function HostelDetailPage() {
  const { id } = useParams();
  const [hostel, setHostel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchHostel = async () => {
      try {
        const response = await api.get(`/hostels/${id}/`);
        console.log("HOSTEL DETAIL RESPONSE:", response.data);
        setHostel(response.data);
      } catch (err) {
        console.log("HOSTEL DETAIL ERROR:", err);
        console.log("HOSTEL DETAIL ERROR RESPONSE:", err?.response);
        console.log("HOSTEL DETAIL ERROR DATA:", err?.response?.data);

        setError(
          err?.response?.data?.detail || "Failed to load hostel details."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchHostel();
  }, [id]);

  if (loading) {
    return (
      <div className="app-shell">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
          <div className="space-y-6">
            <div className="panel-card p-6 md:p-8">
              <div className="animate-pulse space-y-4">
                <div className="h-4 w-32 rounded-full bg-[var(--surface-muted)]" />
                <div className="h-10 w-80 rounded-full bg-[var(--surface-muted)]" />
                <div className="h-5 w-full max-w-2xl rounded-full bg-[var(--surface-muted)]" />
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_380px]">
              <div className="panel-card h-96 animate-pulse bg-[var(--surface-muted)]" />
              <div className="panel-card h-96 animate-pulse bg-[var(--surface-muted)]" />
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

  if (!hostel) {
    return (
      <div className="app-shell">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
          <div className="rounded-[24px] border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-12 text-center">
            <p className="text-base font-semibold text-[var(--text)]">
              Hostel not found.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const roomTypes = Array.isArray(hostel.room_types)
    ? hostel.room_types
    : Array.isArray(hostel.roomTypes)
    ? hostel.roomTypes
    : [];

  const amenitiesList = normalizeAmenities(hostel.amenities);

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
                <div className="flex flex-wrap items-center gap-3">
                  <div className="inline-flex items-center rounded-full bg-[var(--surface-muted)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                    Hostel Details
                  </div>

                  <span
                    className={
                      hostel.is_active
                        ? "status-badge status-success"
                        : "status-badge status-danger"
                    }
                  >
                    {hostel.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-[var(--text)] md:text-5xl">
                  {hostel.name || "Unnamed Hostel"}
                </h1>

                <p className="mt-4 text-sm leading-7 text-[var(--text-soft)] md:text-base">
                  {hostel.location_area ||
                    hostel.location ||
                    hostel.address ||
                    "Location not available"}
                </p>

                <p className="mt-5 max-w-3xl text-sm leading-8 text-[var(--text)] md:text-base">
                  {hostel.description || "No description available."}
                </p>
              </div>

              <div className="grid min-w-full gap-4 sm:grid-cols-2 xl:min-w-[360px] xl:grid-cols-1">
                <InfoTile
                  label="Room Types"
                  value={roomTypes.length}
                  note="Available room categories"
                />
                <InfoTile
                  label="Availability"
                  value={hostel.is_active ? "Open" : "Closed"}
                  note="Current listing status"
                />
              </div>
            </div>
          </section>

          <section className="split-panel">
            <div className="space-y-6">
              <div className="panel-card p-6 md:p-7">
                <h2 className="section-title">Amenities</h2>
                <p className="section-subtitle mt-2">
                  Facilities and features available in this hostel.
                </p>

                <div className="mt-5">
                  {amenitiesList.length > 0 ? (
                    <div className="flex flex-wrap gap-3">
                      {amenitiesList.map((amenity, index) => (
                        <span
                          key={`${amenity}-${index}`}
                          className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-2 text-sm font-medium text-[var(--text)]"
                        >
                          {amenity}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[20px] border border-dashed border-[var(--border)] bg-[var(--surface-muted)] px-4 py-8 text-center text-sm text-[var(--text-soft)]">
                      No amenities available.
                    </div>
                  )}
                </div>
              </div>

              <div className="panel-card p-6 md:p-7">
                <div className="mb-4">
                  <h2 className="section-title">Room Types</h2>
                  <p className="section-subtitle mt-2">
                    Review room options before proceeding to checkout.
                  </p>
                </div>

                {roomTypes.length > 0 ? (
                  <div className="space-y-4">
                    {roomTypes.map((room, index) => (
                      <div
                        key={room.id ?? index}
                        className="soft-panel p-5 transition hover:-translate-y-[1px]"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 space-y-4">
                            <div className="flex flex-wrap items-center gap-3">
                              <h3 className="text-lg font-bold text-[var(--text)]">
                                {room.name || room.room_type || "N/A"}
                              </h3>

                              <span className="status-badge status-warning">
                                {formatBookingMode(room.booking_mode)}
                              </span>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                              <DataItem
                                label="Price"
                                value={formatMoney(
                                  room.price || room.price_per_bed
                                )}
                              />
                              <DataItem
                                label="Capacity"
                                value={room.capacity || "N/A"}
                              />
                              <DataItem
                                label="Available"
                                value={
                                  room.available_rooms ??
                                  room.available_beds ??
                                  "N/A"
                                }
                              />
                              <DataItem
                                label="Total Units"
                                value={
                                  room.total_units ??
                                  room.total_rooms ??
                                  room.total_beds ??
                                  "N/A"
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[20px] border border-dashed border-[var(--border)] bg-[var(--surface-muted)] px-4 py-8 text-center text-sm text-[var(--text-soft)]">
                    No room type information available.
                  </div>
                )}
              </div>
            </div>

            <aside className="panel-card h-fit p-6 md:p-7">
              <h2 className="section-title">Booking Summary</h2>
              <p className="section-subtitle mt-2">
                Review this hostel and continue to checkout when ready.
              </p>

              <div className="mt-6 space-y-4">
                <SummaryRow
                  label="Hostel"
                  value={hostel.name || "Unnamed Hostel"}
                />
                <SummaryRow
                  label="Location"
                  value={
                    hostel.location_area ||
                    hostel.location ||
                    hostel.address ||
                    "Not available"
                  }
                />
                <SummaryRow
                  label="Status"
                  value={hostel.is_active ? "Active" : "Inactive"}
                />
                <SummaryRow
                  label="Room Types"
                  value={roomTypes.length}
                />
              </div>

              <div className="mt-8">
                <Link
                  to={`/hostels/${id}/checkout`}
                  className="btn-primary w-full"
                >
                  Proceed to Checkout
                </Link>
              </div>
            </aside>
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

function SummaryRow({ label, value }) {
  return (
    <div className="rounded-[18px] bg-[var(--surface-muted)] px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-[var(--text)]">{value}</p>
    </div>
  );
}

function normalizeAmenities(amenities) {
  if (!amenities) return [];

  if (Array.isArray(amenities)) {
    return amenities.map((item) => String(item));
  }

  if (typeof amenities === "string") {
    return amenities
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof amenities === "object") {
    return Object.values(amenities).map((item) => String(item));
  }

  return [];
}

function formatBookingMode(value) {
  if (!value) return "Room Option";
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