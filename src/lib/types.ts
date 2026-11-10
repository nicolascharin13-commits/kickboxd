// Types applicatifs — alignés sur le schéma Supabase

export interface MatchGoal {
  minute: number
  injuryTime: number | null
  type: 'REGULAR' | 'OWN_GOAL' | 'PENALTY'
  isHome: boolean
  scorer: string
  assist: string | null
}

export interface MatchBooking {
  minute: number
  isHome: boolean
  player: string
  card: 'YELLOW_CARD' | 'YELLOW_RED_CARD' | 'RED_CARD'
}

export interface MatchSubstitution {
  minute: number
  isHome: boolean
  playerOut: string
  playerIn: string
}

export interface Team {
  id: number
  api_id: number
  name: string
  short_name: string | null
  country: string | null
  logo_url: string | null
  type: 'club' | 'national'
  founded: number | null
}

export interface Competition {
  id: number
  api_id: number
  name: string
  country: string | null
  logo_url: string | null
  type: 'league' | 'cup' | 'international'
  tier: number | null
}

export interface Match {
  id: number
  api_id: number
  competition_id: number
  season: string
  matchday: string | null
  kickoff: string
  status: 'scheduled' | 'live' | 'finished' | 'postponed'
  home_team_id: number | null
  away_team_id: number | null
  home_score: number | null
  away_score: number | null
  home_score_ht: number | null
  away_score_ht: number | null
  venue: string | null
  referee: string | null
  goals: MatchGoal[]
  bookings: MatchBooking[]
  substitutions: MatchSubstitution[]
  details_fetched_at: string | null
  api_football_id: number | null
  avg_rating?: number | null
  ratings_count?: number
  // Relations jointes
  home_team?: Team | null
  away_team?: Team | null
  competition?: Competition | null
}

export interface Profile {
  id: string
  username: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  matches_logged_count: number
  followers_count: number
  following_count: number
}

export interface Review {
  id: string
  user_id: string
  match_id: number
  content: string
  rating: number | null
  contains_spoilers: boolean
  likes_count: number
  comments_count: number
  created_at: string
  profile?: Profile
  match?: Match
}
