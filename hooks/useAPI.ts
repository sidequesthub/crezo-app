/**
 * React hook exposing all domain services.
 *
 * Usage in screens:
 *   const { deals, content, invoices, creators, vault } = useAPI();
 *   await deals.create(payload);
 *   await content.update(id, data);
 */

import * as services from '@/services';
import type { ContentService } from '@/services/content/types';
import type { CreatorService } from '@/services/creators/types';
import type { DealService } from '@/services/deals/types';
import type { InvoiceService } from '@/services/invoices/types';
import type { VaultService } from '@/services/vault/types';

export type API = {
  creators: CreatorService;
  deals: DealService;
  content: ContentService;
  invoices: InvoiceService;
  vault: VaultService;
};

const api: API = {
  creators: services.creators,
  deals: services.deals,
  content: services.content,
  invoices: services.invoices,
  vault: services.vault,
};

export function useAPI(): API {
  return api;
}
