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
  isParent: boolean;
  isJunior: boolean;
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
  isParent: false,
  isJunior: false,
  signOut: async () => {},
  refreshProfile: async () => {},
});

// ── Helpers ──────────────────────────────────────────────────────────────

function calcAge(dob: string): number {
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// ── Provider ─────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewRole, setPreviewRole] = useState<'super_admin' | 'admin' | 'coach' | 'student' | null>(null);

  const effectiveRole = previewRole ?? profile?.role ?? 'student';
  const isSuperAdmin = effectiveRole === 'super_admin';
  const isAdmin      = effectiveRole === 'admin' || effectiveRole === 'super_admin';
  const isCoach      = effectiveRole === 'coach' || effectiveRole === 'admin' || effectiveRole === 'super_admin';
  const isParent     = effectiveRole === 'parent';
  // Junior: is_junior flag AND role is still student
  const isJunior     = !!(profile?.is_junior) && profile?.role === 'student';

  // Silently check and run graduation for junior students who have turned 16
  const checkAndGraduate = useCallback(async (p: Profile) => {
    if (!p.is_junior || !p.date_of_birth || p.role !== 'student') return;
    const age = calcAge(p.date_of_birth);
    if (age >= 16) {
      try {
        await supabase.rpc('graduate_junior_to_student', { p_student_id: p.id });
        // Refresh profile to pick up the new role
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', p.id)
          .single();
        if (data) {
          setProfile((prev) => {
            if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
            return data;
          });
        }
      } catch {
        // Silent fail — will retry next login
      }
    }
  }, []);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (data) {
      setProfile((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
        return data;
      });
      // Run graduation check silently after fetching
      checkAndGraduate(data);
    }
  }, [checkAndGraduate]);

  const refreshProfile = useCallback(async () => {
    if (session?.user) await fetchProfile(session.user.id);
  }, [session?.user?.id, fetchProfile]);

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
      isParent,
      isJunior,
      signOut,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
