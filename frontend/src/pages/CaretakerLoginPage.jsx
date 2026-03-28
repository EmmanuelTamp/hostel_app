import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function CaretakerLoginPage() {
  const navigate = useNavigate();
  const { login, logout } = useAuth();

  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      setLoading(true);

      const user = await login({
        username: formData.username,
        password: formData.password,
      });

      const role = user?.role || "";

      if (String(role).toUpperCase() !== "CARETAKER") {
        logout();
        setError("This login page is only for caretakers.");
        return;
      }

      navigate("/caretaker/bookings");
    } catch (err) {
      setError(
        err?.response?.data?.detail || "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <section className="auth-hero">
        <div className="auth-hero-panel">
          <div>
            <div className="inline-flex items-center rounded-full border border-[var(--border)] bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
              Caretaker Access
            </div>

            <h1 className="mt-8 text-4xl font-extrabold leading-tight tracking-tight text-[var(--text)]">
              Manage check-ins, booking verification, and day-to-day hostel operations.
            </h1>

            <p className="mt-5 max-w-xl text-base leading-8 text-[var(--text-soft)]">
              Sign in to review assigned bookings, verify student codes, and
              complete check-in tasks from one focused workspace.
            </p>
          </div>

          <div className="grid gap-4">
            <FeatureItem
              title="Booking oversight"
              text="See assigned student reservations and monitor booking progress clearly."
            />
            <FeatureItem
              title="Code verification"
              text="Validate student booking codes quickly before approving check-in."
            />
            <FeatureItem
              title="Operational workflow"
              text="Handle front-desk accommodation tasks in a simpler task-driven interface."
            />
          </div>
        </div>
      </section>

      <section className="auth-form-side">
        <div className="auth-form-card">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
              Role login
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[var(--text)]">
              Caretaker Login
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
              Sign in to manage bookings, verify codes, and check students in.
            </p>
          </div>

          {error ? (
            <div className="mb-5 rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="input-label">Username</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="input-field"
                placeholder="Enter your username"
                required
              />
            </div>

            <div>
              <label className="input-label">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="input-field"
                placeholder="Enter your password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? "Signing in..." : "Login as Caretaker"}
            </button>
          </form>

          <div className="mt-6 rounded-[20px] bg-[var(--surface-muted)] px-4 py-4 text-sm text-[var(--text-soft)]">
            Need the general user portal instead?{" "}
            <Link
              to="/login"
              className="font-semibold text-[var(--text)] underline underline-offset-4"
            >
              Back to Main Login
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureItem({ title, text }) {
  return (
    <div className="rounded-[22px] border border-[var(--border)] bg-white/65 px-5 py-4">
      <h3 className="text-base font-bold text-[var(--text)]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">{text}</p>
    </div>
  );
}