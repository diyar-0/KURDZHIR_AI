import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const authorization = request.headers.get('Authorization')
  if (!authorization) {
    return Response.json({ error: 'Authorization required.' }, { status: 401 })
  }

  const url = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceRoleKey) {
    return Response.json({ error: 'Account deletion is not configured.' }, { status: 503 })
  }

  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const token = authorization.replace(/^Bearer\s+/i, '')
  const { data: { user }, error: userError } = await admin.auth.getUser(token)
  if (userError || !user) {
    return Response.json({ error: 'Invalid session.' }, { status: 401 })
  }

  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) {
    console.error('[Delete Account Error]', error)
    return Response.json({ error: 'Account deletion failed.' }, { status: 500 })
  }

  return Response.json({ success: true })
})
