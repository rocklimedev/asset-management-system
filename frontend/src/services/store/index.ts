import { configureStore, type Middleware, isAnyOf } from "@reduxjs/toolkit";

// ============================================================
// APIS
// ============================================================

import assetApi from "../api/asset.api";
import employeesApi from "../api/employees.api";
import rolesApi from "../api/role.api";
import usersApi from "../api/users.api";

// ============================================================
// AUTH
// ============================================================

// Change this import if your auth slice is located elsewhere.

import authApi from "../api/auth.api";
import dashboardApi from "../api/dashboard.api";
import reportsApi from "../api/reports.api";

// ============================================================
// STORE
// ============================================================

const custodyCache: Middleware = (api) => (next) => (action) => {
  const result = next(action);
  if (
    isAnyOf(
      assetApi.endpoints.assignAsset.matchFulfilled,
      assetApi.endpoints.returnAsset.matchFulfilled,
      assetApi.endpoints.transferAsset.matchFulfilled,
      assetApi.endpoints.assignSystem.matchFulfilled,
      assetApi.endpoints.updateSystem.matchFulfilled,
      assetApi.endpoints.createSystem.matchFulfilled,
      assetApi.endpoints.releaseAssetsForEmployee.matchFulfilled,
    )(action)
  ) {
    api.dispatch(employeesApi.util.invalidateTags(["Employee"]));
    api.dispatch(dashboardApi.util.invalidateTags(["Dashboard"]));
    api.dispatch(reportsApi.util.invalidateTags(["Report"]));
  }
  if (
    isAnyOf(
      employeesApi.endpoints.updateEmployee.matchFulfilled,
      employeesApi.endpoints.removeEmployee.matchFulfilled,
    )(action)
  ) {
    api.dispatch(
      assetApi.util.invalidateTags(["Asset", "System", "AssetHistory"]),
    );
    api.dispatch(dashboardApi.util.invalidateTags(["Dashboard"]));
    api.dispatch(reportsApi.util.invalidateTags(["Report"]));
  }
  return result;
};

export const store = configureStore({
  reducer: {
    // ==========================================================
    // AUTH
    // ==========================================================

    // ==========================================================
    // RTK QUERY APIs
    // ==========================================================
    [authApi.reducerPath]: authApi.reducer,
    [assetApi.reducerPath]: assetApi.reducer,
    [employeesApi.reducerPath]: employeesApi.reducer,
    [rolesApi.reducerPath]: rolesApi.reducer,
    [usersApi.reducerPath]: usersApi.reducer,
    [dashboardApi.reducerPath]: dashboardApi.reducer,
    [reportsApi.reducerPath]: reportsApi.reducer,
  },

  // ==========================================================
  // MIDDLEWARE
  // ==========================================================

  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      custodyCache,
      assetApi.middleware,
      employeesApi.middleware,
      rolesApi.middleware,
      usersApi.middleware,
      authApi.middleware,
      dashboardApi.middleware,
      reportsApi.middleware,
    ),
});

// ============================================================
// TYPES
// ============================================================

export type RootState = ReturnType<typeof store.getState>;

export type AppDispatch = typeof store.dispatch;

export default store;
