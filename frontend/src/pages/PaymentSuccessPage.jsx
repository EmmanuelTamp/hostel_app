import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/axios";

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState("checking");
  const [message, setMessage] = useState(
    "We are verifying your payment and checking for your booking."
  );
  const [booking, setBooking] = useState(null);

  const reference = searchParams.get("reference") || searchParams.get("trxref");
  const pendingReservationId = sessionStorage.getItem("pending_reservation_id");

  const normalizedReference = useMemo(() => {
    return reference ? String(reference).trim() : "";
  }, [reference]);

  useEffect(() => {
    let cancelled = false;

    async function verifyAndLoadBooking() {
      try {
        setStatus("checking");
        setMessage("We are verifying your payment and checking for your booking.");

        if (normalizedReference) {
          try {
            await api.post("/payments/paystack/verify/", {
              reference: normalizedReference,
            });
          } catch (verifyError) {
            console.log("MANUAL VERIFY ERROR:", verifyError);
            console.log("MANUAL VERIFY ERROR RESPONSE:", verifyError?.response);
            console.log("MANUAL VERIFY ERROR DATA:", verifyError?.response?.data);
          }
        }

        const response = await api.get("/students/my-bookings/");
        const bookings = Array.isArray(response.data)
          ? response.data
          : response.data?.results || [];

        let matchedBooking = null;

        if (pendingReservationId) {
          matchedBooking = bookings.find((item) => {
            const reservationId =
              item?.reservation_id || item?.reservation?.id || null;

            return Number(reservationId) === Number(pendingReservationId);
          });
        }

        if (!matchedBooking && bookings.length > 0) {
          matchedBooking = bookings[0];
        }

        if (!cancelled && matchedBooking) {
          setBooking(matchedBooking);
          setStatus("confirmed");
          setMessage("Your payment has been verified and your booking is confirmed.");
          sessionStorage.removeItem("pending_reservation_id");
          return;
        }

        if (!cancelled) {
          setStatus("pending");
          setMessage(
            "Your payment redirect was received, but the booking is not visible yet. Please wait a moment and check My Bookings."
          );
        }
      } catch (error) {
        console.log("PAYMENT SUCCESS PAGE ERROR:", error);
        console.log("PAYMENT SUCCESS PAGE ERROR RESPONSE:", error?.response);
        console.log("PAYMENT SUCCESS PAGE ERROR DATA:", error?.response?.data);

        if (!cancelled) {
          setStatus("pending");
          setMessage(
            "We could not confirm the booking from this page yet. Please check My Bookings shortly."
          );
        }
      }
    }

    verifyAndLoadBooking();

    return () => {
      cancelled = true;
    };
  }, [normalizedReference, pendingReservationId]);

  useEffect(() => {
    if (status !== "confirmed") return;

    const timer = setTimeout(() => {
      navigate("/my-bookings");
    }, 1500);

    return () => clearTimeout(timer);
  }, [status, navigate]);

  return (
    <div className="app-shell">
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6 lg:px-8">
        <div className="space-y-8">
          <section className="panel-card overflow-hidden p-6 md:p-8">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center rounded-full bg-[var(--surface-muted)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                  Payment Update
                </div>

                <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-[var(--text)] md:text-5xl">
                  Payment Status
                </h1>

                <p className="mt-4 text-sm leading-7 text-[var(--text-soft)] md:text-base">
                  We are checking your payment result and matching it to your
                  booking so you can continue confidently.
                </p>
              </div>

              <div className="grid min-w-full gap-4 sm:grid-cols-2 xl:min-w-[360px] xl:grid-cols-1">
                <InfoTile
                  label="Reference"
                  value={normalizedReference || "Unavailable"}
                  note="Payment callback reference"
                  breakValue
                />
                <InfoTile
                  label="Current State"
                  value={statusLabel(status)}
                  note="Live verification result"
                />
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_360px]">
            <div className="space-y-6">
              <div className="panel-card p-6 md:p-7">
                <h2 className="section-title">Verification Result</h2>
                <p className="section-subtitle mt-2">
                  This section reflects the current payment and booking confirmation state.
                </p>

                <div className="mt-5">
                  {status === "checking" && (
                    <StatusPanel
                      title="Checking payment..."
                      message={message}
                      tone="info"
                    />
                  )}

                  {status === "confirmed" && (
                    <StatusPanel
                      title="Booking confirmed"
                      message={message}
                      tone="success"
                    />
                  )}

                  {status === "pending" && (
                    <StatusPanel
                      title="Still processing"
                      message={message}
                      tone="warning"
                    />
                  )}
                </div>

                <div className="mt-6 rounded-[20px] bg-[var(--surface-muted)] px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                    Reference
                  </p>
                  <p className="mt-2 break-all text-sm font-semibold text-[var(--text)]">
                    {normalizedReference || "No reference found in callback URL"}
                  </p>
                </div>
              </div>

              {booking && (
                <div className="panel-card p-6 md:p-7">
                  <h2 className="section-title">Booking Details</h2>
                  <p className="section-subtitle mt-2">
                    The booking matched from your payment flow is shown below.
                  </p>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <SummaryRow label="Booking ID" value={booking.id ?? "N/A"} />
                    <SummaryRow
                      label="Status"
                      value={formatStatus(booking.status ?? "N/A")}
                    />
                    <SummaryRow
                      label="Hostel"
                      value={booking.hostel_name || booking.hostel?.name || "N/A"}
                    />
                    <SummaryRow
                      label="Room Type"
                      value={
                        booking.room_type_name ||
                        booking.room_type?.type_name ||
                        booking.room_type?.name ||
                        "N/A"
                      }
                    />
                  </div>
                </div>
              )}
            </div>

            <aside className="panel-card h-fit p-6 md:p-7">
              <h2 className="section-title">Next Step</h2>
              <p className="section-subtitle mt-2">
                Continue to your booking history or return to hostel listings.
              </p>

              <div className="mt-6 space-y-4">
                <button
                  onClick={() => navigate("/my-bookings")}
                  className="btn-primary w-full"
                >
                  Go to My Bookings
                </button>

                <Link to="/hostels" className="btn-secondary w-full">
                  Back to Hostels
                </Link>
              </div>

              <div className="mt-6 rounded-[20px] bg-[var(--surface-muted)] px-4 py-4 text-sm leading-7 text-[var(--text-soft)]">
                The booking becomes final only after backend payment verification completes.
              </div>
            </aside>
          </section>
        </div>
      </div>
    </div>
  );
}

function InfoTile({ label, value, note, breakValue = false }) {
  return (
    <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] px-5 py-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
        {label}
      </p>
      <p
        className={`mt-3 text-2xl font-extrabold tracking-tight text-[var(--text)] ${
          breakValue ? "break-all text-base md:text-lg" : ""
        }`}
      >
        {value}
      </p>
      <p className="mt-2 text-sm text-[var(--text-soft)]">{note}</p>
    </div>
  );
}

function StatusPanel({ title, message, tone }) {
  const classes =
    tone === "success"
      ? "border-green-200 bg-green-50 text-green-800"
      : tone === "warning"
      ? "border-yellow-200 bg-yellow-50 text-yellow-800"
      : "border-blue-200 bg-blue-50 text-blue-800";

  return (
    <div className={`rounded-[20px] border px-4 py-4 ${classes}`}>
      <p className="font-semibold">{title}</p>
      <p className="mt-2 text-sm leading-7">{message}</p>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="rounded-[18px] bg-[var(--surface-muted)] px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-semibold text-[var(--text)]">
        {value}
      </p>
    </div>
  );
}

function statusLabel(status) {
  if (status === "checking") return "Checking";
  if (status === "confirmed") return "Confirmed";
  if (status === "pending") return "Pending";
  return "Unknown";
}

function formatStatus(value) {
  if (!value) return "Unknown";

  return String(value)
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}