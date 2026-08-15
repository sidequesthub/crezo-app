import { Request, Response, NextFunction } from 'express';
import { getSupabase } from '../config/supabase';

export interface AuthUser {
  sub: string;
  email?: string;
  phone?: string;
}

export interface AuthRequest extends Request {
  user: AuthUser;
}

export function getUser(req: Request): AuthUser {
  return (req as unknown as AuthRequest).user;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = header.slice(7);

  try {
    const { data, error } = await getSupabase().auth.getUser(token);
    if (error || !data.user) {
      console.error('Auth failed:', error?.message);
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    (req as AuthRequest).user = {
      sub: data.user.id,
      email: data.user.email,
      phone: data.user.phone,
    };
    next();
  } catch (err) {
    console.error('Auth error:', err);
    res.status(401).json({ error: 'Authentication failed' });
  }
}
