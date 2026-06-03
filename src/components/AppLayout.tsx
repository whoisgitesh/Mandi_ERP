// import { ReactNode } from "react";
// import { Navigate, useNavigate } from "react-router-dom";
// import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
// import { AppSidebar } from "./AppSidebar";
// import { useAuth } from "@/lib/auth";
// import { Button } from "@/components/ui/button";
// import { LogOut } from "lucide-react";
// import { GlobalSearch } from "./GlobalSearch";

// export function AppLayout({ children }: { children: ReactNode }) {
//   const { user, loading, signOut } = useAuth();
//   const navigate = useNavigate();

//   if (loading) {
//     return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
//   }
//   if (!user) return <Navigate to="/auth" replace />;

//   return (
//     <SidebarProvider>
//       <div className="min-h-screen flex w-full bg-muted">
//         <AppSidebar />
//         <div className="flex-1 flex flex-col min-w-0">
//           <header className="h-12 flex items-center justify-between border-b bg-card px-3 shadow-sm">
//             <div className="flex items-center gap-2">
//               <SidebarTrigger />
//               <span className="text-sm font-medium text-foreground">Mandi Procurement</span>
//             </div>
//             <div className="flex items-center gap-3">
//               <GlobalSearch />
//               <span className="text-xs text-muted-foreground hidden sm:inline">{user.email}</span>
//               <Button
//                 variant="ghost"
//                 size="sm"
//                 onClick={async () => {
//                   await signOut();
//                   navigate("/auth");
//                 }}
//               >
//                 <LogOut className="h-4 w-4 mr-1" /> Sign out
//               </Button>
//             </div>
//           </header>
//           <main className="flex-1 overflow-auto">{children}</main>
//         </div>
//       </div>
//     </SidebarProvider>
//   );
// }
import { ReactNode } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { GlobalSearch } from "./GlobalSearch";

export function AppLayout({ children }: { children: ReactNode }) {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const navigate = useNavigate();

  if (!token) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-muted">
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center justify-between border-b bg-card px-3 shadow-sm">

            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <span className="text-sm font-medium text-foreground">
                Mandi Procurement
              </span>
            </div>

            <div className="flex items-center gap-3">
              <GlobalSearch />

              <span className="text-xs text-muted-foreground hidden sm:inline">
                {user?.email}
              </span>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  localStorage.removeItem("token");
                  localStorage.removeItem("user");
                  navigate("/auth", { replace: true });
                }}
              >
                <LogOut className="h-4 w-4 mr-1" /> Sign out
              </Button>
            </div>

          </header>

          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}