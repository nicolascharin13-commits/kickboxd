import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/server'
import { getRecentMatches, getUpcomingMatches, getCommunityRecentReviews, getTrendingMatches } from '@/lib/queries'
import { MatchCard } from '@/components/kickbox/MatchCard'
import { RatingStars } from '@/components/kickbox/RatingStars'
import { UserAvatar } from '@/components/kickbox/UserAvatar'
import type { Match } from '@/lib/types'

export const revalidate = 300

export default async function DiscoverPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isNewUser = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('matches_logged_count, followers_count')
      .eq('id', user.id)
      .single()
    isNewUser = !profile || (profile.matches_logged_count === 0 && profile.followers_count === 0)
  }

  const [recent, upcoming, communityReviews, trending] = await Promise.all([
    getRecentMatches(10),
    getUpcomingMatches(10),
    getCommunityRecentReviews(6),
    getTrendingMatches(5),
  ])

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Onboarding */}
      {isNewUser && (
        <div className="border-primary/20 bg-primary/5 mb-8 rounded-xl border p-5">
          <h2 className="font-display mb-1 text-lg font-bold">Bienvenue sur Kickboxd</h2>
          <p className="text-muted-foreground mb-5 text-sm">
            Kickboxd c&apos;est Letterboxd pour le foot — tu loggues les matchs que tu regardes, tu
            les notes, tu suis tes amis.
          </p>
          <div className="mb-4 flex flex-col gap-3">
            {[
              { n: '1', title: 'Recherche un match que tu as regardé', sub: 'Par équipe : "PSG", "Real Madrid"...' },
              { n: '2', title: 'Note-le et écris une review', sub: 'Il apparaît dans ton journal et sur ton profil' },
              { n: '3', title: 'Suis tes amis', sub: "Vois ce qu'ils regardent dans le fil d'activité" },
            ].map(({ n, title, sub }) => (
              <div key={n} className="flex items-start gap-3">
                <span className="text-muted-foreground text-sm font-bold w-4">{n}.</span>
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="text-muted-foreground text-xs">{sub}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/search" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium transition-colors">
              Logger mon premier match
            </Link>
            <Link href="/community" className="border-border hover:bg-muted rounded-md border px-4 py-2 text-sm font-medium transition-colors">
              Trouver des amis
            </Link>
          </div>
        </div>
      )}

      <h1 className="font-display mb-6 text-2xl font-bold">Découvrir</h1>

      {/* Tendances */}
      {trending.length > 0 && (
        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">Tendances</h2>
            <Link href="/popular" className="text-muted-foreground hover:text-foreground text-xs">Voir tout</Link>
          </div>
          <div className="flex flex-col gap-2">
            {(trending as unknown as Match[]).map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Résultats récents */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">Résultats récents</h2>
          </div>
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

        {/* À venir */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">À venir</h2>
          </div>
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

      {/* Reviews communauté */}
      {communityReviews.length > 0 && (
        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">Reviews récentes</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {communityReviews.map((review) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const r = review as any
              const match = r.match
              const profile = r.profile
              const home = match?.home_team?.short_name ?? match?.home_team?.name ?? '?'
              const away = match?.away_team?.short_name ?? match?.away_team?.name ?? '?'
              return (
                <Link
                  key={review.id}
                  href={`/matches/${match?.id}`}
                  className="border-border bg-card hover:border-primary/40 block rounded-lg border p-4 transition-colors"
                >
                  <div className="mb-2 flex items-center gap-2">
                    {profile?.avatar_url ? (
                      <UserAvatar url={profile.avatar_url} name={profile.display_name ?? profile.username} size={24} />
                    ) : (
                      <div className="bg-muted flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold">
                        {(profile?.display_name ?? profile?.username ?? '?')[0].toUpperCase()}
                      </div>
                    )}
                    <span className="text-muted-foreground text-xs">@{profile?.username}</span>
                    {review.rating && <RatingStars value={review.rating} readOnly size="sm" />}
                    <span className="text-muted-foreground ml-auto text-xs">
                      {format(new Date(review.created_at), 'd MMM', { locale: fr })}
                    </span>
                  </div>
                  <p className="mb-1 text-xs font-medium">{home} vs {away}</p>
                  {review.contains_spoilers ? (
                    <p className="text-muted-foreground text-xs italic">Contient des spoilers</p>
                  ) : (
                    <p className="text-muted-foreground line-clamp-3 text-xs">{review.content}</p>
                  )}
                </Link>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
