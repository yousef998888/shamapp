import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { 
  LayoutDashboard,
  Tag,
  ShoppingCart,
  Star,
  Bookmark,
  Heart,
  MessageSquare
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { NavItem } from "@/types";

interface SidebarNavProps {
  type: "horizontal" | "vertical";
}

export function SidebarNav({ type }: SidebarNavProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const navItems: NavItem[] = [
    {
      title: t("navigation.dashboard"),
      icon: <LayoutDashboard className="h-4 w-4" />,
      count: 2,
      href: "/dashboard",
    },
    {
      title: t("navigation.selling"),
      icon: <Tag className="h-4 w-4" />,
      href: "/dashboard/selling",
    },
    {
      title: t("navigation.buying"),
      icon: <ShoppingCart className="h-4 w-4" />,
      href: "/dashboard/buying",
    },
    {
      title: t("navigation.reviews"),
      icon: <Star className="h-4 w-4" />,
      href: "/dashboard/reviews",
    },
    {
      title: t("navigation.savedSearches"),
      icon: <Bookmark className="h-4 w-4" />,
      href: "/dashboard/saved-searches",
    },
    {
      title: t("navigation.chats"),
      icon: <MessageSquare className="h-4 w-4" />,
      href: "/dashboard/chats",
    },
    // {
    //   title: t("navigation.watchlist"),
    //   icon: <Heart className="h-4 w-4" />,
    //   href: "/dashboard/watchlist",
    // },
  ];
  return (
    <nav
      className={
        type === "horizontal" ? "flex items-center overflow-x-auto flex-row gap-1" : "flex flex-col gap-1"
      }
    >
      {navItems.map((item) => (
        <Link
          key={item.href}
          to={item.href}
          className={cn(
            "flex items-center gap-2  justify-between px-3 py-2 text-sm font-medium rounded-md",
            location.pathname === item.href
              ? "bg-blue-100 text-accent-foreground"
              : "hover:bg-gray-100"
          )}
        >
          <span className="flex items-center gap-2" >
            <span className="mx-3">{item.icon}</span>
            <span>{item.title}</span>
          </span>

          {item.count && (
            <span className="   bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
              {item.count}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}
