import {
  Player,
  Position,
  TeamResponse,
  TournamentDetail,
  TournamentSummary,
  MatchdayInfo,
  TournamentStandings,
  AuthUser,
  AuthResponse,
} from '../types';

const TOKEN_KEY = 'gran_dt_token';

const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function authHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    clearToken();
    onUnauthorized?.();
    throw new Error('Sesión expirada. Volvé a iniciar sesión.');
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Error en la solicitud.');
  }
  return response.json();
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(apiUrl('/api/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await handleResponse<AuthResponse>(response);
  setToken(data.token);
  return data;
}

export async function register(data: {
  email: string;
  password: string;
  teamName: string;
}): Promise<AuthResponse> {
  const response = await fetch(apiUrl('/api/auth/register'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await handleResponse<AuthResponse>(response);
  setToken(result.token);
  return result;
}

export async function fetchMe(): Promise<AuthUser> {
  const response = await fetch(apiUrl('/api/auth/me'), { headers: authHeaders() });
  return handleResponse<AuthUser>(response);
}

export async function updateTeamName(teamName: string): Promise<AuthUser> {
  const response = await fetch(apiUrl('/api/auth/team-name'), {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ teamName }),
  });
  return handleResponse<AuthUser>(response);
}

export async function fetchPlayers(params?: { position?: Position; search?: string }): Promise<Player[]> {
  const query = new URLSearchParams();
  if (params?.position) query.set('position', params.position);
  if (params?.search) query.set('search', params.search);

  const qs = query.toString();
  const response = await fetch(apiUrl(`/api/players${qs ? `?${qs}` : ''}`));
  return handleResponse<Player[]>(response);
}

export async function fetchTeam(): Promise<TeamResponse> {
  const response = await fetch(apiUrl('/api/team'), { headers: authHeaders() });
  return handleResponse<TeamResponse>(response);
}

export async function addPlayer(slotId: string, playerId: string): Promise<TeamResponse> {
  const response = await fetch(apiUrl(`/api/team/slots/${slotId}/players`), {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ playerId }),
  });
  return handleResponse<TeamResponse>(response);
}

export async function removePlayer(slotId: string): Promise<TeamResponse> {
  const response = await fetch(apiUrl(`/api/team/slots/${slotId}/players`), {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return handleResponse<TeamResponse>(response);
}

export async function resetTeam(): Promise<TeamResponse> {
  const response = await fetch(apiUrl('/api/team/reset'), {
    method: 'POST',
    headers: authHeaders(),
  });
  return handleResponse<TeamResponse>(response);
}

export async function fetchTournaments(): Promise<TournamentSummary[]> {
  const response = await fetch(apiUrl('/api/tournaments'), { headers: authHeaders() });
  return handleResponse<TournamentSummary[]>(response);
}

export async function createTournament(data: {
  name: string;
  displayName: string;
  maxMembers?: number;
}): Promise<TournamentDetail> {
  const response = await fetch(apiUrl('/api/tournaments'), {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<TournamentDetail>(response);
}

export async function joinTournament(data: {
  inviteCode: string;
  displayName: string;
}): Promise<TournamentDetail> {
  const response = await fetch(apiUrl('/api/tournaments/join'), {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<TournamentDetail>(response);
}

export async function fetchTournament(id: string): Promise<TournamentDetail> {
  const response = await fetch(apiUrl(`/api/tournaments/${id}`), { headers: authHeaders() });
  return handleResponse<TournamentDetail>(response);
}

export async function fetchTournamentStandings(id: string): Promise<TournamentStandings> {
  const response = await fetch(apiUrl(`/api/tournaments/${id}/standings`), { headers: authHeaders() });
  return handleResponse<TournamentStandings>(response);
}

export async function fetchCurrentMatchday(): Promise<MatchdayInfo> {
  const response = await fetch(apiUrl('/api/matchdays/current'));
  return handleResponse<MatchdayInfo>(response);
}

export function logout() {
  clearToken();
}
