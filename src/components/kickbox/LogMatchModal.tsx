'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { RatingStars } from './RatingStars'
import { logMatch, removeFromDiary } from '@/app/actions/log'

interface LogMatchModalProps {
  matchId: number
  matchLabel: string
  isLogged: boolean
  existingRating?: number | null
}

export function LogMatchModal({
  matchId,
  matchLabel,
  isLogged,
  existingRating,
}: LogMatchModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [rating, setRating] = useState<number | null>(existingRating ?? null)
  const [watchedOn, setWatchedOn] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [reviewContent, setReviewContent] = useState('')

  const [isRewatch, setIsRewatch] = useState(false)

  const panelRef = useRef<HTMLDivElement>(null)

  // Fermer sur Escape
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  // Bloquer le scroll body
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    e.stopPropagation()
    setLoading(true)
    setError(null)

    const result = await logMatch({
      matchId,
      watchedOn,
      rating,
      isRewatch,
      reviewContent,
      containsSpoilers: false,
    })

    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      setOpen(false)
      router.refresh()
    }
  }

  return (
    <>
      {/* Bouton déclencheur */}
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex h-8 w-full items-center justify-center rounded-lg border px-3 text-sm font-medium transition-colors sm:w-auto ${
          isLogged
            ? 'border-border bg-background hover:bg-muted text-foreground'
            : 'bg-primary text-primary-foreground hover:bg-primary/90 border-transparent'
        }`}
      >
        {isLogged ? '✓ Loggé' : '+ Logger ce match'}
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          aria-modal="true"
          role="dialog"
        >
          {/* Fond */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div
            ref={panelRef}
            className="border-border bg-card relative z-10 w-full max-w-md rounded-xl border p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 className="font-display text-base leading-tight font-semibold">{matchLabel}</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground shrink-0 rounded-md p-1 transition-colors"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Date */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="log-watched-on">Vu le</Label>
                <input
                  id="log-watched-on"
                  type="date"
                  value={watchedOn}
                  onChange={(e) => setWatchedOn(e.target.value)}
                  className="border-border bg-background text-foreground flex h-8 w-full rounded-md border px-3 py-1 text-sm"
                  required
                />
              </div>

              {/* Note */}
              <div className="flex flex-col gap-1.5">
                <Label>Note</Label>
                <div className="flex items-center gap-3">
                  <RatingStars value={rating} onChange={setRating} size="lg" />
                  {rating && (
                    <button
                      type="button"
                      onClick={() => setRating(null)}
                      className="text-muted-foreground hover:text-foreground text-xs"
                    >
                      Effacer
                    </button>
                  )}
                </div>
              </div>

              {/* Review */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="log-review">Review (optionnel)</Label>
                <Textarea
                  id="log-review"
                  placeholder="Ton avis sur ce match…"
                  value={reviewContent}
                  onChange={(e) => setReviewContent(e.target.value)}
                  maxLength={5000}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-muted-foreground text-right text-xs">
                  {reviewContent.length}/5000
                </p>
              </div>

              {/* Options */}
              <div className="flex flex-col gap-2">
                {isLogged && (
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={isRewatch}
                      onChange={(e) => setIsRewatch(e.target.checked)}
                    />
                    C&apos;est un revisionnage
                  </label>
                )}
              </div>

              {error && (
                <p className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
                  {error}
                </p>
              )}

              <div className="flex items-center justify-between pt-1">
                {isLogged && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-destructive hover:text-destructive text-xs"
                    onClick={async () => {
                      await removeFromDiary(matchId)
                      setOpen(false)
                      router.refresh()
                    }}
                  >
                    Supprimer du journal
                  </Button>
                )}
                <div className="ml-auto flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Enregistrement…' : 'Enregistrer'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
