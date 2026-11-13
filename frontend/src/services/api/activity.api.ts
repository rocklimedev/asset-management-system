import { authApi } from './auth.api';

export interface ActivityLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  createdAt: string;
  user?: { id: string; name: string; email: string } | null;
}

export interface ActivityFilters {
  search?: string;
  entity?: string;
  action?: string;
  from?: string;
  to?: string;
}

export const activityApi = authApi.injectEndpoints({
  endpoints: (builder) => ({
    getActivityLogs: builder.query<
      { items: ActivityLog[]; total: number; page: number; pageSize: number },
      ActivityFilters & { page: number }
    >({
      query: (params) => ({ url: '/audit-logs', params }),
      keepUnusedDataFor: 0,
    }),
  }),
});

export const { useGetActivityLogsQuery } = activityApi;
