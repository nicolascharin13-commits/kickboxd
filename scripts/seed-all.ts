/**
 * Seed complet : synchronise toutes les compétitions sur toutes les saisons
 * Usage : npx tsx scripts/seed-all.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
import { FootballDataProvider } from '../src/lib/match-providers/football-data'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const provider = new FootballDataProvider(process.env.FOOTBALL_DATA_API_KEY!)

// Limite du free tier football-data.org : saison en cours + 2 saisons passées
const COMPETITIONS = [
  {
    code: 'CL',
    label: 'Champions League',
    seasons: ['2026-2027', '2025-2026', '2024-2025', '2023-2024'],
  },
  { code: 'FL1', label: 'Ligue 1', seasons: ['2026-2027', '2025-2026', '2024-2025', '2023-2024'] },
  {
    code: 'PL',
    label: 'Premier League',
    seasons: ['2026-2027', '2025-2026', '2024-2025', '2023-2024'],
  },
  { code: 'PD', label: 'La Liga', seasons: ['2026-2027', '2025-2026', '2024-2025', '2023-2024'] },
  {
    code: 'BL1',
    label: 'Bundesliga',
    seasons: ['2026-2027', '2025-2026', '2024-2025', '2023-2024'],
  },
  { code: 'SA', label: 'Serie A', seasons: ['2026-2027', '2025-2026', '2024-2025', '2023-2024'] },
  {
    code: 'DED',
    label: 'Eredivisie',
    seasons: ['2026-2027', '2025-2026', '2024-2025', '2023-2024'],
  },
  {
    code: 'PPL',
    label: 'Primeira Liga',
    seasons: ['2026-2027', '2025-2026', '2024-2025', '2023-2024'],
  },
  {
    code: 'ELC',
    label: 'Championship',
    seasons: ['2026-2027', '2025-2026', '2024-2025', '2023-2024'],
  },
  {
    code: 'BSA',
    label: 'Série A Brésilienne',
    seasons: ['2026-2027', '2025-2026', '2024-2025', '2023-2024'],
  },
  {
    code: 'CLI',
    label: 'Copa Libertadores',
    seasons: ['2026-2027', '2025-2026', '2024-2025', '2023-2024'],
  },
  { code: 'WC', label: 'Coupe du Monde 2026', seasons: ['2026-2027'] },
  { code: 'EC', label: 'Euro', seasons: ['2024-2025'] },
]

const DELAY = 7000 // 7s entre chaque requête (free tier = 10 req/min)

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function syncOne(code: string, season: string, label: string) {
  process.stdout.write(`  [${code} ${season}] `)

  try {
    // 1. Équipes
    process.stdout.write('équipes… ')
    const teams = await provider.getTeams(code, season)
    await supabase.from('teams').upsert(
      teams.map((t) => ({
        api_id: t.apiId,
        name: t.name,
        short_name: t.shortName,
        country: t.country,
        logo_url: t.logoUrl,
        type: t.type,
        founded: t.founded,
      })),
      { onConflict: 'api_id' }
    )
    await sleep(DELAY)

    // 2. Compétitions
    process.stdout.write('compétitions… ')
    const competitions = await provider.getCompetitions()
    await supabase.from('competitions').upsert(
      competitions.map((c) => ({
        api_id: c.apiId,
        name: c.name,
        country: c.country,
        logo_url: c.logoUrl,
        type: c.type,
        tier: c.tier,
      })),
      { onConflict: 'api_id' }
    )
    await sleep(DELAY)

    // 3. Matchs
    process.stdout.write('matchs… ')
    const matches = await provider.getMatches(code, season)
    if (matches.length === 0) {
      console.log('⚠ aucun match')
      return
    }

    const { data: compRow } = await supabase
      .from('competitions')
      .select('id')
      .eq('api_id', matches[0].competitionApiId)
      .single()
    if (!compRow) throw new Error('Compétition introuvable en base')

    // Résoudre les team ids
    const teamApiIds = [...new Set(matches.flatMap((m) => [m.homeTeamApiId, m.awayTeamApiId]))]
    const { data: teamRows } = await supabase
      .from('teams')
      .select('id, api_id')
      .in('api_id', teamApiIds)
    const teamMap = new Map(
      (teamRows ?? []).map((t: { api_id: number; id: number }) => [t.api_id, t.id])
    )

    const matchRows = matches.map((m) => ({
      api_id: m.apiId,
      competition_id: compRow.id,
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

    for (let i = 0; i < matchRows.length; i += 50) {
      await supabase.from('matches').upsert(matchRows.slice(i, i + 50), { onConflict: 'api_id' })
      process.stdout.write('.')
    }

    console.log(` ✓ ${matches.length} matchs`)
    await sleep(DELAY)
  } catch (err) {
    console.log(` ✗ ${err instanceof Error ? err.message : err}`)
    await sleep(DELAY)
  }
}

async function main() {
  console.log('🚀 Seed complet — toutes compétitions, toutes saisons\n')
  console.log(
    `⏱  ~${Math.round((COMPETITIONS.reduce((s, c) => s + c.seasons.length, 0) * 3 * DELAY) / 60000)} minutes estimées\n`
  )

  for (const { code, label, seasons } of COMPETITIONS) {
    console.log(`\n▶ ${label}`)
    for (const season of seasons) {
      await syncOne(code, season, label)
    }
  }

  console.log('\n✅ Seed terminé !')
  process.exit(0)
}

main().catch((err) => {
  console.error('\n❌', err.message)
  process.exit(1)
})
