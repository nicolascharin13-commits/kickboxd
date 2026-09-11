import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getTeam, getTeamMatches } from '@/lib/queries'
import { TeamBadge } from '@/components/kickbox/TeamBadge'
import { MatchCard } from '@/components/kickbox/MatchCard'
import type { Match } from '@/lib/types'

export const revalidate = 300

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const team = await getTeam(Number(id))
  if (!team) return { title: 'Équipe — Kickboxd' }
  return {
    title: team.name,
    description: `Matchs de ${team.name}${team.country ? ` (${team.country})` : ''} sur Kickboxd`,
  }
}

export default async function TeamPage({ params }: Props) {
  const { id } = await params
  const [team, matches] = await Promise.all([getTeam(Number(id)), getTeamMatches(Number(id), 30)])

  if (!team) notFound()

  const finished = (matches as unknown as Match[]).filter((m) => m.status === 'finished')
  const upcoming = (matches as unknown as Match[]).filter((m) => m.status === 'scheduled')

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Header équipe */}
      <div className="mb-8 flex items-center gap-4">
        <TeamBadge name={team.name} logoUrl={team.logo_url} size="lg" showName={false} />
        <div>
          <h1 className="font-display text-2xl font-bold">{team.name}</h1>
          <p className="text-muted-foreground text-sm">
            {team.country}
            {team.founded ? ` · Fondé en ${team.founded}` : ''}
          </p>
        </div>
      </div>

      {/* Matchs à venir */}
      {upcoming.length > 0 && (
        <section className="mb-8">
          <h2 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wider uppercase">
            Prochains matchs
          </h2>
          <div className="flex flex-col gap-2">
            {upcoming.slice(0, 5).map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        </section>
      )}

      {/* Résultats récents */}
      <section>
        <h2 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wider uppercase">
          Résultats récents
        </h2>
        {finished.length === 0 ? (
          <p className="text-muted-foreground text-sm">Aucun résultat disponible.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {finished.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
