import React, { useEffect, useState } from "react";
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
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  AlertCircle,
  CircleCheckBig,
  //   Building,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthContext } from "@/context/AuthContext";
import { FcGoogle } from "react-icons/fc";
import { toast } from "sonner";
import { useUser } from "@/context/UserContext";
import { API_CONFIG } from "@/lib/api";
import { signOut } from "firebase/auth";
import { auth } from "@/firebase/firebase";
import { CrevoMark } from "@/components/CrevoMark";

export default function SignUpPage() {
  const navigate = useNavigate();
  const {
    signUp,
    signInWithGoogle,
    error: authError,
    loading: authLoading,
    clearError,
    refreshStatus,
  } = useAuthContext();

  const { fetchUserProfile, setProfile } = useUser();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    // company: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim())
      newErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // if (!formData.company.trim()) newErrors.company = "Company name is required";

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password =
        "Password must contain uppercase, lowercase, and number";
    }

    if (formData.confirmPassword !== formData.password) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = "You must agree to the terms and conditions";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate form data
    if (!validateForm()) return;

    clearError(); // Clear previous auth errors
    // let uidToDeleteOnError: String | null = null;

    // console.log("Submitting sign-up with data:", formData);

    try {
      // Attempt to sign up the user
      const {
        user,
        error,
        uidToDeleteOnError: errorUidToDelete,
      } = await signUp(
        formData.email,
        formData.password,
        formData.firstName,
        formData.lastName,
        formData.agreeToTerms,
      );
      console.log("SignUp Response:", { user, error, errorUidToDelete });

      if (error || !user) {
        console.log("User signed failed:", errorUidToDelete);
        if (errorUidToDelete) {
          console.log(`firebase User: ${errorUidToDelete} needs deletion`);
          try {
            console.log(
              "Attempting to delete Firebase user with UID:",
              errorUidToDelete,
            );

            // Make a request to the backend to delete the Firebase user
            const response = await fetch(
              `${API_CONFIG.backend}/api/deleteFirebaseUserId`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ uid: errorUidToDelete }), // Pass the Firebase UID to the backend
              },
            );

            const data = await response.json();
            if (response.ok) {
              console.log(
                "Orphaned Firebase user deleted successfully via backend",
              );
            } else {
              console.error(
                "Error deleting Firebase user via backend:",
                data.error || data.message,
              );
            }
          } catch (deleteErr: any) {
            console.error(
              "Failed to delete Firebase user via backend:",
              deleteErr,
            );
          }
        }
        throw new Error(error || "Sign up failed");
      }

      toast.success("Welcome! Your account is created.", {
        id: "profile-create",
      });
      const idToken = await user.getIdToken();

      // Fetch the user's backend profile
      const backendProfile = await fetchUserProfile(idToken);

      console.log("SignUpPage: Fetched backend profile:", backendProfile);

      if (backendProfile) {
        setProfile(backendProfile);
        console.log("Fetched backend profile:", backendProfile);
      }

      // Clear saved form data from localStorage
      localStorage.removeItem("signUpFormData");

      await refreshStatus();
      const pendingInviteToken = localStorage.getItem("pendingInviteToken");

      // Redirect to dashboard ONLY on full success
      navigate(
        pendingInviteToken
          ? `/invite/accept/${pendingInviteToken}`
          : "/dashboard",
        { replace: true },
      );
    } catch (err: any) {
      toast.error(
        err.message || "Failed to complete signup. Please try again.",
        { id: "profile-create" },
      );

      await signOut(auth); // Always sign out to remove token and force redirect to signup/login
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    localStorage.setItem("signUpFormData", JSON.stringify(updatedData));
  };

  useEffect(() => {
    const savedData = localStorage.getItem("signUpFormData");
    if (savedData) {
      setFormData(JSON.parse(savedData));
    }
  }, []);

  useEffect(() => {
    clearError();
  }, []);

  const handleGoogleSignUp = async () => {
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
  };

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
            <h1 className="text-4xl font-bold mb-4">Join Crevo Today</h1>
            <p className="text-xl text-white/90 max-w-md text-center leading-relaxed">
              Start managing your agency projects more efficiently with our
              powerful tools
            </p>
          </div>

          <div className="space-y-4 max-w-md">
            {[
              "Unlimited projects and team members",
              "Advanced collaboration tools",
              "Real-time notifications and updates",
              "24/7 customer support",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-sm">
                    <CircleCheckBig />
                  </span>
                </div>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute top-20 right-20 w-32 h-32 bg-white/10 rounded-full blur-xl" />
        <div className="absolute bottom-20 left-20 w-24 h-24 bg-white/10 rounded-full blur-xl" />
        <div className="absolute top-1/2 right-10 w-16 h-16 bg-white/10 rounded-full blur-lg" />
      </div>

      {/* Right Side - Sign Up Form */}
      <div className="flex flex-1 items-center justify-center bg-background px-4 py-5 sm:p-8">
        <div className="w-full max-w-md space-y-4 sm:space-y-6">
          {/* Mobile Logo */}
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
                Create your account
              </CardTitle>
              <CardDescription className="text-center text-xs sm:text-sm">
                Get started with your free Crevo account
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 sm:space-y-4">
              {/* Firebase Auth Error */}
              {authError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4 " />
                  <AlertDescription className="inline">
                    {displayError}
                  </AlertDescription>
                </Alert>
              )}

              {/* Google Sign Up */}
              <Button
                variant="outline"
                className="h-10 w-full border-2 bg-transparent hover:bg-muted/50 sm:h-11"
                onClick={handleGoogleSignUp}
                disabled={isGoogleLoading || authLoading}
              >
                {isGoogleLoading ? (
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

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First name</Label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="firstName"
                        type="text"
                        placeholder="First name"
                        value={formData.firstName}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData({
                            ...formData,
                            firstName: value,
                          });
                          handleInputChange("firstName", value);
                        }}
                        className={`h-10 pl-12 sm:h-11 sm:pl-12 ${
                          errors.firstName
                            ? "border-red-500 focus-visible:ring-red-500"
                            : ""
                        }`}
                        disabled={authLoading}
                      />
                    </div>
                    {errors.firstName && (
                      <p className="text-sm text-red-500">{errors.firstName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Last name"
                      value={formData.lastName}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData({
                          ...formData,
                          lastName: value,
                        });
                        handleInputChange("lastName", value);
                      }}
                      className={`h-10 sm:h-11 ${
                        errors.lastName
                          ? "border-red-500 focus-visible:ring-red-500"
                          : ""
                      }`}
                      disabled={authLoading}
                    />
                    {errors.lastName && (
                      <p className="text-sm text-red-500">{errors.lastName}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Email address"
                      value={formData.email}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData({
                          ...formData,
                          email: value,
                        });
                        handleInputChange("email", value);
                      }}
                      className={`h-10 pl-12 sm:h-11 sm:pl-12 ${
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

                {/* <div className="space-y-2">
                  <Label htmlFor="company">Company name</Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="company"
                      type="text"
                      placeholder="Your Company"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className={`pl-10 h-11 ${errors.company ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                      disabled={authLoading}
                    />
                  </div>
                  {errors.company && <p className="text-sm text-red-500">{errors.company}</p>}
                </div> */}

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      value={formData.password}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData({
                          ...formData,
                          password: value,
                        });
                        handleInputChange("password", value);
                      }}
                      className={`h-10 pl-12 pr-10 sm:h-11 sm:pl-12 ${
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

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData({
                          ...formData,
                          confirmPassword: value,
                        });
                        handleInputChange("confirmPassword", value);
                      }}
                      className={`h-10 pl-12 pr-10 sm:h-11 sm:pl-12 ${
                        errors.confirmPassword
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
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-red-500">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="terms"
                    checked={formData.agreeToTerms}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        agreeToTerms: checked as boolean,
                      })
                    }
                    disabled={authLoading}
                    className="mt-0.5"
                  />
                  <Label
                    htmlFor="terms"
                    className="text-xs font-normal leading-4 sm:text-sm sm:leading-5"
                  >
                    I agree to the{" "}
                    <Link to="/terms" className="text-primary hover:underline">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link
                      to="/privacy"
                      className="text-primary hover:underline"
                    >
                      Privacy Policy
                    </Link>
                  </Label>
                </div>
                {errors.agreeToTerms && (
                  <p className="text-sm text-red-500">{errors.agreeToTerms}</p>
                )}

                <Button
                  type="submit"
                  className="h-10 w-full font-medium sm:h-11"
                  disabled={authLoading || isGoogleLoading}
                >
                  {authLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                      Creating account...
                    </>
                  ) : (
                    "Create account"
                  )}
                </Button>
              </form>

              <div className="text-center text-xs text-muted-foreground sm:text-sm">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="text-primary hover:underline font-medium"
                >
                  Sign in
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
