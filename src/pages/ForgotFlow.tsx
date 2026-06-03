import { useState, type ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API_BASE_URL } from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeft, Eye, EyeOff, KeyRound, Lock, Mail, ShieldCheck } from "lucide-react";

export default function ForgotFlow() {
  const navigate = useNavigate();
  const location = useLocation();

  const path = location.pathname;

  const [email, setEmail] = useState(
    localStorage.getItem("resetEmail") || ""
  );
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ---------------- SEND OTP ----------------
  const sendOtp = async () => {
    if (!email) return toast.error("Enter email");

    const res = await fetch(`${API_BASE_URL}/auth/send-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();

    if (res.ok) {
      toast.success("OTP sent");
      localStorage.setItem("resetEmail", email);
      navigate("/verify-otp");
    } else {
      toast.error(data.error);
    }
  };

  // ---------------- VERIFY OTP ----------------
  const verifyOtp = async () => {
    const res = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, otp }),
    });

    const data = await res.json();

    if (res.ok) {
      toast.success("OTP verified");
      navigate("/reset-password");
    } else {
      toast.error(data.error);
    }
  };

  // ---------------- RESET PASSWORD ----------------
  const resetPassword = async () => {
    const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, newPassword }),
    });

    const data = await res.json();

    if (res.ok) {
      toast.success("Password updated");
      localStorage.removeItem("resetEmail");
      navigate("/");
    } else {
      toast.error(data.error);
    }
  };

  const backToLogin = () => {
    navigate("/auth");
  };

  const title =
    path === "/verify-otp"
      ? "Verify OTP"
      : path === "/reset-password"
      ? "Reset password"
      : "Forgot password?";

  const subtitle =
    path === "/verify-otp"
      ? "Enter the OTP sent to your email."
      : path === "/reset-password"
      ? "Create a new password for your account."
      : "Enter your email and we'll send you a reset OTP.";

  return (
    <main className="min-h-screen bg-muted text-foreground flex items-center justify-center p-4">
      <section className="w-full max-w-md rounded border bg-card px-6 py-9 shadow-lg sm:px-8">
        <div className="mx-auto max-w-sm space-y-4">
          <div className="text-center">
            <h1 className="text-base font-semibold">
              {title}
            </h1>

            <p className="mt-4 text-sm text-muted-foreground">
              {subtitle}
            </p>
          </div>

          {path === "/forgot-password" && (
            <>
              <IconInput icon={<Mail className="h-4 w-4" />}>
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClassName}
                />
              </IconInput>

              <Button
                onClick={sendOtp}
                className={primaryButtonClassName}
              >
                Send OTP
              </Button>
            </>
          )}

          {path === "/verify-otp" && (
            <>
              <IconInput icon={<ShieldCheck className="h-4 w-4" />}>
                <Input
                  type={showOtp ? "text" : "password"}
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className={visibilityInputClassName}
                />
                <VisibilityButton
                  visible={showOtp}
                  label={showOtp ? "Hide OTP" : "Show OTP"}
                  onClick={() => setShowOtp((current) => !current)}
                />
              </IconInput>

              <Button
                onClick={verifyOtp}
                className={primaryButtonClassName}
              >
                Verify OTP
              </Button>
            </>
          )}

          {path === "/reset-password" && (
            <>
              <IconInput icon={<Lock className="h-4 w-4" />}>
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={visibilityInputClassName}
                />
                <VisibilityButton
                  visible={showPassword}
                  label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((current) => !current)}
                />
              </IconInput>

              <Button
                onClick={resetPassword}
                className={primaryButtonClassName}
              >
                <KeyRound className="mr-2 h-4 w-4" />
                Reset Password
              </Button>
            </>
          )}

          <Button
            type="button"
            variant="ghost"
            onClick={backToLogin}
            className="mx-auto flex h-10 text-primary hover:bg-primary/5 hover:text-primary"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to login
          </Button>
        </div>
      </section>
    </main>
  );
}

const inputClassName =
  "h-10 rounded border-input bg-background pl-11 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-primary";

const visibilityInputClassName =
  `${inputClassName} pr-11`;

const primaryButtonClassName =
  "h-10 w-full rounded bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90";

function IconInput({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="relative mt-2">
      <div className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-muted-foreground">
        {icon}
      </div>
      {children}
    </div>
  );
}

function VisibilityButton({
  visible,
  label,
  onClick,
}: {
  visible: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
    >
      {visible ? (
        <EyeOff className="h-4 w-4" />
      ) : (
        <Eye className="h-4 w-4" />
      )}
    </button>
  );
}
