'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function logMatch(formData: {
  matchId: number
  watchedOn: string
  rating: number | null
  isRewatch: boolean
  reviewContent: string
  containsSpoilers: boolean
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }

  const { matchId, watchedOn, rating, isRewatch, reviewContent, containsSpoilers } = formData

  // Créer la review si contenu non vide
  let reviewId: string | null = null
  if (reviewContent.trim().length > 0) {
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .insert({
        user_id: user.id,
        match_id: matchId,
        content: reviewContent.trim(),
        rating,
        contains_spoilers: containsSpoilers,
      })
      .select('id')
      .single()

    if (reviewError) return { error: `Erreur review : ${reviewError.message}` }
    reviewId = review.id
  }

  // Vérifier si une entrée existe déjà (index partiel WHERE is_rewatch = false)
  const { data: existing } = await supabase
    .from('diary_entries')
    .select('id')
    .eq('user_id', user.id)
    .eq('match_id', matchId)
    .eq('is_rewatch', false)
    .single()

  if (existing && !isRewatch) {
    // Mettre à jour l'entrée existante
    const { error } = await supabase
      .from('diary_entries')
      .update({ watched_on: watchedOn, rating, review_id: reviewId })
      .eq('id', existing.id)
    if (error) return { error: `Erreur mise à jour : ${error.message}` }
  } else {
    // Nouvelle entrée
    const { error } = await supabase.from('diary_entries').insert({
      user_id: user.id,
      match_id: matchId,
      watched_on: watchedOn,
      rating,
      review_id: reviewId,
      is_rewatch: isRewatch,
    })
    if (error) return { error: `Erreur diary : ${error.message}` }
  }

  revalidatePath(`/matches/${matchId}`)
  revalidatePath('/[username]/diary', 'page')
  return { success: true }
}

export async function removeFromDiary(matchId: number) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }

  // Récupérer le review_id avant suppression
  const { data: entry } = await supabase
    .from('diary_entries')
    .select('review_id')
    .eq('user_id', user.id)
    .eq('match_id', matchId)
    .eq('is_rewatch', false)
    .single()

  const { error } = await supabase
    .from('diary_entries')
    .delete()
    .eq('user_id', user.id)
    .eq('match_id', matchId)
    .eq('is_rewatch', false)

  if (error) return { error: error.message }

  // Supprimer la review associée si elle existe
  if (entry?.review_id) {
    await supabase.from('reviews').delete().eq('id', entry.review_id).eq('user_id', user.id)
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function updateReview(
  reviewId: string,
  content: string,
  rating: number | null,
  containsSpoilers: boolean
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }

  const trimmed = content.trim()
  if (!trimmed) return { error: 'Contenu requis' }

  const { error } = await supabase
    .from('reviews')
    .update({ content: trimmed, rating, contains_spoilers: containsSpoilers })
    .eq('id', reviewId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/matches/[id]', 'page')
  revalidatePath('/[username]/reviews', 'page')
  return { success: true }
}

export async function deleteReview(reviewId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }

  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', reviewId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return { success: true }
}

export async function toggleWatchlist(matchId: number, currentlyInList: boolean) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }

  if (currentlyInList) {
    const { error } = await supabase
      .from('watchlist')
      .delete()
      .eq('user_id', user.id)
      .eq('match_id', matchId)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('watchlist')
      .insert({ user_id: user.id, match_id: matchId })
    if (error) return { error: error.message }
  }

  revalidatePath(`/matches/${matchId}`)
  revalidatePath('/[username]/watchlist', 'page')
  return { success: true }
}
