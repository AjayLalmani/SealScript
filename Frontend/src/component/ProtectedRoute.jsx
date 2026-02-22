import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");

  // If there's no token, redirect to the login page immediately.
  if (!token) {
    return <Navigate to="/" replace />;
  }

  // Otherwise, render the requested page.
  return children;
}
