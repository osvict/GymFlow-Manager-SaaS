import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen w-full bg-background md:flex-row flex-col">
            <Sidebar />
            <div className="flex flex-1 flex-col min-w-0 bg-muted/20">
                <Header />
                <main className="flex-1 overflow-y-auto p-4 sm:px-6 md:p-8">
                    <div className="mx-auto w-full max-w-7xl">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
