import { Router, Request, Response } from 'express';
import { getUser } from '../../middleware/auth';
import { getCreatorByUserId } from '../creators/service';
import { listInvoices, createInvoice, updateInvoice, deleteInvoice } from './service';

const router = Router();

async function getCreatorId(req: Request, res: Response): Promise<string | null> {
  const creator = await getCreatorByUserId(getUser(req).sub);
  if (!creator) {
    res.status(404).json({ error: 'Creator not found' });
    return null;
  }
  return creator.id;
}

router.get('/', async (req: Request, res: Response) => {
  const creatorId = await getCreatorId(req, res);
  if (!creatorId) return;
  try {
    res.json(await listInvoices(creatorId));
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  const creatorId = await getCreatorId(req, res);
  if (!creatorId) return;
  try {
    res.status(201).json(await createInvoice({ ...req.body, creator_id: creatorId }));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed' });
  }
});

router.patch('/:id', async (req: Request<{ id: string }>, res: Response) => {
  const creatorId = await getCreatorId(req, res);
  if (!creatorId) return;
  try {
    res.json(await updateInvoice(req.params.id, creatorId, req.body));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed' });
  }
});

router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  const creatorId = await getCreatorId(req, res);
  if (!creatorId) return;
  try {
    await deleteInvoice(req.params.id, creatorId);
    res.status(204).send();
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed' });
  }
});

export default router;
