import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { code, error } = req.query;

  if (error) {
    return res.redirect('/#/login?error=' + encodeURIComponent(String(error)));
  }
  if (!code) {
    return res.redirect('/#/login?error=no_code');
  }

  const cookies = parseCookies(req.headers.cookie || '');
  const codeVerifier = cookies['whop_pkce_verifier'];

  if (!codeVerifier) {
    return res.redirect('/#/login?error=no_verifier');
  }

  try {
    const tokenRes = await fetch('https://api.whop.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: String(code),
        redirect_uri: process.env.WHOP_REDIRECT_URI,
        client_id: process.env.VITE_WHOP_CLIENT_ID,
        client_secret: process.env.WHOP_CLIENT_SECRET,
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('Token exchange failed:', tokenRes.status, errText);
      return res.redirect('/#/login?error=token_exchange_failed');
    }

    const tokens = await tokenRes.json();

    const userRes = await fetch('https://api.whop.com/oauth/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userRes.ok) {
      console.error('Userinfo failed:', userRes.status);
      return res.redirect('/#/login?error=userinfo_failed');
    }

    const userInfo = await userRes.json();

    const userData = {
      id: userInfo.sub,
      name: userInfo.name || userInfo.preferred_username || 'مشترك',
      email: userInfo.email || '',
      picture: userInfo.picture || null,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      obtained_at: Date.now(),
    };

    const cookieValue = encodeURIComponent(JSON.stringify(userData));
    const maxAge = 60 * 60 * 24 * 30;

    // SameSite=Lax — required for cross-site redirects from OAuth providers
    // SameSite=Strict breaks because the redirect FROM Whop is cross-site
    res.setHeader('Set-Cookie', [
      `whop_user=${cookieValue}; Path=/; Max-Age=${maxAge}; SameSite=Lax; Secure`,
      `whop_pkce_verifier=; Path=/; Max-Age=0; SameSite=Lax`,
    ]);

    return res.redirect('/#/');
  } catch (e) {
    console.error('Whop OAuth callback error:', e);
    return res.redirect('/#/login?error=server_error');
  }
}

function parseCookies(cookieHeader: string): Record<string, string> {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [k, ...v] = c.trim().split('=');
      return [k.trim(), decodeURIComponent(v.join('='))];
    })
  );
}
