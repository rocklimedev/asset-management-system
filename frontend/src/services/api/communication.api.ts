import { authApi } from './auth.api';

export interface Channel {
  id: string;
  channelName: string;
  channelType?: string;
  isActive: boolean | number;
  externalChannelId: string;
}
export interface Profile {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean | number;
  channelIds: string[];
}
export type ProfileInput = Omit<Profile, 'id' | 'isActive'> & { isActive: boolean };
export interface PlanInput {
  profileId?: string;
  addChannelIds?: string[];
  removeChannelIds?: string[];
}
export interface PlanPreview {
  employeeId: string;
  channelIds: string[];
  channels: Channel[];
}
export interface EmployeeCommunication {
  employeeId: string;
  account: {
    email: string;
    mailAccountId?: string;
    cliqUserId?: string;
    activationStatus: string;
  } | null;
  plan: { profileId?: string; channelIds: string[] | string } | null;
  workflow: { status: string } | null;
  tasks: {
    id: string;
    taskType: string;
    status: string;
    attemptCount: number;
    lastError?: string;
  }[];
  assignments: { id: string; channelId: string; status: string; lastError?: string }[];
}
export interface CommunicationLog {
  id: string;
  operation: string;
  status: string;
  errorCode?: string;
  createdAt: string;
}
export type ProvisionOperation =
  | 'onboard'
  | 'provision-email'
  | 'provision-cliq'
  | 'sync-channels'
  | 'retry';
export interface ProvisionInput {
  email?: string;
  domain?: string;
  temporaryPassword?: string;
  idempotencyKey: string;
  step?: string;
}

export function channelIds(value: string[] | string | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

const api = authApi.enhanceEndpoints({ addTagTypes: ['Communication'] });
export const communicationApi = api.injectEndpoints({
  endpoints: (builder) => ({
    communicationProfiles: builder.query<{ items: Profile[] }, void>({
      query: () => '/communication/profiles',
      providesTags: ['Communication'],
      transformResponse: (response: { items: Profile[] }) => ({
        items: response.items.map((p) => ({ ...p, channelIds: channelIds(p.channelIds) })),
      }),
    }),
    saveCommunicationProfile: builder.mutation<Profile, { id?: string; body: ProfileInput }>({
      query: ({ id, body }) => ({
        url: `/communication/profiles${id ? `/${id}` : ''}`,
        method: id ? 'PATCH' : 'POST',
        body,
      }),
      invalidatesTags: ['Communication'],
    }),
    deleteCommunicationProfile: builder.mutation<unknown, string>({
      query: (id) => ({ url: `/communication/profiles/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Communication'],
    }),
    communicationChannels: builder.query<{ items: Channel[] }, void>({
      query: () => '/communication/channels',
      providesTags: ['Communication'],
    }),
    syncCommunicationChannels: builder.mutation<{ items: Channel[] }, void>({
      query: () => ({ url: '/communication/channels/sync', method: 'POST' }),
      invalidatesTags: ['Communication'],
    }),
    communicationChannelDetails: builder.query<unknown, string>({
      query: (id) => `/communication/channels/${id}`,
    }),
    communicationChannelMembers: builder.query<{ items: unknown[] }, string>({
      query: (id) => `/communication/channels/${id}/members`,
      providesTags: ['Communication'],
    }),
    employeeCommunication: builder.query<EmployeeCommunication, string>({
      query: (id) => `/communication/employees/${id}/status`,
      providesTags: ['Communication'],
    }),
    employeeCommunicationLogs: builder.query<{ items: CommunicationLog[] }, string>({
      query: (id) => `/communication/employees/${id}/logs`,
      providesTags: ['Communication'],
    }),
    previewCommunicationPlan: builder.mutation<
      PlanPreview,
      { employeeId: string; body: PlanInput }
    >({
      query: ({ employeeId, body }) => ({
        url: `/communication/employees/${employeeId}/preview`,
        method: 'POST',
        body,
      }),
    }),
    assignCommunicationPlan: builder.mutation<PlanPreview, { employeeId: string; body: PlanInput }>(
      {
        query: ({ employeeId, body }) => ({
          url: `/communication/employees/${employeeId}/assign-profile`,
          method: 'POST',
          body,
        }),
        invalidatesTags: ['Communication'],
      },
    ),
    provisionCommunication: builder.mutation<
      EmployeeCommunication,
      { employeeId: string; operation: ProvisionOperation; body: ProvisionInput }
    >({
      query: ({ employeeId, operation, body }) => ({
        url: `/communication/employees/${employeeId}/${operation}`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Communication'],
    }),
    removeCommunicationMembership: builder.mutation<
      EmployeeCommunication,
      { employeeId: string; channelId: string }
    >({
      query: ({ employeeId, channelId }) => ({
        url: `/communication/employees/${employeeId}/channels/${channelId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Communication'],
    }),
    confirmCommunicationActivation: builder.mutation<
      EmployeeCommunication,
      { employeeId: string; confirmation: string }
    >({
      query: ({ employeeId, confirmation }) => ({
        url: `/communication/employees/${employeeId}/confirm-activation`,
        method: 'POST',
        body: { confirmation },
      }),
      invalidatesTags: ['Communication'],
    }),
  }),
});

export const {
  useCommunicationProfilesQuery,
  useSaveCommunicationProfileMutation,
  useDeleteCommunicationProfileMutation,
  useCommunicationChannelsQuery,
  useSyncCommunicationChannelsMutation,
  useCommunicationChannelDetailsQuery,
  useCommunicationChannelMembersQuery,
  useEmployeeCommunicationQuery,
  useEmployeeCommunicationLogsQuery,
  usePreviewCommunicationPlanMutation,
  useAssignCommunicationPlanMutation,
  useProvisionCommunicationMutation,
  useRemoveCommunicationMembershipMutation,
  useConfirmCommunicationActivationMutation,
} = communicationApi;
