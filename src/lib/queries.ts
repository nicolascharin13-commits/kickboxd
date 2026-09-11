// Fonctions de requête Supabase — utilisées dans les Server Components

import { createClient } from '@/lib/supabase/server'

const MATCH_SELECT = `
  id, api_id, competition_id, season, matchday, kickoff, status,
  home_team_id, away_team_id,
  home_score, away_score, home_score_ht, away_score_ht, venue,
  referee, goals, bookings, substitutions, details_fetched_at, api_football_id,
  home_team:teams!matches_home_team_id_fkey(id, name, short_name, logo_url, country),
  away_team:teams!matches_away_team_id_fkey(id, name, short_name, logo_url, country),
  competition:competitions(id, api_id, name, country, logo_url, type)
`

export async function getRecentMatches(limit = 20) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('matches')
    .select(MATCH_SELECT)
    .eq('status', 'finished')
    .order('kickoff', { ascending: false })
    .limit(limit)
  return data ?? []
}

export async function getUpcomingMatches(limit = 20) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('matches')
    .select(MATCH_SELECT)
    .eq('status', 'scheduled')
    .gte('kickoff', new Date().toISOString())
    .order('kickoff', { ascending: true })
    .limit(limit)
  return data ?? []
}

export async function getMatch(id: number) {
  const supabase = await createClient()
  const { data } = await supabase.from('matches').select(MATCH_SELECT).eq('id', id).single()
  return data
}

export async function getTeam(id: number) {
  const supabase = await createClient()
  const { data } = await supabase.from('teams').select('*').eq('id', id).single()
  return data
}

export async function getTeamMatches(teamId: number, limit = 30) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('matches')
    .select(MATCH_SELECT)
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .order('kickoff', { ascending: false })
    .limit(limit)
  return data ?? []
}

export async function getCompetition(id: number) {
  const supabase = await createClient()
  const { data } = await supabase.from('competitions').select('*').eq('id', id).single()
  return data
}

export async function getCompetitionSeasons(competitionId: number): Promise<string[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('matches')
    .select('season')
    .eq('competition_id', competitionId)
    .order('season', { ascending: false })
  const seasons = [...new Set((data ?? []).map((r) => r.season as string))].sort().reverse()
  return seasons
}

export async function getCompetitionMatches(competitionId: number, season?: string) {
  const supabase = await createClient()

  // Matchs passés (500 plus récents)
  let pastQuery = supabase
    .from('matches')
    .select(MATCH_SELECT)
    .eq('competition_id', competitionId)
    .eq('status', 'finished')
    .order('kickoff', { ascending: false })
  if (season) pastQuery = pastQuery.eq('season', season)
  const { data: past } = await pastQuery.limit(500)

  // Matchs à venir (tous, sans limite)
  let futureQuery = supabase
    .from('matches')
    .select(MATCH_SELECT)
    .eq('competition_id', competitionId)
    .neq('status', 'finished')
    .gte('kickoff', new Date().toISOString())
    .order('kickoff', { ascending: true })
  if (season) futureQuery = futureQuery.eq('season', season)
  const { data: future } = await futureQuery.limit(500)

  return [...(past ?? []), ...(future ?? [])]
}

export async function getCompetitions() {
  const supabase = await createClient()
  const { data } = await supabase.from('competitions').select('*').order('name')
  return data ?? []
}

export async function searchMatches(q: string, limit = 20) {
  const supabase = await createClient()

  // Supabase ne supporte pas le filtre .or() sur des colonnes jointes.
  // On cherche d'abord les équipes par nom, puis les matchs par leurs IDs.
  const { data: teams } = await supabase
    .from('teams')
    .select('id')
    .ilike('name', `%${q}%`)
    .limit(50)

  const teamIds = (teams ?? []).map((t) => t.id)
  if (teamIds.length === 0) return []

  const { data } = await supabase
    .from('matches')
    .select(MATCH_SELECT)
    .or(teamIds.map((id) => `home_team_id.eq.${id},away_team_id.eq.${id}`).join(','))
    .order('kickoff', { ascending: false })
    .limit(limit)
  return data ?? []
}

export async function searchTeams(q: string, limit = 10) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('teams')
    .select('*')
    .ilike('name', `%${q}%`)
    .order('name')
    .limit(limit)
  return data ?? []
}

export async function searchProfiles(q: string, limit = 10) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, matches_logged_count')
    .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
    .order('matches_logged_count', { ascending: false })
    .limit(limit)
  return data ?? []
}

export async function getMatchReviews(matchId: number) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('reviews')
    .select(`*, profile:profiles(username, display_name, avatar_url)`)
    .eq('match_id', matchId)
    .order('created_at', { ascending: false })
    .limit(20)
  return data ?? []
}

// =========================================================
// Requêtes profil utilisateur
// =========================================================

export async function getProfileByUsername(username: string) {
  const supabase = await createClient()
  const { data } = await supabase.from('profiles').select('*').eq('username', username).single()
  return data
}

export async function getDiaryEntries(userId: string, { limit = 30, offset = 0 } = {}) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('diary_entries')
    .select(
      `
      id, watched_on, rating, is_rewatch, created_at,
      match:matches(
        id, kickoff, status, home_score, away_score, season, matchday,
        home_team:teams!matches_home_team_id_fkey(id, name, short_name, logo_url),
        away_team:teams!matches_away_team_id_fkey(id, name, short_name, logo_url),
        competition:competitions(id, name)
      ),
      review:reviews(id, content, rating)
    `
    )
    .eq('user_id', userId)
    .order('watched_on', { ascending: false })
    .range(offset, offset + limit - 1)
  return data ?? []
}

export async function getUserReviews(userId: string, { limit = 20, offset = 0 } = {}) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('reviews')
    .select(
      `
      id, content, rating, contains_spoilers, likes_count, created_at,
      match:matches(
        id, kickoff, status, home_score, away_score,
        home_team:teams!matches_home_team_id_fkey(id, name, short_name, logo_url),
        away_team:teams!matches_away_team_id_fkey(id, name, short_name, logo_url),
        competition:competitions(id, name)
      ),
      diary_entry:diary_entries!diary_entries_review_id_fkey(watched_on, is_rewatch)
    `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  return data ?? []
}

export async function getWatchlist(userId: string, { limit = 30, offset = 0 } = {}) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('watchlist')
    .select(
      `
      added_at,
      match:matches(
        id, kickoff, status, home_score, away_score, season, matchday,
        home_team:teams!matches_home_team_id_fkey(id, name, short_name, logo_url),
        away_team:teams!matches_away_team_id_fkey(id, name, short_name, logo_url),
        competition:competitions(id, name)
      )
    `
    )
    .eq('user_id', userId)
    .order('added_at', { ascending: false })
    .range(offset, offset + limit - 1)
  return data ?? []
}

// =========================================================
// Requêtes sociales
// =========================================================

export async function isFollowing(currentUserId: string, targetUserId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', currentUserId)
    .eq('following_id', targetUserId)
    .single()
  return !!data
}

export async function getProfileRecentReviews(userId: string, limit = 4) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('reviews')
    .select(
      `
      id, content, rating, contains_spoilers, created_at,
      match:matches(
        id, kickoff, status, home_score, away_score,
        home_team:teams!matches_home_team_id_fkey(id, name, short_name, logo_url),
        away_team:teams!matches_away_team_id_fkey(id, name, short_name, logo_url),
        competition:competitions(id, name)
      )
    `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return data ?? []
}

type MiniProfile = {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
}

export async function getFollowers(userId: string): Promise<MiniProfile[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('follows')
    .select('profile:profiles!follows_follower_id_fkey(id, username, display_name, avatar_url)')
    .eq('following_id', userId)
    .order('created_at', { ascending: false })
  return (data ?? [])
    .map((r) => r.profile as unknown as MiniProfile)
    .filter((p): p is MiniProfile => !!p)
}

export async function getFollowing(userId: string): Promise<MiniProfile[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('follows')
    .select('profile:profiles!follows_following_id_fkey(id, username, display_name, avatar_url)')
    .eq('follower_id', userId)
    .order('created_at', { ascending: false })
  return (data ?? [])
    .map((r) => r.profile as unknown as MiniProfile)
    .filter((p): p is MiniProfile => !!p)
}

export async function getActivityFeed(currentUserId: string, limit = 20) {
  const supabase = await createClient()

  const { data: followingRows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', currentUserId)

  const followingIds = (followingRows ?? []).map((r) => r.following_id)
  if (followingIds.length === 0) return { reviews: [], diary: [] }

  const MATCH_FRAGMENT = `
    id, kickoff, status, home_score, away_score,
    home_team:teams!matches_home_team_id_fkey(id, name, short_name, logo_url),
    away_team:teams!matches_away_team_id_fkey(id, name, short_name, logo_url),
    competition:competitions(id, name)
  `
  const PROFILE_FRAGMENT = `id, username, display_name, avatar_url`

  const [reviewsRes, diaryRes] = await Promise.all([
    supabase
      .from('reviews')
      .select(
        `id, content, rating, contains_spoilers, likes_count, comments_count, created_at, profile:profiles(${PROFILE_FRAGMENT}), match:matches(${MATCH_FRAGMENT})`
      )
      .in('user_id', followingIds)
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('diary_entries')
      .select(
        `id, watched_on, rating, is_rewatch, created_at, profile:profiles(${PROFILE_FRAGMENT}), match:matches(${MATCH_FRAGMENT})`
      )
      .in('user_id', followingIds)
      .order('created_at', { ascending: false })
      .limit(limit),
  ])

  return {
    reviews: reviewsRes.data ?? [],
    diary: diaryRes.data ?? [],
  }
}

export async function getReviewComments(reviewId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('review_comments')
    .select(
      `id, content, created_at, user_id, profile:profiles(username, display_name, avatar_url)`
    )
    .eq('review_id', reviewId)
    .order('created_at', { ascending: true })
  return data ?? []
}

export async function getTopUsers(limit = 20) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select(
      'id, username, display_name, avatar_url, matches_logged_count, followers_count, following_count'
    )
    .gt('matches_logged_count', 0)
    .order('matches_logged_count', { ascending: false })
    .limit(limit)
  return data ?? []
}

export async function getNotifications(userId: string, limit = 30) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('notifications')
    .select(
      `
      id, type, read, created_at, review_id, match_id,
      actor:actor_id(id, username, display_name, avatar_url)
    `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return data ?? []
}

export async function getUnreadNotificationsCount(userId: string) {
  try {
    const supabase = await createClient()
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false)
    return count ?? 0
  } catch {
    return 0
  }
}

export async function getActivityFeedPaginated(currentUserId: string, page = 1, pageSize = 20) {
  const supabase = await createClient()

  const { data: followingRows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', currentUserId)

  const followingIds = (followingRows ?? []).map((r) => r.following_id)
  if (followingIds.length === 0) return { reviews: [], diary: [], hasMore: false }

  const offset = (page - 1) * pageSize
  const MATCH_FRAGMENT = `
    id, kickoff, status, home_score, away_score,
    home_team:teams!matches_home_team_id_fkey(id, name, short_name, logo_url),
    away_team:teams!matches_away_team_id_fkey(id, name, short_name, logo_url),
    competition:competitions(id, name)
  `
  const PROFILE_FRAGMENT = `id, username, display_name, avatar_url`

  const [reviewsRes, diaryRes] = await Promise.all([
    supabase
      .from('reviews')
      .select(
        `id, content, rating, contains_spoilers, likes_count, comments_count, created_at, profile:profiles(${PROFILE_FRAGMENT}), match:matches(${MATCH_FRAGMENT})`
      )
      .in('user_id', followingIds)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1),
    supabase
      .from('diary_entries')
      .select(
        `id, watched_on, rating, is_rewatch, created_at, profile:profiles(${PROFILE_FRAGMENT}), match:matches(${MATCH_FRAGMENT})`
      )
      .in('user_id', followingIds)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1),
  ])

  const reviews = reviewsRes.data ?? []
  const diary = diaryRes.data ?? []
  const hasMore = reviews.length === pageSize || diary.length === pageSize

  return { reviews, diary, hasMore }
}
