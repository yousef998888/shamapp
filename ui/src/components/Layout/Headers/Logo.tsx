import { Link } from "react-router-dom";
import { ShoppingBag } from "lucide-react";

export function Logo() {
  return (
    <Link to="/" className="flex items-center space-x-1 md:space-x-2">
      <ShoppingBag className="h-6 w-6 md:h-8 md:w-8 text-blue-600 flex-shrink-0" />
      <span className="text-lg md:text-xl font-bold text-gray-900 truncate">
        SyriaMarket
      </span>
    </Link>
  );
}
