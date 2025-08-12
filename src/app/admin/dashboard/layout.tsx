import AdminAuth from "@/components/AdminAuth";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <AdminAuth>
            {children}
        </AdminAuth>
    );
} 