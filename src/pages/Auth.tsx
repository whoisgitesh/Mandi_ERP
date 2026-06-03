// import { useState } from "react";
// import { Navigate } from "react-router-dom";
// import { supabase } from "@/integrations/supabase/client";
// import { useAuth } from "@/lib/auth";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { toast } from "sonner";
// import { Warehouse } from "lucide-react";
// import { useNavigate } from "react-router-dom";

// export default function Auth() {
//   const { user, loading } = useAuth();
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const navigate = useNavigate();
//   const [busy, setBusy] = useState(false);
//   const [step, setStep] = useState("login"); // login | forgot | otp | reset
// const [otp, setOtp] = useState("");
// const [newPassword, setNewPassword] = useState("");

//   const localUser = JSON.parse(localStorage.getItem("user"));



// //if (!loading && user) return <Navigate to="/" replace />;
// const token = localStorage.getItem("token");

// if (!loading && token) {
//   return <Navigate to="/" replace />;
// }

//   const signIn = async (e: React.FormEvent) => {
//   e.preventDefault();
//   setBusy(true);

//   try {
//     const res = await fetch("http://localhost:5000/api/auth/login", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({ email, password }),
//     });

//     const data = await res.json();

//     if (res.ok) {
//       toast.success("Login successful");

//       // 👉 TEMP: simulate login
//       localStorage.setItem("token", data.token); 
//       localStorage.setItem("user", JSON.stringify(data.user));

//       navigate("/" ,{replace: true}); // UI behavior unchanged
//     } else {
//       toast.error(data.error);
//     }
//   } catch (err) {
//     toast.error("Server error");
//   }

//   setBusy(false);
// };

//   // const signUp = async (e: React.FormEvent) => {
//   //   e.preventDefault();
//   //   setBusy(true);
//   //   const { error } = await supabase.auth.signUp({
//   //     email,
//   //     password,
//   //     options: { emailRedirectTo: window.location.origin },
//   //   });
//   //   setBusy(false);
//   //   if (error) toast.error(error.message);
//   //   else toast.success("Account created. You're signed in.");
//   // };

//   const signUp = async (e: React.FormEvent) => {
//   e.preventDefault();
//   setBusy(true);

//   try {
//     const res = await fetch("http://localhost:5000/api/auth/signup", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({ email, password }),
//     });

//     const data = await res.json();

//    if (res.ok) {
//   toast.success("Account created successfully");

//   if (data.token) {
//     localStorage.setItem("token", data.token);
//   }

//   localStorage.setItem("user", JSON.stringify(data.user));

//   navigate("/", { replace: true });
// } else {
//       toast.error(data.error || "Signup failed");
//     }
//   } catch (err) {
//     toast.error("Server error");
//   }

//   setBusy(false);
// };
//   const sendOtp = async () => {
//   if (!email) return toast.error("Enter email first");

//   setBusy(true);
//   try {
//     const res = await fetch("http://localhost:5000/api/auth/send-otp", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json"
//       },
//       body: JSON.stringify({ email })
//     });

//     const data = await res.json();

//     if (res.ok) {
//       toast.success("OTP sent");
//       setStep("otp");
//     } else {
//       toast.error(data.error);
//     }
//   } catch {
//     toast.error("Server error");
//   }
//   setBusy(false);
// };

// const verifyOtp = async () => {
//   setBusy(true);
//   try {
//     const res = await fetch("http://localhost:5000/api/auth/verify-otp", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json"
//       },
//       body: JSON.stringify({ email, otp })
//     });

//     const data = await res.json();

//     if (res.ok) {
//       toast.success("OTP verified");
//       setStep("reset");
//     } else {
//       toast.error(data.error);
//     }
//   } catch {
//     toast.error("Server error");
//   }
//   setBusy(false);
// };

// const resetPassword = async () => {
//   setBusy(true);
//   try {
//     const res = await fetch("http://localhost:5000/api/auth/reset-password", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json"
//       },
//       body: JSON.stringify({ email, newPassword })
//     });

//     const data = await res.json();

//     if (res.ok) {
//       toast.success("Password updated");
//       setStep("login");
//     } else {
//       toast.error(data.error);
//     }
//   } catch {
//     toast.error("Server error");
//   }
//   setBusy(false);
// };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-muted px-4">
//       <Card className="w-full max-w-md shadow-lg">
//         <CardHeader className="text-center">
//           <div className="mx-auto mb-2 inline-flex h-12 w-12 items-center justify-center rounded bg-primary text-primary-foreground">
//             <Warehouse className="h-6 w-6" />
//           </div>
//           <CardTitle>Mandi ERP</CardTitle>
//           <CardDescription>Sign in to manage Mandi purchases</CardDescription>
//         </CardHeader>
//         <CardContent>
//           <Tabs defaultValue="signin">
//             <TabsList className="grid w-full grid-cols-2">
//               <TabsTrigger value="signin">Sign in</TabsTrigger>
//               <TabsTrigger value="signup">Sign up</TabsTrigger>
//             </TabsList>
//             <TabsContent value="signin">
//               <form onSubmit={signIn} className="space-y-3 pt-3">
//                 <div>
//                   <Label htmlFor="e1">Email</Label>
//                   <Input id="e1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
//                 </div>
//                 <div>
//                   <Label htmlFor="p1">Password</Label>
//                   <Input id="p1" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
//                 </div>
//                 <div className="text-right">
//                   <button type="button" className="text-sm text-primary" onClick={() => navigate("/forgot-password")}>
//                     Forgot password?
//                   </button>
//                 </div>
//                 <Button type="submit" className="w-full" disabled={busy}>Sign in</Button>
//               </form>
//             </TabsContent>
//             <TabsContent value="signup">
//               <form onSubmit={signUp} className="space-y-3 pt-3">
//                 <div>
//                   <Label htmlFor="e2">Email</Label>
//                   <Input id="e2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
//                 </div>
//                 <div>
//                   <Label htmlFor="p2">Password</Label>
//                   <Input id="p2" type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
//                 </div>
//                 <Button type="submit" className="w-full" disabled={busy}>Create account</Button>
//               </form>
//             </TabsContent>
//           </Tabs>
//         </CardContent>
//       </Card>
//     </div>
//   );
// };

import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Warehouse } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const navigate = useNavigate();

  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // ✅ SAFE AUTH CHECK (NO JSON.parse anywhere)
  const token = localStorage.getItem("token");
  const isAuth = !!token;

  if (isAuth) {
    return <Navigate to="/" replace />;
  }

  // ---------------- LOGIN ----------------
  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Login successful");

        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        navigate("/", { replace: true });
      } else {
        toast.error(data.error || "Login failed");
      }
    } catch {
      toast.error("Server error");
    }

    setBusy(false);
  };

  // ---------------- SIGNUP ----------------
  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Account created successfully");

        if (data.token) {
          localStorage.setItem("token", data.token);
        }

        localStorage.setItem("user", JSON.stringify(data.user));

        navigate("/", { replace: true });
      } else {
        toast.error(data.error || "Signup failed");
      }
    } catch {
      toast.error("Server error");
    }

    setBusy(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted px-4">
      <Card className="w-full max-w-md shadow-lg">

        <CardHeader className="text-center">
          <div className="mx-auto mb-2 inline-flex h-12 w-12 items-center justify-center rounded bg-primary text-primary-foreground">
            <Warehouse className="h-6 w-6" />
          </div>
          <CardTitle>Mandi ERP</CardTitle>
          <CardDescription>Sign in to manage Mandi purchases</CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="signin">

            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>

            {/* ---------------- SIGN IN ---------------- */}
            <TabsContent value="signin">
              <form onSubmit={signIn} className="space-y-3 pt-3">

                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="text-right">
                  <button
                    type="button"
                    className="text-sm text-primary"
                    onClick={() => navigate("/forgot-password")}
                  >
                    Forgot password?
                  </button>
                </div>

                <Button type="submit" className="w-full" disabled={busy}>
                  Sign in
                </Button>

              </form>
            </TabsContent>

            {/* ---------------- SIGN UP ---------------- */}
            <TabsContent value="signup">
              <form onSubmit={signUp} className="space-y-3 pt-3">

                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label>Password</Label>
                  <Input
                    type="password"
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={busy}>
                  Create account
                </Button>

              </form>
            </TabsContent>

          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
