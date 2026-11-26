import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bvijihrulhxagnvqudaw.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2aWppaHJ1bGh4YWdudnF1ZGF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5MjYwOTgsImV4cCI6MjA5NzUwMjA5OH0.1XVsA684DU4j8sZ1Ajr7yd1i7SU0mxQeTbC5z9WQIp0';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
