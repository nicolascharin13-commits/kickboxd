'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const COMPETITIONS = [
  { code: 'WC', label: 'Coupe du Monde 2026', seasons: ['2026-2027'] },
  { code: 'EC', label: 'Euro', seasons: ['2024-2025'] },
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
]

type Status = 'idle' | 'loading' | 'success' | 'error'

export default function AdminPage() {
  const [selectedSeasons, setSelectedSeasons] = useState<Record<string, string>>(() =>
    Object.fromEntries(COMPETITIONS.map((c) => [c.code, c.seasons[0]]))
  )
  const [statuses, setStatuses] = useState<Record<string, Status>>({})
  const [results, setResults] = useState<Record<string, string>>({})
  const [globalStatus, setGlobalStatus] = useState<Status>('idle')

  async function syncOne(code: string, season: string) {
    setStatuses((s) => ({ ...s, [code]: 'loading' }))
    try {
      const res = await fetch(`/api/sync/competition/${code}?season=${season}`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setStatuses((s) => ({ ...s, [code]: 'success' }))
        setResults((r) => ({
          ...r,
          [code]: `✓ ${data.matches ?? 0} matchs, ${data.teams ?? 0} équipes (${season})`,
        }))
      } else {
        setStatuses((s) => ({ ...s, [code]: 'error' }))
        setResults((r) => ({ ...r, [code]: `✗ ${data.error}` }))
      }
    } catch {
      setStatuses((s) => ({ ...s, [code]: 'error' }))
      setResults((r) => ({ ...r, [code]: '✗ Erreur réseau' }))
    }
  }

  async function syncAll() {
    setGlobalStatus('loading')
    for (const { code } of COMPETITIONS) {
      await syncOne(code, selectedSeasons[code])
      await new Promise((resolve) => setTimeout(resolve, 7000))
    }
    setGlobalStatus('success')
  }

  async function syncUpcoming() {
    setGlobalStatus('loading')
    try {
      const res = await fetch('/api/cron/sync-upcoming', {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET ?? 'kickbox_cron_2026'}`,
        },
      })
      const data = await res.json()
      setResults((r) => ({
        ...r,
        upcoming: res.ok ? `✓ ${data.synced ?? 0} matchs à venir` : `✗ ${data.error}`,
      }))
    } catch {
      setResults((r) => ({ ...r, upcoming: '✗ Erreur réseau' }))
    }
    setGlobalStatus('idle')
  }

  async function syncRecent() {
    setGlobalStatus('loading')
    try {
      const res = await fetch('/api/cron/sync-recent', {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET ?? 'kickbox_cron_2026'}`,
        },
      })
      const data = await res.json()
      setResults((r) => ({
        ...r,
        recent: res.ok ? `✓ ${data.updated ?? 0} matchs mis à jour` : `✗ ${data.error}`,
      }))
    } catch {
      setResults((r) => ({ ...r, recent: '✗ Erreur réseau' }))
    }
    setGlobalStatus('idle')
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display mb-6 text-2xl font-bold">Admin — Synchronisation</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={syncAll} disabled={globalStatus === 'loading'}>
            {globalStatus === 'loading' ? 'Sync en cours… (~2 min)' : 'Tout synchroniser'}
          </Button>
          <Button variant="outline" onClick={syncUpcoming} disabled={globalStatus === 'loading'}>
            Matchs à venir (J+7)
          </Button>
          <Button variant="outline" onClick={syncRecent} disabled={globalStatus === 'loading'}>
            Mettre à jour les résultats
          </Button>
          {results.upcoming && (
            <p className="text-muted-foreground w-full text-xs">{results.upcoming}</p>
          )}
          {results.recent && (
            <p className="text-muted-foreground w-full text-xs">{results.recent}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Compétitions par saison</CardTitle>
          <CardDescription>
            Choisir la saison puis cliquer Sync pour importer les matchs.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {COMPETITIONS.map(({ code, label, seasons }) => (
            <div key={code} className="border-border rounded-lg border p-3">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium">{label}</p>
                <Button
                  size="sm"
                  onClick={() => syncOne(code, selectedSeasons[code])}
                  disabled={statuses[code] === 'loading'}
                  variant={
                    statuses[code] === 'success'
                      ? 'outline'
                      : statuses[code] === 'error'
                        ? 'destructive'
                        : 'default'
                  }
                >
                  {statuses[code] === 'loading' ? 'Sync…' : 'Sync'}
                </Button>
              </div>

              {/* Sélecteur de saison */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {seasons.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSeasons((prev) => ({ ...prev, [code]: s }))}
                    className={`rounded-full px-2.5 py-0.5 text-xs transition-colors ${
                      selectedSeasons[code] === s
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/70'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {results[code] && (
                <p
                  className={`mt-1.5 text-xs ${statuses[code] === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}
                >
                  {results[code]}
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
