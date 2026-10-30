import React, { createContext, useContext, useState, useEffect } from 'react';
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
  switchUser: (user: SeededUser) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<SeededUser>(SEEDED_USERS[0]);
  const [token, setToken] = useState<string | null>(localStorage.getItem('campusops_token'));
  const [loading, setLoading] = useState<boolean>(true);

  const loginUser = async (user: SeededUser) => {
    try {
      setLoading(true);
      const res: any = await api.post('/auth/login', { email: user.email });
      if (res.access_token) {
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
      console.error('Failed to log in seeded user:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loginUser(currentUser);
  }, []);

  const switchUser = async (user: SeededUser) => {
    await loginUser(user);
  };

  return (
    <AuthContext.Provider value={{ currentUser, token, loading, switchUser }}>
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

