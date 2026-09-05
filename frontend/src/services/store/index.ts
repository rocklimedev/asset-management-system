import { configureStore } from "@reduxjs/toolkit";

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

// ============================================================
// STORE
// ============================================================

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
  },

  // ==========================================================
  // MIDDLEWARE
  // ==========================================================

  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      assetApi.middleware,
      employeesApi.middleware,
      rolesApi.middleware,
      usersApi.middleware,
      authApi.middleware,
      dashboardApi.middleware,
    ),
});

// ============================================================
// TYPES
// ============================================================

export type RootState = ReturnType<typeof store.getState>;

export type AppDispatch = typeof store.dispatch;

export default store;
