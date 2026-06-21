import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jiifmxlnhxodvqgscjro.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppaWZteGxuaHhvZHZxZ3NjanJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxNzE3OTgsImV4cCI6MjA5NTc0Nzc5OH0.V72l3Nxz8w6Hwh8tJGwpeLkSNh3BEwDjhNuwsmvbejY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
