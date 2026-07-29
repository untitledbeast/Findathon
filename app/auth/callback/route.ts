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
    return NextResponse.redirect(`${origin}/?error=auth_failed`)
  }

  if (data.user) {
    // Upsert profile — ensure DB record exists for this user.
    // onConflict: 'id' + ignoreDuplicates: false = UPDATE on existing rows,
    // which means avatar/email stay fresh but role is NOT overwritten.
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: data.user.id,
          full_name:
            data.user.user_metadata?.full_name ??
            data.user.user_metadata?.name ??
            '',
          avatar_url:
            data.user.user_metadata?.avatar_url ??
            data.user.user_metadata?.picture ??
            '',
          email: data.user.email ?? '',
          role: 'user', // default; existing admins keep their role via onConflict
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id', ignoreDuplicates: false }
      )

    if (profileError) {
      console.error('[auth/callback] Profile upsert error:', profileError.message)
      // Don't fail auth for profile errors — user still gets redirected
    }

    return NextResponse.redirect(`${origin}${next}`)
  }

  return NextResponse.redirect(`${origin}/?error=no_user`)
}