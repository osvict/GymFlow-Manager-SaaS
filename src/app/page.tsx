import { Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "./actions";

export default async function Home(props: {
  searchParams: Promise<{ error?: string }>;
}) {
  const searchParams = await props.searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-card p-8 rounded-2xl shadow-lg border border-border">

        {/* Header / Logo */}
        <div className="flex flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
            <Dumbbell className="h-8 w-8 text-primary" />
          </div>
          <h2 className="mt-2 text-center text-3xl font-extrabold tracking-tight text-foreground">
            GymFlow Manager
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Control de Acceso Facial Edge & Gestión SaaS
          </p>
        </div>

        {/* Global Error Alert */}
        {searchParams?.error && (
          <div className="bg-destructive/15 text-destructive text-sm font-medium px-4 py-3 rounded-md text-center">
            {searchParams.error === "Invalid login credentials"
              ? "Credenciales incorrectas. Intenta de nuevo."
              : searchParams.error}
          </div>
        )}

        {/* Login Form UI connected to Server Action */}
        <form className="mt-8 space-y-6" action={login}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div className="space-y-2">
              <Label htmlFor="email-address">Correo electrónico</Label>
              <Input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="admin@gimnasio.com"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña</Label>
                <a href="#" className="text-sm font-medium text-primary hover:text-primary/80">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="w-full"
              />
            </div>
          </div>

          <div>
            <Button type="submit" className="w-full flex justify-center py-2 px-4 text-md font-medium">
              Iniciar Sesión
            </Button>
          </div>
        </form>

      </div>
    </div>
  );
}
