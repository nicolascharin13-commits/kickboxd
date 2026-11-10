import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function sendPushToUser(userId: string, title: string, body: string, data?: Record<string, string>) {
  // Placeholder — real APNs/FCM integration would go here
  // For now, just log — can be extended with expo-server-sdk or direct APNs
  const supabase = getServiceClient()
  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('token, platform')
    .eq('user_id', userId)

  if (!tokens || tokens.length === 0) return

  // TODO: integrate with APNs (iOS) / FCM (Android)
  // For Expo: use expo-server-sdk
  // For native: use node-apn or firebase-admin
  console.log(`Push to ${userId}: ${title} — ${body}`, tokens.map(t => t.token))
}
