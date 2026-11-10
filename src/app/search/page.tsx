import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { MatchCard } from '@/components/kickbox/MatchCard'
import { TeamBadge } from '@/components/kickbox/TeamBadge'
import { Input } from '@/components/ui/input'
import { UserAvatar } from '@/components/kickbox/UserAvatar'
import type { Match, Team, Competition } from '@/lib/types'

const MATCH_SELECT = `
  id, api_id, season, matchday, kickoff, status,
  home_score, away_score, home_score_ht, away_score_ht, venue,
  home_team:teams!matches_home_team_id_fkey(id, name, short_name, logo_url, country),
  away_team:teams!matches_away_team_id_fkey(id, name, short_name, logo_url, country),
  competition:competitions(id, name, country, logo_url, type)
`

interface Props {
  searchParams: Promise<{ q?: string }>
}

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams
  const query = q?.trim() ?? ''

  let matches: Match[] = []
  let teams: Team[] = []
  let competitions: Competition[] = []
  let profiles: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
    matches_logged_count: number
  }[] = []

  if (query.length >= 2) {
    const supabase = await createClient()

    // Chercher les équipes
    const { data: teamsData } = await supabase
      .from('teams')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('name')
      .limit(10)
    teams = (teamsData ?? []) as Team[]

    // Chercher les compétitions
    const { data: competitionsData } = await supabase
      .from('competitions')
      .select('*')
      .ilike('name', `%${query}%`)
      .limit(5)
    competitions = (competitionsData ?? []) as Competition[]

    // Chercher les matchs via les IDs d'équipes (les filtres sur colonnes jointes ne fonctionnent pas)
    const teamIds = teams.map((t) => t.id)
    if (teamIds.length > 0) {
      const { data: matchesData } = await supabase
        .from('matches')
        .select(MATCH_SELECT)
        .or(teamIds.map((id) => `home_team_id.eq.${id},away_team_id.eq.${id}`).join(','))
        .order('kickoff', { ascending: false })
        .limit(20)
      matches = (matchesData ?? []) as unknown as Match[]
    }

    // Chercher les utilisateurs
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, matches_logged_count')
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .order('matches_logged_count', { ascending: false })
      .limit(10)
    profiles = profilesData ?? []
  }

  const hasResults = teams.length > 0 || matches.length > 0 || profiles.length > 0 || competitions.length > 0

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display mb-6 text-2xl font-bold">Recherche</h1>

      <form method="GET" className="mb-8">
        <Input
          name="q"
          defaultValue={query}
          placeholder="Rechercher un match, une équipe, un utilisateur…"
          className="text-base"
          autoFocus
        />
      </form>

      {query.length >= 2 ? (
        <>
          {/* Utilisateurs */}
          {profiles.length > 0 && (
            <section className="mb-8">
              <h2 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wider uppercase">
                Utilisateurs
              </h2>
              <div className="flex flex-col gap-1">
                {profiles.map((profile) => (
                  <Link
                    key={profile.id}
                    href={`/${profile.username}`}
                    className="border-border bg-card hover:border-primary/40 flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors"
                  >
                    {profile.avatar_url ? (
                      <UserAvatar
                        url={profile.avatar_url}
                        name={profile.display_name ?? profile.username}
                        size={32}
                      />
                    ) : (
                      <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold">
                        {(profile.display_name ?? profile.username)[0].toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {profile.display_name ?? profile.username}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        @{profile.username} · {profile.matches_logged_count} matchs
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Compétitions */}
          {competitions.length > 0 && (
            <section className="mb-8">
              <h2 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wider uppercase">Compétitions</h2>
              <div className="flex flex-col gap-1">
                {competitions.map((comp) => (
                  <Link key={comp.id} href={`/competitions/${comp.id}`}
                    className="border-border bg-card hover:border-primary/40 flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors"
                  >
                    {comp.logo_url && (
                      <Image src={comp.logo_url} alt={comp.name} width={24} height={24} className="object-contain" unoptimized />
                    )}
                    <div>
                      <p className="text-sm font-medium">{comp.name}</p>
                      {comp.country && <p className="text-muted-foreground text-xs">{comp.country}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Équipes */}
          {teams.length > 0 && (
            <section className="mb-8">
              <h2 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wider uppercase">
                Équipes
              </h2>
              <div className="flex flex-col gap-1">
                {teams.map((team) => (
                  <Link
                    key={team.id}
                    href={`/teams/${team.id}`}
                    className="border-border bg-card hover:border-primary/40 flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors"
                  >
                    <TeamBadge
                      name={team.name}
                      logoUrl={team.logo_url}
                      size="sm"
                      showName={false}
                    />
                    <div>
                      <p className="text-sm font-medium">{team.name}</p>
                      {team.country && (
                        <p className="text-muted-foreground text-xs">{team.country}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Matchs */}
          {matches.length > 0 && (
            <section>
              <h2 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wider uppercase">
                Matchs
              </h2>
              <div className="flex flex-col gap-2">
                {matches.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            </section>
          )}

          {!hasResults && (
            <p className="text-muted-foreground text-sm">
              Aucun résultat pour &quot;{query}&quot;.
            </p>
          )}
        </>
      ) : query.length > 0 ? (
        <p className="text-muted-foreground text-sm">Tape au moins 2 caractères.</p>
      ) : null}
    </div>
  )
}
