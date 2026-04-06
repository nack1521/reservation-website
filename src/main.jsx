// src/main.jsx (หรือ src/index.jsx)
import React from "react";
import ReactDOM from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

import "./index.css";

import SiteLayout from "./layouts/SiteLayout.jsx";
import Home from "./pages/Home.jsx";
import Booking from "./pages/Booking.jsx";
import Success from "./pages/Success.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminRooms from "./pages/AdminRooms.jsx";
import NotFound from "./pages/NotFound.jsx";
import Login from "./pages/Login.jsx";
import UserGuide from "./pages/UserGuide.jsx";
import Profile from "./pages/Profile.jsx";
import ReservationDetail from "./pages/ReservationDetail.jsx";

/* ---------- Auth helpers ---------- */
function isAuthed() {
  return localStorage.getItem("auth") === "true";
}

function readRoles() {
  try {
    const raw = localStorage.getItem("authRoles");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const items = parsed
          .map((r) => String(r || "").toLowerCase().trim())
          .filter(Boolean);
        if (items.length) return items;
      }
    }
  } catch {
    // ignore malformed authRoles value
  }

  const single = String(localStorage.getItem("authRole") || "student").toLowerCase();
  return single ? [single] : ["student"];
}

function isAdminLike() {
  const roles = readRoles();
  return roles.includes("admin") || roles.includes("super_admin");
}

function RequireAuth() {
  const location = useLocation();
  if (!isAuthed()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}

function RequireAdmin() {
  const location = useLocation();
  if (!isAdminLike()) {
    return <Navigate to="/dashboard" replace state={{ from: location }} />;
  }
  return <Outlet />;
}

/* ---------- Router ---------- */
const router = createBrowserRouter([
  // public
  { path: "/login", element: <Login /> },

  // protected
  {
    element: <RequireAuth />,
    children: [
      {
        element: <SiteLayout />, // <<< Navbar อยู่ในนี้
        children: [
          { index: true, element: <Home /> },
          { path: "/book", element: <Booking /> },
          { path: "/success", element: <Success /> },
          { path: "/dashboard", element: <Dashboard /> },
          { path: "/dashboard/reservation/:id", element: <ReservationDetail /> },
          {
            element: <RequireAdmin />,
            children: [
              { path: "/admin-dashboard", element: <AdminDashboard /> },
              { path: "/admin-rooms", element: <AdminRooms /> },
            ],
          },
          { path: "/user-guide", element: <UserGuide /> },
          { path: "/profile", element: <Profile /> },
        ],
      },
    ],
  },

  // 404
  { path: "*", element: <NotFound /> },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
