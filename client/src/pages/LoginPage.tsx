import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Mail, Lock, AlertCircle } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthContext } from "@/context/AuthContext";
import { toast } from "sonner";
import { CrevoMark } from "@/components/CrevoMark";
import { MotionSurface } from "@/components/ui/motion-surface";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    signIn,
    signInWithGoogle,
    error: authError,
    loading: authLoading,
    clearError,
    currentUser,
  } = useAuthContext();

  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const inviteFlow = new URLSearchParams(location.search).get("invite") === "1";

  const clearFormFeedback = (field?: keyof typeof formData) => {
    clearError();
    if (!field) {
      setErrors({});
      return;
    }

    setErrors((current) => {
      if (!current[field] && !current.general) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      delete next.general;
      return next;
    });
  };

  // Redirect if already logged in
  useEffect(() => {
    const pendingInviteToken = inviteFlow
      ? localStorage.getItem("pendingInviteToken")
      : null;

    if (currentUser) {
      navigate(
        pendingInviteToken
          ? `/invite/accept/${pendingInviteToken}`
          : "/dashboard",
        { replace: true },
      );
    }
  }, [currentUser, inviteFlow, navigate]);

  useEffect(() => {
    clearError();
    if (!inviteFlow) {
      localStorage.removeItem("pendingInviteToken");
    }
  }, [clearError, inviteFlow]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;

    clearError();

    const { user, error } = await signIn(formData.email, formData.password);

    if (error) {
      // console.error("Login error:", error);
      toast.error(error, { action: { label: "Dismiss", onClick: () => {} } });
      return;
    }
    if (user) {
      const pendingInviteToken = inviteFlow
        ? localStorage.getItem("pendingInviteToken")
        : null;
      navigate(
        pendingInviteToken
          ? `/invite/accept/${pendingInviteToken}`
          : "/dashboard",
        { replace: true },
      );
    }
  };

  const handleGoogleSignIn = async () => {
    clearError();
    setIsGoogleLoading(true);

    const result = await signInWithGoogle();

    if (result) {
      const pendingInviteToken = inviteFlow
        ? localStorage.getItem("pendingInviteToken")
        : null;
      navigate(
        pendingInviteToken
          ? `/invite/accept/${pendingInviteToken}`
          : "/dashboard",
        { replace: true },
      );
    }
    setIsGoogleLoading(false);
    // Error is already set in context → will show below
  };

  // Human-readable Firebase errors
  const displayError = authError
    ? authError.includes("wrong-password") ||
      authError.includes("user-not-found")
      ? "Invalid email or password."
      : authError.includes("too-many-requests")
        ? "Too many failed attempts. Please try again later."
        : authError.includes("popup-closed-by-user")
          ? "Sign-in cancelled."
          : authError.includes("popup-blocked")
            ? "Popup blocked. Please allow popups and try again."
            : "Authentication failed. Please try again."
    : errors.general;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left Side - Branding */}
      <div className="relative hidden overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(200,241,53,0.22),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(96,165,250,0.18),transparent_28%),linear-gradient(160deg,#0c0c0f,#1a1a24_58%,#12121a)] lg:flex lg:w-1/2">
        <div className="absolute inset-0 bg-black/8" />
        <div className="relative z-10 flex flex-col items-center justify-center p-12 text-white">
          <div className="mb-8">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-[#c8f135] backdrop-blur-sm">
                <CrevoMark className="h-9 w-9" />
              </div>
              <span
                className="text-4xl font-semibold tracking-tight"
                data-display-font="true"
              >
                Crevo
              </span>
            </div>
            <h1
              className="mb-4 text-4xl font-semibold"
              data-display-font="true"
            >
              Built for agency work that never stands still.
            </h1>
            <p className="max-w-md text-center text-xl leading-relaxed text-white/78">
              Keep projects, chats, approvals, and deadlines in one place that
              feels made for the way creative teams actually move.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-6 mt-8 max-w-md">
            {[
              { stat: "500+", label: "Projects Completed" },
              { stat: "50+", label: "Happy Clients" },
              { stat: "24/7", label: "Support" },
              { stat: "99%", label: "Uptime" },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl font-bold">{item.stat}</div>
                <div className="text-sm text-white/80">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute top-20 right-20 w-32 h-32 bg-white/10 rounded-full blur-xl" />
        <div className="absolute bottom-20 left-20 w-24 h-24 bg-white/10 rounded-full blur-xl" />
        <div className="absolute top-1/2 right-10 w-16 h-16 bg-white/10 rounded-full blur-lg" />
      </div>

      {/* Right Side - Login Form */}
      <div className="flex flex-1 items-center justify-center bg-background px-4 py-5 sm:p-8">
        <div className="w-full max-w-md space-y-4 sm:space-y-6">
          <div className="mb-6 flex items-center justify-center gap-3 text-center lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/25 bg-primary/12 text-primary shadow-sm">
              <CrevoMark className="h-6 w-6" />
            </div>
            <div className="text-left">
              <h1
                className="text-xl font-semibold tracking-tight"
                data-display-font="true"
              >
                Crevo
              </h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Where agency work actually lives
              </p>
            </div>
          </div>

          <MotionSurface>
            <Card className="border-border/75 bg-card/96 shadow-[var(--shadow-card)]">
              <CardHeader className="space-y-1 pb-4 sm:pb-6">
                <CardTitle
                  className="text-center text-xl font-semibold sm:text-2xl"
                  data-display-font="true"
                >
                  Sign in to your account
                </CardTitle>
                <CardDescription className="text-center text-xs sm:text-sm">
                  Enter your credentials to access your dashboard
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 sm:space-y-4">
                {/* Unified Error Display */}
                {displayError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="inline">
                      {displayError}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Google Sign In */}
                <Button
                  variant="outline"
                  className="h-10 w-full border-2 bg-transparent hover:bg-muted/50 sm:h-11"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading || authLoading}
                >
                  {isGoogleLoading || authLoading ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <FcGoogle className="w-5 h-5 mr-2" />
                  )}
                  Continue with Google
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or continue with email
                    </span>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email address</Label>
                    <div className="relative">
                      <Mail className="field-icon" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={formData.email}
                        onChange={(e) => {
                          clearFormFeedback("email");
                          setFormData({ ...formData, email: e.target.value });
                        }}
                        onFocus={() => clearFormFeedback("email")}
                        className={`field-with-icon h-10 sm:h-11 ${
                          errors.email
                            ? "border-red-500 focus-visible:ring-red-500"
                            : ""
                        }`}
                        disabled={authLoading}
                      />
                    </div>
                    {errors.email && (
                      <p className="text-sm text-red-500">{errors.email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="field-icon" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={(e) => {
                          clearFormFeedback("password");
                          setFormData({
                            ...formData,
                            password: e.target.value,
                          });
                        }}
                        onFocus={() => clearFormFeedback("password")}
                        className={`field-with-icon h-10 pr-10 sm:h-11 ${
                          errors.password
                            ? "border-red-500 focus-visible:ring-red-500"
                            : ""
                        }`}
                        disabled={authLoading}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {errors.password && (
                      <p className="text-sm text-red-500">{errors.password}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="remember"
                        checked={formData.rememberMe}
                        onCheckedChange={(checked) => {
                          clearFormFeedback("rememberMe");
                          setFormData({
                            ...formData,
                            rememberMe: checked as boolean,
                          });
                        }}
                        disabled={authLoading}
                      />
                      <Label
                        htmlFor="remember"
                        className="text-xs font-normal sm:text-sm"
                      >
                        Remember me
                      </Label>
                    </div>
                    <Link
                      to={
                        inviteFlow
                          ? "/forgot-password?invite=1"
                          : "/forgot-password"
                      }
                      className="text-sm text-primary hover:underline font-medium"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  <Button
                    type="submit"
                    className="h-10 w-full font-medium sm:h-11"
                    disabled={authLoading}
                  >
                    {authLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                        Signing in...
                      </>
                    ) : (
                      "Sign in"
                    )}
                  </Button>
                </form>

                <div className="text-center text-xs text-muted-foreground sm:text-sm">
                  Don't have an account?{" "}
                  <Link
                    to={inviteFlow ? "/signup?invite=1" : "/signup"}
                    className="text-primary hover:underline font-medium"
                  >
                    Sign up for free
                  </Link>
                </div>
              </CardContent>
            </Card>
          </MotionSurface>

          <div className="text-center text-xs text-muted-foreground">
            <p>
              By signing in, you agree to our{" "}
              <a
                href="https://www.trycrevo.com/terms"
                className="hover:underline"
                target="_blank"
                rel="noopener"
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href="https://www.trycrevo.com/privacy-policy"
                className="hover:underline"
                target="_blank"
                rel="noopener"
              >
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
