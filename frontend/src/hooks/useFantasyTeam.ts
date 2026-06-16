import { useState, useEffect, useCallback } from 'react';
import { Player, LineupSlot, MatchdayInfo } from '../types';
import * as api from '../api/client';

export function useFantasyTeam() {
  const [slots, setSlots] = useState<LineupSlot[]>([]);
  const [budget, setBudget] = useState(0);
  const [matchday, setMatchday] = useState<MatchdayInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyTeam = useCallback(
    (team: { slots: LineupSlot[]; budget: number; matchday?: MatchdayInfo }) => {
      setSlots(team.slots);
      setBudget(team.budget);
      if (team.matchday) setMatchday(team.matchday);
    },
    []
  );

  const loadTeam = useCallback(async () => {
    try {
      setError(null);
      const team = await api.fetchTeam();
      applyTeam(team);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el equipo.');
    } finally {
      setLoading(false);
    }
  }, [applyTeam]);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  const addPlayer = async (slotId: string, player: Player) => {
    if (matchday?.isLocked) {
      alert('La plantilla está cerrada para esta fecha.');
      return false;
    }
    try {
      const team = await api.addPlayer(slotId, player.id);
      applyTeam(team);
      return true;
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo fichar al jugador.');
      return false;
    }
  };

  const removePlayer = async (slotId: string) => {
    if (matchday?.isLocked) return;
    try {
      const team = await api.removePlayer(slotId);
      applyTeam(team);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo liberar al jugador.');
    }
  };

  const resetTeam = async () => {
    if (matchday?.isLocked) {
      alert('No podés reiniciar la plantilla con el mercado cerrado.');
      return;
    }
    try {
      const team = await api.resetTeam();
      applyTeam(team);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo reiniciar el equipo.');
    }
  };

  const canEditSquad = matchday?.canEditSquad ?? true;

  return {
    slots,
    budget,
    matchday,
    canEditSquad,
    loading,
    error,
    addPlayer,
    removePlayer,
    resetTeam,
    reload: loadTeam,
  };
}
