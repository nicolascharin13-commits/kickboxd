// Logique de synchronisation football-data.org → Supabase
// Utilisée par les endpoints de sync et les cron jobs

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getMatchProvider } from './match-providers'
import type { NormalizedMatch, NormalizedTeam } from './match-providers/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, any, any>

// Client service role — bypass RLS pour les écritures
function getServiceClient(): Db {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function syncCompetition(code: string, season: string) {
  const supabase = getServiceClient()
  const provider = getMatchProvider()
  const startedAt = Date.now()
  let itemsSynced = 0

  try {
    // 1. Récupérer et upsert les équipes
    const teams = await provider.getTeams(code, season)
    await upsertTeams(supabase, teams)
    itemsSynced += teams.length

    // 2. Upsert toutes les compétitions disponibles
    const competitions = await provider.getCompetitions()
    await upsertCompetitions(supabase, competitions)

    // 3. Récupérer les matchs de la compétition
    const matchData = await provider.getMatches(code, season)
    if (matchData.length === 0) {
      await logSync(supabase, `/competitions/${code}/matches`, 200, 0)
      return { teams: teams.length, matches: 0 }
    }

    const compApiId = matchData[0].competitionApiId

    // 4. Récupérer l'id interne de la compétition
    const { data: compRow } = await supabase
      .from('competitions')
      .select('id')
      .eq('api_id', compApiId)
      .single()

    if (!compRow) throw new Error(`Compétition api_id=${compApiId} non trouvée après upsert`)

    // 5. Upsert les matchs
    await upsertMatches(supabase, matchData, compRow.id)
    itemsSynced += matchData.length

    await logSync(supabase, `/competitions/${code}/matches`, 200, itemsSynced)
    return { teams: teams.length, matches: matchData.length, duration: Date.now() - startedAt }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await logSync(supabase, `/competitions/${code}`, 500, itemsSynced, message)
    throw err
  }
}

export async function syncRecentMatches() {
  const supabase = getServiceClient()
  const provider = getMatchProvider()

  const yesterday = formatDate(new Date(Date.now() - 86400000))
  const today = formatDate(new Date())

  try {
    const matches = await provider.getMatchesByDateRange(yesterday, today)
    await updateMatchScores(supabase, matches)
    await logSync(supabase, `/matches?dateFrom=${yesterday}&dateTo=${today}`, 200, matches.length)
    return { updated: matches.length }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await logSync(supabase, '/matches/recent', 500, 0, message)
    throw err
  }
}

export async function syncLiveMatches() {
  const supabase = getServiceClient()
  const provider = getMatchProvider()

  try {
    const liveFromApi = await provider.getLiveMatches()
    const liveApiIds = new Set(liveFromApi.map((m) => m.apiId))

    // Mettre à jour les matchs effectivement en direct
    if (liveFromApi.length > 0) {
      await updateMatchScores(supabase, liveFromApi)
    }

    // Fermer les matchs orphelins : status=live en DB mais absents de l'API
    const { data: liveInDb } = await supabase
      .from('matches')
      .select('id, api_id, kickoff')
      .eq('status', 'live')

    const orphans = (liveInDb ?? []).filter((m: { api_id: number }) => !liveApiIds.has(m.api_id))

    if (orphans.length > 0) {
      const orphanIds = orphans.map((m: { id: number }) => m.id)
      await supabase
        .from('matches')
        .update({ status: 'finished', updated_at: new Date().toISOString() })
        .in('id', orphanIds)
    }

    await logSync(supabase, '/matches?status=IN_PLAY', 200, liveFromApi.length)
    return { updated: liveFromApi.length, closed: orphans.length }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await logSync(supabase, '/matches/live', 500, 0, message)
    throw err
  }
}

export async function syncUpcomingMatches() {
  const supabase = getServiceClient()
  const provider = getMatchProvider()

  const today = formatDate(new Date())
  const in7days = formatDate(new Date(Date.now() + 7 * 86400000))

  try {
    const matches = await provider.getMatchesByDateRange(today, in7days)
    await upsertMatchesMinimal(supabase, matches)
    await logSync(supabase, `/matches?dateFrom=${today}&dateTo=${in7days}`, 200, matches.length)
    return { synced: matches.length }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await logSync(supabase, '/matches/upcoming', 500, 0, message)
    throw err
  }
}

// =========================================================
// Helpers d'upsert
// =========================================================

async function upsertTeams(supabase: Db, teams: NormalizedTeam[]) {
  const rows = teams.map((t) => ({
    api_id: t.apiId,
    name: t.name,
    short_name: t.shortName,
    country: t.country,
    logo_url: t.logoUrl,
    type: t.type,
    founded: t.founded,
  }))
  await supabase.from('teams').upsert(rows, { onConflict: 'api_id' })
}

async function upsertCompetitions(
  supabase: Db,
  competitions: Awaited<ReturnType<ReturnType<typeof getMatchProvider>['getCompetitions']>>
) {
  const rows = competitions.map((c) => ({
    api_id: c.apiId,
    name: c.name,
    country: c.country,
    logo_url: c.logoUrl,
    type: c.type,
    tier: c.tier,
  }))
  await supabase.from('competitions').upsert(rows, { onConflict: 'api_id' })
}

async function upsertMatches(supabase: Db, matches: NormalizedMatch[], competitionId: number) {
  // Upsert les équipes extraites des matchs (évite de dépendre de getTeams)
  const teamsFromMatches = new Map<
    number,
    { name: string; shortName: string | null; logoUrl: string | null; country: string | null }
  >()
  for (const m of matches) {
    if (m.homeTeamData && m.homeTeamApiId) teamsFromMatches.set(m.homeTeamApiId, m.homeTeamData)
    if (m.awayTeamData && m.awayTeamApiId) teamsFromMatches.set(m.awayTeamApiId, m.awayTeamData)
  }
  if (teamsFromMatches.size > 0) {
    const teamRows = Array.from(teamsFromMatches.entries()).map(([apiId, t]) => ({
      api_id: apiId,
      name: t.name,
      short_name: t.shortName,
      country: t.country,
      logo_url: t.logoUrl,
      type: 'club' as const,
      founded: null,
    }))
    await supabase.from('teams').upsert(teamRows, { onConflict: 'api_id' })
  }

  // Récupérer le mapping api_id → id pour les équipes
  const teamApiIds = [...new Set(matches.flatMap((m) => [m.homeTeamApiId, m.awayTeamApiId]))]
  const { data: teams } = await supabase.from('teams').select('id, api_id').in('api_id', teamApiIds)

  const teamMap = new Map(
    (teams ?? []).map((t: { api_id: number; id: number }) => [t.api_id, t.id])
  )

  const rows = matches.map((m) => ({
    api_id: m.apiId,
    competition_id: competitionId,
    season: m.season,
    matchday: m.matchday,
    kickoff: m.kickoff,
    status: m.status,
    home_team_id: teamMap.get(m.homeTeamApiId) ?? null,
    away_team_id: teamMap.get(m.awayTeamApiId) ?? null,
    home_score: m.homeScore,
    away_score: m.awayScore,
    home_score_ht: m.homeScoreHt,
    away_score_ht: m.awayScoreHt,
    venue: m.venue,
    updated_at: new Date().toISOString(),
  }))

  await supabase.from('matches').upsert(rows, { onConflict: 'api_id' })
}

async function updateMatchScores(supabase: Db, matches: NormalizedMatch[]) {
  for (const m of matches) {
    await supabase
      .from('matches')
      .update({
        status: m.status,
        home_score: m.homeScore,
        away_score: m.awayScore,
        home_score_ht: m.homeScoreHt,
        away_score_ht: m.awayScoreHt,
        updated_at: new Date().toISOString(),
      })
      .eq('api_id', m.apiId)
  }
}

async function upsertMatchesMinimal(supabase: Db, matches: NormalizedMatch[]) {
  if (matches.length === 0) return

  // Résoudre les competition_id
  const compApiIds = [...new Set(matches.map((m) => m.competitionApiId))]
  const { data: comps } = await supabase
    .from('competitions')
    .select('id, api_id')
    .in('api_id', compApiIds)
  const compMap = new Map(
    (comps ?? []).map((c: { api_id: number; id: number }) => [c.api_id, c.id])
  )

  // Résoudre les team_id
  const teamApiIds = [...new Set(matches.flatMap((m) => [m.homeTeamApiId, m.awayTeamApiId]))]
  const { data: teams } = await supabase.from('teams').select('id, api_id').in('api_id', teamApiIds)
  const teamMap = new Map(
    (teams ?? []).map((t: { api_id: number; id: number }) => [t.api_id, t.id])
  )

  const rows = matches
    .map((m) => ({
      api_id: m.apiId,
      competition_id: compMap.get(m.competitionApiId) ?? null,
      season: m.season,
      matchday: m.matchday,
      kickoff: m.kickoff,
      status: m.status,
      home_team_id: teamMap.get(m.homeTeamApiId) ?? null,
      away_team_id: teamMap.get(m.awayTeamApiId) ?? null,
      home_score: m.homeScore,
      away_score: m.awayScore,
      home_score_ht: m.homeScoreHt,
      away_score_ht: m.awayScoreHt,
      venue: m.venue,
      updated_at: new Date().toISOString(),
    }))
    .filter((r) => r.competition_id !== null && r.home_team_id !== null && r.away_team_id !== null)

  if (rows.length > 0) {
    await supabase.from('matches').upsert(rows, { onConflict: 'api_id' })
  }
}

async function logSync(
  supabase: Db,
  endpoint: string,
  status: number,
  itemsSynced: number,
  error?: string
) {
  await supabase.from('api_sync_logs').insert({
    endpoint,
    status,
    items_synced: itemsSynced,
    error: error ?? null,
  })
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0]
}
