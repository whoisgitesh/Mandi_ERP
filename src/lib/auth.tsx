// import { createContext, useContext, useEffect, useState, ReactNode } from "react";
// import type { Session, User } from "@supabase/supabase-js";
// import { supabase } from "@/integrations/supabase/client";

// type AuthCtx = {
//   user: User | null;
//   session: Session | null;
//   loading: boolean;
//   signOut: () => Promise<void>;
// };

// const Ctx = createContext<AuthCtx>({ user: null, session: null, loading: true, signOut: async () => {} });

// export function AuthProvider({ children }: { children: ReactNode }) {
//   const [session, setSession] = useState<Session | null>(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
//       setSession(s);
//       setLoading(false);
//     });
//     supabase.auth.getSession().then(({ data }) => {
//       setSession(data.session);
//       setLoading(false);
//     });
//     return () => sub.subscription.unsubscribe();
//   }, []);

//   return (
//     <Ctx.Provider
//       value={{
//         user: session?.user ?? null,
//         session,
//         loading,
//         signOut: async () => {
//           await supabase.auth.signOut();
//         },
//       }}
//     >
//       {children}
//     </Ctx.Provider>
//   );
// }

// export const useAuth = () => useContext(Ctx);
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type AuthCtx = {
  user: any | null;
  loading: boolean;
  signOut: () => void;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  loading: true,
  signOut: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      }
    }

    setLoading(false);
  }, []);

  const signOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    window.location.href = "/auth";
  };

  return (
    <Ctx.Provider value={{ user, loading, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);