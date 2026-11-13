import { authApi } from './auth.api';

export interface ZohoStatus {
  status: string;
  organizationId?: string;
  organizationName?: string;
  accountEmail?: string;
  dataCenter?: string;
  tokenHealth?: string;
  lastAuthenticatedAt?: string;
  missingScopes: string[];
}

export interface Connector {
  provider: string;
  name: string;
  description: string;
  enabled: boolean | number;
  health: string;
  capabilities: string[];
  lastError?: string;
  lastSuccessfulRequest?: string;
}

export const connectorsApi = authApi.injectEndpoints({
  endpoints: (builder) => ({
    zohoStatus: builder.query<ZohoStatus, void>({ query: () => '/integrations/zoho/status' }),
    connectors: builder.query<{ items: Connector[] }, void>({ query: () => '/connectors' }),
    authorizeZoho: builder.mutation<{ authorizationUrl: string }, void>({
      query: () => ({ url: '/integrations/zoho/reconnect', method: 'POST' }),
    }),
    disconnectZoho: builder.mutation<ZohoStatus, void>({
      query: () => ({ url: '/integrations/zoho/disconnect', method: 'POST' }),
    }),
    testConnector: builder.mutation<{ healthy: boolean }, string>({
      query: (provider) => ({
        url: `/connectors/${encodeURIComponent(provider)}/test`,
        method: 'POST',
      }),
    }),
    toggleConnector: builder.mutation<unknown, { provider: string; enabled: boolean }>({
      query: ({ provider, enabled }) => ({
        url: `/connectors/${encodeURIComponent(provider)}/toggle`,
        method: 'PATCH',
        body: { enabled },
      }),
    }),
  }),
});

export const {
  useZohoStatusQuery,
  useConnectorsQuery,
  useAuthorizeZohoMutation,
  useDisconnectZohoMutation,
  useTestConnectorMutation,
  useToggleConnectorMutation,
} = connectorsApi;
