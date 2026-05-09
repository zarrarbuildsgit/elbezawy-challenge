import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only returns non-sensitive debug info
  return res.status(200).json({
    method: req.method,
    has_admin_password: !!process.env.ADMIN_PASSWORD,
    admin_password_length: process.env.ADMIN_PASSWORD?.length || 0,
    body: req.method === 'POST' ? req.body : 'N/A',
    content_type: req.headers['content-type'],
  });
}
