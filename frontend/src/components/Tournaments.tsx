import { useState, useEffect } from 'react';
import { Copy, Users, Trophy, ArrowLeft, Check } from 'lucide-react';
import {
  fetchTournaments,
  createTournament,
  joinTournament,
  fetchTournament,
  fetchTournamentStandings,
  getDisplayName,
  setDisplayName,
} from '../api/client';
import { TournamentDetail, TournamentSummary, TournamentStandings } from '../types';
import { formatMoney } from '../utils';
import MatchdayBanner from './MatchdayBanner';

type View = 'list' | 'detail';

export default function Tournaments() {
  const [view, setView] = useState<View>('list');
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([]);
  const [selected, setSelected] = useState<TournamentDetail | null>(null);
  const [standings, setStandings] = useState<TournamentStandings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [createName, setCreateName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [displayName, setDisplayNameState] = useState(getDisplayName());
  const [submitting, setSubmitting] = useState(false);

  const loadList = async () => {
    try {
      setError(null);
      const data = await fetchTournaments();
      setTournaments(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los torneos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadList();
  }, []);

  const openTournament = async (id: string) => {
    try {
      setError(null);
      const [data, standingsData] = await Promise.all([
        fetchTournament(id),
        fetchTournamentStandings(id),
      ]);
      setSelected(data);
      setStandings(standingsData);
      setView('detail');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo abrir el torneo.');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      setDisplayName(displayName);
      const tournament = await createTournament({ name: createName, displayName });
      setCreateName('');
      setSelected(tournament);
      setView('detail');
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear el torneo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      setDisplayName(displayName);
      const tournament = await joinTournament({ inviteCode: joinCode, displayName });
      setJoinCode('');
      setSelected(tournament);
      setView('detail');
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo unir al torneo.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (view === 'detail' && selected) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => { setView('list'); setSelected(null); setStandings(null); }}
          className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors"
        >
          <ArrowLeft size={16} /> Volver a torneos
        </button>

        <div className="bg-[#121212] border border-white/10 rounded-xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white">{selected.name}</h2>
              <p className="text-gray-500 text-sm mt-1">
                {selected.memberCount}/{selected.maxMembers} participantes
              </p>
            </div>
            <div className="bg-[#0a0a0a] border border-amber-500/30 rounded-lg px-4 py-3">
              <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Código para amigos</div>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-mono font-bold text-amber-500 tracking-widest">{selected.inviteCode}</span>
                <button
                  onClick={() => copyCode(selected.inviteCode)}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                  title="Copiar código"
                >
                  {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} className="text-gray-400" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {selected.matchday && <MatchdayBanner matchday={selected.matchday} />}

        {standings && standings.standings.length > 0 && (
          <div className="bg-[#121212] border border-white/10 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                Tabla de posiciones · desde Fecha {standings.activeMatchday}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-white/5">
                    <th className="text-left px-4 py-2">#</th>
                    <th className="text-left px-4 py-2">Jugador</th>
                    {standings.matchdays.map((md) => (
                      <th key={md} className="text-center px-3 py-2">F{md}</th>
                    ))}
                    <th className="text-center px-4 py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.standings.map((row) => (
                    <tr
                      key={row.userId}
                      className={`border-b border-white/5 ${row.rank === 1 ? 'bg-amber-500/5' : ''}`}
                    >
                      <td className="px-4 py-3 font-mono text-gray-400">{row.rank}</td>
                      <td className="px-4 py-3 font-bold text-white">{row.displayName}</td>
                      {standings.matchdays.map((md) => (
                        <td key={md} className="text-center px-3 py-3 text-gray-300">
                          {row.matchdayPoints[String(md)] ?? 0}
                        </td>
                      ))}
                      <td className="text-center px-4 py-3 font-bold text-amber-500">{row.totalPoints}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Participantes</h3>
          {selected.members.map((member) => (
            <div
              key={member.userId}
              className={`bg-[#121212] border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                member.isYou ? 'border-amber-500/40' : 'border-white/5'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{member.displayName}</span>
                  {member.isYou && (
                    <span className="text-[10px] bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded font-bold uppercase">Vos</span>
                  )}
                  {member.isCreator && (
                    <span className="text-[10px] bg-white/10 text-gray-300 px-2 py-0.5 rounded font-bold uppercase">Creador</span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {member.playersCount}/{member.totalSlots} jugadores · Valor plantilla {formatMoney(member.squadValue)}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`text-xs font-bold uppercase px-3 py-1 rounded-full ${
                  member.isComplete ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-gray-400'
                }`}>
                  {member.isComplete ? 'Plantilla completa' : 'En armado'}
                </div>
                <div className="text-sm font-mono text-amber-500">{formatMoney(member.budget)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Torneos entre amigos</h2>
        <p className="text-gray-500 text-sm">Creá un torneo, compartí el código y competí con tu plantilla.</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <form onSubmit={handleCreate} className="bg-[#121212] border border-white/10 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-amber-500">
            <Trophy size={18} />
            <h3 className="font-bold uppercase tracking-wider text-sm">Crear torneo</h3>
          </div>
          <input
            type="text"
            placeholder="Tu nombre"
            value={displayName}
            onChange={(e) => setDisplayNameState(e.target.value)}
            className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-amber-500"
            required
            minLength={2}
          />
          <input
            type="text"
            placeholder="Nombre del torneo (ej: Amigos del laburo)"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-amber-500"
            required
            minLength={3}
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold py-2.5 rounded-lg transition-colors"
          >
            {submitting ? 'Creando...' : 'Crear torneo'}
          </button>
        </form>

        <form onSubmit={handleJoin} className="bg-[#121212] border border-white/10 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-amber-500">
            <Users size={18} />
            <h3 className="font-bold uppercase tracking-wider text-sm">Unirse con código</h3>
          </div>
          <input
            type="text"
            placeholder="Tu nombre"
            value={displayName}
            onChange={(e) => setDisplayNameState(e.target.value)}
            className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-amber-500"
            required
            minLength={2}
          />
          <input
            type="text"
            placeholder="Código de invitación (ej: ABC123)"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-2.5 text-white font-mono tracking-widest uppercase focus:outline-none focus:border-amber-500"
            required
            minLength={4}
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white font-bold py-2.5 rounded-lg transition-colors"
          >
            {submitting ? 'Uniéndose...' : 'Unirse al torneo'}
          </button>
        </form>
      </div>

      <div>
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Mis torneos</h3>
        {loading ? (
          <p className="text-gray-500 text-sm">Cargando...</p>
        ) : tournaments.length === 0 ? (
          <div className="bg-[#121212] border border-dashed border-white/10 rounded-xl p-8 text-center">
            <p className="text-gray-500 text-sm">Todavía no estás en ningún torneo.</p>
            <p className="text-gray-600 text-xs mt-1">Creá uno o unite con un código de invitación.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tournaments.map((t) => (
              <button
                key={t.id}
                onClick={() => openTournament(t.id)}
                className="w-full bg-[#121212] border border-white/5 hover:border-amber-500/30 rounded-xl p-4 flex items-center justify-between text-left transition-colors"
              >
                <div>
                  <div className="font-bold text-white">{t.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {t.memberCount}/{t.maxMembers} jugadores · Código <span className="font-mono text-amber-500">{t.inviteCode}</span>
                  </div>
                </div>
                <Trophy size={18} className="text-gray-600 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
