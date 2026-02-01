import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Verify from "./pages/Verify";
import Home from "./pages/Home";
import React from "react"; // needed for React.ReactNode

function App() {
  const isAuthenticated = () => {
    return sessionStorage.getItem("access") === "true";
  };

  // Protected route with proper typing for children
  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    if (!isAuthenticated()) {
      return <Navigate to="/verify" replace />;
    }
    return <>{children}</>; // or just return children;
  };

  return (
    <Router>
      <div>
        <Routes>
          {/* Default route redirects based on auth status */}
          <Route
            path="/"
            element={
              isAuthenticated() ? (
                <Navigate to="/home" replace />
              ) : (
                <Navigate to="/verify" replace />
              )
            }
          />

          {/* Public verification page */}
          <Route path="/verify" element={<Verify />} />

          {/* Protected home page */}
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />

          {/* Catch-all redirect to verify */}
          <Route path="*" element={<Navigate to="/verify" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;