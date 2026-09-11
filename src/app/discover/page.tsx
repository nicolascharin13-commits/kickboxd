import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getRecentMatches, getUpcomingMatches } from '@/lib/queries'
import { MatchCard } from '@/components/kickbox/MatchCard'
import type { Match } from '@/lib/types'

export const revalidate = 300 // 5 min

export default async function DiscoverPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let isNewUser = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('matches_logged_count, followers_count')
      .eq('id', user.id)
      .single()
    isNewUser = !profile || (profile.matches_logged_count === 0 && profile.followers_count === 0)
  }

  const [recent, upcoming] = await Promise.all([getRecentMatches(20), getUpcomingMatches(20)])

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Onboarding — visible uniquement pour les nouveaux utilisateurs */}
      {isNewUser && (
        <div className="border-primary/20 bg-primary/5 mb-8 rounded-xl border p-5">
          <h2 className="font-display mb-1 text-lg font-bold">Bienvenue sur Kickboxd 👋</h2>
          <p className="text-muted-foreground mb-4 text-sm">
            Commence par logger les matchs que tu as regardés, découvrir la communauté, ou ajouter
            des matchs à ta watchlist.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/search"
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium transition-colors"
            >
              Rechercher un match →
            </Link>
            <Link
              href="/community"
              className="border-border hover:bg-muted rounded-md border px-4 py-2 text-sm font-medium transition-colors"
            >
              Découvrir des membres
            </Link>
            <Link
              href="/competitions"
              className="border-border hover:bg-muted rounded-md border px-4 py-2 text-sm font-medium transition-colors"
            >
              Parcourir les compétitions
            </Link>
          </div>
        </div>
      )}

      <h1 className="font-display mb-6 text-2xl font-bold">Découvrir</h1>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Matchs récents */}
        <section>
          <h2 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wider uppercase">
            Résultats récents
          </h2>
          {recent.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucun match récent.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {(recent as unknown as Match[]).map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          )}
        </section>

        {/* Matchs à venir */}
        <section>
          <h2 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wider uppercase">
            À venir
          </h2>
          {upcoming.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucun match à venir.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {(upcoming as unknown as Match[]).map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
