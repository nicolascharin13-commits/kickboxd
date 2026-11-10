import type { Metadata } from 'next'
import { getLiveMatches, getUpcomingMatches } from '@/lib/queries'
import { MatchCard } from '@/components/kickbox/MatchCard'
import { Badge } from '@/components/ui/badge'
import type { Match } from '@/lib/types'

export const revalidate = 30

export const metadata: Metadata = {
  title: 'En direct',
  description: 'Matchs de football en cours et à venir.',
}

export default async function LivePage() {
  const [live, upcoming] = await Promise.all([getLiveMatches(), getUpcomingMatches(10)])

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Matchs en direct */}
      <section className="mb-10">
        <div className="mb-4 flex items-center gap-2">
          <h1 className="font-display text-xl font-bold">En direct</h1>
          {live.length > 0 && (
            <Badge className="bg-primary text-primary-foreground animate-pulse text-[10px]">
              {live.length} match{live.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {live.length === 0 ? (
          <div className="border-border rounded-lg border border-dashed p-8 text-center">
            <p className="text-muted-foreground text-sm">Aucun match en cours pour le moment.</p>
            <p className="text-muted-foreground mt-1 text-xs">
              Les scores se mettent à jour automatiquement.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {(live as unknown as Match[]).map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        )}
      </section>

      {/* Prochains matchs */}
      {upcoming.length > 0 && (
        <section>
          <h2 className="font-display mb-4 text-lg font-bold">À venir</h2>
          <div className="flex flex-col gap-2">
            {(upcoming as unknown as Match[]).map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
