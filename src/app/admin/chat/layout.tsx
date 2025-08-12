import SidebarAdmin from "@/components/SidebarAdmin";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen bg-gray-50">
      <SidebarAdmin />
      <div className="h-full">
        {children}
      </div>
    </div>
  );
} 