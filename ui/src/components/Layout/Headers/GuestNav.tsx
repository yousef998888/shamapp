import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Heart, ShoppingCart, User } from "lucide-react";
import { Button } from "@/components/shadcn/button";

type GuestNavProps = {
  isMobile?: boolean;
  onOpenLoginModal?: () => void;
  onOpenRegisterModal?: () => void;
};

export function GuestNav({ 
  isMobile = false, 
  onOpenLoginModal, 
  onOpenRegisterModal 
}: GuestNavProps) {
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
          to="/"
          className="text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100"
        >
          <ShoppingCart className="h-5 w-5" />
        </Link>
        <button
          onClick={onOpenLoginModal}
          className="text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100"
        >
          <User className="h-5 w-5" />
        </button>
      </>
    );
  }

  return (
    <>
      <Button
        variant="ghost"
        onClick={onOpenLoginModal}
        className="text-gray-700 hover:text-blue-600 px-2 md:px-3 py-1 md:py-2 rounded-lg hover:bg-gray-100 transition-colors text-xs md:text-sm font-medium"
      >
        {t("auth.signIn")}
      </Button>
      <Button
        onClick={onOpenRegisterModal}
        className="bg-blue-600 text-white px-2 md:px-3 py-1 md:py-2 rounded-lg hover:bg-blue-700 transition-colors text-xs md:text-sm font-medium"
      >
        {t("auth.signUp")}
      </Button>
      <Link
        to="/favorites"
        className="text-gray-600 hover:text-gray-900 p-1 md:p-2 rounded-lg hover:bg-gray-100"
      >
        <Heart className="h-4 w-4 md:h-5 md:w-5" />
      </Link>
      <Link
        to="/"
        className="text-gray-600 hover:text-gray-900 p-1 md:p-2 rounded-lg hover:bg-gray-100"
      >
        <ShoppingCart className="h-4 w-4 md:h-5 md:w-5" />
      </Link>
    </>
  );
}
