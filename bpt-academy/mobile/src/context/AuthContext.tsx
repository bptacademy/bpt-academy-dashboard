import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  previewRole: 'super_admin' | 'admin' | 'coach' | 'student' | null;
  setPreviewRole: (role: 'super_admin' | 'admin' | 'coach' | 'student' | null) => void;
  effectiveRole: string;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isCoach: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  previewRole: null,
  setPreviewRole: () => {},
  effectiveRole: 'student',
  isSuperAdmin: false,
  isAdmin: false,
  isCoach: false,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewRole, setPreviewRole] = useState<'super_admin' | 'admin' | 'coach' | 'student' | null>(null);

  const effectiveRole = previewRole ?? profile?.role ?? 'student';
  const isSuperAdmin = effectiveRole === 'super_admin';
  const isAdmin = effectiveRole === 'admin' || effectiveRole === 'super_admin';
  const isCoach = effectiveRole === 'coach' || effectiveRole === 'admin' || effectiveRole === 'super_admin';

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (data) {
      // Only update state if something actually changed — prevents
      // infinite re-render loops in screens that depend on [profile]
      setProfile((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
        return data;
      });
    }
  };

  const refreshProfile = useCallback(async () => {
    if (session?.user) await fetchProfile(session.user.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setPreviewRole(null);
  };

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      profile,
      loading,
      previewRole,
      setPreviewRole,
      effectiveRole,
      isSuperAdmin,
      isAdmin,
      isCoach,
      signOut,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
