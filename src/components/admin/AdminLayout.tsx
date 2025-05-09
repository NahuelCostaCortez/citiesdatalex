import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, NavLink } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { LogOut, Database, Home } from 'lucide-react';

const AdminLayout = () => {
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate('/admin/login');
      }
      setIsLoading(false);
    };

    checkAuth();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 bg-card border-r border-border">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <h1 className="text-xl font-bold text-foreground">Panel de Administración</h1>
        </div>
        <nav className="mt-6 px-4">
          <NavLink 
            to="/admin/dashboard" 
            className={({ isActive }) => 
              `flex items-center px-4 py-2 mt-2 text-sm ${
                isActive 
                  ? 'bg-primary text-primary-foreground rounded-md'
                  : 'text-foreground hover:bg-muted rounded-md'
              }`
            }
          >
            <Home className="h-5 w-5 mr-2" />
            Dashboard
          </NavLink>
          <NavLink 
            to="/admin/regulations" 
            className={({ isActive }) => 
              `flex items-center px-4 py-2 mt-2 text-sm ${
                isActive 
                  ? 'bg-primary text-primary-foreground rounded-md'
                  : 'text-foreground hover:bg-muted rounded-md'
              }`
            }
          >
            <Database className="h-5 w-5 mr-2" />
            Entradas
          </NavLink>
        </nav>
        <div className="absolute bottom-0 w-64 p-4 border-t border-border">
          <button
            onClick={handleSignOut}
            className="flex items-center px-4 py-2 text-sm text-foreground hover:bg-muted rounded-md w-full"
          >
            <LogOut className="h-5 w-5 mr-2" />
            Sign out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 flex items-center px-6 border-b border-border">
          <h2 className="text-lg font-medium text-foreground">Dashboard</h2>
        </header>
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout; 