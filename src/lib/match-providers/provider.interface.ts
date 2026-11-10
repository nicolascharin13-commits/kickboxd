import type { NormalizedCompetition, NormalizedMatch, NormalizedTeam } from './types'

export interface MatchDataProvider {
  getCompetitions(): Promise<NormalizedCompetition[]>
  getTeams(competitionCode: string, season: string): Promise<NormalizedTeam[]>
  getMatches(competitionCode: string, season: string): Promise<NormalizedMatch[]>
  getMatchesByDateRange(dateFrom: string, dateTo: string): Promise<NormalizedMatch[]>
  getMatch(apiId: number): Promise<NormalizedMatch | null>
  getLiveMatches(): Promise<NormalizedMatch[]>
}
