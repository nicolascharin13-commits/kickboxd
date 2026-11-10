import { NextResponse } from 'next/server'
import { syncLiveMatches } from '@/lib/sync'

// Appelé par cron-job.org toutes les minutes pendant les matchs
// Protégé par CRON_SECRET
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const result = await syncLiveMatches()
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
