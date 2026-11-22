import { useCallback, useEffect, useState } from 'react'
import { supabase, supabaseConfigured } from '../lib/supabase.js'

export function useAuth() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(supabaseConfigured)

  useEffect(() => {
    if (!supabase) return undefined

    let active = true
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) console.error('[Auth Session Error]', error)
      setSession(data?.session ?? null)
      setLoading(false)
    }).catch((error) => {
      if (!active) return
      console.error('[Auth Session Error]', error)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async () => {
    if (!supabase) throw new Error('Supabase ڕێکنەخراوە. .env و ڕێنمایی README بپشکنە.')

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  const deleteAccount = useCallback(async () => {
    if (!supabase) throw new Error('Supabase ڕێکنەخراوە.')
    const { error } = await supabase.functions.invoke('delete-account', {
      method: 'POST',
    })
    if (error) throw error
    await supabase.auth.signOut()
  }, [])

  return {
    user: session?.user ?? null,
    session,
    loading,
    configured: supabaseConfigured,
    signIn,
    signOut,
    deleteAccount,
  }
}
