// src/main.jsx (หรือ src/index.jsx)
import React from "react";
import ReactDOM from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";

import "./index.css";

import SiteLayout from "./layouts/SiteLayout.jsx";
import Home from "./pages/Home.jsx";
import Booking from "./pages/Booking.jsx";
import Success from "./pages/Success.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminRooms from "./pages/AdminRooms.jsx";
import AdminTeacherRequests from "./pages/AdminTeacherRequests.jsx";
import AdminTransactions from "./pages/AdminTransactions.jsx";
import NotFound from "./pages/NotFound.jsx";
import Login from "./pages/Login.jsx";
import UserGuide from "./pages/UserGuide.jsx";
import Profile from "./pages/Profile.jsx";
import ReservationDetail from "./pages/ReservationDetail.jsx";
import AuthProvider from "./auth/AuthProvider.jsx";
import { RequireAdmin, RequireAuth } from "./auth/RouteGuards.jsx";

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
              { path: "/admin-teacher-requests", element: <AdminTeacherRequests /> },
              { path: "/admin-transactions", element: <Navigate to="/admin-transactions/1" replace /> },
              { path: "/admin-transactions/:page", element: <AdminTransactions /> },
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
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>
);
