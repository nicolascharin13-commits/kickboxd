import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { getProfileByUsername, getDiaryEntries } from '@/lib/queries'
import { createClient } from '@/lib/supabase/server'
import { MatchCard } from '@/components/kickbox/MatchCard'
import { RatingStars } from '@/components/kickbox/RatingStars'
import { ProfileNav } from '@/components/kickbox/ProfileNav'
import { removeFromDiary } from '@/app/actions/log'
import type { Match } from '@/lib/types'

const PAGE_SIZE = 30

interface Props {
  params: Promise<{ username: string }>
  searchParams: Promise<{ page?: string }>
}

export default async function DiaryPage({ params, searchParams }: Props) {
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
  const isOwnProfile = user?.id === profile.id

  const entries = await getDiaryEntries(profile.id, { limit: PAGE_SIZE, offset })
  const hasNext = entries.length === PAGE_SIZE
  const hasPrev = page > 1

  // Grouper par mois
  const grouped = entries.reduce<Record<string, typeof entries>>((acc, entry) => {
    const key = format(new Date(entry.watched_on), 'MMMM yyyy', { locale: fr })
    if (!acc[key]) acc[key] = []
    acc[key].push(entry)
    return acc
  }, {})

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
          <span className="text-sm font-medium">Journal</span>
        </div>
        <h1 className="font-display text-2xl font-bold">
          Journal de {profile.display_name ?? username}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {profile.matches_logged_count} matchs vus
        </p>
      </div>

      <ProfileNav username={username} active="journal" />

      {entries.length === 0 && page === 1 ? (
        <div className="border-border rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground text-sm">Aucun match loggé pour l&apos;instant.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-8">
            {Object.entries(grouped).map(([month, monthEntries]) => (
              <section key={month}>
                <h2 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wider capitalize uppercase">
                  {month}
                </h2>
                <div className="flex flex-col gap-2">
                  {monthEntries.map((entry) => {
                    const match = entry.match as unknown as Match
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const deleteAction = removeFromDiary.bind(null, match.id) as any
                    return (
                      <div key={entry.id} className="group flex flex-col gap-1">
                        <MatchCard match={match} />
                        <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground text-xs">
                              Vu le {format(new Date(entry.watched_on), 'd MMM', { locale: fr })}
                              {entry.is_rewatch ? ' · revisionnage' : ''}
                            </span>
                            {entry.rating && (
                              <RatingStars value={entry.rating} readOnly size="sm" />
                            )}
                          </div>
                          {isOwnProfile && (
                            <form action={deleteAction}>
                              <button
                                type="submit"
                                className="text-muted-foreground hover:text-destructive text-xs opacity-0 transition-opacity group-hover:opacity-100"
                              >
                                Supprimer
                              </button>
                            </form>
                          )}
                        </div>
                        {entry.review && (entry.review as { content: string }).content && (
                          <Link href={`/matches/${match.id}`} className="block px-1">
                            <p className="text-muted-foreground hover:text-foreground line-clamp-2 text-xs leading-relaxed transition-colors">
                              &ldquo;{(entry.review as { content: string }).content}&rdquo;
                            </p>
                          </Link>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>

          {(hasPrev || hasNext) && (
            <div className="mt-8 flex items-center justify-between">
              {hasPrev ? (
                <Link
                  href={`/${username}/diary?page=${page - 1}`}
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
                  href={`/${username}/diary?page=${page + 1}`}
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
