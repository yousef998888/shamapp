import { useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  Menu,
  X,
} from "lucide-react";
import { useAuthContext } from "../../contexts/AuthContext";
import { Logo } from "./Headers/Logo";
import { SearchBar } from "./Headers/SearchBar";
import { AuthenticatedNav } from "./Headers/AuthenticatedNav";
import { GuestNav } from "./Headers/GuestNav";
import { LanguageSwitcher } from "../shared/LanguageSwitcher";
import { LoginModal } from "../Modals/Auth/LoginModal";
import { RegisterModal } from "../Modals/Auth/RegisterModal";

export function Header() {
  const { profile, signOut, isAuthenticated } = useAuthContext();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  const handleSignOut = () => {
    signOut();
    navigate("/");
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleOpenLoginModal = () => {
    setIsLoginModalOpen(true);
    setIsRegisterModalOpen(false);
  };

  const handleOpenRegisterModal = () => {
    setIsRegisterModalOpen(true);
    setIsLoginModalOpen(false);
  };

  const handleSwitchToRegister = () => {
    setIsLoginModalOpen(false);
    setIsRegisterModalOpen(true);
  };

  const handleSwitchToLogin = () => {
    setIsRegisterModalOpen(false);
    setIsLoginModalOpen(true);
  };

  return (
    <header className="bg-white shadow-sm border-b">
      {/* Top Bar - Hidden on mobile */}
      <div className="hidden md:block border-b max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between text-sm py-2 min-h-[44.5px]">
          <div>
            <ul className="flex space-x-2 lg:space-x-4 items-center">
              <li>
                <a
                  href="#"
                  className="text-secondary-foreground hover:text-primary text-xs lg:text-sm font-medium"
                >
                  FAQ
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-secondary-foreground hover:text-primary text-xs lg:text-sm font-medium"
                >
                  My account
                </a>
              </li>
              <li className="hidden lg:block">
                <a
                  href="#"
                  className="text-secondary-foreground hover:text-primary text-sm font-medium"
                >
                  About Us
                </a>
              </li>
              <li className="hidden lg:block">
                <a
                  href="#"
                  className="text-secondary-foreground hover:text-primary text-sm font-medium"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>
          <div>
            <ul className="flex space-x-2 lg:space-x-4 items-center">
              <li>
                <a
                  href="#"
                  className="text-secondary-foreground hover:text-primary text-xs lg:text-sm font-medium"
                >
                  Order Tracking
                </a>
              </li>
              <li className="px-2 lg:px-4">
                <LanguageSwitcher />
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={toggleMobileMenu}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>

          {/* Logo */}
          <div className="flex-shrink-0">
            <Logo />
          </div>

          {/* Search Bar - Hidden on mobile, shown on tablet+ */}
          <div className="hidden md:flex flex-1 max-w-2xl mx-4 lg:mx-8">
            <SearchBar />
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2 lg:space-x-4">
            {isAuthenticated ? (
              <AuthenticatedNav
                profile={profile}
                handleSignOut={handleSignOut}
              />
            ) : (
              <GuestNav 
                onOpenLoginModal={handleOpenLoginModal}
                onOpenRegisterModal={handleOpenRegisterModal}
              />
            )}
          </div>

          {/* Mobile Navigation Icons */}
          <div className="md:hidden flex items-center space-x-2">
            {isAuthenticated ? (
              <div className="flex items-center space-x-1">
                <AuthenticatedNav
                  profile={profile}
                  handleSignOut={handleSignOut}
                  isMobile={true}
                />
              </div>
            ) : (
              <GuestNav 
                isMobile={true}
                onOpenLoginModal={handleOpenLoginModal}
                onOpenRegisterModal={handleOpenRegisterModal}
              />
            )}
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="md:hidden pb-4">
          <SearchBar />
        </div>
      </div>

      {/* Categories Bar - Responsive with Dropdown */}
      <div className="border-t max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between text-sm py-2 min-h-[56px]">
          <div className="flex-1 overflow-x-auto">
            <ul className="flex space-x-2 lg:space-x-4 items-center whitespace-nowrap">
              <li>
                <a
                  href="#"
                  className="text-secondary-foreground hover:text-primary text-xs lg:text-sm font-medium"
                >
                  Home
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-secondary-foreground hover:text-primary text-xs lg:text-sm font-medium"
                >
                  Shop
                </a>
              </li>
              <li className="hidden sm:block">
                <a
                  href="#"
                  className="text-secondary-foreground hover:text-primary text-xs lg:text-sm font-medium"
                >
                  Electronics
                </a>
              </li>
              <li className="hidden md:block">
                <a
                  href="#"
                  className="text-secondary-foreground hover:text-primary text-sm font-medium"
                >
                  Home & Furniture
                </a>
              </li>
              <li className="hidden lg:block">
                <a
                  href="#"
                  className="text-secondary-foreground hover:text-primary text-sm font-medium"
                >
                  Contact
                </a>
              </li>
              <li className="hidden lg:block">
                <a
                  href="#"
                  className="text-secondary-foreground hover:text-primary text-sm font-medium"
                >
                  Blog
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-4 pt-2 pb-3 space-y-1 bg-white border-t">
            {/* Top bar links for mobile */}
            <div className="border-b pb-3 mb-3">
              <div className="flex flex-wrap gap-4 text-sm">
                <a
                  href="#"
                  className="text-secondary-foreground hover:text-primary"
                >
                  FAQ
                </a>
                <a
                  href="#"
                  className="text-secondary-foreground hover:text-primary"
                >
                  My account
                </a>
                <a
                  href="#"
                  className="text-secondary-foreground hover:text-primary"
                >
                  About Us
                </a>
                <a
                  href="#"
                  className="text-secondary-foreground hover:text-primary"
                >
                  Contact
                </a>
                <a
                  href="#"
                  className="text-secondary-foreground hover:text-primary"
                >
                  Order Tracking
                </a>
              </div>
              <div className="mt-3">
                <LanguageSwitcher />
              </div>
            </div>

            {/* Category links for mobile */}
            <div className="space-y-2">
              <a
                href="#"
                className="block text-secondary-foreground hover:text-primary"
              >
                Electronics
              </a>
              <a
                href="#"
                className="block text-secondary-foreground hover:text-primary"
              >
                Home & Furniture
              </a>
              <a
                href="#"
                className="block text-secondary-foreground hover:text-primary"
              >
                Contact
              </a>
              <a
                href="#"
                className="block text-secondary-foreground hover:text-primary"
              >
                Blog
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modals */}
      <LoginModal
        open={isLoginModalOpen}
        onOpenChange={setIsLoginModalOpen}
        onSwitchToRegister={handleSwitchToRegister}
      />
      <RegisterModal
        open={isRegisterModalOpen}
        onOpenChange={setIsRegisterModalOpen}
        onSwitchToLogin={handleSwitchToLogin}
      />
    </header>
  );
}
