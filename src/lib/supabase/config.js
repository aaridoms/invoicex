// true cuando están definidas las variables de entorno de Supabase
// (en .env.local para desarrollo y en Vercel para producción)
export const isSupabaseConfigured = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
