const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export type User = {
  id: string;
  email: string;
};

export type AuthResult = {
  user: User;
  accessToken: string;
  refreshToken: string;
};

export type Business = {
  id: string;
  name: string;
  members?: Array<{
    id: string;
    role: MemberRole;
    displayName: string;
  }>;
};

export type MemberRole = "manager" | "staff";

export type Member = {
  id: string;
  businessId: string;
  userId: string;
  role: MemberRole;
  displayName: string;
  phoneNumber?: string | null;
  user: User;
};

export type Shift = {
  id: string;
  businessId: string;
  memberId: string;
  startsAt: string;
  endsAt: string;
  roleName: string | null;
  notes: string | null;
  member: {
    id: string;
    displayName: string;
    role: MemberRole;
    user: User;
  };
  business?: {
    id: string;
    name: string;
  };
};

export type ShiftInput = {
  memberId: string;
  startsAt: string;
  endsAt: string;
  roleName?: string;
  notes?: string;
};

export type Invitation = {
  id: string;
  businessId: string;
  email: string;
  role: MemberRole;
  displayName: string | null;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

export type RosterPublication = {
  id: string;
  businessId: string;
  weekStart: string;
  publishedAt: string;
  publishedBy: User;
  acknowledgements: Array<{
    id: string;
    acknowledgedAt: string;
    member: {
      id: string;
      displayName: string;
      user: User;
    };
  }>;
};

export type RosterRecord = {
  weekStart: string;
  status: "draft" | "published";
  shiftCount: number;
  staffCount: number;
  acknowledgementCount: number;
  publishedAt: string | null;
  updatedAt: string | null;
};

type RequestOptions = {
  token?: string;
  method?: string;
  body?: unknown;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function register(email: string, password: string) {
  return apiRequest<AuthResult>("/auth/register", {
    method: "POST",
    body: {
      email,
      password
    }
  });
}

export async function login(email: string, password: string) {
  return apiRequest<AuthResult>("/auth/login", {
    method: "POST",
    body: {
      email,
      password
    }
  });
}

export async function listBusinesses(token: string) {
  const result = await apiRequest<{ businesses: Business[] }>("/businesses", {
    token
  });

  return result.businesses;
}

export async function createBusiness(token: string, name: string) {
  const result = await apiRequest<{ business: Business }>("/businesses", {
    token,
    method: "POST",
    body: {
      name
    }
  });

  return result.business;
}

export async function updateBusiness(token: string, businessId: string, name: string) {
  const result = await apiRequest<{ business: Business }>(`/businesses/${businessId}`, {
    token,
    method: "PATCH",
    body: {
      name
    }
  });

  return result.business;
}

export async function deleteBusiness(token: string, businessId: string) {
  await apiRequest<null>(`/businesses/${businessId}`, {
    token,
    method: "DELETE"
  });
}

export async function listMembers(token: string, businessId: string) {
  const result = await apiRequest<{ members: Member[] }>(`/businesses/${businessId}/members`, {
    token
  });

  return result.members;
}

export async function addMember(
  token: string,
  businessId: string,
  input: { email: string; password?: string; displayName?: string; phoneNumber?: string; role: MemberRole }
) {
  const result = await apiRequest<{ member: Member }>(`/businesses/${businessId}/members`, {
    token,
    method: "POST",
    body: input
  });

  return result.member;
}

export async function updateMember(
  token: string,
  businessId: string,
  memberId: string,
  input: { email?: string; displayName?: string; phoneNumber?: string | null; role?: MemberRole }
) {
  const result = await apiRequest<{ member: Member }>(`/businesses/${businessId}/members/${memberId}`, {
    token,
    method: "PATCH",
    body: input
  });

  return result.member;
}

export async function updateMemberPassword(
  token: string,
  businessId: string,
  memberId: string,
  password: string
) {
  await apiRequest<null>(`/businesses/${businessId}/members/${memberId}/password`, {
    token,
    method: "PATCH",
    body: {
      password
    }
  });
}

export async function deleteMember(token: string, businessId: string, memberId: string) {
  await apiRequest<null>(`/businesses/${businessId}/members/${memberId}`, {
    token,
    method: "DELETE"
  });
}

export async function createInvitation(
  token: string,
  businessId: string,
  input: { email: string; displayName?: string; role: MemberRole }
) {
  return apiRequest<{ invitation: Invitation; inviteToken: string }>(
    `/businesses/${businessId}/invitations`,
    {
      token,
      method: "POST",
      body: input
    }
  );
}

export async function listInvitations(token: string, businessId: string) {
  const result = await apiRequest<{ invitations: Invitation[] }>(
    `/businesses/${businessId}/invitations`,
    {
      token
    }
  );

  return result.invitations;
}

export async function acceptInvitation(token: string, inviteToken: string) {
  const result = await apiRequest<{ member: Member }>("/invitations/accept", {
    token,
    method: "POST",
    body: {
      token: inviteToken
    }
  });

  return result.member;
}

export async function listRoster(token: string, businessId: string, weekStart: string) {
  const result = await apiRequest<{ shifts: Shift[] }>(
    `/businesses/${businessId}/shifts?weekStart=${encodeURIComponent(weekStart)}`,
    {
      token
    }
  );

  return result.shifts;
}

export async function listRosterRecords(token: string, businessId: string) {
  const result = await apiRequest<{ records: RosterRecord[] }>(`/businesses/${businessId}/rosters`, {
    token
  });

  return result.records;
}

export async function publishRoster(token: string, businessId: string, weekStart: string) {
  const result = await apiRequest<{ publication: RosterPublication }>(
    `/businesses/${businessId}/rosters/publish`,
    {
      token,
      method: "POST",
      body: {
        weekStart
      }
    }
  );

  return result.publication;
}

export async function getRosterPublication(token: string, businessId: string, weekStart: string) {
  const result = await apiRequest<{ publication: RosterPublication | null }>(
    `/businesses/${businessId}/rosters/publication?weekStart=${encodeURIComponent(weekStart)}`,
    {
      token
    }
  );

  return result.publication;
}

export async function acknowledgeRoster(token: string, businessId: string, publicationId: string) {
  return apiRequest<{ acknowledgement: unknown }>(
    `/businesses/${businessId}/rosters/${publicationId}/acknowledge`,
    {
      token,
      method: "POST"
    }
  );
}

export async function createShift(
  token: string,
  businessId: string,
  input: ShiftInput
) {
  const result = await apiRequest<{ shift: Shift }>(`/businesses/${businessId}/shifts`, {
    token,
    method: "POST",
    body: input
  });

  return result.shift;
}

export async function updateShift(
  token: string,
  businessId: string,
  shiftId: string,
  input: Partial<ShiftInput>
) {
  const result = await apiRequest<{ shift: Shift }>(`/businesses/${businessId}/shifts/${shiftId}`, {
    token,
    method: "PATCH",
    body: input
  });

  return result.shift;
}

export async function deleteShift(token: string, businessId: string, shiftId: string) {
  await apiRequest<null>(`/businesses/${businessId}/shifts/${shiftId}`, {
    token,
    method: "DELETE"
  });
}

export async function listMyShifts(token: string, from: string, to: string) {
  const result = await apiRequest<{ shifts: Shift[] }>(
    `/me/shifts?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    {
      token
    }
  );

  return result.shifts;
}

async function apiRequest<T>(path: string, options: RequestOptions = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "content-type": "application/json",
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const payload = response.status === 204 ? null : await response.json();

  if (!response.ok) {
    const error = payload?.error;
    throw new ApiError(
      error?.message ?? "Request failed",
      response.status,
      error?.code ?? "REQUEST_FAILED"
    );
  }

  return payload as T;
}
