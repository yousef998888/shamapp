import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { User } from "lucide-react";

type UserMenuProps = {
  profile: any;
  handleSignOut: () => void;
};

export function UserMenu({ profile, handleSignOut }: UserMenuProps) {
  const { t } = useTranslation();
  return (
    <div className="relative group">
      <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100">
        <span className="hidden sm:block">
          <User />
        </span>
      </button>
      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
        <div className="py-1">
          <Link
            to="/profile"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            {t("navigation.profile")}
          </Link>
          <Link
            to="/dashboard"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            {t("navigation.dashboard")}
          </Link>
          <Link
            to="/dashboard/selling"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            {t("navigation.myListings")}
          </Link>
          <Link
            to="/orders"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            {t("navigation.orders")}
          </Link>
          <button
            onClick={handleSignOut}
            className="block w-full text-start px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            {t("navigation.logout")}
          </button>
        </div>
      </div>
    </div>
  );
}
