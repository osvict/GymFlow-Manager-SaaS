import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/Label";
import { Dumbbell } from "lucide-react";

export default function LoginPage() {
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
                    <form className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" placeholder="m@example.com" required />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Password</Label>
                                <a href="#" className="text-sm text-muted-foreground hover:text-primary underline">
                                    Forgot password?
                                </a>
                            </div>
                            <Input id="password" type="password" required />
                        </div>
                        <Button type="submit" className="w-full">
                            Sign In
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
