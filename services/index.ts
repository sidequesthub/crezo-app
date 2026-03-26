/**
 * Service Composition Root
 *
 * This is the SINGLE FILE that wires all domain services to their implementations.
 * Each domain maps 1:1 to a potential microservice.
 *
 * To swap a domain to a REST API:
 *   1. Create e.g. services/deals/rest.ts implementing DealService
 *   2. Change the import + factory call for that domain below
 *   3. Done — zero screen changes.
 *
 * To break into microservices:
 *   - Each domain folder becomes its own deployable service
 *   - The types.ts in each folder becomes the API contract
 *   - Replace the Supabase implementation with HTTP client calls
 */

import { createSupabaseAuth } from './auth/supabase';
import { createSupabaseContent } from './content/supabase';
import { createSupabaseCreators } from './creators/supabase';
import { createSupabaseDeals } from './deals/supabase';
import { createSupabaseInvoices } from './invoices/supabase';
import { createSupabaseVault } from './vault/supabase';

// ── Domain Services ──────────────────────────────────

export const auth = createSupabaseAuth();
export const creators = createSupabaseCreators();
export const deals = createSupabaseDeals();
export const content = createSupabaseContent();
export const invoices = createSupabaseInvoices();
export const vault = createSupabaseVault();

// ── Re-export types for convenience ──────────────────

export type { AuthService } from './auth/types';
export type { CreatorService, CreatorUpdate } from './creators/types';
export type { DealService, DealInput, BrandInput, DeliverableInput } from './deals/types';
export type { ContentService, ContentSlotInput } from './content/types';
export type { InvoiceService, InvoiceInput } from './invoices/types';
export type { VaultService, AssetMetaInput, AssetMetaRow } from './vault/types';
