/**
 * Supabase Client Configuration
 *
 * Initializes the Supabase client for authentication and database access.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.');
}

// Validate key format.
// Accepts the new publishable key (sb_publishable_...) and the legacy anon JWT (eyJ...).
// A secret key (sb_secret_...) bypasses Row Level Security and must never ship to the browser.
if (supabaseAnonKey.startsWith('sb_secret_')) {
  throw new Error('VITE_SUPABASE_ANON_KEY is a Supabase secret key. Use the publishable key (sb_publishable_...) instead.');
}

const isPublishableKey = supabaseAnonKey.startsWith('sb_publishable_');
const isLegacyAnonKey = supabaseAnonKey.startsWith('eyJ');

if (!isPublishableKey && !isLegacyAnonKey) {
  console.error('❌ Invalid Supabase key format! Expected a publishable key (sb_publishable_...) or a legacy anon key (eyJ...)');
  console.error('Key starts with:', supabaseAnonKey.substring(0, 10));
  throw new Error('Invalid Supabase key format. Please check your VITE_SUPABASE_ANON_KEY in .env.local');
}

// Hosted projects must use HTTPS on supabase.co. Local Supabase development
// uses an HTTP loopback URL such as http://127.0.0.1:54321.
const isValidSupabaseUrl = (value) => {
  try {
    const url = new URL(value);
    const isHostedProject = url.protocol === 'https:' && url.hostname.endsWith('.supabase.co');
    const isLocalProject = url.protocol === 'http:' && ['localhost', '127.0.0.1', '::1'].includes(url.hostname);

    return isHostedProject || isLocalProject;
  } catch {
    return false;
  }
};

if (!isValidSupabaseUrl(supabaseUrl)) {
  console.error('❌ Invalid Supabase URL format!');
  console.error('URL should be a hosted https://xxxxxxxxxxxxx.supabase.co URL or a local loopback URL');
  console.error('Actual URL:', supabaseUrl);
  throw new Error('Invalid Supabase URL format. Please check your VITE_SUPABASE_URL in .env.local');
}

// Debug: Log configuration (remove after debugging - DO NOT log full keys in production)
if (import.meta.env.DEV) {
  console.log('✅ Supabase Config:', {
    url: supabaseUrl,
    urlLength: supabaseUrl?.length,
    keyLength: supabaseAnonKey?.length,
    keyPrefix: supabaseAnonKey?.substring(0, 20) + '...',
    keySuffix: '...' + supabaseAnonKey?.substring(supabaseAnonKey.length - 10),
    keyType: isPublishableKey ? 'publishable' : 'legacy anon',
  });
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
});
