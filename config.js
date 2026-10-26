// Connexion à Supabase. Laisser vide = mode démo (données sur l'appareil seulement).
// Ces deux valeurs sont faites pour être publiques : la base est protégée
// par les règles d'accès définies dans supabase/schema.sql.
window.MAISON_CONFIG = {
  supabaseUrl: '',  // ex. https://abcdefgh.supabase.co
  supabaseKey: ''   // clé « publishable » (sb_publishable_…) ou « anon »
};
