import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://bpktxchujrkvztgwvqxs.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwa3R4Y2h1anJrdnp0Z3d2cXhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5Mzk1NzUsImV4cCI6MjA5NTUxNTU3NX0.3BJy9-NH4OO3cNpCFBXU9WJcilxDA6XrxOmiVCPkfeY'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
