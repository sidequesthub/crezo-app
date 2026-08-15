import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mvhpxaewcsnkkgryyfve.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12aHB4YWV3Y3Nua2tncnl5ZnZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNjYyMzEsImV4cCI6MjA4OTk0MjIzMX0.EX9HVdodRFSUdCNMqlH5qxOFtC45vSPpcC8LBsNPMaU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const BACKEND_URL = 'https://crezo-app.vercel.app';
