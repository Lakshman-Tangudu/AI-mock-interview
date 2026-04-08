import { Gauge, ClockArrowUp, SlidersHorizontal, AudioLines } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
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
} from '@/components/ui/sidebar';

const items = [
  { title: 'Dashboard', url: '/', icon: Gauge },
  { title: 'History', url: '/history', icon: ClockArrowUp },
  { title: 'Settings', url: '/settings', icon: SlidersHorizontal },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className={`p-4 flex items-center gap-2.5 ${collapsed ? 'justify-center' : ''}`}>
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shrink-0 shadow-md shadow-primary/15">
            <AudioLines className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          {!collapsed && <span className="font-bold text-base tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>InterviewAI</span>}
        </div>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest">Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/'}
                      className="hover:bg-accent/40 transition-all duration-200 rounded-lg"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span className="text-sm">{item.title}</span>}
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
