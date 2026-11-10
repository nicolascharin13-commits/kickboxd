import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getProfileByUsername, compareUsers } from '@/lib/queries'
import { UserAvatar } from '@/components/kickbox/UserAvatar'
import { RatingStars } from '@/components/kickbox/RatingStars'

interface Props {
  params: Promise<{ username: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  return { title: `Comparaison avec @${username} — Kickboxd` }
}

export default async function ComparePage({ params }: Props) {
  const { username } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const theirProfile = await getProfileByUsername(username)

  if (!theirProfile) notFound()

  // Get current user's profile
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!currentProfile) redirect('/login')

  if (currentProfile.username === username) {
    redirect(`/${username}`)
  }

  const comparison = await compareUsers(user.id, theirProfile.id)

  const myAvg = comparison.avg1 > 0 ? comparison.avg1.toFixed(1) : null
  const theirAvg = comparison.avg2 > 0 ? comparison.avg2.toFixed(1) : null

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href={`/${currentProfile.username}`} className="hover:text-foreground">@{currentProfile.username}</Link>
        <span>vs</span>
        <Link href={`/${username}`} className="hover:text-foreground">@{username}</Link>
      </div>
      <h1 className="font-display mb-8 text-2xl font-bold">Comparaison</h1>

      {/* Stats côte à côte */}
      <div className="border-border bg-card mb-8 rounded-xl border p-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="mb-1 flex flex-col items-center gap-1">
              {currentProfile.avatar_url ? (
                <UserAvatar url={currentProfile.avatar_url} name={currentProfile.display_name ?? currentProfile.username} size={40} />
              ) : (
                <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full font-bold">
                  {(currentProfile.display_name ?? currentProfile.username)[0].toUpperCase()}
                </div>
              )}
              <p className="text-sm font-medium">@{currentProfile.username}</p>
            </div>
            <p className="font-display text-3xl font-bold">{comparison.total1}</p>
            <p className="text-muted-foreground text-xs">matchs</p>
            {myAvg && <p className="mt-1 text-sm font-medium">★ {myAvg}</p>}
          </div>

          <div className="flex flex-col items-center justify-center">
            <div className="border-border rounded-lg border px-3 py-2 text-center">
              <p className="font-display text-2xl font-bold">{comparison.common.length}</p>
              <p className="text-muted-foreground text-xs">en commun</p>
            </div>
          </div>

          <div>
            <div className="mb-1 flex flex-col items-center gap-1">
              {theirProfile.avatar_url ? (
                <UserAvatar url={theirProfile.avatar_url} name={theirProfile.display_name ?? theirProfile.username} size={40} />
              ) : (
                <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full font-bold">
                  {(theirProfile.display_name ?? theirProfile.username)[0].toUpperCase()}
                </div>
              )}
              <p className="text-sm font-medium">@{username}</p>
            </div>
            <p className="font-display text-3xl font-bold">{comparison.total2}</p>
            <p className="text-muted-foreground text-xs">matchs</p>
            {theirAvg && <p className="mt-1 text-sm font-medium">★ {theirAvg}</p>}
          </div>
        </div>
      </div>

      {/* Matchs en commun */}
      {comparison.common.length === 0 ? (
        <div className="border-border rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground text-sm">Vous n&apos;avez aucun match en commun pour l&apos;instant.</p>
        </div>
      ) : (
        <section>
          <h2 className="mb-4 text-sm font-semibold">Matchs en commun</h2>
          <div className="flex flex-col gap-2">
            {comparison.common.slice(0, 20).map((entry) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const e = entry as any
              const match = e.match
              const home = match?.home_team?.short_name ?? match?.home_team?.name ?? '?'
              const away = match?.away_team?.short_name ?? match?.away_team?.name ?? '?'
              return (
                <Link
                  key={e.match_id}
                  href={`/matches/${e.match_id}`}
                  className="border-border bg-card hover:border-primary/40 flex items-center justify-between gap-3 rounded-lg border px-4 py-3 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{home} vs {away}</p>
                    {match?.competition?.name && (
                      <p className="text-muted-foreground text-xs">{match.competition.name}</p>
                    )}
                  </div>
                  {entry.rating && (
                    <RatingStars value={entry.rating} readOnly size="sm" />
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
