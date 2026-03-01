import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

type InvitePayload = {
  email: string
  shareAllProfiles: boolean
  profileId?: string | null
  role: 'admin' | 'member' | 'viewer'
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const fromEmail = Deno.env.get('RESEND_FROM_EMAIL')
  const appBaseUrl = Deno.env.get('APP_BASE_URL')

  if (!resendApiKey || !fromEmail || !appBaseUrl) {
    return new Response(JSON.stringify({
      error: 'Missing required function secrets (RESEND_API_KEY, RESEND_FROM_EMAIL, APP_BASE_URL)'
    }), { status: 500, headers: { 'content-type': 'application/json' } })
  }

  let payload: InvitePayload
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'content-type': 'application/json' }
    })
  }

  if (!payload?.email) {
    return new Response(JSON.stringify({ error: 'Missing email' }), {
      status: 400,
      headers: { 'content-type': 'application/json' }
    })
  }

  const inviteLink = `${appBaseUrl.replace(/\/$/, '')}/login`
  const sharingText = payload.shareAllProfiles
    ? 'ALL profiles'
    : 'a profile'

  const subject = 'You have been invited to share expense profiles'
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2>Profile Sharing Invitation</h2>
      <p>You have been invited to access ${sharingText} in <strong>Kharadhu Baradhu</strong>.</p>
      <p>Role: <strong>${payload.role}</strong></p>
      <p>
        If you already have an account, sign in. If not, create an account using this email address.
      </p>
      <p>
        <a href="${inviteLink}" style="display:inline-block;padding:10px 14px;background:#059669;color:#fff;text-decoration:none;border-radius:8px;">Open App</a>
      </p>
      <p style="color:#6b7280;font-size:12px;">If the button does not work, copy and paste this link: ${inviteLink}</p>
    </div>
  `

  const resendResp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: fromEmail,
      to: payload.email,
      subject,
      html
    })
  })

  if (!resendResp.ok) {
    const text = await resendResp.text()
    return new Response(JSON.stringify({ error: 'Failed to send email', details: text }), {
      status: 502,
      headers: { 'content-type': 'application/json' }
    })
  }

  const data = await resendResp.json().catch(() => ({}))

  return new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  })
})
