import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2'

Deno.serve(async (req) => {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  const url = new URL(req.url)
  const token = url.searchParams.get('token')

  if (!token) {
    return htmlResponse('Missing Token', 'No unsubscribe token was provided.', false)
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { data, error } = await supabase.rpc('handle_unsubscribe', { token })

    if (error) {
      console.error('Unsubscribe error:', error)
      return htmlResponse('Error', 'Something went wrong. Please try again later.', false)
    }

    if (data === false) {
      return htmlResponse('Invalid Link', 'This unsubscribe link is not valid. It may have already been used or expired.', false)
    }

    return htmlResponse('Unsubscribed', 'You have been successfully unsubscribed from CSS Jobs emails.', true)
  } catch (error) {
    console.error('Unexpected error:', error)
    return htmlResponse('Error', 'An unexpected error occurred. Please try again later.', false)
  }
})

function htmlResponse(title: string, message: string, success: boolean): Response {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - CSS Jobs</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: linear-gradient(135deg, #eef2ff, #ffffff, #faf5ff); }
    .card { background: white; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.1); padding: 40px; max-width: 420px; text-align: center; }
    .icon { width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 32px; }
    .icon.success { background: #dcfce7; }
    .icon.error { background: #fee2e2; }
    h1 { margin: 0 0 12px; color: #111827; font-size: 24px; }
    p { color: #6b7280; line-height: 1.6; margin: 0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon ${success ? 'success' : 'error'}">${success ? '&#10003;' : '&#10007;'}</div>
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
    status: success ? 200 : 400,
  })
}
