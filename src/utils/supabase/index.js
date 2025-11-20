/**
 * Supabase client utilities
 * 
 * All Supabase operations are server-side only.
 * Use this in API routes and server components.
 * 
 * Usage:
 * import { createSupabaseClient } from '@/utils/supabase'
 * 
 * const supabase = createSupabaseClient();
 */

export { createSupabaseServerClient as createSupabaseClient } from './server';

