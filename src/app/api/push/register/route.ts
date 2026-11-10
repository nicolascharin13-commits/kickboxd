import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { token, platform } = await request.json()
  if (!token || !platform) return NextResponse.json({ error: 'token et platform requis' }, { status: 400 })

  await supabase.from('push_tokens').upsert({ user_id: user.id, token, platform }, { onConflict: 'user_id,token' })
  return NextResponse.json({ success: true })
}
