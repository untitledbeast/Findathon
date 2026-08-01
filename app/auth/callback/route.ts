import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/account'

  if (!code) {
    console.error('[auth/callback] No code in request')
    return NextResponse.redirect(`${origin}/?error=no_code`)
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] Exchange error:', error.message)
    return NextResponse.redirect(`${origin}/?error=auth_failed&msg=${encodeURIComponent(error.message)}`)
  }

  if (!data?.user) {
    return NextResponse.redirect(`${origin}/?error=no_user`)
  }

  // Safely upsert profile — only fields guaranteed to exist in schema
  try {
    await supabase
      .from('profiles')
      .upsert(
        {
          id: data.user.id,
          full_name:
            data.user.user_metadata?.full_name ??
            data.user.user_metadata?.name ??
            data.user.email?.split('@')[0] ??
            'User',
          avatar_url:
            data.user.user_metadata?.avatar_url ??
            data.user.user_metadata?.picture ??
            null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id', ignoreDuplicates: false }
      )
  } catch (profileErr) {
    // Never block auth for profile errors
    console.error('[auth/callback] Profile upsert exception:', profileErr)
  }

  return NextResponse.redirect(`${origin}${next}`)
}