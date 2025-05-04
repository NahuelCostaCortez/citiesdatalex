import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vchgkwrgugxtmabwonaj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjaGdrd3JndWd4dG1hYndvbmFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYzMzA1NzEsImV4cCI6MjA2MTkwNjU3MX0.SEw9R91LgUyEZFtEJVxj0BIjaFt_sHmK6ki_bZuTc20';

export const supabase = createClient(supabaseUrl, supabaseKey); 