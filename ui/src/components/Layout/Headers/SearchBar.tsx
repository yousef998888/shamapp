import { Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import SearchService, { SearchResult } from "@/services/SearchService";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shadcn/select";

export function SearchBar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced search effect
  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (searchTerm.trim()) {
        setIsLoading(true);
        try {
          const results = await SearchService.searchProducts(searchTerm, 8);
          setSearchResults(results);
        } catch (error) {
          console.error("Search failed:", error);
          setSearchResults([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 700);

    return () => clearTimeout(searchTimeout);
  }, [searchTerm]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setSelectedIndex(-1);
    setIsDropdownOpen(true);
  };

  // Handle input focus
  const handleInputFocus = () => {
    setIsDropdownOpen(true);
  };

  // Handle clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
          handleSelectResult(searchResults[selectedIndex]);
        } else if (searchTerm.trim()) {
          handleSearch();
        }
        break;
      case "Escape":
        setIsDropdownOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle selecting a result
  const handleSelectResult = (result: SearchResult) => {
    navigate(`/product/${result.id}`);
    setIsDropdownOpen(false);
    setSearchTerm("");
    inputRef.current?.blur();
  };

  // Handle search submission
  const handleSearch = () => {
    if (searchTerm.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
      setIsDropdownOpen(false);
      inputRef.current?.blur();
    }
  };

  // Clear search
  const clearSearch = () => {
    setSearchTerm("");
    setSearchResults([]);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  return (
    <div className="flex-1 w-full relative">
      <div className="relative">
        {/* Search Icon */}
        <div className="absolute start-0 top-1/2 transform -translate-y-1/2 flex items-center justify-center text-white h-full w-8 md:w-10 bg-primary ltr:rounded-tl-lg ltr:rounded-bl-lg rtl:rounded-tr-lg rtl:rounded-br-lg">
          <Search className="h-4 w-4 md:h-5 md:w-5" />
        </div>

        {/* Category Selector - Hidden on mobile */}
        <div className="hidden md:block absolute end-2 lg:end-10 top-1/2 transform -translate-y-1/2">
          <Select>
            <SelectTrigger className="w-16 lg:w-[100px] border border-gray-300 rounded-md text-xs lg:text-sm">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                className="outline-none text-xs lg:text-sm"
                value="all"
              >
                All
              </SelectItem>
              <SelectItem
                className="outline-none text-xs lg:text-sm"
                value="test"
              >
                Test
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Search Input */}
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={t("search.placeholder")}
          className="w-full ps-10 md:ps-12 pe-10 md:pe-20 lg:pe-32 py-2 md:py-3 border border-primary rounded-lg focus:ring-2 focus:ring-blue-500 outline-none focus:border-transparent text-sm md:text-base"
        />

        {/* Clear Button */}
        {searchTerm && (
          <button
            onClick={clearSearch}
            className="absolute right-2 md:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="h-3 w-3 md:h-4 md:w-4" />
          </button>
        )}
      </div>

      {/* Search Dropdown */}
      {isDropdownOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 md:max-h-96 overflow-y-auto"
        >
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
            </div>
          ) : searchResults.length > 0 ? (
            <>
              <div className="p-3 border-b border-gray-100">
                <h3 className="text-xs md:text-sm font-medium text-gray-700">
                  {t("search.results")} ({searchResults.length})
                </h3>
              </div>
              <div className="max-h-60 md:max-h-80 overflow-y-auto">
                {searchResults.map((result, index) => (
                  <button
                    key={result.id}
                    onClick={() => handleSelectResult(result)}
                    className={`w-full text-start p-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0 ${
                      index === selectedIndex ? "bg-blue-50" : ""
                    }`}
                  >
                    <div className="flex items-center">
                      <Search className="h-3 w-3 md:h-4 md:w-4 text-gray-400 me-2 md:me-3 flex-shrink-0" />
                      <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-7 flex-1 min-w-0">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs md:text-sm text-gray-900 truncate">
                            {result.title}
                          </div>
                          <div className="text-xs md:text-sm text-gray-900 truncate">
                            {result.ar_title}
                          </div>
                        </div>
                        {result.category_name && (
                          <div className="text-xs text-gray-500 truncate md:flex-shrink-0">
                            {result.category_name}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              {searchTerm && (
                <button
                  onClick={handleSearch}
                  className="w-full p-3 text-left hover:bg-gray-50 transition-colors border-t border-gray-100"
                >
                  <div className="flex items-center">
                    <Search className="h-3 w-3 md:h-4 md:w-4 text-blue-500 me-2 md:me-3 flex-shrink-0" />
                    <span className="text-xs md:text-sm text-blue-600 truncate">
                      {t("search.seeAllResults")} "{searchTerm}"
                    </span>
                  </div>
                </button>
              )}
            </>
          ) : searchTerm ? (
            <div className="p-4 text-center text-gray-500">
              <div className="mb-2">
                <Search className="h-6 w-6 md:h-8 md:w-8 mx-auto text-gray-300" />
              </div>
              <p className="text-xs md:text-sm">{t("search.noResults")}</p>
              <p className="text-xs text-gray-400 mt-1">
                {t("search.tryDifferentKeywords")}
              </p>
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500">
              <div className="mb-2">
                <Search className="h-6 w-6 md:h-8 md:w-8 mx-auto text-gray-300" />
              </div>
              <p className="text-xs md:text-sm">{t("search.startTyping")}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
