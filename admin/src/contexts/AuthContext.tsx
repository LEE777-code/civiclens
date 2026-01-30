import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, Admin } from '@/lib/supabase';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  adminEmail: string;
  admin: Admin | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Admin credentials - Change these to your desired username/password
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123', // CHANGE THIS PASSWORD!
  email: 'admin@civiclens.com'
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [admin, setAdmin] = useState<Admin | null>(null);

  // Check if user is already logged in (from localStorage)
  useEffect(() => {
    const authToken = localStorage.getItem('admin_auth');
    const storedAdmin = localStorage.getItem('admin_data');

    if (authToken === 'authenticated' && storedAdmin) {
      setIsAuthenticated(true);
      setAdminEmail(ADMIN_CREDENTIALS.email);
      try {
        setAdmin(JSON.parse(storedAdmin));
      } catch (error) {
        console.error('Error parsing admin data:', error);
      }
    }
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    if (
      username === ADMIN_CREDENTIALS.username &&
      password === ADMIN_CREDENTIALS.password
    ) {
      setIsAuthenticated(true);
      setAdminEmail(ADMIN_CREDENTIALS.email);
      localStorage.setItem('admin_auth', 'authenticated');

      // Try to fetch or create admin profile from Supabase
      try {
        // First, try to find existing admin by email
        const { data: existingAdmin } = await supabase
          .from('admins')
          .select('*')
          .eq('email', ADMIN_CREDENTIALS.email)
          .single();

        if (existingAdmin) {
          setAdmin(existingAdmin);
          localStorage.setItem('admin_data', JSON.stringify(existingAdmin));
        } else {
          // Create a default admin profile if it doesn't exist
          const newAdmin: Partial<Admin> = {
            clerk_id: 'local_admin_' + Date.now(),
            email: ADMIN_CREDENTIALS.email,
            name: 'Admin User',
            role: 'super_admin',
            state: 'All States',
          };

          const { data: createdAdmin } = await supabase
            .from('admins')
            .insert([newAdmin])
            .select()
            .single();

          if (createdAdmin) {
            setAdmin(createdAdmin);
            localStorage.setItem('admin_data', JSON.stringify(createdAdmin));
          }
        }
      } catch (error) {
        console.error('Error fetching/creating admin profile:', error);
        // Set a default admin object even if DB fetch fails
        const defaultAdmin: Admin = {
          id: 'local',
          clerk_id: 'local_admin',
          email: ADMIN_CREDENTIALS.email,
          name: 'Admin User',
          role: 'super_admin',
          state: 'All States',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setAdmin(defaultAdmin);
        localStorage.setItem('admin_data', JSON.stringify(defaultAdmin));
      }

      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setAdminEmail('');
    setAdmin(null);
    localStorage.removeItem('admin_auth');
    localStorage.removeItem('admin_data');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, adminEmail, admin }}>
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
