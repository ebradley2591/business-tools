'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { UserProfile } from '@/types/tenant';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, tenantName: string) => Promise<void>;
  logout: () => Promise<void>;
  getAuthToken: () => Promise<string | null>;
  isAdmin: boolean;
  isTenantActive: boolean;
  refreshUserProfile: () => Promise<void>;
  setUserProfile: (profile: UserProfile | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (_uid: string) => {
    try {
      // Check if activation is in progress - if so, don't fetch profile yet
      if (localStorage.getItem('activationInProgress') === 'true') {
        return;
      }

      // Check if this is a fresh sign-in - if so, don't fetch profile yet
      if (localStorage.getItem('freshSignIn') === 'true') {
        return;
      }

      // Additional check: if we already have a valid profile, don't fetch again
      if (userProfile && userProfile.tenant_id && userProfile.subscription_status === 'active') {
        return;
      }

      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        return;
      }

      const response = await fetch('/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const profile = await response.json();
        setUserProfile(profile);
      } else if (response.status === 401) {
        setUserProfile(null);
      } else {
        setUserProfile(null);
      }
    } catch (error) {
      setUserProfile(null);
    }
  };

    const refreshUserProfile = async () => {
    // Get the current user from auth state
    const currentUser = auth?.currentUser;
    if (!currentUser) {
      return null;
    }

    // Check if activation is in progress - if so, skip profile refresh
    if (localStorage.getItem('activationInProgress') === 'true') {
      return null;
    }

    try {
      const token = await currentUser.getIdToken(true); // Force token refresh
      if (!token) {
        return null;
      }

      const response = await fetch('/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const profile = await response.json();
        setUserProfile(profile);
        return profile; // Return the profile data
      } else {
        return null;
      }
    } catch (error) {
      return null;
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return; // Only run on client side
    
    if (!auth) {
      console.warn('Firebase auth not initialized');
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        // Fetch user profile with tenant information
        await fetchUserProfile(user.uid);
        
        // Only set loading to false if this wasn't a fresh sign-in
        // (fresh sign-ins will handle loading state in LoginForm)
        if (localStorage.getItem('freshSignIn') !== 'true') {
          setLoading(false);
        }
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!auth) {
      throw new Error('Firebase auth not initialized');
    }
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string, tenantName: string) => {
    if (!auth) {
      throw new Error('Firebase auth not initialized');
    }
    
    // Create user account
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Create tenant and set user as admin
    const token = await userCredential.user.getIdToken();
    const response = await fetch('/api/auth/setup-tenant', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tenantName }),
    });

    if (!response.ok) {
      throw new Error('Failed to setup tenant');
    }
  };

  const logout = async () => {
    if (!auth) {
      throw new Error('Firebase auth not initialized');
    }
    await signOut(auth);
  };

  const getAuthToken = async (): Promise<string | null> => {
    if (!auth || !auth.currentUser) {
      return null;
    }
    try {
      return await auth.currentUser.getIdToken();
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  };

  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'tool_admin';
  const isTenantActive = userProfile?.subscription_status === 'active';

  const value = { 
    user, 
    userProfile,
    loading, 
    signIn, 
    signUp, 
    logout, 
    getAuthToken, 
    isAdmin,
    isTenantActive,
    refreshUserProfile,
    setUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
