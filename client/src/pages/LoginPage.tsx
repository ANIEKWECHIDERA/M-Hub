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
import { Link, useNavigate } from "react-router-dom";
import { useAuthContext } from "@/context/AuthContext";
import { toast } from "sonner";
import { CrevoMark } from "@/components/CrevoMark";

export default function LoginPage() {
  const navigate = useNavigate();
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

  // Redirect if already logged in
  useEffect(() => {
    if (currentUser) {
      const pendingInviteToken = localStorage.getItem("pendingInviteToken");
      navigate(
        pendingInviteToken
          ? `/invite/accept/${pendingInviteToken}`
          : "/dashboard",
        { replace: true },
      );
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    clearError();
  }, []);

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
      const pendingInviteToken = localStorage.getItem("pendingInviteToken");
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
      const pendingInviteToken = localStorage.getItem("pendingInviteToken");
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
    <div className="flex min-h-screen">
      {/* Left Side - Branding */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/80 lg:flex lg:w-1/2">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative z-10 flex flex-col items-center justify-center p-12 text-white">
          <div className="mb-8">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                <CrevoMark className="h-9 w-9 text-white" />
              </div>
              <span className="text-4xl font-bold tracking-tight">Crevo</span>
            </div>
            <h1 className="text-4xl font-bold mb-4">Welcome to Crevo</h1>
            <p className="text-xl text-white/90 max-w-md text-center leading-relaxed">
              Streamline your agency workflow with our comprehensive project
              management platform
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
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <CrevoMark className="h-6 w-6" />
            </div>
            <div className="text-left">
              <h1 className="text-xl font-bold tracking-tight">Crevo</h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Creative Workflow Management
              </p>
            </div>
          </div>

          <Card className="border-0 shadow-lg premium-interactive">
            <CardHeader className="space-y-1 pb-4 sm:pb-6">
              <CardTitle className="text-center text-xl font-bold sm:text-2xl">
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
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className={`h-10 pl-11 sm:h-11 ${
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
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      className={`h-10 pl-11 pr-10 sm:h-11 ${
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
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          rememberMe: checked as boolean,
                        })
                      }
                      disabled={authLoading}
                    />
                    <Label htmlFor="remember" className="text-xs font-normal sm:text-sm">
                      Remember me
                    </Label>
                  </div>
                  <Link
                    to="/forgot-password"
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
                  to="/signup"
                  className="text-primary hover:underline font-medium"
                >
                  Sign up for free
                </Link>
              </div>
            </CardContent>
          </Card>

          <div className="text-center text-xs text-muted-foreground">
            <p>
              By signing in, you agree to our{" "}
              <Link to="/terms" className="hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link to="/privacy" className="hover:underline">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
