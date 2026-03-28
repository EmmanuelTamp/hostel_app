import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

export default function CaretakerBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCaretakerBookings = async () => {
      try {
        const response = await api.get("/caretaker/bookings/");
        console.log("CARETAKER BOOKINGS RESPONSE:", response.data);

        if (Array.isArray(response.data)) {
          setBookings(response.data);
        } else if (Array.isArray(response.data?.results)) {
          setBookings(response.data.results);
        } else {
          setBookings([]);
        }
      } catch (err) {
        console.log("CARETAKER BOOKINGS ERROR:", err);
        console.log("CARETAKER BOOKINGS ERROR RESPONSE:", err?.response);
        console.log("CARETAKER BOOKINGS ERROR DATA:", err?.response?.data);

        setError(
          err?.response?.data?.detail ||
            "Failed to load caretaker bookings."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCaretakerBookings();
  }, []);

  const formatPrice = (value) => {
    const amount = Number(value);
    if (Number.isNaN(amount)) return value || "N/A";

    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
    }).format(amount);
  };

  const formatDate = (value) => {
    if (!value) return "N/A";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString();
  };

  if (loading) {
    return <div className="p-6">Loading caretaker bookings...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link to="/caretaker/login" className="inline-block mb-6 underline">
          ← Back to Caretaker Login
        </Link>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <h1 className="text-3xl font-bold mb-3">Caretaker Bookings</h1>
          <p className="text-gray-600 mb-6">
            View all bookings for hostels assigned to you.
          </p>

          {bookings.length > 0 ? (
            <div className="space-y-4">
              {bookings.map((booking, index) => (
                <div
                  key={booking.id ?? index}
                  className="border rounded-xl p-5"
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    <p>
                      <strong>Booking ID:</strong> {booking.id || "N/A"}
                    </p>
                    <p>
                      <strong>Status:</strong> {booking.status || "N/A"}
                    </p>
                    <p>
                      <strong>Hostel:</strong> {booking.hostel_name || "N/A"}
                    </p>
                    <p>
                      <strong>Room Type:</strong>{" "}
                      {booking.room_type_name || "N/A"}
                    </p>
                    <p>
                      <strong>Amount:</strong>{" "}
                      {formatPrice(booking.amount)}
                    </p>
                    <p>
                      <strong>Created At:</strong>{" "}
                      {formatDate(booking.created_at)}
                    </p>
                    <p>
                      <strong>Student Name:</strong>{" "}
                      {booking.student_name || "N/A"}
                    </p>
                    <p>
                      <strong>Student Email:</strong>{" "}
                      {booking.student_email || "N/A"}
                    </p>
                    <p>
                      <strong>Student Phone:</strong>{" "}
                      {booking.student_phone || "N/A"}
                    </p>
                    <p>
                      <strong>Access Code Status:</strong>{" "}
                      {booking.access_code_status || "N/A"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="border rounded-xl p-6 bg-gray-50">
              <p className="text-gray-600">
                No caretaker bookings found yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
