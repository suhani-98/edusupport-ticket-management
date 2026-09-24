import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import { AppShell } from "../layouts/AppShell";
import { LoginPage } from "../pages/LoginPage";
import { RegisterPage } from "../pages/RegisterPage";
import { CreateTicketPage } from "../pages/CreateTicketPage";
import { StudentDashboardPage } from "../pages/StudentDashboardPage";
import { TicketDetailPage } from "../pages/TicketDetailPage";
import { TicketListPage } from "../pages/TicketListPage";
import { StaffDashboardPage } from "../pages/StaffDashboardPage";
import { StaffTicketDetailPage } from "../pages/StaffTicketDetailPage";
import { StaffTicketListPage } from "../pages/StaffTicketListPage";
import { ManagerDashboardPage } from "../pages/ManagerDashboardPage";
import { ManagerTicketDetailPage } from "../pages/ManagerTicketDetailPage";
import { ManagerTicketListPage } from "../pages/ManagerTicketListPage";
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
                <Route path="/student" element={<StudentDashboardPage />} />
                <Route path="/student/tickets" element={<TicketListPage />} />
                <Route path="/student/tickets/new" element={<CreateTicketPage />} />
                <Route path="/student/tickets/:id" element={<TicketDetailPage />} />
              </Route>
              <Route element={<RoleRoute role="staff" />}>
                <Route path="/staff" element={<StaffDashboardPage />} />
                <Route path="/staff/tickets" element={<StaffTicketListPage />} />
                <Route path="/staff/tickets/:id" element={<StaffTicketDetailPage />} />
              </Route>
              <Route element={<RoleRoute role="manager" />}>
                <Route path="/manager" element={<ManagerDashboardPage />} />
                <Route path="/manager/tickets" element={<ManagerTicketListPage />} />
                <Route path="/manager/tickets/:id" element={<ManagerTicketDetailPage />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<HomeRedirect />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
