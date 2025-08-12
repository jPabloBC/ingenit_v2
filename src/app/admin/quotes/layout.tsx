import SidebarAdmin from "@/components/SidebarAdmin";

export default function QuotesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gray-100">
            <SidebarAdmin />
            <main className="w-full">
                {children}
            </main>
        </div>
    );
} 