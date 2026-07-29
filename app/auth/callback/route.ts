import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.user) {
      // Ensure profile exists (upsert on login)
      await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: data.user.user_metadata?.full_name
          ?? data.user.user_metadata?.name ?? '',
        avatar_url: data.user.user_metadata?.avatar_url
          ?? data.user.user_metadata?.picture ?? '',
        email: data.user.email ?? '',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id',
        ignoreDuplicates: false,
      })

      // Redirect to account dashboard
      return NextResponse.redirect(`${origin}/account`)
    }
  }

  // Error — redirect home
  return NextResponse.redirect(`${origin}/?error=auth`)
}
