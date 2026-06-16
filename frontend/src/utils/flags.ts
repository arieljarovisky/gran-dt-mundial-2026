const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export function resolveFlagUrl(flag?: string | null, teamCode?: string): string | null {
  if (flag?.startsWith('/api/flags/')) {
    return `${API_BASE}${flag}`;
  }

  if (teamCode) {
    return `${API_BASE}/api/flags/${teamCode.toUpperCase()}`;
  }

  if (flag?.startsWith('http')) {
    return flag;
  }

  return null;
}
