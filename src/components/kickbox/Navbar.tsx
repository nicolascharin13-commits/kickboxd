import Link from 'next/link'
import { Bell, Search, Radio } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getUnreadNotificationsCount } from '@/lib/queries'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { UserDropdown } from './UserDropdown'

export async function Navbar() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let profile = null
  let unreadCount = 0
  if (user) {
    const [{ data }, count] = await Promise.all([
      supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single(),
      getUnreadNotificationsCount(user.id),
    ])
    profile = data
    unreadCount = count
  }

  return (
    <header className="border-border bg-background/95 sticky top-0 z-50 border-b backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="font-display text-primary text-xl font-bold">
          Kickboxd
        </Link>

        {/* Nav principale */}
        <nav className="hidden items-center gap-1 sm:flex">
          <Link
            href="/discover"
            className="text-muted-foreground hover:text-foreground rounded-md px-3 py-1.5 text-sm transition-colors"
          >
            Découvrir
          </Link>
          <Link
            href="/popular"
            className="text-muted-foreground hover:text-foreground rounded-md px-3 py-1.5 text-sm transition-colors"
          >
            Populaire
          </Link>
          <Link
            href="/live"
            className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors"
          >
            <Radio className="h-3.5 w-3.5" />
            Live
          </Link>
          <Link
            href="/competitions"
            className="text-muted-foreground hover:text-foreground rounded-md px-3 py-1.5 text-sm transition-colors"
          >
            Compétitions
          </Link>
          <Link
            href="/community"
            className="text-muted-foreground hover:text-foreground rounded-md px-3 py-1.5 text-sm transition-colors"
          >
            Communauté
          </Link>
        </nav>

        {/* Actions droite */}
        <div className="flex items-center gap-1">
          <Link
            href="/search"
            className="text-muted-foreground hover:text-foreground rounded-md p-1.5 transition-colors"
            aria-label="Recherche"
          >
            <Search className="h-4 w-4" />
          </Link>

          {user && profile ? (
            <>
              <Link
                href="/notifications"
                className="text-muted-foreground hover:text-foreground relative rounded-md p-1.5 transition-colors"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] leading-none font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
              <UserDropdown username={profile.username} />
            </>
          ) : (
            <div className="flex items-center gap-2 pl-1">
              <Link href="/login" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
                Connexion
              </Link>
              <Link href="/signup" className={cn(buttonVariants({ size: 'sm' }))}>
                S&apos;inscrire
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
