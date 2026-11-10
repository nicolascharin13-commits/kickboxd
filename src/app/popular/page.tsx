import Link from 'next/link'
import { getTopRatedMatches, getTrendingMatches } from '@/lib/queries'
import { MatchCard } from '@/components/kickbox/MatchCard'
import type { Match } from '@/lib/types'

export const revalidate = 300

interface Props {
  searchParams: Promise<{ tab?: string }>
}

export default async function PopularPage({ searchParams }: Props) {
  const { tab } = await searchParams
  const activeTab = tab === 'top' ? 'top' : 'trending'

  const matches = activeTab === 'top'
    ? await getTopRatedMatches(30)
    : await getTrendingMatches(30)

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display mb-6 text-2xl font-bold">Populaire</h1>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b border-border">
        <Link
          href="/popular?tab=trending"
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === 'trending' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Tendances
        </Link>
        <Link
          href="/popular?tab=top"
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === 'top' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Les mieux notés
        </Link>
      </div>

      {matches.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-12 text-center">
          <p className="text-muted-foreground text-sm">
            {activeTab === 'trending'
              ? 'Aucun match tendance pour le moment. Commence à logger des matchs !'
              : 'Pas encore assez de notes pour classer les matchs.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {(matches as unknown as Match[]).map((match, i) => (
            <div key={match.id} className="flex items-center gap-3">
              <span className="text-muted-foreground w-6 shrink-0 text-right text-sm font-medium">
                {i + 1}
              </span>
              <div className="flex-1">
                <MatchCard match={match} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
