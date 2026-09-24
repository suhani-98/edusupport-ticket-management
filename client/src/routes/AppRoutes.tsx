import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import { AppShell } from "../layouts/AppShell";
import { LoginPage } from "../pages/LoginPage";
import { RegisterPage } from "../pages/RegisterPage";
import { WorkspacePage } from "../pages/WorkspacePage";
import { GuestRoute, HomeRedirect, ProtectedRoute, RoleRoute } from "./guards";

export function AppRoutes() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<GuestRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/" element={<HomeRedirect />} />
              <Route element={<RoleRoute role="student" />}>
                <Route path="/student" element={<WorkspacePage />} />
              </Route>
              <Route element={<RoleRoute role="staff" />}>
                <Route path="/staff" element={<WorkspacePage />} />
              </Route>
              <Route element={<RoleRoute role="manager" />}>
                <Route path="/manager" element={<WorkspacePage />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<HomeRedirect />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
