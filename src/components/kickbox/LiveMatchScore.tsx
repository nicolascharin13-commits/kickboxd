'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ScoreDisplay } from './ScoreDisplay'
import { Badge } from '@/components/ui/badge'

interface LiveMatchScoreProps {
  matchId: number
  initialHomeScore: number | null
  initialAwayScore: number | null
  initialStatus: string
  kickoff: string
}

export function LiveMatchScore({
  matchId,
  initialHomeScore,
  initialAwayScore,
  initialStatus,
  kickoff,
}: LiveMatchScoreProps) {
  const [homeScore, setHomeScore] = useState(initialHomeScore)
  const [awayScore, setAwayScore] = useState(initialAwayScore)
  const [status, setStatus] = useState(initialStatus)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`match-live-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${matchId}`,
        },
        (payload) => {
          const data = payload.new as {
            home_score: number | null
            away_score: number | null
            status: string
          }
          setHomeScore(data.home_score)
          setAwayScore(data.away_score)
          setStatus(data.status)
          setLastUpdated(new Date())
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [matchId])

  return (
    <div className="flex flex-col items-center gap-1">
      <ScoreDisplay
        homeScore={homeScore}
        awayScore={awayScore}
        status={status as 'live' | 'finished' | 'scheduled' | 'postponed'}
        kickoff={kickoff}
        size="lg"
      />
      {status === 'live' && (
        <Badge className="bg-primary text-primary-foreground animate-pulse text-[10px]">
          EN DIRECT
        </Badge>
      )}
      {lastUpdated && status === 'live' && (
        <span className="text-muted-foreground text-[10px]">
          màj{' '}
          {lastUpdated.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </span>
      )}
    </div>
  )
}
