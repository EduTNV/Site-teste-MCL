// client/src/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xwdtgztlzprpexnnzzir.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3ZHRnenRsenBycGV4bm56emlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MDYzMTYsImV4cCI6MjA3ODQ4MjMxNn0.ZXAACIJqilZGoOpoY9l8G7sVWZn7NNmsRdpqnpR1la0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export const BUCKET_NAME = 'media'