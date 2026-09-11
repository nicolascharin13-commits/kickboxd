import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { MapPin, Calendar, User } from 'lucide-react'
import { getMatch, getMatchReviews, getReviewComments } from '@/lib/queries'
import { createClient } from '@/lib/supabase/server'
import { syncMatchDetails } from '@/lib/sync-match-details'
import { TeamBadge } from '@/components/kickbox/TeamBadge'
import { ScoreDisplay } from '@/components/kickbox/ScoreDisplay'
import { LogMatchModal } from '@/components/kickbox/LogMatchModal'
import { WatchlistButton } from '@/components/kickbox/WatchlistButton'
import { ReviewCard } from '@/components/kickbox/ReviewCard'
import { MatchTagsPanel } from '@/components/kickbox/MatchTagsPanel'
import { AddToListButton } from '@/components/kickbox/AddToListButton'
import { ShareButton } from '@/components/kickbox/ShareButton'
import { CommentSection } from '@/components/kickbox/CommentSection'
import { Badge } from '@/components/ui/badge'
import type { Match, Review, MatchGoal, MatchBooking, MatchSubstitution } from '@/lib/types'

export const revalidate = 60

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const raw = await getMatch(Number(id))
  if (!raw) return { title: 'Match — Kickboxd' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const match = raw as any
  const homeTeam = Array.isArray(match.home_team) ? match.home_team[0] : match.home_team
  const awayTeam = Array.isArray(match.away_team) ? match.away_team[0] : match.away_team
  const competition = Array.isArray(match.competition) ? match.competition[0] : match.competition
  const home = homeTeam?.short_name ?? homeTeam?.name ?? '?'
  const away = awayTeam?.short_name ?? awayTeam?.name ?? '?'
  const score =
    match.status === 'finished' ? `${match.home_score ?? 0}–${match.away_score ?? 0}` : 'vs'
  const competitionName = competition?.name ?? ''
  const dateStr = format(new Date(match.kickoff), 'd MMM yyyy', { locale: fr })
  return {
    title: `${home} ${score} ${away}`,
    description: `${competitionName} · ${dateStr}`,
    openGraph: {
      title: `${home} ${score} ${away}`,
      description: `${competitionName} · ${dateStr}`,
    },
  }
}

const CARD_LABEL = {
  YELLOW_CARD: '🟨',
  YELLOW_RED_CARD: '🟨🟥',
  RED_CARD: '🟥',
}

const GOAL_LABEL = {
  REGULAR: '⚽',
  OWN_GOAL: '⚽ (csc)',
  PENALTY: '⚽ (pen.)',
}

function minuteLabel(minute: number, injuryTime: number | null) {
  return injuryTime ? `${minute}+${injuryTime}'` : `${minute}'`
}

export default async function MatchPage({ params }: Props) {
  const { id } = await params
  const match = (await getMatch(Number(id))) as Match | null
  if (!match) notFound()

  // Sync des détails si pas encore récupérés (matchs terminés uniquement)
  if (match.status === 'finished' && !match.details_fetched_at) {
    try {
      await syncMatchDetails(match)
      // Re-fetch avec les détails
      const refreshed = (await getMatch(Number(id))) as Match | null
      if (refreshed) Object.assign(match, refreshed)
    } catch {
      // On continue sans détails si l'API est down
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let isLogged = false
  let isInWatchlist = false
  let existingRating: number | null = null
  let userTagIds: number[] = []
  let userLists: { id: string; name: string; matches_count: number }[] = []
  let listIdsContaining: string[] = []
  let likedReviewIds = new Set<string>()

  if (user) {
    const [{ data: diary }, { data: wl }, { data: userTagsData }, { data: listsData }] =
      await Promise.all([
        supabase
          .from('diary_entries')
          .select('rating')
          .eq('user_id', user.id)
          .eq('match_id', match.id)
          .eq('is_rewatch', false)
          .single(),
        supabase
          .from('watchlist')
          .select('match_id')
          .eq('user_id', user.id)
          .eq('match_id', match.id)
          .single(),
        supabase
          .from('match_tags')
          .select('tag_id')
          .eq('user_id', user.id)
          .eq('match_id', match.id),
        supabase
          .from('lists')
          .select('id, name, matches_count')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false }),
      ])

    isLogged = !!diary
    existingRating = diary?.rating ?? null
    isInWatchlist = !!wl
    userTagIds = (userTagsData ?? []).map((t) => t.tag_id)
    userLists = listsData ?? []

    if (userLists.length > 0) {
      const { data: listMatchData } = await supabase
        .from('list_matches')
        .select('list_id')
        .in(
          'list_id',
          userLists.map((l) => l.id)
        )
        .eq('match_id', match.id)
      listIdsContaining = (listMatchData ?? []).map((r) => r.list_id)
    }
  }

  const reviews = (await getMatchReviews(match.id)) as unknown as Review[]

  if (user && reviews.length > 0) {
    const { data: likesData } = await supabase
      .from('review_likes')
      .select('review_id')
      .eq('user_id', user.id)
      .in(
        'review_id',
        reviews.map((r) => r.id)
      )
    likedReviewIds = new Set((likesData ?? []).map((l) => l.review_id))
  }

  // Commentaires de toutes les reviews
  const commentsMap: Record<string, Awaited<ReturnType<typeof getReviewComments>>> = {}
  if (reviews.length > 0) {
    await Promise.all(
      reviews.map(async (r) => {
        commentsMap[r.id] = await getReviewComments(r.id)
      })
    )
  }

  const { data: allTagsData } = await supabase.from('tags').select('*').order('name')
  const { data: matchTagCountsData } = await supabase
    .from('match_tags')
    .select('tag_id')
    .eq('match_id', match.id)

  const tagCounts: Record<number, number> = {}
  for (const row of matchTagCountsData ?? []) {
    tagCounts[row.tag_id] = (tagCounts[row.tag_id] ?? 0) + 1
  }

  const kickoff = new Date(match.kickoff)
  const homeTeam = match.home_team
  const awayTeam = match.away_team
  const competition = match.competition
  const matchLabel = `${homeTeam?.name ?? '?'} vs ${awayTeam?.name ?? '?'}`

  const goals = (match.goals ?? []) as MatchGoal[]
  const bookings = (match.bookings ?? []) as MatchBooking[]
  const substitutions = (match.substitutions ?? []) as MatchSubstitution[]

  const homeGoals = goals.filter((g) => g.isHome)
  const awayGoals = goals.filter((g) => !g.isHome)

  const hasDetails = !!match.details_fetched_at

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Compétition */}
      <div className="mb-6 flex items-center gap-2">
        <Badge variant="secondary">{competition?.name ?? '—'}</Badge>
        {match.matchday && <span className="text-muted-foreground text-sm">{match.matchday}</span>}
        {match.season && <span className="text-muted-foreground text-sm">· {match.season}</span>}
      </div>

      {/* Score */}
      <div className="border-border bg-card mb-6 rounded-xl border p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-1 flex-col items-center gap-2 text-center">
            <TeamBadge
              name={homeTeam?.name ?? '?'}
              logoUrl={homeTeam?.logo_url}
              size="lg"
              align="center"
              showName={false}
            />
            <span className="text-sm leading-tight font-semibold">{homeTeam?.name ?? '?'}</span>
            <span className="text-muted-foreground text-xs">Domicile</span>
            {homeGoals.length > 0 && (
              <div className="mt-1 space-y-0.5 text-center">
                {homeGoals.map((g, i) => (
                  <p key={i} className="text-muted-foreground text-xs">
                    {g.scorer} {minuteLabel(g.minute, g.injuryTime)}
                    {g.type !== 'REGULAR' && (
                      <span className="ml-1 opacity-60">
                        {g.type === 'OWN_GOAL' ? '(csc)' : '(pen.)'}
                      </span>
                    )}
                  </p>
                ))}
              </div>
            )}
          </div>

          <div className="flex shrink-0 flex-col items-center gap-1">
            <ScoreDisplay
              homeScore={match.home_score}
              awayScore={match.away_score}
              status={match.status}
              kickoff={match.kickoff}
              size="lg"
            />
            {match.status === 'finished' &&
              match.home_score_ht !== null &&
              match.away_score_ht !== null && (
                <span className="text-muted-foreground text-xs">
                  ({match.home_score_ht} – {match.away_score_ht}) mi-temps
                </span>
              )}
            {match.status === 'live' && (
              <Badge className="bg-primary text-primary-foreground text-[10px]">EN DIRECT</Badge>
            )}
          </div>

          <div className="flex flex-1 flex-col items-center gap-2 text-center">
            <TeamBadge
              name={awayTeam?.name ?? '?'}
              logoUrl={awayTeam?.logo_url}
              size="lg"
              align="center"
              showName={false}
            />
            <span className="text-sm leading-tight font-semibold">{awayTeam?.name ?? '?'}</span>
            <span className="text-muted-foreground text-xs">Extérieur</span>
            {awayGoals.length > 0 && (
              <div className="mt-1 space-y-0.5 text-center">
                {awayGoals.map((g, i) => (
                  <p key={i} className="text-muted-foreground text-xs">
                    {g.scorer} {minuteLabel(g.minute, g.injuryTime)}
                    {g.type !== 'REGULAR' && (
                      <span className="ml-1 opacity-60">
                        {g.type === 'OWN_GOAL' ? '(csc)' : '(pen.)'}
                      </span>
                    )}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Infos */}
      <div className="text-muted-foreground mb-6 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4" />
          <span>{format(kickoff, "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr })}</span>
        </div>
        {match.venue && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            <span>{match.venue}</span>
          </div>
        )}
        {match.referee && (
          <div className="flex items-center gap-1.5">
            <User className="h-4 w-4" />
            <span>{match.referee}</span>
          </div>
        )}
      </div>

      {/* Actions utilisateur */}
      {user ? (
        <div className="mb-6 flex flex-wrap gap-2">
          <LogMatchModal
            matchId={match.id}
            matchLabel={matchLabel}
            isLogged={isLogged}
            existingRating={existingRating}
          />
          {(match.status !== 'finished' || isInWatchlist) && (
            <WatchlistButton matchId={match.id} isInWatchlist={isInWatchlist} />
          )}
          <AddToListButton
            matchId={match.id}
            userLists={userLists}
            listIdsContaining={listIdsContaining}
          />
          <ShareButton title={matchLabel} url={`/matches/${match.id}`} />
        </div>
      ) : (
        <div className="border-border mb-6 rounded-lg border p-4 text-center">
          <p className="text-muted-foreground text-sm">
            <Link href="/login" className="text-primary underline">
              Connecte-toi
            </Link>{' '}
            pour logger ce match.
          </p>
        </div>
      )}

      {/* Timeline des événements */}
      {hasDetails &&
        match.status === 'finished' &&
        (goals.length > 0 || bookings.length > 0 || substitutions.length > 0) && (
          <section className="mb-8">
            <h2 className="font-display text-muted-foreground mb-3 text-sm font-semibold tracking-wider uppercase">
              Résumé du match
            </h2>
            <div className="border-border divide-border divide-y rounded-lg border">
              {/* Buts */}
              {goals.length > 0 && (
                <div className="p-3">
                  <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
                    Buts
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {goals.map((g, i) => {
                      const isHome = g.isHome
                      return (
                        <div
                          key={i}
                          className={`flex items-start gap-2 text-sm ${isHome ? 'flex-row' : 'flex-row-reverse'}`}
                        >
                          <span className="text-muted-foreground w-12 shrink-0 text-center font-mono text-xs">
                            {minuteLabel(g.minute, g.injuryTime)}
                          </span>
                          <span>{GOAL_LABEL[g.type]}</span>
                          <div className={isHome ? '' : 'text-right'}>
                            <span className="font-medium">{g.scorer}</span>
                            {g.assist && (
                              <span className="text-muted-foreground ml-1 text-xs">
                                ({g.assist})
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Cartons */}
              {bookings.length > 0 && (
                <div className="p-3">
                  <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
                    Cartons
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {bookings.map((b, i) => {
                      const isHome = b.isHome
                      return (
                        <div
                          key={i}
                          className={`flex items-center gap-2 text-sm ${isHome ? 'flex-row' : 'flex-row-reverse'}`}
                        >
                          <span className="text-muted-foreground w-12 shrink-0 text-center font-mono text-xs">
                            {b.minute}&apos;
                          </span>
                          <span>{CARD_LABEL[b.card]}</span>
                          <span>{b.player}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Remplacements */}
              {substitutions.length > 0 && (
                <div className="p-3">
                  <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
                    Remplacements
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                    {/* Home subs */}
                    <div className="flex flex-col gap-1.5">
                      {substitutions
                        .filter((s) => s.isHome)
                        .map((s, i) => (
                          <div key={i} className="text-xs">
                            <span className="text-muted-foreground font-mono">
                              {s.minute}&apos;{' '}
                            </span>
                            <span className="text-green-600">↑ {s.playerIn}</span>
                            <span className="text-red-500"> ↓ {s.playerOut}</span>
                          </div>
                        ))}
                    </div>
                    {/* Away subs */}
                    <div className="flex flex-col gap-1.5 text-right">
                      {substitutions
                        .filter((s) => !s.isHome)
                        .map((s, i) => (
                          <div key={i} className="text-xs">
                            <span className="text-muted-foreground font-mono">
                              {s.minute}&apos;{' '}
                            </span>
                            <span className="text-green-600">↑ {s.playerIn}</span>
                            <span className="text-red-500"> ↓ {s.playerOut}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

      {/* Tags */}
      {(allTagsData ?? []).length > 0 && (
        <section className="mb-8">
          <h2 className="font-display text-muted-foreground mb-3 text-sm font-semibold tracking-wider uppercase">
            Tags de la communauté
          </h2>
          {user ? (
            <MatchTagsPanel
              matchId={match.id}
              allTags={allTagsData ?? []}
              userTagIds={userTagIds}
              tagCounts={tagCounts}
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {(allTagsData ?? [])
                .filter((t) => (tagCounts[t.id] ?? 0) > 0)
                .map((tag) => (
                  <span
                    key={tag.id}
                    className="border-border text-muted-foreground flex items-center gap-1 rounded-full border px-3 py-1 text-xs"
                  >
                    <span>{tag.emoji}</span>
                    <span>{tag.name}</span>
                    <span className="opacity-60">{tagCounts[tag.id]}</span>
                  </span>
                ))}
              {Object.keys(tagCounts).length === 0 && (
                <p className="text-muted-foreground text-xs">Aucun tag pour ce match.</p>
              )}
            </div>
          )}
        </section>
      )}

      {/* Reviews */}
      <section>
        <h2 className="font-display mb-4 text-lg font-bold">
          Reviews de la communauté
          {reviews.length > 0 && (
            <span className="text-muted-foreground ml-2 text-base font-normal">
              ({reviews.length})
            </span>
          )}
        </h2>
        {reviews.length === 0 ? (
          <div className="border-border rounded-lg border border-dashed p-6 text-center">
            <p className="text-muted-foreground text-sm">
              Aucune review pour ce match. Sois le premier !
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {reviews.map((review) => (
              <div key={review.id}>
                <ReviewCard
                  review={review}
                  currentUserId={user?.id}
                  initialLiked={likedReviewIds.has(review.id)}
                />
                <CommentSection
                  reviewId={review.id}
                  initialComments={commentsMap[review.id] ?? []}
                  currentUserId={user?.id}
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
