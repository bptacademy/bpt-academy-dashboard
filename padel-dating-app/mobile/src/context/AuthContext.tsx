import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { User } from '../types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  refreshUser: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const sessionRef = useRef<Session | null>(null);

  const fetchUser = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', userId)
        .maybeSingle();
      if (data) setUser(data as User);
      else setUser(null);
    } catch {
      setUser(null);
    }
  };

  const refreshUser = async () => {
    const { data: { session: liveSession } } = await supabase.auth.getSession();
    if (liveSession?.user?.id) await fetchUser(liveSession.user.id);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    sessionRef.current = null;
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      // Stale/invalid refresh token — clear the session silently and show welcome screen
      if (error) {
        console.log('Session restore failed (stale token) — signing out silently');
        supabase.auth.signOut().catch(() => {});
        setLoading(false);
        return;
      }
      setSession(session);
      sessionRef.current = session;
      if (session?.user?.id) {
        fetchUser(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // TOKEN_REFRESHED failure fires as a null session — handle gracefully
      setSession(session);
      sessionRef.current = session;
      if (session?.user?.id) fetchUser(session.user.id);
      else setUser(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, loading, refreshUser, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
