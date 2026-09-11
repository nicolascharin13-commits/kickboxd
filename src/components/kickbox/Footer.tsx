import Link from 'next/link'

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-border bg-background border-t">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-4 py-6 sm:flex-row">
        <p className="text-muted-foreground text-xs">
          © {year} Kickboxd — Le tracker de matchs de football
        </p>
        <nav className="flex items-center gap-4">
          <Link
            href="/privacy"
            className="text-muted-foreground hover:text-foreground text-xs transition-colors"
          >
            Confidentialité
          </Link>
          <Link
            href="/terms"
            className="text-muted-foreground hover:text-foreground text-xs transition-colors"
          >
            CGU
          </Link>
          <a
            href="mailto:contact@kickbox.app"
            className="text-muted-foreground hover:text-foreground text-xs transition-colors"
          >
            Contact
          </a>
        </nav>
      </div>
    </footer>
  )
}
