import { Player, Position, TeamResponse, TournamentDetail, TournamentSummary, MatchdayInfo, TournamentStandings } from '../types';

const USER_ID_KEY = 'gran_dt_user_id';
const DISPLAY_NAME_KEY = 'gran_dt_display_name';

const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

function getUserId(): string {
  let userId = localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = `user_${crypto.randomUUID().slice(0, 8)}`;
    localStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
}

export function getDisplayName(): string {
  return localStorage.getItem(DISPLAY_NAME_KEY) || '';
}

export function setDisplayName(name: string) {
  localStorage.setItem(DISPLAY_NAME_KEY, name.trim());
}

function headers(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-User-Id': getUserId(),
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Error en la solicitud.');
  }
  return response.json();
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
  const response = await fetch(apiUrl('/api/team'), { headers: headers() });
  return handleResponse<TeamResponse>(response);
}

export async function addPlayer(slotId: string, playerId: string): Promise<TeamResponse> {
  const response = await fetch(apiUrl(`/api/team/slots/${slotId}/players`), {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ playerId }),
  });
  return handleResponse<TeamResponse>(response);
}

export async function removePlayer(slotId: string): Promise<TeamResponse> {
  const response = await fetch(apiUrl(`/api/team/slots/${slotId}/players`), {
    method: 'DELETE',
    headers: headers(),
  });
  return handleResponse<TeamResponse>(response);
}

export async function resetTeam(): Promise<TeamResponse> {
  const response = await fetch(apiUrl('/api/team/reset'), {
    method: 'POST',
    headers: headers(),
  });
  return handleResponse<TeamResponse>(response);
}

export async function fetchTournaments(): Promise<TournamentSummary[]> {
  const response = await fetch(apiUrl('/api/tournaments'), { headers: headers() });
  return handleResponse<TournamentSummary[]>(response);
}

export async function createTournament(data: {
  name: string;
  displayName: string;
  maxMembers?: number;
}): Promise<TournamentDetail> {
  const response = await fetch(apiUrl('/api/tournaments'), {
    method: 'POST',
    headers: headers(),
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
    headers: headers(),
    body: JSON.stringify(data),
  });
  return handleResponse<TournamentDetail>(response);
}

export async function fetchTournament(id: string): Promise<TournamentDetail> {
  const response = await fetch(apiUrl(`/api/tournaments/${id}`), { headers: headers() });
  return handleResponse<TournamentDetail>(response);
}

export async function fetchTournamentStandings(id: string): Promise<TournamentStandings> {
  const response = await fetch(apiUrl(`/api/tournaments/${id}/standings`), { headers: headers() });
  return handleResponse<TournamentStandings>(response);
}

export async function fetchCurrentMatchday(): Promise<MatchdayInfo> {
  const response = await fetch(apiUrl('/api/matchdays/current'));
  return handleResponse<MatchdayInfo>(response);
}
