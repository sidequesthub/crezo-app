import { Router, Request, Response } from 'express';
import { getUser } from '../../middleware/auth';
import { getCreatorByUserId } from '../creators/service';
import { listAssetsByDeal, upsertAsset, updateAssetStatus } from './service';

const router = Router();

async function getCreatorId(req: Request, res: Response): Promise<string | null> {
  const creator = await getCreatorByUserId(getUser(req).sub);
  if (!creator) {
    res.status(404).json({ error: 'Creator not found' });
    return null;
  }
  return creator.id;
}

router.get('/deal/:dealId', async (req: Request<{ dealId: string }>, res: Response) => {
  const creatorId = await getCreatorId(req, res);
  if (!creatorId) return;
  try {
    res.json(await listAssetsByDeal(creatorId, req.params.dealId));
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  const creatorId = await getCreatorId(req, res);
  if (!creatorId) return;
  try {
    res.status(201).json(await upsertAsset({ ...req.body, creator_id: creatorId }));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed' });
  }
});

router.patch('/:id/status', async (req: Request<{ id: string }>, res: Response) => {
  try {
    await updateAssetStatus(req.params.id, req.body.status);
    res.json({ success: true });
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed' });
  }
});

export default router;
