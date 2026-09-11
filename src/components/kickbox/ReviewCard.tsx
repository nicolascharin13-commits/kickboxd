'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Trash2, AlertTriangle, Pencil, Check, X } from 'lucide-react'
import { RatingStars } from './RatingStars'
import { LikeButton } from './LikeButton'
import { deleteReview, updateReview } from '@/app/actions/log'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { Review } from '@/lib/types'

interface ReviewCardProps {
  review: Review
  currentUserId?: string
  initialLiked?: boolean
}

export function ReviewCard({ review, currentUserId, initialLiked = false }: ReviewCardProps) {
  const router = useRouter()
  const [revealed, setRevealed] = useState(!review.contains_spoilers)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editContent, setEditContent] = useState(review.content)
  const [editRating, setEditRating] = useState<number | null>(review.rating ?? null)
  const [editSpoilers, setEditSpoilers] = useState(review.contains_spoilers)
  const isOwner = currentUserId === review.user_id
  const profile = review.profile

  async function handleDelete() {
    setDeleting(true)
    await deleteReview(review.id)
    router.refresh()
  }

  async function handleSave() {
    setSaving(true)
    const result = await updateReview(review.id, editContent, editRating, editSpoilers)
    setSaving(false)
    if (!result.error) {
      setEditing(false)
      router.refresh()
    }
  }

  function handleCancelEdit() {
    setEditContent(review.content)
    setEditRating(review.rating ?? null)
    setEditSpoilers(review.contains_spoilers)
    setEditing(false)
  }

  return (
    <div className="border-border bg-card rounded-lg border p-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <a href={`/${profile?.username}`} className="text-sm font-semibold hover:underline">
            @{profile?.username ?? '?'}
          </a>
          {!editing && review.rating && <RatingStars value={review.rating} readOnly size="sm" />}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">
            {formatDistanceToNow(new Date(review.created_at), { locale: fr, addSuffix: true })}
          </span>
          {isOwner && !editing && (
            <>
              <button
                onClick={() => setEditing(true)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Modifier la review"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              {confirmDelete ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="text-destructive text-xs font-medium"
                  >
                    {deleting ? '…' : 'Confirmer'}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-muted-foreground text-xs"
                  >
                    Annuler
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  aria-label="Supprimer la review"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mode édition */}
      {editing ? (
        <div className="flex flex-col gap-3">
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={4}
            maxLength={5000}
            className="resize-none text-sm"
          />
          <div className="flex items-center gap-4">
            <RatingStars value={editRating ?? 0} onChange={setEditRating} size="sm" />
            <label className="flex cursor-pointer items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={editSpoilers}
                onChange={(e) => setEditSpoilers(e.target.checked)}
                className="rounded"
              />
              Spoilers
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving || !editContent.trim()}>
              <Check className="mr-1 h-3.5 w-3.5" />
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancelEdit} disabled={saving}>
              <X className="mr-1 h-3.5 w-3.5" />
              Annuler
            </Button>
          </div>
        </div>
      ) : /* Contenu */
      review.contains_spoilers && !revealed ? (
        <button
          onClick={() => setRevealed(true)}
          className="border-border flex w-full items-center justify-center gap-2 rounded-md border border-dashed py-3 text-sm"
        >
          <AlertTriangle className="text-muted-foreground h-4 w-4" />
          <span className="text-muted-foreground">
            Contient des spoilers — cliquer pour afficher
          </span>
        </button>
      ) : (
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{review.content}</p>
      )}

      {/* Footer */}
      {!editing && currentUserId && !isOwner && (
        <div className="border-border mt-3 flex items-center gap-3 border-t pt-3">
          <LikeButton
            reviewId={review.id}
            initialLiked={initialLiked}
            initialCount={review.likes_count}
          />
        </div>
      )}
      {!editing && !currentUserId && review.likes_count > 0 && (
        <div className="border-border mt-3 border-t pt-3">
          <span className="text-muted-foreground text-xs">{review.likes_count} j&apos;aime</span>
        </div>
      )}
    </div>
  )
}
