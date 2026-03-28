import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

export default function HostelsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchHostels = async () => {
      try {
        const response = await api.get("/hostels/");
        console.log("HOSTELS RESPONSE:", response.data);

        const hostelData = Array.isArray(response.data)
          ? response.data
          : response.data.results || [];

        setHostels(hostelData);
      } catch (err) {
        console.log("HOSTELS ERROR:", err);
        console.log("HOSTELS ERROR RESPONSE:", err?.response);
        console.log("HOSTELS ERROR DATA:", err?.response?.data);
        setError("Failed to load hostels.");
      } finally {
        setLoading(false);
      }
    };

    fetchHostels();
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="app-shell">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
          <div className="space-y-6">
            <div className="panel-card p-6 md:p-8">
              <div className="animate-pulse space-y-4">
                <div className="h-4 w-28 rounded-full bg-[var(--surface-muted)]" />
                <div className="h-10 w-72 rounded-full bg-[var(--surface-muted)]" />
                <div className="h-5 w-96 max-w-full rounded-full bg-[var(--surface-muted)]" />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="panel-card h-72 animate-pulse bg-[var(--surface-muted)]"
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
          <header className="panel-card overflow-hidden p-6 md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center rounded-full bg-[var(--surface-muted)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                  Student Portal
                </div>

                <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-[var(--text)] md:text-5xl">
                  Available Hostels
                </h1>

                <p className="mt-4 text-sm leading-7 text-[var(--text-soft)] md:text-base">
                  Welcome
                  {user ? `, ${user.username || user.email || "User"}` : ""}. Browse
                  hostel options, compare locations, and continue to the room
                  details page to make your booking decision.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link to="/my-bookings" className="btn-primary">
                    My Bookings
                  </Link>
                  <button onClick={handleLogout} className="btn-secondary">
                    Logout
                  </button>
                </div>
              </div>

              <div className="grid min-w-full gap-4 sm:grid-cols-2 lg:min-w-[320px] lg:max-w-[360px] lg:grid-cols-1">
                <InfoTile
                  label="Available Listings"
                  value={hostels.length}
                  note="Current hostel records"
                />
                <InfoTile
                  label="Student Access"
                  value="Open"
                  note="You can continue to room selection"
                />
              </div>
            </div>
          </header>

          {hostels.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-12 text-center">
              <p className="text-base font-semibold text-[var(--text)]">
                No hostels found.
              </p>
              <p className="mt-2 text-sm text-[var(--text-soft)]">
                There are currently no hostel listings available to display.
              </p>
            </div>
          ) : (
            <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {hostels.map((hostel) => (
                <article
                  key={hostel.id}
                  className="panel-card group flex h-full flex-col p-5 transition duration-200 hover:-translate-y-[2px] hover:shadow-[var(--shadow-soft)] md:p-6"
                >
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight text-[var(--text)]">
                        {hostel.name || "Unnamed Hostel"}
                      </h2>
                      <p className="mt-2 text-sm text-[var(--text-soft)]">
                        {hostel.location_area || "Location not available"}
                      </p>
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

                  <div className="mb-5 rounded-[20px] bg-[var(--surface-muted)] px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                      Overview
                    </p>
                    <p className="mt-2 text-sm leading-7 text-[var(--text)]">
                      {hostel.description?.trim()
                        ? hostel.description
                        : "Hostel listing available for viewing. Open details to see room options and proceed with booking."}
                    </p>
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-3">
                    <div className="text-sm text-[var(--text-soft)]">
                      {hostel.address || "Address not available"}
                    </div>

                    <Link to={`/hostels/${hostel.id}`} className="btn-primary">
                      View Details
                    </Link>
                  </div>
                </article>
              ))}
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