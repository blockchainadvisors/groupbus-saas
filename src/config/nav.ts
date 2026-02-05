import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  CalendarCheck,
  Truck,
  Users,
  Settings,
  Brain,
  ClipboardList,
  ScrollText,
  DollarSign,
  ClipboardCheck,
  Mail,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  roles: string[];
  badge?: string;
}

export const dashboardNav: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["SUPERADMIN", "ADMIN", "CLIENT"],
  },
  {
    title: "Enquiries",
    href: "/enquiries",
    icon: MessageSquare,
    roles: ["SUPERADMIN", "ADMIN", "CLIENT"],
  },
  {
    title: "Quotes",
    href: "/quotes",
    icon: FileText,
    roles: ["SUPERADMIN", "ADMIN", "CLIENT"],
  },
  {
    title: "Bookings",
    href: "/bookings",
    icon: CalendarCheck,
    roles: ["SUPERADMIN", "ADMIN", "CLIENT"],
  },
  {
    title: "Suppliers",
    href: "/suppliers",
    icon: Truck,
    roles: ["SUPERADMIN", "ADMIN"],
  },
  {
    title: "Users",
    href: "/users",
    icon: Users,
    roles: ["SUPERADMIN"],
  },
  {
    title: "Surveys",
    href: "/surveys",
    icon: ClipboardCheck,
    roles: ["SUPERADMIN", "ADMIN"],
  },
  {
    title: "AI Decisions",
    href: "/ai-decisions",
    icon: Brain,
    roles: ["SUPERADMIN", "ADMIN"],
  },
  {
    title: "AI Costs",
    href: "/ai-costs",
    icon: DollarSign,
    roles: ["SUPERADMIN", "ADMIN"],
  },
  {
    title: "Human Review",
    href: "/human-review",
    icon: ClipboardList,
    roles: ["SUPERADMIN", "ADMIN"],
  },
  {
    title: "Audit Log",
    href: "/audit",
    icon: ScrollText,
    roles: ["SUPERADMIN", "ADMIN"],
  },
  {
    title: "Email Preview",
    href: "/email-preview",
    icon: Mail,
    roles: ["SUPERADMIN", "ADMIN"],
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    roles: ["SUPERADMIN", "ADMIN", "CLIENT"],
  },
];
