/**
 * Dummy ABC Team Data for Testing and Development
 * 11 players with realistic cricket roles
 */

import { TeamPlayer, Team } from './cricket-scorer-types';

export const ABC_TEAM_PLAYERS: TeamPlayer[] = [
  {
    id: 'abc-p1',
    name: 'Kieron Pollard',
    role: 'allrounder',
    jerseyNumber: 1,
  },
  {
    id: 'abc-p2',
    name: 'Nicholas Pooran',
    role: 'batsman',
    jerseyNumber: 2,
  },
  {
    id: 'abc-p3',
    name: 'Bhuvneshwar Kumar',
    role: 'bowler',
    jerseyNumber: 3,
  },
  {
    id: 'abc-p4',
    name: 'Sheldon Cottrell',
    role: 'bowler',
    jerseyNumber: 4,
  },
  {
    id: 'abc-p5',
    name: 'Andre Russell',
    role: 'allrounder',
    jerseyNumber: 5,
  },
  {
    id: 'abc-p6',
    name: 'Shai Hope',
    role: 'batsman',
    jerseyNumber: 6,
  },
  {
    id: 'abc-p7',
    name: 'Shimron Hetmyer',
    role: 'batsman',
    jerseyNumber: 7,
  },
  {
    id: 'abc-p8',
    name: 'Keemo Paul',
    role: 'bowler',
    jerseyNumber: 8,
  },
  {
    id: 'abc-p9',
    name: 'Romesh Shepherd',
    role: 'bowler',
    jerseyNumber: 9,
  },
  {
    id: 'abc-p10',
    name: 'Jason Holder',
    role: 'allrounder',
    jerseyNumber: 10,
  },
  {
    id: 'abc-p11',
    name: 'Akeal Hosein',
    role: 'bowler',
    jerseyNumber: 11,
  },
];

export const ABC_TEAM: Team = {
  id: 'abc-team',
  name: 'ABC Team',
  players: ABC_TEAM_PLAYERS,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
