import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
// Load environment variables from .env file in project root
// Handle both direct execution and when imported as a module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// .env is in the root, which is 2 levels up from src/config/
const envPath = resolve(__dirname, '../../.env');
config({ path: envPath });
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase environment variables!');
    console.error('   Please ensure SUPABASE_URL and SUPABASE_ANON_KEY are set in .env');
    console.error(`   Looking for .env at: ${envPath}`);
    console.error(`   Current SUPABASE_URL: ${supabaseUrl ? 'Found' : 'Missing'}`);
    console.error(`   Current SUPABASE_ANON_KEY: ${supabaseAnonKey ? 'Found' : 'Missing'}`);
    throw new Error('Missing Supabase environment variables');
}
// Public client (for inserts via RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
// Admin client (bypasses RLS - use with caution!)
export const supabaseAdmin = supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;
if (!supabaseAdmin) {
    console.warn('⚠️  SUPABASE_SERVICE_KEY not set - admin functions will be limited');
}
else {
    console.log('✅ Supabase clients initialized successfully');
}
