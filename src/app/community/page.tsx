import Link from 'next/link'

import { createClient } from '@/lib/supabase/server'
import { getTopUsers, searchProfiles } from '@/lib/queries'
import { FollowButton } from '@/components/kickbox/FollowButton'
import { UserAvatar } from '@/components/kickbox/UserAvatar'

export const revalidate = 0

interface Props {
  searchParams: Promise<{ q?: string }>
}

export default async function CommunityPage({ searchParams }: Props) {
  const { q } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const topUsers = await getTopUsers(30)
  const searchResults = q && q.trim().length > 0 ? await searchProfiles(q.trim(), 20) : []

  // Batch : une seule requête pour savoir qui je suis parmi ces utilisateurs
  const myFollowingSet = new Set<string>()
  if (user && topUsers.length > 0) {
    const { data } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)
      .in(
        'following_id',
        topUsers.map((u) => u.id)
      )
    ;(data ?? []).forEach((r) => myFollowingSet.add(r.following_id))
  }

  // Suggestions : utilisateurs que le current user ne suit pas encore (hors soi-même)
  const suggestions = user
    ? topUsers.filter((u) => u.id !== user.id && !myFollowingSet.has(u.id)).slice(0, 6)
    : topUsers.slice(0, 6)

  const everyone = topUsers

  // Batch follow status for search results
  const searchFollowSet = new Set<string>()
  if (user && searchResults.length > 0) {
    const { data } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)
      .in(
        'following_id',
        searchResults.map((u) => u.id)
      )
    ;(data ?? []).forEach((r) => searchFollowSet.add(r.following_id))
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">Communauté</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Découvre les membres les plus actifs de Kickboxd
        </p>
      </div>

      {/* Barre de recherche */}
      <form method="GET" className="mb-8">
        <div className="relative">
          <input
            type="text"
            name="q"
            defaultValue={q ?? ''}
            placeholder="Rechercher un membre par pseudo..."
            className="border-border bg-card text-foreground placeholder:text-muted-foreground focus:ring-primary w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2"
          />
          {q && (
            <Link
              href="/community"
              className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 text-xs hover:underline"
            >
              Effacer
            </Link>
          )}
        </div>
      </form>

      {/* Résultats de recherche */}
      {q && (
        <section className="mb-10">
          <h2 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wider uppercase">
            Résultats pour &quot;{q}&quot;
          </h2>
          {searchResults.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucun membre trouvé.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {searchResults.map((u) => (
                <div
                  key={u.id}
                  className="border-border bg-card flex items-center gap-3 rounded-xl border p-4"
                >
                  <Link href={`/${u.username}`} className="flex-shrink-0">
                    <UserAvatar url={u.avatar_url} name={u.display_name ?? u.username} size={44} />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/${u.username}`} className="hover:underline">
                      <p className="truncate text-sm font-semibold">
                        {u.display_name ?? u.username}
                      </p>
                      <p className="text-muted-foreground text-xs">@{u.username}</p>
                    </Link>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {u.matches_logged_count} match{u.matches_logged_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  {user && u.id !== user.id && (
                    <FollowButton
                      targetUserId={u.id}
                      initialIsFollowing={searchFollowSet.has(u.id)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Suggestions (non-suivis) */}
      {suggestions.length > 0 && user && (
        <section className="mb-10">
          <h2 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wider uppercase">
            À suivre
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {suggestions.map((u) => (
              <div
                key={u.id}
                className="border-border bg-card flex items-center gap-3 rounded-xl border p-4"
              >
                <Link href={`/${u.username}`} className="flex-shrink-0">
                  <UserAvatar url={u.avatar_url} name={u.display_name ?? u.username} size={44} />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/${u.username}`} className="hover:underline">
                    <p className="truncate text-sm font-semibold">{u.display_name ?? u.username}</p>
                    <p className="text-muted-foreground text-xs">@{u.username}</p>
                  </Link>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {u.matches_logged_count} match{u.matches_logged_count !== 1 ? 's' : ''}
                    {' · '}
                    {u.followers_count} abonné{u.followers_count !== 1 ? 's' : ''}
                  </p>
                </div>
                <FollowButton targetUserId={u.id} initialIsFollowing={myFollowingSet.has(u.id)} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Classement global */}
      <section>
        <h2 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wider uppercase">
          Les plus actifs
        </h2>
        {everyone.length === 0 ? (
          <div className="border-border rounded-lg border border-dashed p-8 text-center">
            <p className="text-muted-foreground text-sm">Aucun membre actif pour l&apos;instant.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {everyone.map((u, i) => (
              <Link
                key={u.id}
                href={`/${u.username}`}
                className="border-border hover:bg-muted/40 flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors"
              >
                <span className="text-muted-foreground w-6 shrink-0 text-right font-mono text-sm">
                  {i + 1}
                </span>
                <UserAvatar url={u.avatar_url} name={u.display_name ?? u.username} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{u.display_name ?? u.username}</p>
                  <p className="text-muted-foreground text-xs">@{u.username}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold">{u.matches_logged_count}</p>
                  <p className="text-muted-foreground text-xs">matchs</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
