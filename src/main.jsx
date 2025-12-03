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
import NotFound from "./pages/NotFound.jsx";
import Login from "./pages/Login.jsx";
import UserGuide from "./pages/UserGuide.jsx";
import Profile from "./pages/Profile.jsx";

/* ---------- Auth helpers ---------- */
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
