import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Verify from "./pages/Verify";
import Home from "./pages/Home";

function App() {
  const isAuthenticated = () => {
    return sessionStorage.getItem("access") === "true";
  };

  // Protected route component
  const ProtectedRoute = ({ children }) => {
    if (!isAuthenticated()) {
      return <Navigate to="/verify" replace />;
    }
    return children;
  };

  return (
    <Router>
      <div>
        <Routes>
          {/* Default route redirects to verify if not authenticated */}
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

          {/* Verification page */}
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

          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/verify" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
