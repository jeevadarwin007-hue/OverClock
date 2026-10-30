import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';

export interface SeededUser {
  id?: string;
  email: string;
  name: string;
  role: string;
  dept: string;
  badgeColor: string;
}

export const SEEDED_USERS: SeededUser[] = [
  {
    email: 'sys_admin_1@easwari.edu',
    name: 'Anand Natarajan',
    role: 'SYS_ADMIN',
    dept: 'Campus Administration',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
  },
  {
    email: 'student_1@easwari.edu',
    name: 'Student / Staff',
    role: 'STUDENT_FACULTY',
    dept: 'Student & Faculty Portal',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
  }
];

interface AuthContextType {
  currentUser: SeededUser;
  token: string | null;
  loading: boolean;
  loginUser: (user: SeededUser, password: string) => Promise<void>;
  switchUser: (user: SeededUser, password: string) => Promise<void>;
  logoutUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<SeededUser>(SEEDED_USERS[1]);
  const [token, setToken] = useState<string | null>(() => {
    // Tokens issued by the old email-only login must not remain valid in the browser.
    localStorage.removeItem('campusops_token');
    return null;
  });
  const [loading, setLoading] = useState<boolean>(false);
  const startedStudentSession = useRef(false);

  useEffect(() => {
    if (startedStudentSession.current) return;
    startedStudentSession.current = true;
    // Launch directly in the read-only student persona while sign-in UI is paused.
    void loginUser(SEEDED_USERS[1], '').catch((error) => {
      console.error('Could not start the student session:', error);
    });
  }, []);

  const loginUser = async (user: SeededUser, password: string) => {
    try {
      setLoading(true);
      const res: any = await api.post('/auth/login', { email: user.email, password });
      if (res.access_token) {
        if (res.role !== user.role) {
          throw new Error('The authenticated account does not match the selected role.');
        }
        localStorage.setItem('campusops_token', res.access_token);
        setToken(res.access_token);
        setCurrentUser({
          ...user,
          id: res.user_id,
          name: res.full_name,
          role: res.role,
        });
      }
    } catch (err) {
      throw new Error((err as any)?.message || 'Sign-in failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const switchUser = async (user: SeededUser, password: string) => {
    await loginUser(user, password);
  };

  const logoutUser = () => {
    localStorage.removeItem('campusops_token');
    setToken(null);
    setCurrentUser(SEEDED_USERS[1]);
  };

  return (
    <AuthContext.Provider value={{ currentUser, token, loading, loginUser, switchUser, logoutUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

