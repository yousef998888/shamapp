// src/components/Products/CategoryGrid.tsx
// import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
// import {
//   Smartphone,
//   Home,
//   Car,
//   Shirt,
//   Sofa,
//   Trophy,
//   Book,
//   Briefcase,
//   Package,
// } from "lucide-react";
import CategoryService from "@/services/CategoryService";
import { useQuery } from "@tanstack/react-query";
import { Category } from "@/types/database";
import { SkeletonGridLoader } from "@/components/Skeletons/SkeletonGridLoader";
import {
  getCategoryName,
  getLocalizedDescription,
} from "@/utils/DisplayAtteibuteSupportedLanguage";

// const iconMap: Record<string, React.ComponentType<any>> = {
//   Smartphone,
//   Home,
//   Car,
//   Shirt,
//   Sofa,
//   Trophy,
//   Book,
//   Briefcase,
//   Package,
// };
import img from "../../assets/icons/img.png";
export function CategoryGrid() {
  const { t } = useTranslation();
  const {
    data: categories, // Type will be inferred as Category[] based on queryFn's return type
    isLoading,
    isError,
    error,
    refetch, // This is the function you should use to retry fetching
  } = useQuery<Category[], Error>({
    // Explicitly type the useQuery hook for data and error
    queryKey: ["categories"],
    queryFn: CategoryService.fetchCategories,
  });
  if (isLoading) {
    // Use the reusable SkeletonGridLoader component here
    return (
      <SkeletonGridLoader count={8} gridCols="grid-cols-2 md:grid-cols-4" />
    );
  }

  // When `isError` is true, `error` will be of type `Error`.
  if (isError) {
    return (
      <div className="text-center p-8 text-red-600">
        <p className="mb-4">
          {t("errors.somethingWentWrong")}:{" "}
          {error?.message || t("errors.somethingWentWrong")}
        </p>{" "}
        {/* Use optional chaining for safety */}
        <button
          onClick={() => refetch()} // Use refetch() from useQuery
          className="bg-red-100 text-red-700 px-4 py-2 rounded hover:bg-red-200 transition-colors"
        >
          {t("errors.tryAgain")}
        </button>
      </div>
    );
  }

  // After loading and error checks, `categories` will be `Category[] | undefined` if no initial data.
  // We can add a check if it's undefined, though with a good `queryFn` it should be `[]` or `Category[]`.
  if (!categories || categories.length === 0) {
    return (
      <div className="text-center p-8 text-gray-600">
        <p>{t("search.noResults")}</p>
      </div>
    );
  }
  const colors = [
    "bg-[#e8e3dd]",
    "bg-[#e5ecda]",
    "bg-[#fae1cb]",
    "bg-[#d5e6ed]",
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {categories.map((category, index) => {
        // const IconComponent = iconMap[category.icon || "Package"] || Package;

        return (
          <Link
            key={category.id}
            to={`/category/${category.slug}`}
            className={`
            ${colors[index % colors.length]} 
            w-full min-h-[460px] rounded-lg shadow-sm 
            transition-all duration-300 ease-in-out
            p-6 text-start group relative
            hover:shadow-lg overflow-hidden
          `}
          >
            <h3 className="font-semibold text-gray-900 mb-2 text-[22px] pt-10">
              {getCategoryName(category)}
            </h3>
            <p className="text-base text-gray-600">
              {getLocalizedDescription(category)}
            </p>
            <span className="text-sm text-gray-600 underline py-6 inline-block">
              Show products
            </span>

            {/* الصورة */}
            <img
              src={img}
              className="absolute bottom-0 left-1/2 -translate-x-1/2 
               transition-transform duration-300 ease-in-out 
               group-hover:scale-105"
              alt=""
            />
          </Link>
        );
      })}
    </div>
  );
}
