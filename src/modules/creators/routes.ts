import { Router, Request, Response } from 'express';
import { getUser } from '../../middleware/auth';
import { getCreatorByUserId, updateCreator } from './service';

const router = Router();

router.get('/me', async (req: Request, res: Response) => {
  const creator = await getCreatorByUserId(getUser(req).sub);
  if (!creator) {
    res.status(404).json({ error: 'Creator profile not found' });
    return;
  }
  res.json(creator);
});

router.patch('/me', async (req: Request, res: Response) => {
  const creator = await getCreatorByUserId(getUser(req).sub);
  if (!creator) {
    res.status(404).json({ error: 'Creator profile not found' });
    return;
  }

  try {
    const updated = await updateCreator(creator.id, req.body);
    res.json(updated);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Update failed';
    res.status(400).json({ error: msg });
  }
});

export default router;
