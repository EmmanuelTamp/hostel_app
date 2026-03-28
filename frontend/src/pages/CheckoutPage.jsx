import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/axios";

export default function CheckoutPage() {
  const { id } = useParams();

  const [hostel, setHostel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [reservation, setReservation] = useState(null);

  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  useEffect(() => {
    const fetchHostel = async () => {
      try {
        const response = await api.get(`/hostels/${id}/`);
        console.log("CHECKOUT HOSTEL DETAIL RESPONSE:", response.data);
        setHostel(response.data);
      } catch (err) {
        console.log("CHECKOUT HOSTEL DETAIL ERROR:", err);
        console.log("CHECKOUT HOSTEL DETAIL ERROR RESPONSE:", err?.response);
        console.log("CHECKOUT HOSTEL DETAIL ERROR DATA:", err?.response?.data);

        setError(
          err?.response?.data?.detail || "Failed to load hostel details."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchHostel();
  }, [id]);

  const roomTypes = useMemo(() => {
    if (!hostel) return [];

    const rawRoomTypes = Array.isArray(hostel.room_types)
      ? hostel.room_types
      : Array.isArray(hostel.roomTypes)
      ? hostel.roomTypes
      : [];

    return rawRoomTypes.filter((room) => {
      const available =
        room.available_rooms ?? room.available_beds ?? room.available ?? 0;
      return Number(available) > 0;
    });
  }, [hostel]);

  const selectedRoom = useMemo(() => {
    return (
      roomTypes.find((room) => String(room.id) === String(selectedRoomTypeId)) ||
      null
    );
  }, [roomTypes, selectedRoomTypeId]);

  const formatPrice = (value) => {
    const amount = Number(value);
    if (Number.isNaN(amount)) return value || "N/A";

    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
    }).format(amount);
  };

  const handleReserve = async (e) => {
    e.preventDefault();

    if (!selectedRoomTypeId) {
      setCheckoutError("Please select a room type.");
      return;
    }

    try {
      setCheckoutLoading(true);
      setCheckoutError("");
      setPaymentError("");
      setReservation(null);

      const response = await api.post("/bookings/checkout/", {
        room_type_id: Number(selectedRoomTypeId),
      });

      console.log("CHECKOUT RESPONSE:", response.data);

      if (response.data?.reservation) {
        setReservation(response.data.reservation);
      } else {
        setReservation(response.data);
      }
    } catch (err) {
      console.log("CHECKOUT ERROR:", err);
      console.log("CHECKOUT ERROR RESPONSE:", err?.response);
      console.log("CHECKOUT ERROR DATA:", err?.response?.data);

      setCheckoutError(
        err?.response?.data?.detail || "Failed to create reservation."
      );
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleContinueToPayment = async () => {
    if (!reservation?.id) {
      setPaymentError("Reservation not found.");
      return;
    }

    try {
      setPaymentLoading(true);
      setPaymentError("");

      sessionStorage.setItem("pending_reservation_id", String(reservation.id));

      const payload = {
        reservation_id: reservation.id,
      };

      const response = await api.post("/payments/paystack/init/", payload);

      console.log("PAYMENT INIT RESPONSE:", response.data);

      const authorizationUrl =
        response.data?.authorization_url ||
        response.data?.data?.authorization_url;

      if (!authorizationUrl) {
        setPaymentError("Payment link was not returned by the server.");
        return;
      }

      window.location.href = authorizationUrl;
    } catch (err) {
      console.log("PAYMENT INIT ERROR:", err);
      console.log("PAYMENT INIT ERROR RESPONSE:", err?.response);
      console.log("PAYMENT INIT ERROR DATA:", err?.response?.data);

      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.callback_url?.[0] ||
        err?.response?.data?.callback_url ||
        "Failed to initiate payment.";

      setPaymentError(message);
    } finally {
      setPaymentLoading(false);
    }
  };

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
              <div className="panel-card h-[520px] animate-pulse bg-[var(--surface-muted)]" />
              <div className="panel-card h-[520px] animate-pulse bg-[var(--surface-muted)]" />
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

  return (
    <div className="app-shell">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
        <div className="space-y-8">
          <div>
            <Link
              to={`/hostels/${id}`}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-muted)]"
            >
              ← Back to Hostel Details
            </Link>
          </div>

          <section className="panel-card overflow-hidden p-6 md:p-8">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center rounded-full bg-[var(--surface-muted)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                  Checkout
                </div>

                <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-[var(--text)] md:text-5xl">
                  Reserve Your Space
                </h1>

                <p className="mt-4 text-sm leading-7 text-[var(--text-soft)] md:text-base">
                  {hostel.name || "Unnamed Hostel"} •{" "}
                  {hostel.location_area ||
                    hostel.location ||
                    hostel.address ||
                    "Location not available"}
                </p>

                <p className="mt-5 max-w-3xl text-sm leading-8 text-[var(--text)] md:text-base">
                  Select an available room option, create your reservation, and
                  continue to payment when you are ready.
                </p>
              </div>

              <div className="grid min-w-full gap-4 sm:grid-cols-2 xl:min-w-[360px] xl:grid-cols-1">
                <InfoTile
                  label="Available Options"
                  value={roomTypes.length}
                  note="Room types currently open for reservation"
                />
                <InfoTile
                  label="Booking Flow"
                  value="2 Steps"
                  note="Reserve first, then continue to payment"
                />
              </div>
            </div>
          </section>

          <section className="split-panel">
            <div className="panel-card p-6 md:p-7">
              <div className="mb-5">
                <h2 className="section-title">Select a Room Type</h2>
                <p className="section-subtitle mt-2">
                  Choose one available option to create your reservation.
                </p>
              </div>

              {roomTypes.length > 0 ? (
                <form onSubmit={handleReserve} className="space-y-5">
                  <div className="space-y-4">
                    {roomTypes.map((room, index) => {
                      const available =
                        room.available_rooms ??
                        room.available_beds ??
                        room.available ??
                        "N/A";

                      const isSelected =
                        String(selectedRoomTypeId) === String(room.id);

                      return (
                        <label
                          key={room.id ?? index}
                          className={`block cursor-pointer rounded-[22px] border p-5 transition ${
                            isSelected
                              ? "border-[var(--accent)] bg-[rgba(196,154,50,0.08)]"
                              : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-muted)]"
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <input
                              type="radio"
                              name="room_type"
                              value={room.id}
                              checked={isSelected}
                              onChange={(e) =>
                                setSelectedRoomTypeId(e.target.value)
                              }
                              className="mt-1 h-4 w-4"
                            />

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-3">
                                <h3 className="text-lg font-bold text-[var(--text)]">
                                  {room.name || room.room_type || "N/A"}
                                </h3>
                                <span className="status-badge status-warning">
                                  {formatBookingMode(room.booking_mode)}
                                </span>
                              </div>

                              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                <DataItem
                                  label="Price"
                                  value={formatPrice(
                                    room.price || room.price_per_bed
                                  )}
                                />
                                <DataItem
                                  label="Capacity"
                                  value={room.capacity || "N/A"}
                                />
                                <DataItem
                                  label="Available"
                                  value={available}
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
                        </label>
                      );
                    })}
                  </div>

                  {checkoutError && (
                    <div className="rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {checkoutError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={checkoutLoading}
                    className="btn-primary"
                  >
                    {checkoutLoading ? "Creating Reservation..." : "Reserve Now"}
                  </button>
                </form>
              ) : (
                <div className="rounded-[20px] border border-dashed border-[var(--border)] bg-[var(--surface-muted)] px-4 py-10 text-center text-sm text-[var(--text-soft)]">
                  No available room types for reservation.
                </div>
              )}
            </div>

            <aside className="space-y-6">
              <div className="panel-card p-6 md:p-7">
                <h2 className="section-title">Reservation Summary</h2>
                <p className="section-subtitle mt-2">
                  Your selected booking details will appear here.
                </p>

                <div className="mt-6 space-y-4">
                  <SummaryRow
                    label="Hostel"
                    value={hostel.name || "N/A"}
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
                    label="Room Type"
                    value={
                      selectedRoom
                        ? selectedRoom.name || selectedRoom.room_type || "N/A"
                        : "Not selected"
                    }
                  />
                  <SummaryRow
                    label="Amount"
                    value={
                      selectedRoom
                        ? formatPrice(
                            selectedRoom.price || selectedRoom.price_per_bed
                          )
                        : "N/A"
                    }
                  />
                </div>
              </div>

              {reservation && (
                <div className="rounded-[24px] border border-green-200 bg-green-50 p-6">
                  <h2 className="text-xl font-bold text-green-800">
                    Reservation Created Successfully
                  </h2>

                  <div className="mt-4 space-y-3">
                    <SummaryRow
                      label="Reservation ID"
                      value={reservation.id}
                    />
                    <SummaryRow
                      label="Status"
                      value={reservation.status || "Pending"}
                    />
                    <SummaryRow
                      label="Amount"
                      value={formatPrice(reservation.amount)}
                    />
                  </div>

                  {paymentError && (
                    <div className="mt-4 rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {paymentError}
                    </div>
                  )}

                  <button
                    onClick={handleContinueToPayment}
                    disabled={paymentLoading}
                    className="btn-primary mt-6 w-full"
                  >
                    {paymentLoading ? "Redirecting..." : "Continue to Payment"}
                  </button>
                </div>
              )}
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
      <p className="mt-2 text-sm font-semibold text-[var(--text)] break-words">
        {value}
      </p>
    </div>
  );
}

function formatBookingMode(value) {
  if (!value) return "Room Option";
  return String(value).toUpperCase() === "WHOLE_ROOM" ? "Whole Room" : "Per Bed";
}