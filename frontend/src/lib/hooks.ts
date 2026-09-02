import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import type { Asset, AssetHistoryEntry, DashboardSummary, Employee } from '../types';

// ---------------- Dashboard ----------------
export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => (await api.get<DashboardSummary>('/dashboard')).data,
  });
}

// ---------------- Employees ----------------
export function useEmployees(params: { search?: string; departmentId?: number; status?: string } = {}) {
  return useQuery({
    queryKey: ['employees', params],
    queryFn: async () =>
      (await api.get<{ items: Employee[]; total: number }>('/employees', { params })).data,
  });
}

export function useEmployee(id: number | null) {
  return useQuery({
    queryKey: ['employee', id],
    queryFn: async () => (await api.get<Employee>(`/employees/${id}`)).data,
    enabled: id != null,
  });
}

// ---------------- Assets ----------------
export function useAssets(params: Record<string, string | number | undefined> = {}) {
  return useQuery({
    queryKey: ['assets', params],
    queryFn: async () => (await api.get<{ items: Asset[]; total: number; page: number; pageSize: number }>('/assets', { params })).data,
  });
}

export function useAsset(id: number | null) {
  return useQuery({
    queryKey: ['asset', id],
    queryFn: async () => (await api.get<Asset>(`/assets/${id}`)).data,
    enabled: id != null,
  });
}

export function useAssetHistory(id: number | null) {
  return useQuery({
    queryKey: ['asset-history', id],
    queryFn: async () => (await api.get<AssetHistoryEntry[]>(`/assets/${id}/history`)).data,
    enabled: id != null,
  });
}

export function useTransferAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { assetId: number; toEmployeeId: number; reason?: string; notes?: string }) =>
      (await api.post(`/assets/${vars.assetId}/transfer`, {
        toEmployeeId: vars.toEmployeeId,
        reason: vars.reason,
        notes: vars.notes,
      })).data,
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      qc.invalidateQueries({ queryKey: ['assets'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useAssignAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { assetId: number; employeeId: number; notes?: string }) =>
      (await api.post(`/assets/${vars.assetId}/assign`, { employeeId: vars.employeeId, notes: vars.notes })).data,
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      qc.invalidateQueries({ queryKey: ['assets'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useCreateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => (await api.post('/assets', payload)).data,
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['assets'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
