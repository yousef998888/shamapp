import { Link } from "react-router-dom";

interface Ui_Link_Props {
  title: string;
  url: string;
  className?: string;
  variant?: "primary" | "secondary" | "outline" | "underline" | "default";
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  onClick?: (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => void;
} 

const variantClasses: Record<string, string> = {
  primary: "bg-primary shadow-xs  text-white hover:bg-blue-700",
  secondary: "bg-gray-200 shadow-xs  text-gray-800 hover:bg-gray-300",
  outline: "border shadow-xs  border-primary  text-primary  hover:bg-blue-100 hover:border-blue-400 hover:text-blue-700",
  underline: " shadow-xs  relative group hover:text-blue-700 focus:text-blue-700",
  default: "text-gray-600 shadow-xs  hover:text-gray-900",
};

const sizeClasses: Record<string, string> = {
  xs: "text-xs px-2 py-1",
  sm: "text-sm px-3 py-2",
  md: "text-base ",
  lg: "text-lg px-6 py-2.5",
  xl: "text-xl px-7 py-3",
  "2xl": "text-2xl px-8 py-3.5",
};

const underlineHeight: Record<string, string> = {
  xs: "h-0.5",
  sm: "h-0.5",
  md: "h-0.5",
  lg: "h-0.5",
  xl: "h-0.5",
  "2xl": "h-1",
};

const animationClasses =
  "transition-all duration-300 ease-in-out";

function Ui_Link({
  title,
  url,
  className,
  variant = "default",
  size = "md",
  onClick,
}: Ui_Link_Props) {
  const isUnderline = variant === "underline";
  return (
    <Link
      to={url}
      className={`rounded-lg ${
        variantClasses[variant] || variantClasses.default
      } ${sizeClasses[size] || sizeClasses.md} ${animationClasses} ${
        isUnderline ? "overflow-hidden" : ""
      } group${className ? ` ${className}` : ""}`}
      onClick={onClick}
    >
      <span className={isUnderline ? "relative inline-block " : undefined}>
        {title}
        {isUnderline && (
          <span
            className={`absolute left-0 bottom-0 w-full bg-primary scale-x-0 group-hover:scale-x-100 group-focus:scale-x-100 transition-transform duration-300 origin-left rounded ${underlineHeight[size] || underlineHeight.md}`}
            aria-hidden="true"
          />
        )}
      </span>
    </Link>
  );
}

export default Ui_Link;
