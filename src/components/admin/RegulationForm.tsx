import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { Regulation } from '../../context/RegulationsContext';
import autonomiasData from '../../data/autonomias.json';
import provinciasData from '../../data/provincias.json';
import municipiosData from '../../data/municipios.json';

type FormMode = 'create' | 'edit';

// Define types for the location data
type Autonomia = {
  autonomia_id: string;
  nombre: string;
};

type Provincia = {
  provincia_id: string;
  nombre: string;
  comunidad_id: string;
};

type Municipio = {
  municipio_id: string;
  nombre: string;
  provincia_id: string;
};

const RegulationForm: React.FC<{ mode: FormMode }> = ({ mode }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showAutocompletarMessage, setShowAutocompletarMessage] = useState(false);
  const [formData, setFormData] = useState<Partial<Regulation>>({
    titulo: '',
    escala_normativa: '',
    ambito: '',
    ccaa: '',
    provincia: '',
    ciudad: '',
    url: '',
    sostenibilidad_economica: '',
    sostenibilidad_social: '',
    sostenibilidad_ambiental: '',
    cambio_climatico: '',
    gobernanza_urbana: ''
  });
  
  // State for location selections
  const [filteredProvincias, setFilteredProvincias] = useState<Provincia[]>([]);
  const [filteredMunicipios, setFilteredMunicipios] = useState<Municipio[]>([]);
  const [dbSchema, setDbSchema] = useState<any>(null);

  // On component mount, fetch database schema to debug column names
  useEffect(() => {
    const inspectDatabaseSchema = async () => {
      try {
        // First, fetch a sample record to see the actual structure
        const { data: sampleRecord, error: sampleError } = await supabase
          .from('registros')
          .select('*')
          .limit(1)
          .single();
        
        if (sampleError) {
          console.error('Error fetching sample record:', sampleError);
        } else {
          setDbSchema(sampleRecord);
        }
        
      } catch (err) {
        console.error('Error inspecting database schema:', err);
      }
    };
    
    inspectDatabaseSchema();
  }, []);

  useEffect(() => {
    if (mode === 'edit' && id) {
      fetchRegulation(id);
    }
  }, [mode, id]);

  // Clear success message after 3 seconds
  useEffect(() => {
    let timer: number | undefined;
    if (successMessage) {
      timer = window.setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [successMessage]);

  // Effect to update province list when CCAA changes
  useEffect(() => {
    if (formData.ccaa) {
      // Find the autonomia ID based on the name
      const selectedAutonomia = autonomiasData.find((a: Autonomia) => a.nombre === formData.ccaa);
      
      if (selectedAutonomia) {        
        const provinciasList = provinciasData.filter(
          (p: Provincia) => p.comunidad_id === selectedAutonomia.autonomia_id
        );
        setFilteredProvincias(provinciasList);
      } else {
        setFilteredProvincias([]);
      }
    } else {
      setFilteredProvincias([]);
    }
  }, [formData.ccaa]);

  // Effect to update municipality list when province changes
  useEffect(() => {
    if (formData.provincia) {
      // Find the provincia ID based on the name
      const selectedProvincia = provinciasData.find((p: Provincia) => p.nombre === formData.provincia);
		
      if (selectedProvincia) {
        // Filter municipalities that belong to the selected provincia
        
        const municipiosList = municipiosData.filter(
          (m: Municipio) => m.provincia_id === selectedProvincia.provincia_id
        );
        setFilteredMunicipios(municipiosList);
      } else {
        setFilteredMunicipios([]);
      }
    } else {
      setFilteredMunicipios([]);
    }
  }, [formData.provincia]);

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

      if (data) {        
        // Map database fields to form fields, handling the CCAA case difference
        const formattedData = {
          ...data,
          ccaa: data.CCAA || '', // Map uppercase CCAA from DB to lowercase ccaa in form
        };
        
        setFormData(formattedData);
        
        // Initialize filtered provinces based on the selected CCAA
        if (formattedData.ccaa) {
          const selectedAutonomia = autonomiasData.find((a: Autonomia) => a.nombre === formattedData.ccaa);
          if (selectedAutonomia) {
            const provinciasList = provinciasData.filter(
              (p: Provincia) => p.comunidad_id === selectedAutonomia.autonomia_id
            );
            setFilteredProvincias(provinciasList);
            
            // Initialize filtered municipalities based on the selected province
            if (formattedData.provincia) {
              const selectedProvincia = provinciasList.find((p: Provincia) => p.nombre === formattedData.provincia);
              if (selectedProvincia) {
                const municipiosList = municipiosData.filter(
                  (m: Municipio) => m.provincia_id === selectedProvincia.provincia_id
                );
                setFilteredMunicipios(municipiosList);
              }
            }
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch regulation');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Clear dependent fields when parent field changes
    if (name === 'ccaa') {
      setFormData(prev => ({ ...prev, [name]: value, provincia: '', ciudad: '' }));
    } else if (name === 'provincia') {
      setFormData(prev => ({ ...prev, [name]: value, ciudad: '' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAutocompletar = () => {
    setShowAutocompletarMessage(true);
    // Hide message after 3 seconds
    setTimeout(() => {
      setShowAutocompletarMessage(false);
    }, 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (mode === 'create') {
        // For create mode, create a new object with only the fields we want to submit
        // Explicitly excluding any id field and lowercase ccaa
        const { 
          id, // Excluded from newRecordData
          ccaa, // Exclude lowercase ccaa
          ...fieldsToSubmit 
        } = formData;
        
        const newRecordData = {
          ...fieldsToSubmit,
          // Add uppercase CCAA only
          CCAA: formData.ccaa || '',
          created_at: new Date().toISOString()
        };
                
        // Try a different approach - first get the max ID
        const { data: maxIdResult } = await supabase
          .from('registros')
          .select('id')
          .order('id', { ascending: false })
          .limit(1)
          .single();
        
        const nextId = maxIdResult ? maxIdResult.id + 1 : 1;
        
        // Now insert with the explicit ID
        const { data, error } = await supabase
          .from('registros')
          .insert([{ ...newRecordData, id: nextId }]);
        
        if (error) {
          console.error('Insert error details:', error);
          throw error;
        }
        
        setSuccessMessage('Entrada guardada correctamente');
        
        // Navigate after a short delay so the user can see the success message
        setTimeout(() => {
          navigate('/admin/regulations');
        }, 1500);
      } else if (mode === 'edit' && id) {
        // For edit mode, ensure we're using the correct case for columns
        const { 
          id: recordId,
          ccaa, // Exclude lowercase ccaa 
          ...fieldsToUpdate 
        } = formData;
        
        const updateData = {
          ...fieldsToUpdate,
          // Use uppercase CCAA
          CCAA: formData.ccaa || ''
        };
        
        console.log('Updating record with ID:', id, 'Data:', updateData);
        
        const { data, error } = await supabase
          .from('registros')
          .update(updateData)
          .eq('id', id);

        if (error) {
          console.error('Update error details:', error);
          throw error;
        }
        
        console.log('Update response:', data);
        setSuccessMessage('Entrada actualizada correctamente');
        
        // Navigate after a short delay so the user can see the success message
        setTimeout(() => {
          navigate('/admin/regulations');
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save regulation');
      console.error('Error saving regulation:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-foreground">
          {mode === 'create' ? 'Agregar Nueva Entrada' : 'Editar Entrada'}
        </h1>
      </div>

      {error && (
        <div className="p-4 bg-error/10 border border-error text-error rounded-md">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-success/10 border border-success text-success rounded-md">
          {successMessage}
        </div>
      )}

      {showAutocompletarMessage && (
        <div className="p-4 bg-info/10 border border-info text-info rounded-md">
          Esta función aún no está implementada.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 bg-card p-6 rounded-lg shadow-sm border border-border">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="titulo" className="block text-sm font-medium text-foreground">
              Título <span className="text-error">*</span>
            </label>
            <input
              type="text"
              id="titulo"
              name="titulo"
              required
              value={formData.titulo || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white text-black"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="escala_normativa" className="block text-sm font-medium text-foreground">
              Escala Normativa <span className="text-error">*</span>
            </label>
            <select
              id="escala_normativa"
              name="escala_normativa"
              required
              value={formData.escala_normativa || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white text-black"
            >
              <option value="">Seleccionar escala</option>
              <option value="DOC_UE">Documento UE</option>
              <option value="REG_UE">Reglamento UE</option>
              <option value="DIR_UE">Directiva UE</option>
              <option value="UNE_ISO">Norma ISO</option>
              <option value="DOC_NA">Documento Nacional</option>
              <option value="LEY_EST">Ley Estatal</option>
              <option value="REG_EST">Reglamento Estatal</option>
              <option value="LEY_CCAA">Ley CCAA</option>
              <option value="REG_CCAA">Reglamento CCAA</option>
              <option value="PLAN_TER">Plan Territorial</option>
              <option value="PLAN_URB">Plan Urbano</option>
              <option value="WHITE_PAPER">White Paper</option>
              <option value="NOTICIA">Noticia</option>
              <option value="DECISION">Decisión</option>
              <option value="INST_AGREE">Acuerdo Institucional</option>
              <option value="OTROS">Otros</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="ambito" className="block text-sm font-medium text-foreground">
              Ámbito territorial <span className="text-error">*</span>
            </label>
            <select
              id="ambito"
              name="ambito"
              required
              value={formData.ambito || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white text-black"
            >
              <option value="">Seleccionar ámbito</option>
              <option value="COM">Comunitario</option>
              <option value="EST">Estatal</option>
              <option value="CCAA">Autonómico</option>
              <option value="MUN">Municipal</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="ccaa" className="block text-sm font-medium text-foreground">
              Comunidad Autónoma
            </label>
            <select
              id="ccaa"
              name="ccaa"
              value={formData.ccaa || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white text-black"
            >
              <option value="">Seleccionar comunidad autónoma</option>
              {autonomiasData && autonomiasData.map((ccaa: Autonomia) => (
                <option key={ccaa.autonomia_id} value={ccaa.nombre}>
                  {ccaa.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="provincia" className="block text-sm font-medium text-foreground">
              Provincia
            </label>
            <select
              id="provincia"
              name="provincia"
              value={formData.provincia || ''}
              onChange={handleChange}
              disabled={!formData.ccaa}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white text-black disabled:opacity-50"
            >
              <option value="">Seleccionar provincia</option>
              {filteredProvincias && filteredProvincias.map((provincia: Provincia) => (
                <option key={provincia.provincia_id} value={provincia.nombre}>
                  {provincia.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="ciudad" className="block text-sm font-medium text-foreground">
              Ciudad/Municipio
            </label>
            <select
              id="ciudad"
              name="ciudad"
              value={formData.ciudad || ''}
              onChange={handleChange}
              disabled={!formData.provincia}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white text-black disabled:opacity-50"
            >
              <option value="">Seleccionar municipio</option>
              {filteredMunicipios && filteredMunicipios.map((municipio: Municipio) => (
                <option key={municipio.municipio_id} value={municipio.nombre}>
                  {municipio.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="url" className="block text-sm font-medium text-foreground">
              URL <span className="text-error">*</span>
            </label>
            <div className="flex space-x-2">
              <input
                type="url"
                id="url"
                name="url"
                required
                value={formData.url || ''}
                onChange={handleChange}
                className="flex-grow px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white text-black"
              />
              <button
                type="button"
                onClick={handleAutocompletar}
                disabled={!formData.url}
                className="px-3 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                title={!formData.url ? "Introduce una URL primero" : ""}
              >
                Autocompletar
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">Descriptores</h3>
          
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="sostenibilidad_economica" className="block text-sm font-medium text-foreground">
                Sostenibilidad Económica
              </label>
              <textarea
                id="sostenibilidad_economica"
                name="sostenibilidad_economica"
                rows={3}
                value={formData.sostenibilidad_economica || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white text-black"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="sostenibilidad_social" className="block text-sm font-medium text-foreground">
                Sostenibilidad Social
              </label>
              <textarea
                id="sostenibilidad_social"
                name="sostenibilidad_social"
                rows={3}
                value={formData.sostenibilidad_social || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white text-black"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="sostenibilidad_ambiental" className="block text-sm font-medium text-foreground">
                Sostenibilidad Ambiental
              </label>
              <textarea
                id="sostenibilidad_ambiental"
                name="sostenibilidad_ambiental"
                rows={3}
                value={formData.sostenibilidad_ambiental || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white text-black"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="cambio_climatico" className="block text-sm font-medium text-foreground">
                Cambio Climático
              </label>
              <textarea
                id="cambio_climatico"
                name="cambio_climatico"
                rows={3}
                value={formData.cambio_climatico || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white text-black"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="gobernanza_urbana" className="block text-sm font-medium text-foreground">
                Gobernanza Urbana
              </label>
              <textarea
                id="gobernanza_urbana"
                name="gobernanza_urbana"
                rows={3}
                value={formData.gobernanza_urbana || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white text-black"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/admin/regulations')}
            className="px-4 py-2 border border-border rounded-md text-foreground hover:bg-muted"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {isSaving ? 'Guardando...' : mode === 'create' ? 'Crear Entrada' : 'Actualizar Entrada'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RegulationForm; 