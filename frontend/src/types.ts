export type Position = 'POR' | 'DEF' | 'MED' | 'DEL';

export interface Player {
  id: string;
  name: string;
  country: string;
  position: Position;
  price: number;
  points: number;
  teamCode: string;
  flag?: string;
  teamId?: string;
  group?: string;
}

export interface LineupSlot {
  id: string;
  position: Position;
  player: Player | null;
}

export interface TeamResponse {
  userId: string;
  budget: number;
  slots: LineupSlot[];
  matchday?: MatchdayInfo;
}

export interface MatchdayInfo {
  matchday: number;
  activeMatchday: number;
  firstKickoff: string;
  lockDeadline: string;
  isLocked: boolean;
  isFinished: boolean;
  gamesCount: number;
  finishedCount: number;
  canEditSquad: boolean;
  msUntilLock: number;
}

export interface StandingEntry {
  rank: number;
  userId: string;
  displayName: string;
  totalPoints: number;
  matchdayPoints: Record<string, number>;
}

export interface TournamentStandings {
  activeMatchday: number;
  matchdays: number[];
  standings: StandingEntry[];
}

export interface TournamentSummary {
  id: string;
  name: string;
  inviteCode: string;
  creatorUserId: string;
  maxMembers: number;
  memberCount: number;
  createdAt: string;
}

export interface TournamentMember {
  userId: string;
  displayName: string;
  joinedAt: string;
  isCreator: boolean;
  isYou: boolean;
  playersCount: number;
  totalSlots: number;
  budget: number;
  squadValue: number;
  isComplete: boolean;
}

export interface TournamentDetail extends TournamentSummary {
  isCreator: boolean;
  matchday?: MatchdayInfo;
  members: TournamentMember[];
}
