import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables');
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
);

// Database Types
export interface Issue {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'pending' | 'resolved' | 'rejected' | 'in-progress';
  severity: 'low' | 'medium' | 'high';
  location_name: string;
  latitude?: number;
  longitude?: number;
  district?: string;
  state?: string;
  image_url?: string;
  user_id: string;
  reporter_name?: string;
  is_anonymous?: boolean;
  upvotes: number;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  assigned_to?: string;
  resolved_image_url?: string;
  viewed_by_admin?: boolean;
}

export interface Admin {
  id: string;
  clerk_id: string;
  email: string;
  name: string;
  role: 'state' | 'district' | 'local' | 'super_admin';
  state?: string;
  district?: string;
  local_body?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  color: string;
  icon?: string;
  created_at: string;
}
