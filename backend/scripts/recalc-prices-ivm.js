#!/usr/bin/env node
/**
 * Recalculates player prices using the IVM (Índice de Valor de Mercado) algorithm.
 *
 * Requires players-parsed.json to have season stats (run fetch-player-stats.js first).
 * Falls back to career stats (goals/caps) if season stats are missing.
 *
 * Algorithm:
 *   DEL/MED: IVM_Base = goals*0.5 + assists*0.4 + games*0.1
 *   DEF/POR: IVM_Base = clean_sheets*0.5 + tackles*0.3 + games*0.2
 *   IVM_Final = IVM_Base * FP  (Factor de Proyección por selección)
 *   Precio = P_min + (IVM_Final - IVM_min)/(IVM_max - IVM_min) * (P_max - P_min)
 *
 * Usage: node scripts/recalc-prices-ivm.js [--budget 100000000]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLAYERS_JSON = path.join(__dirname, '../src/db/players-parsed.json');
const PLAYERS_JS   = path.join(__dirname, '../src/db/players-data.js');

const P_MIN = 1_500_000;
const P_MAX = 10_000_000;

// Factor de Proyección: fase esperada que alcanzará la selección en WC 2026
const FP = {
  // Semifinal / Final (1.0)
  ARG: 1.0, FRA: 1.0, ENG: 1.0, BRA: 1.0, ESP: 1.0, GER: 1.0, POR: 1.0,
  // Cuartos de final (0.85)
  NED: 0.85, BEL: 0.85, CRO: 0.85, URU: 0.85, COL: 0.85, JPN: 0.85, MAR: 0.85,
  // Octavos de final (0.75)
  USA: 0.75, MEX: 0.75, SEN: 0.75, KOR: 0.75, SUI: 0.75, AUS: 0.75,
  NOR: 0.75, TUR: 0.75, ECU: 0.75, SCO: 0.75, GHA: 0.75, ALG: 0.75,
  // Fase de grupos (0.60)
  QAT: 0.60, CIV: 0.60, IRN: 0.60, KSA: 0.60, PAR: 0.60, EGY: 0.60,
  BIH: 0.60, AUT: 0.60, CZE: 0.60, SWE: 0.60, CAN: 0.60, CUW: 0.60,
  HAI: 0.60, IRQ: 0.60, JOR: 0.60, NZL: 0.60, CPV: 0.60, COD: 0.60,
  RSA: 0.60, UZB: 0.60, PAN: 0.60,
};

function hasSeason(p) {
  return (p.games_season ?? 0) > 0 ||
         (p.goals_season ?? 0) > 0 ||
         (p.assists_season ?? 0) > 0 ||
         (p.clean_sheets_season ?? 0) > 0 ||
         (p.tackles_season ?? 0) > 0;
}

function calcIVM(p) {
  let goals, assists, games, cleanSheets, tackles;

  if (hasSeason(p)) {
    // Use last-season stats (fetched from API-Football)
    goals       = p.goals_season ?? 0;
    assists     = p.assists_season ?? 0;
    games       = p.games_season ?? 0;
    cleanSheets = p.clean_sheets_season ?? 0;
    tackles     = p.tackles_season ?? 0;
  } else {
    // Fallback: career international stats (caps/goals)
    goals       = p.goals ?? 0;
    assists     = 0;
    games       = p.caps ?? 0;
    cleanSheets = 0;
    tackles     = 0;
  }

  let ivm;
  if (p.position === 'DEL' || p.position === 'MED') {
    ivm = goals * 0.5 + assists * 0.4 + games * 0.1;
  } else {
    ivm = cleanSheets * 0.5 + tackles * 0.3 + games * 0.2;
  }

  return ivm * (FP[p.teamCode] ?? 0.60);
}

function writeJS(players) {
  const coreFields = ['id', 'name', 'country', 'teamCode', 'position', 'price', 'points'];
  const payload = players.map(p => {
    const obj = {};
    coreFields.forEach(k => { obj[k] = p[k]; });
    return obj;
  });
  const lines = [
    'export const INITIAL_BUDGET = 100_000_000;',
    '',
    `export const PLAYERS = ${JSON.stringify(payload, null, 2)};`,
    '',
    "export const INITIAL_SLOTS = [",
    "  { id: 'gk1', position: 'POR' },",
    "  { id: 'def1', position: 'DEF' },",
    "  { id: 'def2', position: 'DEF' },",
    "  { id: 'def3', position: 'DEF' },",
    "  { id: 'def4', position: 'DEF' },",
    "  { id: 'mid1', position: 'MED' },",
    "  { id: 'mid2', position: 'MED' },",
    "  { id: 'mid3', position: 'MED' },",
    "  { id: 'mid4', position: 'MED' },",
    "  { id: 'fwd1', position: 'DEL' },",
    "  { id: 'fwd2', position: 'DEL' },",
    "];",
    '',
  ];
  fs.writeFileSync(PLAYERS_JS, lines.join('\n'), 'utf8');
}

const players = JSON.parse(fs.readFileSync(PLAYERS_JSON, 'utf8'));

const withSeason = players.filter(hasSeason).length;
console.log(`Jugadores con stats de temporada: ${withSeason}/${players.length}`);
if (withSeason < players.length * 0.3) {
  console.warn('⚠ Menos del 30% tiene stats de temporada. Ejecutá fetch-player-stats.js primero.');
}

const ivms = players.map(calcIVM);
const ivm_min = Math.min(...ivms);
const ivm_max = Math.max(...ivms);

const updated = players.map((p, i) => {
  const iv = ivms[i];
  const price = ivm_max === ivm_min
    ? P_MIN
    : Math.round(
        Math.max(P_MIN, Math.min(P_MAX,
          P_MIN + ((iv - ivm_min) / (ivm_max - ivm_min)) * (P_MAX - P_MIN)
        )) / 100_000
      ) * 100_000;
  return { ...p, price };
});

fs.writeFileSync(PLAYERS_JSON, JSON.stringify(updated, null, 2), 'utf8');
writeJS(updated);

console.log(`IVM rango: ${ivm_min.toFixed(2)} – ${ivm_max.toFixed(2)}`);
console.log(`Precios: $${P_MIN/1e6}M – $${P_MAX/1e6}M`);
console.log('Jugadores actualizados:', updated.filter((p, i) => p.price !== players[i].price).length);

// Sample output
const sample = [...updated]
  .sort((a, b) => b.price - a.price)
  .slice(0, 10);
console.log('\nTop 10 más caros:');
sample.forEach(p => console.log(` ${p.name} (${p.teamCode}, ${p.position}): $${p.price / 1e6}M`));
