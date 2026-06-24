import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus, Heart, ShoppingCart } from "lucide-react";
import { UserMenu } from "./UserMenu";
import { ChatNotification } from "../../shared/ChatNotification";

type AuthenticatedNavProps = {
  profile: any;
  handleSignOut: () => void;
  isMobile?: boolean;
};

export function AuthenticatedNav({
  profile,
  handleSignOut,
  isMobile = false,
}: AuthenticatedNavProps) {
  const { t } = useTranslation();

  if (isMobile) {
    return (
      <>
        <Link
          to="/favorites"
          className="text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100"
        >
          <Heart className="h-5 w-5" />
        </Link>
        <Link
          to="/dashboard/chats"
          className="text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100"
        >
          <ChatNotification />
        </Link>
        <Link
          to="/"
          className="text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100"
        >
          <ShoppingCart className="h-5 w-5" />
        </Link>
        <UserMenu
          profile={profile}
          handleSignOut={handleSignOut}
          isMobile={true}
        />
      </>
    );
  }

  return (
    <>
      <Link
        to="/dashboard/selling/create"
        className="bg-blue-600 text-white px-2 md:px-3 py-1 md:mx-2 lg:mx-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-1 md:space-x-2 text-xs md:text-sm"
      >
        <Plus className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
        <span className="hidden sm:inline">{t("navigation.sell")}</span>
        <span className="sm:hidden">Sell</span>
      </Link>
      <Link
        to="/favorites"
        className="text-gray-600 hover:text-gray-900 p-1 md:p-2 rounded-lg hover:bg-gray-100"
      >
        <Heart className="h-4 w-4 md:h-5 md:w-5" />
      </Link>
      <Link
        to="/dashboard/chats"
        className="text-gray-600 hover:text-gray-900 p-1 md:p-2 rounded-lg hover:bg-gray-100"
      >
        <ChatNotification />
      </Link>
      <Link
        to="/"
        className="text-gray-600 hover:text-gray-900 p-1 md:p-2 rounded-lg hover:bg-gray-100"
      >
        <ShoppingCart className="h-4 w-4 md:h-5 md:w-5" />
      </Link>
      <UserMenu profile={profile} handleSignOut={handleSignOut} />
    </>
  );
}
