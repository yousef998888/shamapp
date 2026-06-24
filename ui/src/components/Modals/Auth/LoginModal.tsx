import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/shadcn/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/shadcn/dialog";
import { Input } from "@/components/shadcn/input";
import { Label } from "@/components/shadcn/label";
import { Checkbox } from "@/components/shadcn/checkbox";
import Ui_Link from "../../shared/Link";
import GoogleIcon from "@/components/Icons/Google";
import FacebookIcon from "@/components/Icons/Facebook";
import AppleIcon from "@/components/Icons/Apple";
import { useAuth } from "@/hooks/useAuth";
import { Eye, EyeOff } from "lucide-react";

export function LoginModal({
  open,
  onOpenChange,
  onSwitchToRegister,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSwitchToRegister?: () => void;
} = {}) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { signInWithEmail, signInWithGoogle, signInLoading, signInError } =
    useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await signInWithEmail(email, password);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* <DialogTrigger asChild>
        <Button variant="outline">{t('auth.login.signIn')}</Button>
      </DialogTrigger> */}
      <DialogContent className="sm:max-w-3xl">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">{t('auth.login.title')}</h2>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="space-y-4 lg:border-e-2 lg:pe-4 max-lg:border-b-2 max-lg:pb-6 ">
              <div className="space-y-2">
                <Input
                  id="email"
                  className="py-5 border-2 rounded-full placeholder:text-secondary-foreground"
                  placeholder={t('auth.login.email')}
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={signInLoading}
                />
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Input
                    id="password"
                    className="py-5 border-2 rounded-full placeholder:text-secondary-foreground pe-12"
                    required
                    type={showPassword ? "text" : "password"}
                    placeholder={t('auth.login.password')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={signInLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute end-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    disabled={signInLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox id="remember" />
                  <Label htmlFor="remember">{t('auth.login.rememberMe')}</Label>
                </div>

                <Ui_Link
                  variant="underline"
                  title={t('auth.login.forgotPassword')}
                  url="#"
                  className="h-auto font-semibold p-0 text-sm"
                />
              </div>

              {/* <div className="text-xs border py-3 px-3 bg-gray-50 text-muted-foreground text-center">
                <div className="flex items-center space-x-2 py-2">
                  <Checkbox id="robot" />
                  <Label htmlFor="robot">I'm not a robot</Label>
                </div>
                <span>reCAPTCHA</span>
                <span className="mx-2">•</span>
                <Ui_Link
                  variant="underline"
                  title="Privacy"
                  url="#"
                  className="h-auto p-0 text-sm"
                />
                <span className="mx-2">•</span>
                <Ui_Link
                  variant="underline"
                  title="Terms"
                  url="#"
                  className="h-auto p-0 text-sm"
                />
              </div> */}

              <Button type="submit" className="w-full py-5 rounded-full" disabled={signInLoading}>
                {signInLoading ? t('auth.login.loggingIn') : t('auth.login.signIn')}
              </Button>
              {signInError && (
                <div className="text-red-500 text-sm text-center">
                  {signInError}
                </div>
              )}
            </div>
            <div className="flex flex-col space-y-3">
              <Button
                variant="outline"
                className="py-5 border-2 rounded-full"
                type="button"
                onClick={signInWithGoogle}
                disabled={signInLoading}
              >
                <GoogleIcon className="h-4 w-4" />
                {t('auth.login.continueWithGoogle')}
              </Button>
              <Button variant="outline" className="py-5 border-2 rounded-full" type="button" disabled>
                <AppleIcon className="h-4 w-4" />
                {t('auth.login.continueWithApple')}
              </Button>
              <Button variant="outline" className="py-5 border-2 rounded-full" type="button" disabled>
                <FacebookIcon className="h-4 w-4" />
                {t('auth.login.continueWithFacebook')}
              </Button>
              <div className="text-center mt-4 text-sm">
                <span>{t('auth.login.noAccount')} </span>
                <Ui_Link
                  variant="underline"
                  title={t('auth.login.signUp')}
                  url="#"
                  className="h-auto font-semibold p-0 text-sm"
                  onClick={(e) => {
                    e.preventDefault();
                    onSwitchToRegister && onSwitchToRegister();
                  }}
                />
              </div>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
