import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import { Edit, Trash2, Plus, FileSearch } from 'lucide-react';
import type { Regulation } from '../../context/RegulationsContext';

const RegulationsList = () => {
  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchRegulations();
  }, [currentPage]);

  const fetchRegulations = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch total count
      const { count: totalItems } = await supabase
        .from('registros')
        .select('*', { count: 'exact', head: true });

      if (totalItems !== null) {
        setTotalCount(totalItems);
      }

      // Fetch paginated data
      let query = supabase
        .from('registros')
        .select('*')
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      // Apply search if provided
      if (searchQuery) {
        query = query.ilike('titulo', `%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      setRegulations(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch regulations');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page on new search
    fetchRegulations();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this regulation?')) return;

    try {
      const { error } = await supabase
        .from('registros')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Refresh the list after deletion
      fetchRegulations();
    } catch (err: any) {
      setError(err.message || 'Failed to delete regulation');
      console.error(err);
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-foreground">Entradas</h1>
        <Link 
          to="/admin/regulations/new"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Añadir nueva entrada
        </Link>
      </div>

      {/* Search and filter */}
      <div className="bg-card p-4 rounded-lg shadow-sm border border-border">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar entradas..."
            className="flex-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white text-black"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          >
            Buscar
          </button>
        </form>
      </div>

      {error && (
        <div className="p-4 bg-error/10 border border-error text-error rounded-md">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          {regulations.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-lg shadow-sm border border-border">
              <p className="text-muted-foreground">No regulations found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted">
                  <tr>
                    <th className="px-6 py-3">Title</th>
                    <th className="px-6 py-3">Scale</th>
                    <th className="px-6 py-3">Location</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {regulations.map((regulation) => (
                    <tr 
                      key={regulation.id} 
                      className="bg-card border-b border-border hover:bg-muted/50"
                    >
                      <td className="px-6 py-4 font-medium text-foreground">
                        {regulation.titulo}
                      </td>
                      <td className="px-6 py-4">
                        {regulation.escala_normativa}
                      </td>
                      <td className="px-6 py-4">
                        {regulation.ciudad || regulation.provincia || regulation.ccaa || regulation.ambito}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <Link 
                          to={`/admin/regulations/${regulation.id}/view`}
                          className="inline-flex items-center justify-center h-8 w-8 border border-border rounded-md hover:bg-muted"
                          title="View"
                        >
                          <FileSearch className="h-4 w-4 text-foreground" />
                        </Link>
                        <Link 
                          to={`/admin/regulations/${regulation.id}/edit`}
                          className="inline-flex items-center justify-center h-8 w-8 border border-border rounded-md hover:bg-muted"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4 text-foreground" />
                        </Link>
                        <button
                          onClick={() => handleDelete(regulation.id)}
                          className="inline-flex items-center justify-center h-8 w-8 border border-border rounded-md hover:bg-muted"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-error" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <nav className="inline-flex rounded-md shadow">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded-l-md border border-border bg-card text-foreground disabled:opacity-50"
                >
                  Previous
                </button>
                
                <div className="flex">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      // Show current page and neighbors
                      return Math.abs(page - currentPage) <= 1 || page === 1 || page === totalPages;
                    })
                    .map((page, index, array) => {
                      // Add dots for gaps
                      const prevPage = array[index - 1];
                      if (prevPage && page - prevPage > 1) {
                        return (
                          <React.Fragment key={`gap-${page}`}>
                            <span className="px-3 py-1 border-t border-b border-border bg-card text-muted-foreground">...</span>
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={`px-3 py-1 border-t border-b border-border ${
                                currentPage === page
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-card text-foreground'
                              }`}
                            >
                              {page}
                            </button>
                          </React.Fragment>
                        );
                      }
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1 border-t border-b border-border ${
                            currentPage === page
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-card text-foreground'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                </div>
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded-r-md border border-border bg-card text-foreground disabled:opacity-50"
                >
                  Next
                </button>
              </nav>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RegulationsList; 