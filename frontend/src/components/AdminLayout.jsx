import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { label: "Dashboard", to: "/admin" },
  { label: "Hostels", to: "/admin/hostels" },
  { label: "Room Types", to: "/admin/room-types" },
  { label: "Caretakers", to: "/admin/caretakers" },
  { label: "Bookings", to: "/admin/bookings" },
  { label: "Payments", to: "/admin/payments" },
];

const pageMeta = {
  "/admin": {
    title: "Dashboard",
    subtitle: "Track platform activity, bookings, payments, and occupancy at a glance.",
  },
  "/admin/hostels": {
    title: "Hostels",
    subtitle: "Manage hostel listings, availability, and core property information.",
  },
  "/admin/room-types": {
    title: "Room Types",
    subtitle: "Organize room categories, pricing, capacity, and related options.",
  },
  "/admin/caretakers": {
    title: "Caretakers",
    subtitle: "Manage caretaker accounts and operational assignments.",
  },
  "/admin/bookings": {
    title: "Bookings",
    subtitle: "Review reservations, payment state, and booking progress.",
  },
  "/admin/payments": {
    title: "Payments",
    subtitle: "Monitor completed, pending, and failed payment records.",
  },
};

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const currentPage = pageMeta[location.pathname] || {
    title: "Admin Panel",
    subtitle: "Manage the hostel platform from one place.",
  };

  const linkClasses = ({ isActive }) =>
    `sidebar-link ${isActive ? "active" : ""}`;

  return (
    <div className="dashboard-layout">
      <aside className="sidebar-shell dashboard-sidebar hidden lg:flex lg:flex-col">
        <div className="flex h-full flex-col px-5 py-6 xl:px-6">
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-lg font-extrabold text-white shadow-sm">
                HA
              </div>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-white">
                  Hostel Admin
                </h1>
                <p className="mt-1 text-sm text-white/65">
                  Management Console
                </p>
              </div>
            </div>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/admin"}
                className={linkClasses}
              >
                <span className="h-2.5 w-2.5 rounded-full bg-current opacity-80" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="mt-8 rounded-[24px] border border-white/10 bg-white/5 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
              Signed in
            </p>
            <div className="mt-3">
              <p className="text-base font-bold text-white">
                {user?.full_name || user?.username || "Admin"}
              </p>
              <p className="mt-1 break-words text-sm text-white/65">
                {user?.email || "admin@hostelapp.com"}
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="mt-5 w-full rounded-full border border-white/12 bg-white/8 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/14"
            >
              Logout
            </button>
          </div>

          <div className="mt-auto pt-6">
            <div className="rounded-[24px] border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-4">
              <p className="text-sm font-semibold text-white">Hostel App</p>
              <p className="mt-1 text-sm leading-6 text-white/65">
                Clean operations, clearer booking oversight, and better control.
              </p>
            </div>
          </div>
        </div>
      </aside>

      <div className="dashboard-main">
        <div className="content-stack">
          <header className="panel-card px-5 py-5 md:px-7 md:py-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                  Admin Panel
                </p>
                <h2 className="page-title">{currentPage.title}</h2>
                <p className="mt-2 max-w-2xl text-sm text-[var(--text-soft)] md:text-base">
                  {currentPage.subtitle}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="hidden min-w-[260px] items-center gap-3 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 md:flex">
                  <span className="text-sm text-[var(--text-soft)]">Search</span>
                  <input
                    type="text"
                    placeholder="Search records..."
                    className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-soft)]"
                  />
                </div>

                <button
                  onClick={handleLogout}
                  className="btn-secondary lg:hidden"
                >
                  Logout
                </button>
              </div>
            </div>

            <div className="mt-5 flex gap-2 overflow-x-auto lg:hidden">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/admin"}
                  className={({ isActive }) =>
                    `whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                      isActive
                        ? "bg-[var(--accent)] text-black"
                        : "border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </header>

          <main>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}