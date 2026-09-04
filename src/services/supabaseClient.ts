/**
 * Connecteur optionnel Supabase Realtime
 * 
 * Pour activer la synchronisation Cloud multi-téléphones via Supabase :
 * 1. Créez un projet sur https://supabase.com
 * 2. Créez une table `game_sessions` :
 *    CREATE TABLE game_sessions (
 *      room_code TEXT PRIMARY KEY,
 *      data JSONB NOT NULL,
 *      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 *    );
 * 3. Activez le Realtime sur la table `game_sessions` dans le dashboard Supabase.
 * 4. Définissez vos variables dans `.env` :
 *    VITE_SUPABASE_URL=https://votre-projet.supabase.co
 *    VITE_SUPABASE_ANON_KEY=votre-cle-anon
 */

export interface CloudConfig {
  supabaseUrl?: string;
  supabaseKey?: string;
  enabled: boolean;
}

export const getCloudConfig = (): CloudConfig => {
  const url = import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('monopoly_supabase_url') || '';
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('monopoly_supabase_key') || '';
  return {
    supabaseUrl: url,
    supabaseKey: key,
    enabled: Boolean(url && key),
  };
};

export const saveCloudConfig = (url: string, key: string) => {
  localStorage.setItem('monopoly_supabase_url', url);
  localStorage.setItem('monopoly_supabase_key', key);
};
