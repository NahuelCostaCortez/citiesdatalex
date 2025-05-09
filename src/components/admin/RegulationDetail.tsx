import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Edit, ArrowLeft } from 'lucide-react';
import type { Regulation } from '../../context/RegulationsContext';

const RegulationDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [regulation, setRegulation] = useState<Regulation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchRegulation(id);
    }
  }, [id]);

  const fetchRegulation = async (regulationId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('registros')
        .select('*')
        .eq('id', regulationId)
        .single();

      if (error) throw error;
      
      setRegulation(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch regulation');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-error/10 border border-error text-error rounded-md">
        {error}
      </div>
    );
  }

  if (!regulation) {
    return (
      <div className="text-center py-12 bg-card rounded-lg shadow-sm border border-border">
        <p className="text-muted-foreground">Regulation not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigate('/admin/regulations')}
            className="p-2 rounded-full hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="text-2xl font-bold text-foreground">Detalles</h1>
        </div>
        <Link
          to={`/admin/regulations/${regulation.id}/edit`}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md flex items-center"
        >
          <Edit className="h-4 w-4 mr-2" />
          Editar
        </Link>
      </div>

      <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">{regulation.titulo}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {regulation.escala_normativa}
          </p>
        </div>

        <div className="p-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Escala Normativa</dt>
              <dd className="mt-1 text-sm text-foreground">{regulation.escala_normativa}</dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Ámbito temático</dt>
              <dd className="mt-1 text-sm text-foreground">{regulation.ambito}</dd>
            </div>
            
            {regulation.ccaa && (
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Comunidad Autónoma</dt>
                <dd className="mt-1 text-sm text-foreground">{regulation.ccaa}</dd>
              </div>
            )}
            
            {regulation.provincia && (
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Provincia</dt>
                <dd className="mt-1 text-sm text-foreground">{regulation.provincia}</dd>
              </div>
            )}
            
            {regulation.ciudad && (
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Ciudad/Municipio</dt>
                <dd className="mt-1 text-sm text-foreground">{regulation.ciudad}</dd>
              </div>
            )}
            
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-muted-foreground">URL</dt>
              <dd className="mt-1 text-sm text-primary">
                <a href={regulation.url} target="_blank" rel="noopener noreferrer" className="hover:underline break-words">
                  {regulation.url}
                </a>
              </dd>
            </div>
          </dl>
        </div>

        {(regulation.sostenibilidad_economica || regulation.sostenibilidad_social || 
          regulation.sostenibilidad_ambiental || regulation.cambio_climatico || 
          regulation.gobernanza_urbana) && (
          <div className="px-6 py-4 border-t border-border">
            <h3 className="text-lg font-medium text-foreground mb-4">Descriptores</h3>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {regulation.sostenibilidad_economica && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Sostenibilidad Económica</h4>
                  <p className="text-sm text-foreground whitespace-pre-line">{regulation.sostenibilidad_economica}</p>
                </div>
              )}
              
              {regulation.sostenibilidad_social && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Sostenibilidad Social</h4>
                  <p className="text-sm text-foreground whitespace-pre-line">{regulation.sostenibilidad_social}</p>
                </div>
              )}
              
              {regulation.sostenibilidad_ambiental && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Sostenibilidad Ambiental</h4>
                  <p className="text-sm text-foreground whitespace-pre-line">{regulation.sostenibilidad_ambiental}</p>
                </div>
              )}
              
              {regulation.cambio_climatico && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Cambio Climático</h4>
                  <p className="text-sm text-foreground whitespace-pre-line">{regulation.cambio_climatico}</p>
                </div>
              )}
              
              {regulation.gobernanza_urbana && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Gobernanza Urbana</h4>
                  <p className="text-sm text-foreground whitespace-pre-line">{regulation.gobernanza_urbana}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegulationDetail; 