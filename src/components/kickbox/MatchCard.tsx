import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { TeamBadge } from './TeamBadge'
import { ScoreDisplay } from './ScoreDisplay'
import { Badge } from '@/components/ui/badge'
import type { Match } from '@/lib/types'

interface MatchCardProps {
  match: Match
  variant?: 'compact' | 'full'
}

export function MatchCard({ match, variant = 'compact' }: MatchCardProps) {
  const kickoff = new Date(match.kickoff)
  const homeTeam = match.home_team
  const awayTeam = match.away_team
  const competition = match.competition

  return (
    <Link
      href={`/matches/${match.id}`}
      className="group border-border bg-card hover:border-primary/40 hover:bg-card/80 block rounded-lg border p-3 transition-colors"
    >
      {/* Compétition + date */}
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-muted-foreground truncate text-xs">
          {competition?.name ?? '—'}
          {match.matchday ? ` · ${match.matchday}` : ''}
        </span>
        <span className="text-muted-foreground ml-2 shrink-0 text-xs">
          {format(kickoff, 'd MMM', { locale: fr })}
        </span>
      </div>

      {/* Équipes + score */}
      <div className="flex items-center justify-between gap-2">
        {/* Domicile */}
        <div className="min-w-0 flex-1">
          <TeamBadge
            name={homeTeam?.name ?? '?'}
            shortName={homeTeam?.short_name}
            logoUrl={homeTeam?.logo_url}
            size="sm"
          />
        </div>

        {/* Score / heure */}
        <div className="shrink-0 px-2 text-center">
          <ScoreDisplay
            homeScore={match.home_score}
            awayScore={match.away_score}
            status={match.status}
            kickoff={match.kickoff}
            size="sm"
          />
        </div>

        {/* Extérieur */}
        <div className="flex min-w-0 flex-1 justify-end">
          <TeamBadge
            name={awayTeam?.name ?? '?'}
            shortName={awayTeam?.short_name}
            logoUrl={awayTeam?.logo_url}
            size="sm"
            align="right"
          />
        </div>
      </div>

      {/* Badge statut live */}
      {match.status === 'live' && (
        <div className="mt-2">
          <Badge
            variant="default"
            className="bg-primary text-primary-foreground px-1.5 py-0 text-[10px]"
          >
            EN DIRECT
          </Badge>
        </div>
      )}

      {/* Note communauté */}
      {match.ratings_count != null && match.ratings_count > 0 && match.avg_rating != null && (
        <div className="mt-1.5 flex items-center gap-1">
          <span className="text-amber-400 text-xs">★</span>
          <span className="text-xs font-medium">{Number(match.avg_rating).toFixed(1)}</span>
          <span className="text-muted-foreground text-xs">({match.ratings_count})</span>
        </div>
      )}

      {/* Lieu (variant full) */}
      {variant === 'full' && match.venue && (
        <p className="text-muted-foreground mt-2 text-xs">{match.venue}</p>
      )}
    </Link>
  )
}
