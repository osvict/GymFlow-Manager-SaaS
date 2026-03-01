"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dumbbell } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);

        const formData = new FormData(e.currentTarget);
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;

        const supabase = createClient();

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            toast.error("Error al iniciar sesión: " + error.message);
            setIsLoading(false);
            return;
        }

        toast.success("Sesión iniciada correctamente");

        // PASO CRÍTICO: Refrescar caché del servidor ANTES de navegar
        router.refresh();

        setTimeout(() => {
            router.push('/dashboard');
        }, 100);
    };

    return (
        <div className="flex h-screen w-screen flex-col items-center justify-center bg-muted/40">
            <div className="mb-8 flex flex-col items-center text-center">
                <div className="flex items-center justify-center h-16 w-16 bg-primary/10 rounded-full mb-4">
                    <Dumbbell className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-2xl font-semibold tracking-tight">GymFlow Manager</h1>
                <p className="text-sm text-muted-foreground mt-2">
                    Facial Recognition Edge / Cloud Management
                </p>
            </div>

            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle className="text-xl">Sign In</CardTitle>
                    <CardDescription>
                        Enter your admin credentials to access your dashboard.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form className="space-y-4" onSubmit={handleLogin}>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" name="email" type="email" placeholder="m@example.com" required disabled={isLoading} />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Password</Label>
                                <a href="#" className="text-sm text-muted-foreground hover:text-primary underline">
                                    Forgot password?
                                </a>
                            </div>
                            <Input id="password" name="password" type="password" required disabled={isLoading} />
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? "Iniciando sesión..." : "Sign In"}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center text-sm text-muted-foreground border-t pt-4">
                    Protected by Supabase Auth & Edge Rules
                </CardFooter>
            </Card>
        </div>
    );
}
