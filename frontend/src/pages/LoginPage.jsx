import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const user = await login(form);

      const role =
        user?.role ||
        user?.user_type ||
        user?.account_type ||
        "";

      if (String(role).toUpperCase() === "CARETAKER") {
        navigate("/caretaker/bookings");
      } else if (String(role).toUpperCase() === "ADMIN") {
        navigate("/admin");
      } else {
        navigate("/hostels");
      }
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          "Login failed. Check your credentials."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-shell">
      <section className="auth-hero">
        <div className="auth-hero-panel">
          <div>
            <div className="inline-flex items-center rounded-full border border-[var(--border)] bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
              CJAY HOSTEL
            </div>

            <h1 className="mt-8 text-4xl font-extrabold leading-tight tracking-tight text-[var(--text)]">
              Smarter hostel booking, cleaner accommodation management.
            </h1>

            <p className="mt-5 max-w-xl text-base leading-8 text-[var(--text-soft)]">
              Sign in to access bookings, room availability, payment status,
              and accommodation operations in one organized system.
            </p>
          </div>

          <div className="grid gap-4">
            <FeatureItem
              title="Fast booking access"
              text="Students can move quickly from hostel selection to reservation."
            />
            <FeatureItem
              title="Operational visibility"
              text="Caretakers and administrators can monitor bookings and occupancy clearly."
            />
            <FeatureItem
              title="Payment tracking"
              text="Follow transaction status and reservation progress from one place."
            />
          </div>
        </div>
      </section>

      <section className="auth-form-side">
        <div className="auth-form-card">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
              Welcome back
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[var(--text)]">
              Login
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
              Enter your credentials to continue to your dashboard.
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="input-label">Username</label>
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                className="input-field"
                placeholder="Enter username"
                required
              />
            </div>

            <div>
              <label className="input-label">Password</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                className="input-field"
                placeholder="Enter password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full"
            >
              {submitting ? "Logging in..." : "Login"}
            </button>
          </form>

          <div className="mt-6 rounded-[20px] bg-[var(--surface-muted)] px-4 py-4 text-sm text-[var(--text-soft)]">
            Don’t have an account?{" "}
            <Link
              to="/register"
              className="font-semibold text-[var(--text)] underline underline-offset-4"
            >
              Register
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