import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getCompetition, getCompetitionMatches, getCompetitionSeasons } from '@/lib/queries'
import { MatchCard } from '@/components/kickbox/MatchCard'
import type { Match } from '@/lib/types'

export const revalidate = 300

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ season?: string; page?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const competition = await getCompetition(Number(id))
  if (!competition) return { title: 'Compétition — Kickbox' }
  return {
    title: competition.name,
    description: `Tous les matchs de ${competition.name}${competition.country ? ` (${competition.country})` : ''} sur Kickbox`,
  }
}

const PAGE_SIZE = 5 // journées par page

export default async function CompetitionPage({ params, searchParams }: Props) {
  const { id } = await params
  const { season, page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10))

  const competition = await getCompetition(Number(id))
  if (!competition) notFound()

  const [seasons, matches] = await Promise.all([
    getCompetitionSeasons(Number(id)),
    getCompetitionMatches(Number(id), season ?? undefined),
  ])

  const selectedSeason = season ?? seasons[0]
  const filtered = (matches as unknown as Match[]).filter((m) =>
    selectedSeason ? m.season === selectedSeason : true
  )

  // Résultats groupés par journée, plus récente en premier
  const finished = filtered
    .filter((m) => m.status === 'finished')
    .sort((a, b) => new Date(b.kickoff).getTime() - new Date(a.kickoff).getTime())

  // Grouper par matchday
  const grouped = finished.reduce<Record<string, Match[]>>((acc, m) => {
    const key = m.matchday ?? 'Autre'
    if (!acc[key]) acc[key] = []
    acc[key].push(m)
    return acc
  }, {})

  // Trier les journées : la plus récente en premier (par date du premier match du groupe)
  const sortedGroups = Object.entries(grouped).sort(([, a], [, b]) => {
    const dateA = new Date(a[0].kickoff).getTime()
    const dateB = new Date(b[0].kickoff).getTime()
    return dateB - dateA
  })

  // Pagination sur les journées
  const totalPages = Math.ceil(sortedGroups.length / PAGE_SIZE)
  const paginatedGroups = sortedGroups.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // À venir : du plus proche au plus lointain
  const upcoming = filtered
    .filter((m) => m.status === 'scheduled')
    .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
    .slice(0, 30)

  const baseUrl = `/competitions/${id}${selectedSeason ? `?season=${selectedSeason}` : ''}`
  const pageUrl = (p: number) =>
    `/competitions/${id}?${selectedSeason ? `season=${selectedSeason}&` : ''}page=${p}`

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">{competition.name}</h1>
        {competition.country && (
          <p className="text-muted-foreground text-sm">{competition.country}</p>
        )}
      </div>

      {/* Sélecteur de saison */}
      {seasons.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {seasons.map((s) => (
            <a
              key={s}
              href={`/competitions/${id}?season=${s}`}
              className={`rounded-full px-3 py-1 text-sm transition-colors ${
                s === selectedSeason
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {s}
            </a>
          ))}
        </div>
      )}

      {/* Matchs à venir */}
      {upcoming.length > 0 && (
        <section className="mb-8">
          <h2 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wider uppercase">
            À venir
          </h2>
          <div className="flex flex-col gap-2">
            {upcoming.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        </section>
      )}

      {/* Résultats groupés par journée */}
      <section>
        <h2 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wider uppercase">
          Résultats
        </h2>
        {paginatedGroups.length === 0 ? (
          <p className="text-muted-foreground text-sm">Aucun résultat pour cette saison.</p>
        ) : (
          <div className="flex flex-col gap-6">
            {paginatedGroups.map(([matchday, groupMatches]) => (
              <div key={matchday}>
                <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
                  {matchday}
                </h3>
                <div className="flex flex-col gap-2">
                  {groupMatches.map((match) => (
                    <MatchCard key={match.id} match={match} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            {page > 1 ? (
              <a
                href={page === 2 ? baseUrl : pageUrl(page - 1)}
                className="border-border hover:bg-muted rounded-md border px-4 py-2 text-sm transition-colors"
              >
                ← Plus récent
              </a>
            ) : (
              <span />
            )}
            <span className="text-muted-foreground text-sm">
              Page {page} / {totalPages}
            </span>
            {page < totalPages ? (
              <a
                href={pageUrl(page + 1)}
                className="border-border hover:bg-muted rounded-md border px-4 py-2 text-sm transition-colors"
              >
                Plus ancien →
              </a>
            ) : (
              <span />
            )}
          </div>
        )}
      </section>
    </div>
  )
}
