"use client";

import { usePathname } from "next/navigation";
import SidebarAdmin from "./SidebarAdmin";
import { SidebarProvider, useSidebar } from "@/contexts/SidebarContext";

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isCollapsed } = useSidebar();
  
  // No aplicar layout especial para páginas de login
  const isLoginPage = pathname === "/admin/login" || pathname === "/admin/reset-password";
  
  // El chat necesita layout especial sin padding
  const isChatPage = pathname === "/admin/chat";
  
  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className={`${isChatPage ? 'h-screen' : 'min-h-screen'} bg-gray-50 overflow-hidden`}>
      {/* Sidebar dinámico */}
      <SidebarAdmin />
      
      {/* Contenido principal que se adapta al sidebar */}
      <div 
        className={`${isChatPage ? 'h-screen' : 'min-h-screen'} transition-all duration-300 ${
          isCollapsed ? 'lg:ml-16' : 'lg:ml-64'
        }`}
      >
        {isChatPage ? (
          // Para el chat, sin padding y altura completa
          <main className="h-full">
            {children}
          </main>
        ) : (
          // Para otras páginas, con padding normal
          <main className="p-6">
            {children}
          </main>
        )}
      </div>
    </div>
  );
}

export default function AdminLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AdminLayoutContent>
        {children}
      </AdminLayoutContent>
    </SidebarProvider>
  );
} 