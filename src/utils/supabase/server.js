import { createClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client for server-side operations only
 * Use this in API routes and server components
 * 
 * Uses the service role key which has admin privileges
 * NEVER expose this key to the client-side
 */
export function createSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error(
      'Missing Supabase environment variables. Please check your .env.local file.',
    );
  }

  return createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

