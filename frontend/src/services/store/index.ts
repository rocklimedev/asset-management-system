import { configureStore, type Middleware, isAnyOf } from '@reduxjs/toolkit';

// ============================================================
// APIS
// ============================================================

import assetApi from '../api/asset.api';
import employeesApi from '../api/employees.api';
import rolesApi from '../api/role.api';
import usersApi from '../api/users.api';
import authApi from '../api/auth.api';
import dashboardApi from '../api/dashboard.api';
import reportsApi from '../api/reports.api';

// ============================================================
// OPTIMIZED CUSTODY CACHE MIDDLEWARE
// ============================================================

/**
 * Keep employee views in sync when asset custody or embedded asset details
 * change. Both list and detail responses embed assignments, so both must be
 * refreshed. Dashboard and report summaries also depend on custody changes.
 */

const custodyCache: Middleware = (api) => (next) => (action) => {
  const result = next(action);

  // ============================================================
  // ASSET & SYSTEM OPERATIONS
  // ============================================================

  if (
    isAnyOf(
      assetApi.endpoints.createAsset.matchFulfilled,
      assetApi.endpoints.updateAsset.matchFulfilled,
      assetApi.endpoints.updateAssetUnit.matchFulfilled,
      assetApi.endpoints.assignAsset.matchFulfilled,
      assetApi.endpoints.returnAsset.matchFulfilled,
      assetApi.endpoints.transferAsset.matchFulfilled,
      assetApi.endpoints.assignSystem.matchFulfilled,
      assetApi.endpoints.returnSystem.matchFulfilled,
      assetApi.endpoints.updateSystem.matchFulfilled,
      assetApi.endpoints.createSystem.matchFulfilled,
      assetApi.endpoints.releaseAssetsForEmployee.matchFulfilled,
    )(action)
  ) {
    // Employee responses embed asset custody and asset details. Refresh both
    // the board and individual employee views, including initial assignments.
    api.dispatch(employeesApi.util.invalidateTags(['Employee']));

    api.dispatch(
      dashboardApi.util.invalidateTags([
        // Dashboard is always a single view, so just one tag
        'Dashboard',
      ]),
    );

    api.dispatch(
      reportsApi.util.invalidateTags([
        // Invalidate report list for refreshing
        { type: 'Report', id: 'LIST' },
      ]),
    );
  }

  // ============================================================
  // EMPLOYEE OPERATIONS
  // ============================================================

  if (
    isAnyOf(
      employeesApi.endpoints.updateEmployee.matchFulfilled,
      employeesApi.endpoints.removeEmployee.matchFulfilled,
      employeesApi.endpoints.deleteEmployee.matchFulfilled,
    )(action)
  ) {
    // ✅ FIX: Invalidate specific asset lists, not all assets
    api.dispatch(
      assetApi.util.invalidateTags([
        // Only invalidate lists that might have changed
        { type: 'Asset', id: 'LIST' },
        { type: 'Asset', id: 'POOL' },
        { type: 'System', id: 'LIST' },
        // AssetHistory is tied to specific assets, not invalidated
      ]),
    );

    api.dispatch(dashboardApi.util.invalidateTags(['Dashboard']));

    api.dispatch(reportsApi.util.invalidateTags([{ type: 'Report', id: 'LIST' }]));
  }

  return result;
};

// ============================================================
// STORE CONFIGURATION
// ============================================================

export const store = configureStore({
  reducer: {
    [authApi.reducerPath]: authApi.reducer,
    [assetApi.reducerPath]: assetApi.reducer,
    [employeesApi.reducerPath]: employeesApi.reducer,
    [rolesApi.reducerPath]: rolesApi.reducer,
    [usersApi.reducerPath]: usersApi.reducer,
    [dashboardApi.reducerPath]: dashboardApi.reducer,
    [reportsApi.reducerPath]: reportsApi.reducer,
  },

  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware(
      // ✅ FIX: Configure serializability check with better timeouts
      {
        serializableCheck: {
          // RTK Query can have non-serializable values (like Promises)
          ignoredActions: [
            'assetApi/executeMutation/pending',
            'assetApi/executeMutation/fulfilled',
            'assetApi/executeMutation/rejected',
            'employeesApi/executeMutation/pending',
            'employeesApi/executeMutation/fulfilled',
            'employeesApi/executeMutation/rejected',
            'dashboardApi/executeMutation/pending',
            'dashboardApi/executeMutation/fulfilled',
            'dashboardApi/executeMutation/rejected',
            'reportsApi/executeMutation/pending',
            'reportsApi/executeMutation/fulfilled',
            'reportsApi/executeMutation/rejected',
            'rolesApi/executeMutation/pending',
            'rolesApi/executeMutation/fulfilled',
            'rolesApi/executeMutation/rejected',
            'usersApi/executeMutation/pending',
            'usersApi/executeMutation/fulfilled',
            'usersApi/executeMutation/rejected',
            'authApi/executeMutation/pending',
            'authApi/executeMutation/fulfilled',
            'authApi/executeMutation/rejected',
          ],
          ignoredPaths: [
            'assetApi',
            'employeesApi',
            'dashboardApi',
            'reportsApi',
            'rolesApi',
            'usersApi',
            'authApi',
          ],
        },
      },
    ).concat(
      custodyCache,
      assetApi.middleware,
      employeesApi.middleware,
      rolesApi.middleware,
      usersApi.middleware,
      authApi.middleware,
      dashboardApi.middleware,
      reportsApi.middleware,
    ),

  // ✅ FIX: Improve Redux dev tools configuration for performance
  devTools: {
    // Limit action history in dev tools to prevent memory bloat
    maxAge: 50,
    // Throttle action tracking
    trace: false,
    traceLimit: 25,
  },
});

// ============================================================
// TYPES
// ============================================================

export type RootState = ReturnType<typeof store.getState>;

export type AppDispatch = typeof store.dispatch;

export default store;
