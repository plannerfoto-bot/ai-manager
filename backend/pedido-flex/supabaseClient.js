import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://jiifmxlnhxodvqgscjro.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppaWZteGxuaHhvZHZxZ3NjanJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDE3MTc5OCwiZXhwIjoyMDk1NzQ3Nzk4fQ.VYXXKFr_r-jYtNor4oMKFqqtOULO37fOce08tGQrB5Y';

export const supabase = createClient(supabaseUrl, supabaseKey);
