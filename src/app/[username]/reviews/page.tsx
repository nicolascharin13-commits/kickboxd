import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { getProfileByUsername, getUserReviews } from '@/lib/queries'
import { createClient } from '@/lib/supabase/server'
import { TeamBadge } from '@/components/kickbox/TeamBadge'
import { ScoreDisplay } from '@/components/kickbox/ScoreDisplay'
import { RatingStars } from '@/components/kickbox/RatingStars'
import { ProfileNav } from '@/components/kickbox/ProfileNav'
import { deleteReview } from '@/app/actions/log'
import type { Match } from '@/lib/types'

const PAGE_SIZE = 20

interface Props {
  params: Promise<{ username: string }>
  searchParams: Promise<{ page?: string }>
}

export default async function ReviewsPage({ params, searchParams }: Props) {
  const { username } = await params
  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10))
  const offset = (page - 1) * PAGE_SIZE

  const profile = await getProfileByUsername(username)
  if (!profile) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isOwner = user?.id === profile.id

  const reviews = await getUserReviews(profile.id, { limit: PAGE_SIZE, offset })
  const hasNext = reviews.length === PAGE_SIZE
  const hasPrev = page > 1

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-3">
          <Link
            href={`/${username}`}
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            @{username}
          </Link>
          <span className="text-muted-foreground text-sm">/</span>
          <span className="text-sm font-medium">Reviews</span>
        </div>
        <h1 className="font-display text-2xl font-bold">
          Reviews de {profile.display_name ?? username}
        </h1>
      </div>

      <ProfileNav username={username} active="reviews" />

      {reviews.length === 0 && page === 1 ? (
        <div className="border-border rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground text-sm">Aucune review pour l&apos;instant.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {reviews.map((review) => {
              const match = review.match as unknown as Match
              return (
                <div key={review.id} className="border-border bg-card rounded-lg border p-4">
                  <Link href={`/matches/${match.id}`} className="mb-3 block">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <TeamBadge
                          name={match.home_team?.name ?? '?'}
                          logoUrl={match.home_team?.logo_url}
                          size="sm"
                          showName={false}
                        />
                        <span className="truncate text-sm font-medium">
                          {match.home_team?.short_name ?? match.home_team?.name}
                        </span>
                      </div>
                      <ScoreDisplay
                        homeScore={match.home_score}
                        awayScore={match.away_score}
                        status={match.status}
                        kickoff={match.kickoff}
                        size="sm"
                      />
                      <div className="flex min-w-0 items-center justify-end gap-2">
                        <span className="truncate text-sm font-medium">
                          {match.away_team?.short_name ?? match.away_team?.name}
                        </span>
                        <TeamBadge
                          name={match.away_team?.name ?? '?'}
                          logoUrl={match.away_team?.logo_url}
                          size="sm"
                          showName={false}
                        />
                      </div>
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {match.competition?.name} ·{' '}
                      {format(new Date(match.kickoff), 'd MMM yyyy', { locale: fr })}
                    </p>
                  </Link>

                  <div className="mb-2 flex items-center gap-2">
                    {review.rating && <RatingStars value={review.rating} readOnly size="sm" />}
                    <span className="text-muted-foreground text-xs">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {(review as any).diary_entry?.watched_on
                        ? /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                          `Vu le ${format(new Date((review as any).diary_entry.watched_on), 'd MMM yyyy', { locale: fr })}`
                        : format(new Date(review.created_at), 'd MMM yyyy', { locale: fr })}
                    </span>
                  </div>
                  <p className="line-clamp-4 text-sm leading-relaxed whitespace-pre-wrap">
                    {review.content}
                  </p>

                  {isOwner && (
                    <form
                      action={async () => {
                        'use server'
                        await deleteReview(review.id)
                      }}
                      className="mt-3"
                    >
                      <button
                        type="submit"
                        className="text-muted-foreground hover:text-destructive text-xs transition-colors"
                      >
                        Supprimer
                      </button>
                    </form>
                  )}
                </div>
              )
            })}
          </div>

          {(hasPrev || hasNext) && (
            <div className="mt-8 flex items-center justify-between">
              {hasPrev ? (
                <Link
                  href={`/${username}/reviews?page=${page - 1}`}
                  className="border-border hover:bg-muted rounded-md border px-4 py-2 text-sm transition-colors"
                >
                  ← Page précédente
                </Link>
              ) : (
                <span />
              )}
              <span className="text-muted-foreground text-sm">Page {page}</span>
              {hasNext ? (
                <Link
                  href={`/${username}/reviews?page=${page + 1}`}
                  className="border-border hover:bg-muted rounded-md border px-4 py-2 text-sm transition-colors"
                >
                  Page suivante →
                </Link>
              ) : (
                <span />
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
