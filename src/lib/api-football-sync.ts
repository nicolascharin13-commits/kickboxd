// Sync des compétitions extra via ESPN API (gratuit, sans limite)
// 5 compétitions : Europa League, Conference League, Nations League, FA Cup, Coupe de France
// ~190 req/jour (38 jours × 5 compétitions — fenêtre J-30 → J+7)

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, any, any>

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer'

function getServiceClient(): Db {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

const EXTRA_COMPETITIONS = [
  {
    espnSlug: 'uefa.europa',
    compApiId: 50003,
    name: 'UEFA Europa League',
    country: 'Europe',
    logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/2.png',
  },
  {
    espnSlug: 'uefa.europa.conf',
    compApiId: 50848,
    name: 'UEFA Conference League',
    country: 'Europe',
    logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/20296.png',
  },
  {
    espnSlug: 'uefa.nations',
    compApiId: 50005,
    name: 'UEFA Nations League',
    country: 'Europe',
    logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/20298.png',
  },
  {
    espnSlug: 'eng.fa',
    compApiId: 50045,
    name: 'FA Cup',
    country: 'England',
    logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/44.png',
  },
  {
    espnSlug: 'fra.coupe_de_france',
    compApiId: 50065,
    name: 'Coupe de France',
    country: 'France',
    logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/182.png',
  },
]

type MatchStatus = 'scheduled' | 'live' | 'finished' | 'postponed'

function mapEspnStatus(statusName: string, state: string): MatchStatus {
  if (state === 'in') return 'live'
  if (state === 'post') {
    if (
      ['STATUS_POSTPONED', 'STATUS_CANCELED', 'STATUS_ABANDONED', 'STATUS_SUSPENDED'].includes(
        statusName
      )
    ) {
      return 'postponed'
    }
    return 'finished'
  }
  if (
    ['STATUS_POSTPONED', 'STATUS_CANCELED', 'STATUS_ABANDONED', 'STATUS_SUSPENDED'].includes(
      statusName
    )
  ) {
    return 'postponed'
  }
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

function formatDateESPN(d: Date): string {
  // ESPN date format: YYYYMMDD
  return d.toISOString().split('T')[0].replace(/-/g, '')
}

interface EspnEvent {
  id: string
  date: string
  season: { year: number; slug: string }
  competitions: Array<{
    status: { type: { name: string; state: string } }
    venue?: { fullName: string }
    competitors: Array<{
      homeAway: 'home' | 'away'
      score: string
      team: { id: string; displayName: string; logo?: string }
    }>
  }>
}

async function fetchEspnScoreboard(slug: string, dateStr: string): Promise<EspnEvent[]> {
  try {
    const url = `${ESPN_BASE}/${slug}/scoreboard?dates=${dateStr}&limit=50`
    const res = await fetch(url)
    if (!res.ok) return []
    const data = await res.json()
    return (data.events ?? []) as EspnEvent[]
  } catch {
    return []
  }
}

async function ensureCompetitions(supabase: Db) {
  const rows = EXTRA_COMPETITIONS.map((c) => ({
    api_id: c.compApiId,
    name: c.name,
    country: c.country,
    type: 'cup' as const,
    tier: 1,
    logo_url: c.logo,
  }))
  await supabase.from('competitions').upsert(rows, { onConflict: 'api_id' })
}

interface NormalizedFixture {
  espnId: number
  compApiId: number
  season: string
  matchday: string | null
  kickoff: string
  status: MatchStatus
  homeTeamEspnId: number
  homeTeamName: string
  homeTeamLogo: string | null
  awayTeamEspnId: number
  awayTeamName: string
  awayTeamLogo: string | null
  homeScore: number | null
  awayScore: number | null
  venue: string | null
}

function parseEspnEvents(events: EspnEvent[], compApiId: number): NormalizedFixture[] {
  const fixtures: NormalizedFixture[] = []
  for (const e of events) {
    const comp = e.competitions[0]
    if (!comp) continue

    const home = comp.competitors.find((c) => c.homeAway === 'home')
    const away = comp.competitors.find((c) => c.homeAway === 'away')
    if (!home || !away) continue

    const statusType = comp.status.type
    const status = mapEspnStatus(statusType.name, statusType.state)

    const homeScore = statusType.state !== 'pre' ? parseInt(home.score, 10) : null
    const awayScore = statusType.state !== 'pre' ? parseInt(away.score, 10) : null

    const year = e.season.year
    // Saisons européennes : année 2026 = saison 2025-2026
    const season = `${year - 1}-${year}`

    fixtures.push({
      espnId: parseInt(e.id, 10),
      compApiId,
      season,
      matchday: e.season.slug ?? null,
      kickoff: e.date,
      status,
      homeTeamEspnId: parseInt(home.team.id, 10),
      homeTeamName: home.team.displayName,
      homeTeamLogo: home.team.logo ?? null,
      awayTeamEspnId: parseInt(away.team.id, 10),
      awayTeamName: away.team.displayName,
      awayTeamLogo: away.team.logo ?? null,
      homeScore: isNaN(homeScore as number) ? null : homeScore,
      awayScore: isNaN(awayScore as number) ? null : awayScore,
      venue: comp.venue?.fullName ?? null,
    })
  }
  return fixtures
}

// ESPN team api_id namespace : 9000000 + espnTeamId (évite conflits avec football-data.org et API-Football)
function espnTeamApiId(espnTeamId: number): number {
  return 9000000 + espnTeamId
}

async function resolveTeamIds(
  supabase: Db,
  fixtures: NormalizedFixture[]
): Promise<Map<number, number>> {
  const teamsToResolve = new Map<number, { name: string; logo: string | null }>()
  for (const f of fixtures) {
    teamsToResolve.set(f.homeTeamEspnId, { name: f.homeTeamName, logo: f.homeTeamLogo })
    teamsToResolve.set(f.awayTeamEspnId, { name: f.awayTeamName, logo: f.awayTeamLogo })
  }

  // 1. Try to match by namespaced ESPN api_id (teams already inserted from ESPN)
  const espnApiIds = Array.from(teamsToResolve.keys()).map(espnTeamApiId)
  const { data: existingByEspnId } = await supabase
    .from('teams')
    .select('id, api_id')
    .in('api_id', espnApiIds)

  const teamIdMap = new Map<number, number>()
  const foundByEspnId = new Set<number>()

  for (const t of existingByEspnId ?? []) {
    const espnId = (t.api_id as number) - 9000000
    teamIdMap.set(espnId, t.id as number)
    foundByEspnId.add(espnId)
  }

  // 2. For remaining, try name matching against all teams
  const unmatched = Array.from(teamsToResolve.keys()).filter((id) => !foundByEspnId.has(id))
  if (unmatched.length > 0) {
    const { data: allTeams } = await supabase.from('teams').select('id, name')
    const existingByNorm = new Map(
      (allTeams ?? []).map((t: { id: number; name: string }) => [normalizeName(t.name), t.id])
    )

    const toInsert: { api_id: number; name: string; logo_url: string | null; type: 'club' }[] = []

    for (const espnId of unmatched) {
      const team = teamsToResolve.get(espnId)!
      const matchedId = existingByNorm.get(normalizeName(team.name))
      if (matchedId) {
        teamIdMap.set(espnId, matchedId)
      } else {
        toInsert.push({
          api_id: espnTeamApiId(espnId),
          name: team.name,
          logo_url: team.logo,
          type: 'club',
        })
      }
    }

    if (toInsert.length > 0) {
      const { data: inserted } = await supabase
        .from('teams')
        .upsert(toInsert, { onConflict: 'api_id' })
        .select('id, api_id')
      for (const t of inserted ?? []) {
        const espnId = (t.api_id as number) - 9000000
        teamIdMap.set(espnId, t.id as number)
      }
    }
  }

  return teamIdMap
}

export async function syncExtraCompetitions(): Promise<{ synced: number; requests: number }> {
  const supabase = getServiceClient()

  // Fenêtre : J-30 → J+7 (38 jours × 5 compétitions = ~190 req — ESPN gratuit sans limite)
  const dates: string[] = []
  for (let i = -30; i <= 7; i++) {
    dates.push(formatDateESPN(new Date(Date.now() + i * 86400000)))
  }

  let totalRequests = 0
  const allFixtures: NormalizedFixture[] = []
  const seenIds = new Set<number>()

  for (const comp of EXTRA_COMPETITIONS) {
    for (const date of dates) {
      const events = await fetchEspnScoreboard(comp.espnSlug, date)
      totalRequests++
      const fixtures = parseEspnEvents(events, comp.compApiId)
      for (const f of fixtures) {
        if (!seenIds.has(f.espnId)) {
          seenIds.add(f.espnId)
          allFixtures.push(f)
        }
      }
    }
  }

  if (allFixtures.length === 0) return { synced: 0, requests: totalRequests }

  await ensureCompetitions(supabase)

  const { data: comps } = await supabase
    .from('competitions')
    .select('id, api_id')
    .in(
      'api_id',
      EXTRA_COMPETITIONS.map((c) => c.compApiId)
    )

  const compMap = new Map(
    (comps ?? []).map((c: { api_id: number; id: number }) => [c.api_id, c.id])
  )

  const teamIdMap = await resolveTeamIds(supabase, allFixtures)

  const rows = allFixtures
    .map((f) => ({
      // ESPN event IDs ~400M+ — pas de conflit avec football-data.org ~576K ni API-Football ~1.3M
      api_id: f.espnId,
      competition_id: compMap.get(f.compApiId) ?? null,
      season: f.season,
      matchday: f.matchday,
      kickoff: f.kickoff,
      status: f.status,
      home_team_id: teamIdMap.get(f.homeTeamEspnId) ?? null,
      away_team_id: teamIdMap.get(f.awayTeamEspnId) ?? null,
      home_score: f.homeScore,
      away_score: f.awayScore,
      home_score_ht: null,
      away_score_ht: null,
      venue: f.venue,
      updated_at: new Date().toISOString(),
    }))
    .filter((r) => r.competition_id !== null && r.home_team_id !== null && r.away_team_id !== null)

  if (rows.length > 0) {
    await supabase.from('matches').upsert(rows, { onConflict: 'api_id' })
  }

  return { synced: rows.length, requests: totalRequests }
}
