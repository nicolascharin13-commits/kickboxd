'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const accepted = localStorage.getItem('cookie_consent')
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!accepted) setVisible(true)
  }, [])

  function accept() {
    localStorage.setItem('cookie_consent', 'true')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="border-border bg-card fixed right-0 bottom-14 left-0 z-[60] border-t px-4 py-3 sm:bottom-0">
      <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <p className="text-muted-foreground text-xs leading-relaxed">
          Kickboxd utilise des cookies strictement nécessaires au fonctionnement du service (session
          d&apos;authentification). Aucun cookie publicitaire.{' '}
          <Link href="/privacy" className="text-foreground underline underline-offset-2">
            En savoir plus
          </Link>
        </p>
        <button
          onClick={accept}
          className="border-border hover:bg-muted shrink-0 rounded-md border px-4 py-1.5 text-xs font-medium transition-colors"
        >
          J&apos;accepte
        </button>
      </div>
    </div>
  )
}
