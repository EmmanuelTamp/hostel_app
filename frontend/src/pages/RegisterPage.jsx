import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    username: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
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
    setSuccess("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      await register({
        username: form.username,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });

      setSuccess("Registration successful. You can now log in.");
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      console.log("REGISTER ERROR:", err);
      console.log("REGISTER ERROR RESPONSE:", err?.response);
      console.log("REGISTER ERROR DATA:", err?.response?.data);

      const data = err?.response?.data;

      if (!err.response) {
        setError(
          "Cannot reach backend. Check that Django server is running and CORS is configured."
        );
      } else if (typeof data === "string") {
        setError(data);
      } else if (data?.detail) {
        setError(data.detail);
      } else if (typeof data === "object" && data !== null) {
        const messages = Object.entries(data)
          .map(([key, value]) => {
            if (Array.isArray(value)) return `${key}: ${value.join(", ")}`;
            return `${key}: ${value}`;
          })
          .join(" | ");

        setError(messages || "Registration failed.");
      } else {
        setError("Registration failed.");
      }
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
              Student Registration
            </div>

            <h1 className="mt-8 text-4xl font-extrabold leading-tight tracking-tight text-[var(--text)]">
              Create your account and start booking with confidence.
            </h1>

            <p className="mt-5 max-w-xl text-base leading-8 text-[var(--text-soft)]">
              Register once to browse hostels, compare room options, complete
              reservations, and manage your bookings from one place.
            </p>
          </div>

          <div className="grid gap-4">
            <FeatureItem
              title="Explore available hostels"
              text="Browse accommodation options and compare room categories clearly."
            />
            <FeatureItem
              title="Secure your booking"
              text="Move from registration to reservation and payment in one smooth flow."
            />
            <FeatureItem
              title="Track your bookings"
              text="Manage reservation progress, payment status, and accommodation details easily."
            />
          </div>
        </div>
      </section>

      <section className="auth-form-side">
        <div className="auth-form-card">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
              Get started
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[var(--text)]">
              Register
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
              Create a student account to start using the hostel platform.
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-5 rounded-[18px] border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {success}
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
              <label className="input-label">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
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
                value={form.phone}
                onChange={handleChange}
                className="input-field"
                placeholder="Enter phone number"
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

            <div>
              <label className="input-label">Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                className="input-field"
                placeholder="Confirm password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full"
            >
              {submitting ? "Registering..." : "Register"}
            </button>
          </form>

          <div className="mt-6 rounded-[20px] bg-[var(--surface-muted)] px-4 py-4 text-sm text-[var(--text-soft)]">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-[var(--text)] underline underline-offset-4"
            >
              Login
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