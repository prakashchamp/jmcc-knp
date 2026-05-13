import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';

/**
 * Custom hook to get the primary team name
 * Returns Firestore team name or default 'JMCC KNP' if not set
 */
export function useTeamName() {
  const team = useSelector((state: RootState) => state.team.team);
  return team?.name || 'JMCC KNP';
}
