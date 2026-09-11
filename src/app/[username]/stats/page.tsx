import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getProfileByUsername } from '@/lib/queries'
import { createClient } from '@/lib/supabase/server'
import { ProfileNav } from '@/components/kickbox/ProfileNav'

interface Props {
  params: Promise<{ username: string }>
}

export default async function StatsPage({ params }: Props) {
  const { username } = await params
  const profile = await getProfileByUsername(username)
  if (!profile) notFound()

  const supabase = await createClient()

  // Stats des diary entries
  const { data: entries } = await supabase
    .from('diary_entries')
    .select('watched_on, rating, is_rewatch, match:matches(competition:competitions(id, name))')
    .eq('user_id', profile.id)

  const allEntries = entries ?? []
  const withRating = allEntries.filter((e) => e.rating !== null)
  const avgRating =
    withRating.length > 0
      ? (withRating.reduce((sum, e) => sum + (e.rating as number), 0) / withRating.length).toFixed(
          1
        )
      : null

  // Distribution des notes (0.5 à 5)
  const ratingDistribution: Record<string, number> = {}
  for (const e of withRating) {
    const key = String(e.rating)
    ratingDistribution[key] = (ratingDistribution[key] ?? 0) + 1
  }

  // Matchs par compétition
  const byCompetition: Record<string, number> = {}
  for (const e of allEntries) {
    const comp = (e.match as { competition?: { name: string } | null } | null)?.competition
    const name = comp?.name ?? 'Inconnue'
    byCompetition[name] = (byCompetition[name] ?? 0) + 1
  }
  const topCompetitions = Object.entries(byCompetition)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  // Matchs par année
  const byYear: Record<string, number> = {}
  for (const e of allEntries) {
    const year = e.watched_on.slice(0, 4)
    byYear[year] = (byYear[year] ?? 0) + 1
  }
  const years = Object.entries(byYear).sort((a, b) => b[0].localeCompare(a[0]))

  // Distribution des notes pour affichage en barres
  const ratingSteps = ['0.5', '1', '1.5', '2', '2.5', '3', '3.5', '4', '4.5', '5']
  const maxCount = Math.max(...ratingSteps.map((s) => ratingDistribution[s] ?? 0), 1)

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Breadcrumb */}
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-3">
          <Link
            href={`/${username}`}
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            @{username}
          </Link>
          <span className="text-muted-foreground text-sm">/</span>
          <span className="text-sm font-medium">Stats</span>
        </div>
        <h1 className="font-display text-2xl font-bold">Statistiques</h1>
      </div>

      <ProfileNav username={username} active="stats" />

      {allEntries.length === 0 ? (
        <div className="border-border rounded-lg border border-dashed p-12 text-center">
          <p className="mb-3 text-4xl">📊</p>
          <p className="mb-1 font-medium">Pas encore de stats</p>
          <p className="text-muted-foreground mb-4 text-sm">
            Logge tes premiers matchs pour voir tes statistiques apparaître ici.
          </p>
          <Link
            href="/search"
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium transition-colors"
          >
            Rechercher un match →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {/* Résumé */}
          <div className="grid grid-cols-3 gap-4">
            <div className="border-border rounded-lg border p-4 text-center">
              <div className="font-display text-2xl font-bold">{profile.matches_logged_count}</div>
              <div className="text-muted-foreground mt-1 text-xs">Matchs vus</div>
            </div>
            <div className="border-border rounded-lg border p-4 text-center">
              <div className="font-display text-2xl font-bold">{avgRating ?? '—'}</div>
              <div className="text-muted-foreground mt-1 text-xs">Note moyenne</div>
            </div>
            <div className="border-border rounded-lg border p-4 text-center">
              <div className="font-display text-2xl font-bold">{withRating.length}</div>
              <div className="text-muted-foreground mt-1 text-xs">Matchs notés</div>
            </div>
          </div>

          {/* Distribution des notes */}
          {withRating.length > 0 && (
            <section>
              <h2 className="mb-4 text-sm font-semibold">Distribution des notes</h2>
              <div className="flex items-end gap-1">
                {ratingSteps.map((step) => {
                  const count = ratingDistribution[step] ?? 0
                  const height = Math.round((count / maxCount) * 80)
                  return (
                    <div key={step} className="flex flex-1 flex-col items-center gap-1">
                      <div
                        className="bg-primary/70 w-full rounded-t-sm transition-all"
                        style={{ height: `${height}px`, minHeight: count > 0 ? '2px' : '0' }}
                        title={`${step}★ : ${count}`}
                      />
                      <span className="text-muted-foreground text-[10px]">{step}</span>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Top compétitions */}
          {topCompetitions.length > 0 && (
            <section>
              <h2 className="mb-4 text-sm font-semibold">Compétitions les plus suivies</h2>
              <div className="flex flex-col gap-2">
                {topCompetitions.map(([name, count]) => {
                  const pct = Math.round((count / allEntries.length) * 100)
                  return (
                    <div key={name}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span>{name}</span>
                        <span className="text-muted-foreground">{count}</span>
                      </div>
                      <div className="bg-muted h-2 rounded-full">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Par année */}
          {years.length > 0 && (
            <section>
              <h2 className="mb-4 text-sm font-semibold">Matchs par année</h2>
              <div className="flex flex-col gap-2">
                {years.map(([year, count]) => (
                  <div key={year} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{year}</span>
                    <div className="flex items-center gap-3">
                      <div className="bg-muted h-2 w-32 rounded-full">
                        <div
                          className="bg-primary/60 h-2 rounded-full"
                          style={{ width: `${Math.round((count / allEntries.length) * 100)}%` }}
                        />
                      </div>
                      <span className="w-8 text-right font-medium">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
