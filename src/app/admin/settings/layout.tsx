import AdminAuth from "@/components/AdminAuth";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    return (
        <AdminAuth>
            {children}
        </AdminAuth>
    );
} 