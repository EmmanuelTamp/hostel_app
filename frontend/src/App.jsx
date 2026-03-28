import "./App.css";
import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import HostelsPage from "./pages/HostelsPage";
import HostelDetailPage from "./pages/HostelDetailPage";
import CheckoutPage from "./pages/CheckoutPage";
import MyBookingsPage from "./pages/MyBookingsPage";
import CaretakerLoginPage from "./pages/CaretakerLoginPage";
import CaretakerBookingsPage from "./pages/CaretakerBookingsPage";
import VerifyCodePage from "./pages/VerifyCodePage";
import CheckInPage from "./pages/CheckInPage";
import PaymentSuccessPage from "./pages/PaymentSuccessPage";

import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./components/AdminLayout";

import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminHostelsPage from "./pages/AdminHostelsPage";
import AdminRoomTypesPage from "./pages/AdminRoomTypesPage";
import AdminCaretakersPage from "./pages/AdminCaretakersPage";
import AdminBookingsPage from "./pages/AdminBookingsPage";
import AdminPaymentsPage from "./pages/AdminPaymentsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/hostels" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/caretaker/login" element={<CaretakerLoginPage />} />

      <Route
        path="/hostels"
        element={
          <ProtectedRoute allowedRoles={["STUDENT", "ADMIN"]}>
            <HostelsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/hostels/:id"
        element={
          <ProtectedRoute allowedRoles={["STUDENT", "ADMIN"]}>
            <HostelDetailPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/payment/success"
        element={
          <ProtectedRoute allowedRoles={["STUDENT", "ADMIN"]}>
            <PaymentSuccessPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/hostels/:id/checkout"
        element={
          <ProtectedRoute allowedRoles={["STUDENT", "ADMIN"]}>
            <CheckoutPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/my-bookings"
        element={
          <ProtectedRoute allowedRoles={["STUDENT", "ADMIN"]}>
            <MyBookingsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/caretaker/bookings"
        element={
          <ProtectedRoute allowedRoles={["CARETAKER"]}>
            <CaretakerBookingsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/caretaker/verify-code"
        element={
          <ProtectedRoute allowedRoles={["CARETAKER"]}>
            <VerifyCodePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/caretaker/check-in"
        element={
          <ProtectedRoute allowedRoles={["CARETAKER"]}>
            <CheckInPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route path="hostels" element={<AdminHostelsPage />} />
        <Route path="room-types" element={<AdminRoomTypesPage />} />
        <Route path="caretakers" element={<AdminCaretakersPage />} />
        <Route path="bookings" element={<AdminBookingsPage />} />
        <Route path="payments" element={<AdminPaymentsPage />} />
      </Route>

      <Route
        path="*"
        element={<h1 className="p-6 text-xl">404 - Page Not Found</h1>}
      />
    </Routes>
  );
}