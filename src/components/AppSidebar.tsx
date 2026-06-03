import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { CompanyLogo } from "./CompanyLogo";
import { sidebarSections } from "@/config/navigation";
import { SkeletonSidebarMenu } from "@/components/ui/skeleton";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const [ready, setReady] = useState(false);
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();

  const isGrnPage =
    pathname.startsWith("/goods-receipt-notes") ||
    /^\/inward-gate-entries\/[^/]+\/grn$/.test(pathname);

  const isActive = (url: string) => {
    if (url === "/goods-receipt-notes") {
      return isGrnPage;
    }

    if (url === "/inward-gate-entries" && isGrnPage) {
      return false;
    }

    return pathname === url || (url !== "/" && pathname.startsWith(url));
  };

  useEffect(() => {
    setReady(true);
  }, []);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <CompanyLogo collapsed={collapsed} />
      </SidebarHeader>
      <SidebarContent>
        {sidebarSections.map((section) => (
          <SidebarGroup key={section.title}>
            <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              {!ready ? (
                <SkeletonSidebarMenu items={section.items.length} />
              ) : (
                <SidebarMenu>
                  {section.items.map((item) => {
                    const active = isActive(item.path);
                    return (
                      <SidebarMenuItem key={`${section.title}-${item.title}`}>
                        <SidebarMenuButton asChild isActive={active}>
                          <NavLink to={item.path} end={item.path === "/"}>
                            <item.icon className="h-4 w-4" />
                            {!collapsed && <span>{item.title}</span>}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
