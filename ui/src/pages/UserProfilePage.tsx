// src/pages/UserProfilePage.tsx (or wherever your page component is)
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader } from "@/components/shadcn/card";
import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";
import { Label } from "@/components/shadcn/label";
import { Textarea } from "@/components/shadcn/textarea";
import { Star, Edit, Save, X, Eye, EyeOff, Phone, MapPin } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile"; // Import the profile hook
import { usePasswordChange } from "@/hooks/usePasswordChange"; // Import the password hook

export default function UserProfilePage() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuthContext();
  const {
    profile,
    formData,
    isProfileLoading,
    isProfileSaving,
    isProfileError,
    profileError,
    handleInputChange,
    saveProfile,
    cancelProfileEdit,
  } = useProfile();

  const {
    passwordData,
    showPassword,
    isLoading: isPasswordChanging,
    isError: isPasswordChangeError,
    error: passwordChangeError,
    handlePasswordChange,
    submitPasswordChange,
    cancelPasswordEdit: cancelPasswordForm, // Renamed to avoid conflict
    toggleShowPassword,
  } = usePasswordChange();

  const [isEditingProfileUI, setIsEditingProfileUI] = useState(false); // UI state for profile edit mode
  const [isEditingPasswordUI, setIsEditingPasswordUI] = useState(false); // UI state for password edit mode

  // Combined loading state for the page
  const pageLoading = authLoading || isProfileLoading;

  // Handle setting/resetting editing modes
  const handleEditProfileClick = () => {
    setIsEditingProfileUI(true);
  };

  const handleCancelProfileEditUI = () => {
    cancelProfileEdit();
    setIsEditingProfileUI(false);
  };

  const handleSaveProfileUI = () => {
    saveProfile();
  };

  const handleEditPasswordClick = () => {
    setIsEditingPasswordUI(true);
  };

  const handleCancelPasswordEditUI = () => {
    cancelPasswordForm();
    setIsEditingPasswordUI(false);
  };

  const handleSubmitPasswordChangeUI = (event: React.FormEvent) => {
    submitPasswordChange(event);
  };

  if (pageLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {t("auth.login.subtitle")}
          </h1>
        </div>
      </div>
    );
  }

  // Handle error if profile fails to load
  if (isProfileError) {
    return (
      <div className="container mx-auto py-8 text-center text-red-600">
        <p>
          {t("errors.somethingWentWrong")}:{" "}
          {profileError?.message || t("errors.somethingWentWrong")}
        </p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          {t("errors.tryAgain")}
        </Button>
      </div>
    );
  }

  // If profile is null but user exists (e.g., new user without profile row yet)
  if (!profile) {
    return (
      <div className="container mx-auto py-8 text-center text-gray-600">
        <p>{t("search.noResults")}</p>
        {/* Potentially offer a button to create initial profile data */}
      </div>
    );
  }

  return (
    <div className=" mx-auto py-8 ">
      <div className="space-y-6">
        {/* Profile Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">
              {profile.full_name ||
                user.email?.split("@")[0] ||
                t("profile.personalInfo")}
            </h1>
            {!isEditingProfileUI ? (
              <Button
                onClick={handleEditProfileClick}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                {t("common.edit")} {t("profile.personalInfo")}
              </Button>
            ):(
              <Button
              variant="outline"
              onClick={handleCancelProfileEditUI}
              disabled={isProfileSaving}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              {t("profile.cancel")}
            </Button>
            )}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>{user.email}</span>
            {profile.member_since && (
              <>
                <span>
                  {t("product.memberSince")}{" "}
                  {new Date(profile.member_since).toLocaleDateString()}
                </span>
              </>
            )}
          </div>
          <span className="flex items-center gap-1">
            <span className="flex">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < Math.floor(profile.rating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300"
                  }`}
                />
              ))}
            </span>
            <span className="text-sm">({profile.rating.toFixed(1)})</span>
          </span>
        </div>

        {/* Account Statistics */}
        <Card>
          <CardHeader className="pb-2">
            <h2 className="text-xl font-semibold">{t("dashboard.overview")}</h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-100 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {profile.rating?.toFixed(1) || "N/A"}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("reviews.rating")}
                </div>
              </div>
              <div className="text-center p-4 bg-gray-100 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {profile.total_sales || 0}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("profile.totalSales")}
                </div>
              </div>
              <div className="text-center p-4 bg-gray-100 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {profile.is_verified ? "✓" : "—"}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("profile.verified")}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Information Card */}
        <Card>
          <CardHeader className="pb-2">
            <h2 className="text-xl font-semibold">
              {t("profile.profileInformation")}
            </h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">{t("profile.fullName")}</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) =>
                    handleInputChange("full_name", e.target.value)
                  }
                  readOnly={!isEditingProfileUI}
                  className={!isEditingProfileUI ? "bg-muted/50" : ""}
                  placeholder={t("profile.enterFullName")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">{t("profile.username")}</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) =>
                    handleInputChange("username", e.target.value)
                  }
                  readOnly={!isEditingProfileUI}
                  className={!isEditingProfileUI ? "bg-muted/50" : ""}
                  placeholder={t("profile.enterUsername")}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">{t("profile.phoneNumber")}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    readOnly={!isEditingProfileUI}
                    className={!isEditingProfileUI ? "bg-muted/50" : ""}
                    placeholder={t("profile.enterPhoneNumber")}
                  />
                  {!isEditingProfileUI && !formData.phone && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleEditProfileClick}
                    >
                      <Phone className="h-4 w-4 mr-1" />
                      {t("profile.add")}
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">{t("profile.location")}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) =>
                      handleInputChange("location", e.target.value)
                    }
                    readOnly={!isEditingProfileUI}
                    className={!isEditingProfileUI ? "bg-muted/50" : ""}
                    placeholder={t("profile.enterLocation")}
                  />
                  {!isEditingProfileUI && !formData.location && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleEditProfileClick}
                    >
                      <MapPin className="h-4 w-4 mr-1" />
                      {t("profile.add")}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">{t("profile.bio")}</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => handleInputChange("bio", e.target.value)}
                readOnly={!isEditingProfileUI}
                className={!isEditingProfileUI ? "bg-muted/50" : ""}
                placeholder={t("profile.tellUsAboutYourself")}
                rows={3}
              />
            </div>

            {isEditingProfileUI && (
              <div className="flex items-center gap-2 pt-4">
                <Button
                  onClick={handleSaveProfileUI}
                  disabled={isProfileSaving}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {isProfileSaving
                    ? t("profile.saving")
                    : t("profile.saveChanges")}
                </Button>
      
              </div>
            )}
          </CardContent>
        </Card>

        {/* Password Card */}
        <Card>
          <CardHeader className="pb-2">
            <h2 className="text-xl font-semibold">{t("profile.password")}</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isEditingPasswordUI ? (
              <div className="space-y-2">
                <Label>{t("profile.currentPasswordDisplay")}</Label>
                <div className="flex items-center">
                  <span className="text-lg tracking-widest">•••••••••••</span>
                </div>
                <Button
                  variant="link"
                  className="px-0 text-blue-600"
                  onClick={handleEditPasswordClick}
                >
                  {t("profile.changePasswordLink")}
                </Button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmitPasswordChangeUI}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="newPassword">
                    {t("profile.newPassword")}
                  </Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        handlePasswordChange("newPassword", e.target.value)
                      }
                      placeholder={t("profile.enterNewPassword")}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={`absolute end-0 top-0 h-full px-3 py-2  ${
                        showPassword ? "bg-blue-500 text-white" : ""
                      } hover:bg-blue-500 hover:text-white`}
                      onClick={toggleShowPassword}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">
                    {t("profile.confirmNewPassword")}
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      handlePasswordChange("confirmPassword", e.target.value)
                    }
                    placeholder={t("profile.confirmNewPasswordPlaceholder")}
                  />
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <Button
                    type="submit" // Set type to submit for form handling
                    disabled={isPasswordChanging}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {isPasswordChanging
                      ? t("profile.updating")
                      : t("profile.updatePassword")}
                  </Button>
                  <Button
                    type="button" // Set type to button to prevent form submission
                    variant="outline"
                    onClick={handleCancelPasswordEditUI}
                    disabled={isPasswordChanging}
                    className="flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    {t("profile.cancel")}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
