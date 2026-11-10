import { createClient } from '@/lib/supabase/server'
import { MobileNav } from './MobileNav'

export async function MobileNavServer() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let username: string | null = null
  if (user) {
    const { data } = await supabase.from('profiles').select('username').eq('id', user.id).single()
    username = data?.username ?? null
  }

  return <MobileNav username={username} />
}
