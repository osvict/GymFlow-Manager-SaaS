import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  // --- OPCIÓN NUCLEAR: INYECTAR LAS CREDENCIALES DIRECTAMENTE ---
  // TPM (Usuario): Pega aquí mismo entre comillas tu URL de Supabase y tu Llave ANON
  // Ejemplo: const supabaseUrl = "https://tu-url.supabase.co";
  const supabaseUrl = "https://gnmutnrlarudaugrcmwu.supabase.co";

  // Ejemplo: const supabaseKey = "eyJhbG..";
  const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdubXV0bnJsYXJ1ZGF1Z3JjbXd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5ODIzMTMsImV4cCI6MjA4NzU1ODMxM30.t_VXLy5_0535kLDfpBU4HDKp4NLN-EukuYPBtRAfkrQ";

  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Unhandled component errors if setAll is called from a Server Component.
          }
        },
      },
    }
  );
}
