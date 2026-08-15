import { Router, Request, Response } from 'express';
import {
  startPhoneOtp,
  verifyPhoneOtp,
  resendPhoneOtp,
  refreshPhoneSession,
} from './service';

const router = Router();

router.post('/otp/send', async (req: Request, res: Response) => {
  try {
    const phone = String(req.body?.phone ?? '').trim();
    if (!phone) {
      res.status(400).json({ error: 'phone is required' });
      return;
    }
    const result = await startPhoneOtp(phone);
    res.json({ sent: true, phone: result.phone });
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Send OTP failed' });
  }
});

router.post('/otp/resend', async (req: Request, res: Response) => {
  try {
    const phone = String(req.body?.phone ?? '').trim();
    const via = req.body?.via === 'voice' ? 'voice' : 'text';
    if (!phone) {
      res.status(400).json({ error: 'phone is required' });
      return;
    }
    const result = await resendPhoneOtp(phone, via);
    res.json({ sent: true, phone: result.phone, via });
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Resend OTP failed' });
  }
});

router.post('/otp/verify', async (req: Request, res: Response) => {
  try {
    const phone = String(req.body?.phone ?? '').trim();
    const otp = String(req.body?.otp ?? '').trim();
    if (!phone || !otp) {
      res.status(400).json({ error: 'phone and otp are required' });
      return;
    }
    const session = await verifyPhoneOtp(phone, otp);
    res.json(session);
  } catch (e: unknown) {
    res.status(401).json({ error: e instanceof Error ? e.message : 'Verify OTP failed' });
  }
});

router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const refresh_token = String(req.body?.refresh_token ?? '').trim();
    if (!refresh_token) {
      res.status(400).json({ error: 'refresh_token is required' });
      return;
    }
    const session = refreshPhoneSession(refresh_token);
    res.json(session);
  } catch (e: unknown) {
    res.status(401).json({ error: e instanceof Error ? e.message : 'Refresh failed' });
  }
});

export default router;
