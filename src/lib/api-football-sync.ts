// Sync des compétitions non couvertes par football-data.org via API-Football free
// 5 compétitions extra : Europa League, Conference League, Nations League, FA Cup, Coupe de France
// Budget : ~9 req/jour (toutes compétitions confondues via filtre client-side)

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, any, any>

const BASE_URL = 'https://v3.football.api-sports.io'

function getServiceClient(): Db {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

function apiHeaders() {
  return { 'x-apisports-key': process.env.API_FOOTBALL_KEY! }
}

const EXTRA_COMPETITIONS = [
  {
    leagueId: 3,
    name: 'UEFA Europa League',
    country: 'Europe',
    logo: 'https://media.api-sports.io/football/leagues/3.png',
  },
  {
    leagueId: 848,
    name: 'UEFA Conference League',
    country: 'Europe',
    logo: 'https://media.api-sports.io/football/leagues/848.png',
  },
  {
    leagueId: 5,
    name: 'UEFA Nations League',
    country: 'Europe',
    logo: 'https://media.api-sports.io/football/leagues/5.png',
  },
  {
    leagueId: 45,
    name: 'FA Cup',
    country: 'England',
    logo: 'https://media.api-sports.io/football/leagues/45.png',
  },
  {
    leagueId: 65,
    name: 'Coupe de France',
    country: 'France',
    logo: 'https://media.api-sports.io/football/leagues/65.png',
  },
]

const EXTRA_LEAGUE_IDS = new Set(EXTRA_COMPETITIONS.map((c) => c.leagueId))

// Competition api_id namespace : 50000 + leagueId (football-data.org utilise 2000-2019)
function compApiId(leagueId: number): number {
  return 50000 + leagueId
}

type MatchStatus = 'scheduled' | 'live' | 'finished' | 'postponed'

function mapStatus(shortStatus: string): MatchStatus {
  if (['1H', '2H', 'HT', 'ET', 'P', 'BT', 'LIVE'].includes(shortStatus)) return 'live'
  if (['FT', 'AET', 'PEN'].includes(shortStatus)) return 'finished'
  if (['PST', 'CANC', 'SUSP', 'ABD'].includes(shortStatus)) return 'postponed'
  return 'scheduled'
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(fc|sc|afc|cf|ac|as|ss|rb|rcd|sd|ud|rc|ca|cd|ssc)\b/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

interface ApiFixture {
  fixture: {
    id: number
    date: string
    status: { short: string }
    venue: { name: string | null }
    referee: string | null
  }
  league: {
    id: number
    season: number
    round: string | null
  }
  teams: {
    home: { id: number; name: string; logo: string | null }
    away: { id: number; name: string; logo: string | null }
  }
  goals: { home: number | null; away: number | null }
  score: {
    halftime: { home: number | null; away: number | null }
    fulltime: { home: number | null; away: number | null }
  }
}

async function fetchFixturesByDate(date: string): Promise<ApiFixture[]> {
  const res = await fetch(`${BASE_URL}/fixtures?date=${date}`, { headers: apiHeaders() })
  if (!res.ok) return []
  const data = await res.json()
  if (data.errors && Object.keys(data.errors).length > 0) return []
  const all: ApiFixture[] = data.response ?? []
  return all.filter((f) => EXTRA_LEAGUE_IDS.has(f.league.id))
}

async function ensureCompetitions(supabase: Db) {
  const rows = EXTRA_COMPETITIONS.map((c) => ({
    api_id: compApiId(c.leagueId),
    name: c.name,
    country: c.country,
    type: 'cup' as const,
    tier: 1,
    logo_url: c.logo,
  }))
  await supabase.from('competitions').upsert(rows, { onConflict: 'api_id' })
}

async function resolveTeamIds(supabase: Db, fixtures: ApiFixture[]): Promise<Map<number, number>> {
  // Collect unique teams
  const teamsToResolve = new Map<number, { name: string; logo: string | null }>()
  for (const f of fixtures) {
    teamsToResolve.set(f.teams.home.id, { name: f.teams.home.name, logo: f.teams.home.logo })
    teamsToResolve.set(f.teams.away.id, { name: f.teams.away.name, logo: f.teams.away.logo })
  }

  // Load all existing teams for name matching
  const { data: existingTeams } = await supabase.from('teams').select('id, name')
  const existingByNorm = new Map(
    (existingTeams ?? []).map((t: { id: number; name: string }) => [normalizeName(t.name), t.id])
  )

  const teamIdMap = new Map<number, number>()
  const toInsert: { api_id: number; name: string; logo_url: string | null; type: 'club' }[] = []

  for (const [afId, team] of teamsToResolve) {
    const match = existingByNorm.get(normalizeName(team.name))
    if (match) {
      teamIdMap.set(afId, match)
    } else {
      // Negative api_id = équipe source API-Football (évite conflit avec football-data.org)
      toInsert.push({ api_id: -afId, name: team.name, logo_url: team.logo, type: 'club' })
    }
  }

  if (toInsert.length > 0) {
    const { data: inserted } = await supabase
      .from('teams')
      .upsert(toInsert, { onConflict: 'api_id' })
      .select('id, api_id')
    for (const t of inserted ?? []) {
      teamIdMap.set(-(t.api_id as number), t.id as number)
    }
  }

  return teamIdMap
}

export async function syncExtraCompetitions(): Promise<{ synced: number; requests: number }> {
  const supabase = getServiceClient()

  if (!process.env.API_FOOTBALL_KEY) throw new Error('API_FOOTBALL_KEY non configurée')

  // Fenêtre : hier → J+7 (9 dates = 9 req pour toutes les compétitions confondues)
  const dates: string[] = []
  for (let i = -1; i <= 7; i++) {
    dates.push(formatDate(new Date(Date.now() + i * 86400000)))
  }

  const allFixtures: ApiFixture[] = []
  for (const date of dates) {
    const fixtures = await fetchFixturesByDate(date)
    allFixtures.push(...fixtures)
  }

  if (allFixtures.length === 0) return { synced: 0, requests: dates.length }

  await ensureCompetitions(supabase)

  const { data: comps } = await supabase
    .from('competitions')
    .select('id, api_id')
    .in(
      'api_id',
      EXTRA_COMPETITIONS.map((c) => compApiId(c.leagueId))
    )

  const compMap = new Map(
    (comps ?? []).map((c: { api_id: number; id: number }) => [c.api_id, c.id])
  )

  const teamIdMap = await resolveTeamIds(supabase, allFixtures)

  const rows = allFixtures
    .map((f) => ({
      // API-Football fixture IDs ~1.3M+ — pas de conflit avec football-data.org ~576K
      api_id: f.fixture.id,
      api_football_id: f.fixture.id,
      competition_id: compMap.get(compApiId(f.league.id)) ?? null,
      season: `${f.league.season}-${f.league.season + 1}`,
      matchday: f.league.round ?? null,
      kickoff: f.fixture.date,
      status: mapStatus(f.fixture.status.short),
      home_team_id: teamIdMap.get(f.teams.home.id) ?? null,
      away_team_id: teamIdMap.get(f.teams.away.id) ?? null,
      home_score: f.score.fulltime.home,
      away_score: f.score.fulltime.away,
      home_score_ht: f.score.halftime.home,
      away_score_ht: f.score.halftime.away,
      venue: f.fixture.venue.name,
      updated_at: new Date().toISOString(),
    }))
    .filter((r) => r.competition_id !== null && r.home_team_id !== null && r.away_team_id !== null)

  if (rows.length > 0) {
    await supabase.from('matches').upsert(rows, { onConflict: 'api_id' })
  }

  return { synced: rows.length, requests: dates.length }
}
