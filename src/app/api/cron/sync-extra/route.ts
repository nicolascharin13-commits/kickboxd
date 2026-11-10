import { NextResponse } from 'next/server'
import { syncExtraCompetitions } from '@/lib/api-football-sync'

// Appelé par cron Vercel — synchronise Europa, Conference, Nations League, FA Cup, CdF
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const result = await syncExtraCompetitions()
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
