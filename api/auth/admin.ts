import type { VercelRequest, VercelResponse } from '@vercel/node';

const ADMIN_EMAILS = [
  'muhummadzarrar09@gmail.com',
  'muhummadzarrar99@gmail.com',
  'sinz.lumi@icloud.com'
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Missing credentials' });
  }

  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

  if (!ADMIN_PASSWORD) {
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  // Both email AND password must match
  if (!ADMIN_EMAILS.includes(email.toLowerCase()) || password !== ADMIN_PASSWORD) {
    // Same error for both cases — never reveal which one failed
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const userData = {
    id: 'admin_' + email.split('@')[0].replace(/[^a-z0-9]/gi, ''),
    name: email.split('@')[0],
    email: email.toLowerCase(),
    picture: null,
    access_token: 'admin_bypass',
    refresh_token: 'admin_bypass',
    obtained_at: Date.now(),
  };

  const cookieValue = encodeURIComponent(JSON.stringify(userData));
  const maxAge = 60 * 60 * 24; // 24 hours only for admin bypass

  res.setHeader('Set-Cookie',
    `whop_user=${cookieValue}; Path=/; Max-Age=${maxAge}; SameSite=Lax; Secure; HttpOnly=false`
  );

  return res.status(200).json({ ok: true });
}
