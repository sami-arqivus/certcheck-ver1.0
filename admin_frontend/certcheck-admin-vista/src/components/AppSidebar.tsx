import { Users, UserCheck, UserX, Clock, Activity, FileText } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Employee Directory", url: "/dashboard", icon: Users },
  { title: "Pending", url: "/dashboard/pending", icon: Clock },
  { title: "Accepted", url: "/dashboard/accepted", icon: UserCheck },
  { title: "Rejected", url: "/dashboard/rejected", icon: UserX },
  { title: "Expired Cards", url: "/dashboard/expired", icon: Clock },
  { title: "Active Cards", url: "/dashboard/active", icon: Activity },
  { title: "All CSCS Card Details", url: "/dashboard/cscs-cards", icon: Users },
  { title: "Filtered CSCS Cards", url: "/dashboard/filtered-cscs", icon: Users },
  { title: "Verify Card", url: "/dashboard/verify-card", icon: FileText },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-muted text-primary font-medium" : "hover:bg-muted/50";

  return (
    <Sidebar
      collapsible="icon"
    >
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Admin Panel</SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="mr-2 h-4 w-4" />
                      {state !== "collapsed" && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}