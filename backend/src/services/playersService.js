import { getAllPlayers } from './playersBuilder.js';

export async function getPlayers({ position, search, teamCode } = {}) {
  let players = await getAllPlayers();

  if (position) {
    players = players.filter((p) => p.position === position);
  }

  if (teamCode) {
    players = players.filter((p) => p.teamCode === teamCode.toUpperCase());
  }

  if (search) {
    const term = search.toLowerCase();
    players = players.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.country.toLowerCase().includes(term) ||
        p.teamCode.toLowerCase().includes(term)
    );
  }

  return players
    .map(({ id, name, shirtName, country, teamCode, position, price, points, flag, teamId, group }) => ({
      id,
      name,
      shirtName: shirtName ?? name,
      country,
      teamCode,
      position,
      price,
      points,
      flag,
      teamId,
      group,
    }))
    .sort((a, b) => b.price - a.price);
}
