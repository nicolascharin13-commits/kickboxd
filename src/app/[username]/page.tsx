import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/server'
import {
  getProfileByUsername,
  isFollowing,
  getProfileRecentReviews,
  getDiaryEntries,
} from '@/lib/queries'
import { FollowButton } from '@/components/kickbox/FollowButton'
import { RatingStars } from '@/components/kickbox/RatingStars'
import { ProfileNav } from '@/components/kickbox/ProfileNav'
import { UserAvatar } from '@/components/kickbox/UserAvatar'
import type { Match } from '@/lib/types'

interface Props {
  params: Promise<{ username: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const profile = await getProfileByUsername(username)
  if (!profile) return { title: 'Profil — Kickboxd' }
  const name = profile.display_name ?? profile.username
  return {
    title: `${name} (@${profile.username})`,
    description: profile.bio ?? `${profile.matches_logged_count} matchs sur Kickboxd`,
    openGraph: {
      title: `${name} sur Kickboxd`,
      description: profile.bio ?? `${profile.matches_logged_count} matchs loggés`,
    },
  }
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params
  const profile = await getProfileByUsername(username)
  if (!profile) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isOwnProfile = user?.id === profile.id

  const [following, recentReviews, recentDiary] = await Promise.all([
    user && !isOwnProfile ? isFollowing(user.id, profile.id) : Promise.resolve(false),
    getProfileRecentReviews(profile.id),
    getDiaryEntries(profile.id, { limit: 4 }),
  ])

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Header profil */}
      <div className="mb-8 flex items-start gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {profile.avatar_url ? (
            <UserAvatar
              url={profile.avatar_url}
              name={profile.display_name ?? profile.username}
              size={64}
            />
          ) : (
            <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold">
              {(profile.display_name ?? profile.username)[0].toUpperCase()}
            </div>
          )}
        </div>

        {/* Infos */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-xl font-bold">
              {profile.display_name ?? profile.username}
            </h1>
            {!isOwnProfile && user && (
              <FollowButton targetUserId={profile.id} initialIsFollowing={following} />
            )}
            {isOwnProfile && (
              <Link
                href="/settings"
                className="border-border text-muted-foreground hover:text-foreground rounded-md border px-2 py-1 text-xs"
              >
                Modifier le profil
              </Link>
            )}
          </div>
          <p className="text-muted-foreground text-sm">@{profile.username}</p>
          {profile.bio && <p className="mt-2 text-sm">{profile.bio}</p>}

          {/* Stats */}
          <div className="mt-3 flex gap-4 text-sm">
            <span>
              <strong>{profile.matches_logged_count}</strong>{' '}
              <span className="text-muted-foreground">
                match{profile.matches_logged_count !== 1 ? 's' : ''}
              </span>
            </span>
            <Link href={`/${username}/followers`} className="hover:underline">
              <strong>{profile.followers_count}</strong>{' '}
              <span className="text-muted-foreground">
                abonné{profile.followers_count !== 1 ? 's' : ''}
              </span>
            </Link>
            <Link href={`/${username}/following`} className="hover:underline">
              <strong>{profile.following_count}</strong>{' '}
              <span className="text-muted-foreground">abonnements</span>
            </Link>
          </div>
        </div>
      </div>

      <ProfileNav username={username} active="profil" />

      {/* Matchs récents du journal */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Matchs récents</h2>
          <Link
            href={`/${username}/diary`}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            Tout voir →
          </Link>
        </div>

        {recentDiary.length === 0 ? (
          <div className="border-border rounded-lg border border-dashed p-8 text-center">
            <p className="text-muted-foreground text-sm">Aucun match loggé pour l&apos;instant.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {recentDiary.map((entry) => {
              const match = entry.match as unknown as Match
              const homeTeam = match?.home_team
              const awayTeam = match?.away_team
              const review = entry.review as { content: string; rating: number } | null
              return (
                <Link
                  key={entry.id}
                  href={`/matches/${match?.id}`}
                  className="border-border bg-card hover:bg-muted/40 block rounded-lg border p-4 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {homeTeam && awayTeam
                          ? `${homeTeam.short_name ?? homeTeam.name} vs ${awayTeam.short_name ?? awayTeam.name}`
                          : 'Match inconnu'}
                      </p>
                      {match?.competition && (
                        <p className="text-muted-foreground text-xs">
                          {(match.competition as { name: string }).name}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {entry.rating && <RatingStars value={entry.rating} readOnly size="sm" />}
                      <span className="text-muted-foreground text-xs">
                        {format(new Date(entry.watched_on), 'd MMM yyyy', { locale: fr })}
                      </span>
                    </div>
                  </div>
                  {review?.content && (
                    <p className="text-muted-foreground mt-2 line-clamp-2 text-xs">
                      &ldquo;{review.content}&rdquo;
                    </p>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* Reviews récentes */}
      {recentReviews.length > 0 && (
        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Reviews récentes</h2>
            <Link
              href={`/${username}/reviews`}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              Tout voir →
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {recentReviews.map((review) => {
              const match = review.match as unknown as Match
              return (
                <Link
                  key={review.id}
                  href={`/matches/${match?.id}`}
                  className="border-border bg-card hover:bg-muted/40 block rounded-lg border p-4 transition-colors"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">
                      {match?.home_team && match?.away_team
                        ? `${match.home_team.short_name ?? match.home_team.name} vs ${match.away_team.short_name ?? match.away_team.name}`
                        : 'Match inconnu'}
                    </p>
                    {review.rating && <RatingStars value={review.rating} readOnly size="sm" />}
                  </div>
                  <p className="text-muted-foreground line-clamp-2 text-xs">{review.content}</p>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {profile.matches_logged_count > 0 && false && (
        <section className="mt-8">
          <div className="border-border rounded-lg border p-4 text-center">
            <p className="text-muted-foreground text-sm" />
            <Link
              href={`/${username}/diary`}
              className="text-primary mt-1 block text-sm hover:underline"
            >
              Voir le journal →
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}
