import { NextResponse } from 'next/server'
import { syncCompetition } from '@/lib/sync'

// Cron hebdomadaire : synchronise les compétitions importantes
// Appelé chaque lundi à 5h UTC
const COMPETITIONS = [
  { code: 'WC', season: '2026-2027' }, // Coupe du Monde 2026
  { code: 'EC', season: '2024-2025' }, // Euro
  { code: 'CL', season: '2026-2027' }, // Champions League
  { code: 'FL1', season: '2026-2027' }, // Ligue 1
  { code: 'PL', season: '2026-2027' }, // Premier League
  { code: 'PD', season: '2026-2027' }, // La Liga
  { code: 'BL1', season: '2026-2027' }, // Bundesliga
  { code: 'SA', season: '2026-2027' }, // Serie A
  { code: 'DED', season: '2026-2027' }, // Eredivisie (Pays-Bas)
  { code: 'PPL', season: '2026-2027' }, // Primeira Liga (Portugal)
  { code: 'ELC', season: '2026-2027' }, // Championship (Angleterre D2)
  { code: 'BSA', season: '2026-2027' }, // Série A Brésilienne
  { code: 'CLI', season: '2026-2027' }, // Copa Libertadores
]

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const results: Record<string, unknown> = {}

  for (const { code, season } of COMPETITIONS) {
    try {
      const result = await syncCompetition(code, season)
      results[code] = result
    } catch (err) {
      results[code] = { error: err instanceof Error ? err.message : String(err) }
    }
    // Respecter la limite football-data.org : 10 req/min
    await new Promise((resolve) => setTimeout(resolve, 7000))
  }

  return NextResponse.json({ success: true, results })
}
