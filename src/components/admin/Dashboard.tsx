import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

const Dashboard = () => {
  const [regulationsCount, setRegulationsCount] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
      }
      
      // Get regulations count
      const { count, error } = await supabase
        .from('registros')
        .select('*', { count: 'exact', head: true });
      
      if (!error && count !== null) {
        setRegulationsCount(count);
      }
      
      setIsLoading(false);
    };
    
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Bienvenido</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
          <h3 className="text-lg font-medium text-foreground">Total Entradas</h3>
          <p className="text-3xl font-bold mt-2 text-primary">{regulationsCount}</p>
          <p className="text-sm text-muted-foreground mt-1">Total entradas en la base de datos</p>
        </div>
      </div>
      
      <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
        <h2 className="text-xl font-semibold mb-4 text-foreground">Acciones Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a 
            href="/admin/regulations/new" 
            className="p-4 border border-border rounded-md hover:bg-muted flex items-center space-x-3"
          >
            <div className="rounded-full p-2 bg-primary/10 text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-foreground">Agregar Nueva Entrada</h3>
              <p className="text-sm text-muted-foreground">Crear una nueva entrada</p>
            </div>
          </a>
          <a 
            href="/admin/regulations" 
            className="p-4 border border-border rounded-md hover:bg-muted flex items-center space-x-3"
          >
            <div className="rounded-full p-2 bg-primary/10 text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-foreground">Administrar Entradas</h3>
              <p className="text-sm text-muted-foreground">Ver, editar y eliminar entradas</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 