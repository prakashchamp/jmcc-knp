/**
 * Dummy ABC Team Data for Testing and Development
 * 11 players with realistic cricket roles
 */

import { TeamPlayer, Team } from './cricket-scorer-types';

export const ABC_TEAM_PLAYERS: TeamPlayer[] = [
  {
    id: 'abc-p1',
    name: 'Kieron Pollard',
    jerseyNumber: 1,
  },
  {
    id: 'abc-p2',
    name: 'Nicholas Pooran',
    jerseyNumber: 2,
  },
  {
    id: 'abc-p3',
    name: 'Bhuvneshwar Kumar',
    jerseyNumber: 3,
  },
  {
    id: 'abc-p4',
    name: 'Sheldon Cottrell',
    jerseyNumber: 4,
  },
  {
    id: 'abc-p5',
    name: 'Andre Russell',
    jerseyNumber: 5,
  },
  {
    id: 'abc-p6',
    name: 'Shai Hope',
    jerseyNumber: 6,
  },
  {
    id: 'abc-p7',
    name: 'Shimron Hetmyer',
    jerseyNumber: 7,
  },
  {
    id: 'abc-p8',
    name: 'Keemo Paul',
    jerseyNumber: 8,
  },
  {
    id: 'abc-p9',
    name: 'Romesh Shepherd',
    jerseyNumber: 9,
  },
  {
    id: 'abc-p10',
    name: 'Jason Holder',
    jerseyNumber: 10,
  },
  {
    id: 'abc-p11',
    name: 'Akeal Hosein',
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
