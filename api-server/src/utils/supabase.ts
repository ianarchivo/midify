import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Service role client to bypass Row Level Security when running background jobs
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)
