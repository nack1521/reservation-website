import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";

import SiteLayout from "./layouts/SiteLayout.jsx";
import Home from "./pages/Home.jsx";
import Booking from "./pages/Booking.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminRooms from "./pages/AdminRooms.jsx";
import Success from "./pages/Success.jsx";
import Login from "./pages/Login.jsx";
import NotFound from "./pages/NotFound.jsx";
import UserGuide from "./pages/UserGuide.jsx"; 
import Profile from "./pages/Profile.jsx";

/* ---------- auth helpers ---------- */
function isAuthed() {
  return localStorage.getItem("auth") === "true";
}
function RequireAuth() {
  const location = useLocation();
  if (!isAuthed()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}

export default function App() {
  return (
    <div className="min-h-screen h-full">
      <Routes>
        {/* public */}
        <Route path="/login" element={<Login />} />

        {/* protected */}
        <Route element={<RequireAuth />}>
          <Route element={<SiteLayout />}>
            <Route index element={<Home />} />
            <Route path="/" element={<Home />} />
            <Route path="/book" element={<Booking />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/admin-rooms" element={<AdminRooms />} />
            <Route path="/success" element={<Success />} />
            <Route path="/user-guide" element={<UserGuide />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Route>

        {/* fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

