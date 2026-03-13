import { Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminLayout } from "./pages/admin/AdminLayout";
import { AthletesPage } from "./pages/admin/AthletesPage";
import { ScoresPage } from "./pages/admin/ScoresPage";
import { SetupPage } from "./pages/admin/SetupPage";
import { AthleteProfilePage } from "./pages/AthleteProfilePage";
import { LandingPage } from "./pages/LandingPage";
import { LeaderboardPage } from "./pages/LeaderboardPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";

export const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/" element={<LandingPage />} />
      <Route path="/home/:slug" element={<LeaderboardPage />} />
      <Route path="/athletes/:id" element={<AthleteProfilePage />} />
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ScoresPage />} />
        <Route path="athletes" element={<AthletesPage />} />
        <Route path="setup" element={<SetupPage />} />
      </Route>
    </Routes>
  );
};

