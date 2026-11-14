// @ts-check
import { lazy } from 'react';
import { Route, Routes, Navigate, Outlet, useSearchParams } from 'react-router-dom';
import ApplicationLayout from '../components/layout/ApplicationLayout';
import AuthLayout from '../components/layout/AuthLayout';
import LoginPage from '../pages/Login';
import { useAuth } from '../services/context/AuthContext';

// Each module loads on first visit, so the sign-in screen and the
// first page open quickly instead of downloading the whole app.
const Dashboard = lazy(() => import('../pages/Dashboard'));
const AssetManager = lazy(() => import('../pages/AssetManager'));
const AssetCategories = lazy(() => import('../pages/AssetCategories'));
const RepairMaintenance = lazy(() => import('../pages/RepairMaintenance'));
const Inventory = lazy(() => import('../pages/Inventory'));
const EmployeeList = lazy(() => import('../pages/EmployeeList'));
const Reports = lazy(() => import('../pages/Reports'));
const UsersRoles = lazy(() => import('../pages/UsersRoles'));
const RolesPermissions = lazy(() => import('../pages/RolesPermissions'));
const ActivityLogs = lazy(() => import('../pages/ActivityLogs'));
const SettingsPage = lazy(() => import('../pages/Settings'));
const ConnectorsPage = lazy(() => import('../pages/Connectors'));
const Communication = lazy(() => import('../pages/Communication'));
const SoftwareList = lazy(() => import('../pages/SoftwareList'));
const Network = lazy(() => import('../pages/Network'));
const NetworkDirectory = lazy(() => import('../pages/NetworkDirectory'));

// Preserve old Computer Builds links and their query parameters.
function SystemsRedirect() {
  const [params] = useSearchParams();
  const next = new URLSearchParams(params);
  next.set('view', 'computers');
  return <Navigate to={`/asset-manager?${next.toString()}`} replace />;
}

function RequireAuth() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

function RequireGuest() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/" replace /> : <Outlet />;
}

export default function AppRoutes() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <Routes>
      {/* ================================================
          AUTH
      ================================================= */}

      <Route element={<RequireGuest />}>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>
      </Route>

      {/* ================================================
          APPLICATION
      ================================================= */}

      <Route element={<RequireAuth />}>
        <Route element={<ApplicationLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/asset-manager" element={<AssetManager />} />
          <Route path="/systems" element={<SystemsRedirect />} />
          <Route path="/repair-maintenance" element={<RepairMaintenance />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/employees" element={<EmployeeList />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/asset-categories" element={<AssetCategories />} />
          <Route path="/users" element={<UsersRoles />} />
          <Route path="/users-roles" element={<Navigate to="/users" replace />} />
          <Route path="/roles-permissions" element={<RolesPermissions />} />
          <Route path="/activity-logs" element={<ActivityLogs />} />
          <Route path="/software" element={<SoftwareList />} />
          <Route path="/network" element={<Network />} />
          <Route
            path="/network/racks"
            element={<NetworkDirectory key="racks" collection="racks" />}
          />
          <Route
            path="/network/areas"
            element={<NetworkDirectory key="areas" collection="areas" />}
          />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/connectors" element={<ConnectorsPage />} />
          <Route path="/communication" element={<Communication />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
