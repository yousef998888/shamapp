import React from "react";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shadcn/select";

export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    // Update document direction for RTL support
    document.documentElement.dir = lng === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lng;
  };

  const currentLanguage = i18n.language;

  return (
    <div className="flex items-center gap-2">
      <Select value={currentLanguage} onValueChange={changeLanguage}>
        <SelectTrigger className="w-[100px] border border-gray-300 rounded-md">
          <SelectValue placeholder="EN" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem className="outline-none" value="en">
            EN
          </SelectItem>
          <SelectItem className="outline-none" value="ar">
            عربي
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
