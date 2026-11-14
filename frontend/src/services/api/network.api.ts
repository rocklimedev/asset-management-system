import { authApi } from './auth.api';
import type { NetworkDocument } from '../../types/network';

export interface NetworkResponse {
  document: NetworkDocument;
  revision: number;
}

const api = authApi.enhanceEndpoints({ addTagTypes: ['Network'] });

export const networkApi = api.injectEndpoints({
  endpoints: (builder) => ({
    network: builder.query<NetworkResponse, void>({
      query: () => ({ url: '/network', timeout: 30000 }),
      providesTags: ['Network'],
    }),
    saveNetwork: builder.mutation<NetworkResponse, NetworkResponse>({
      query: (body) => ({ url: '/network', method: 'PUT', body, timeout: 30000 }),
      invalidatesTags: (_result, error) => (error ? [] : ['Network']),
    }),
  }),
});

export const { useLazyNetworkQuery, useSaveNetworkMutation } = networkApi;
