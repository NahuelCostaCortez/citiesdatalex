import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { fetchRegulations, fetchRegulationById, testConnection } from '../services/api';

export interface Regulation {
  id: string;
  titulo: string;
  escala_normativa: string;
  ambito: string;
  ccaa: string;
  provincia: string;
  ciudad: string;
  url: string;
  sostenibilidad_economica: string;
  sostenibilidad_social: string;
  sostenibilidad_ambiental: string;
  cambio_climatico: string;
  gobernanza_urbana: string;
  date: string;
}

type Filters = {
  [key: string]: string[];
};

interface RegulationsContextType {
  regulations: Regulation[];
  selectedRegulation: Regulation | null;
  filters: Filters;
  filterActive: boolean;
  isLoading: boolean;
  error: string | null;
  selectRegulation: (id: string) => void;
  clearSelectedRegulation: () => void;
  updateFilters: (section: string, option: string, clear?: boolean) => void;
  searchRegulations: (query: string) => void;
  applyFilters: (locationFilter?: {ccaa?: string, provincia?: string, municipio?: string}) => void;
}

const RegulationsContext = createContext<RegulationsContextType | undefined>(undefined);

export const RegulationsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegulation, setSelectedRegulation] = useState<Regulation | null>(null);
  const [filters, setFilters] = useState<Filters>({
    ambito: [],
    ciudad: [],
    scale: [],
    territorial: [],
  });
  const [filterActive, setFilterActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Test connection and fetch regulations when component mounts
  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Test connection first
        const connectionSuccess = await testConnection();
        
        if (!connectionSuccess) {
          setError('No se pudo conectar a la base de datos. Por favor, inténtelo de nuevo más tarde.');
          setIsLoading(false);
          return;
        }
        
        // Then fetch regulations
        const data = await fetchRegulations();
        setRegulations(data);
      } catch (err) {
        setError('Error al cargar los datos. Por favor, inténtelo de nuevo más tarde.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    
    initialize();
  }, []);

  const selectRegulation = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const regulation = await fetchRegulationById(id);
      setSelectedRegulation(regulation);
    } catch (err) {
      setError('Error al cargar los detalles. Por favor, inténtelo de nuevo más tarde.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearSelectedRegulation = useCallback(() => {
    setSelectedRegulation(null);
  }, []);

  const updateFilters = useCallback((section: string, option: string, clear: boolean = false) => {
    setFilters(prevFilters => {
      // If clear is true, empty the section
      if (clear) {
        return { ...prevFilters, [section]: [] };
      }
      
      // If the option is already in the filter, remove it
      if (prevFilters[section].includes(option)) {
        return {
          ...prevFilters,
          [section]: prevFilters[section].filter(item => item !== option),
        };
      }
      
      // Otherwise, add it
      return {
        ...prevFilters,
        [section]: [...prevFilters[section], option],
      };
    });
    
    // Update filter active state
    const hasActiveFilters = (newFilters: Filters) => {
      return Object.values(newFilters).some(section => section.length > 0);
    };
    
    setFilters(currentFilters => {
      setFilterActive(hasActiveFilters(currentFilters));
      return currentFilters;
    });
  }, []);

  const searchRegulations = useCallback((query: string) => {
    setSearchQuery(query);
    
    if (!query) {
      // Reset to fetch all regulations if needed
      fetchRegulations()
        .then(data => setRegulations(data))
        .catch(err => {
          setError('Error al restablecer los datos. Por favor, inténtelo de nuevo más tarde.');
          console.error(err);
        });
      return;
    }
    
    const filtered = regulations.filter(reg => 
      reg.titulo.toLowerCase().includes(query.toLowerCase()) ||
      reg.ciudad.toLowerCase().includes(query.toLowerCase()) ||
      reg.ambito.toLowerCase().includes(query.toLowerCase())
    );
    
    setRegulations(filtered);
  }, [regulations]);

  const applyFilters = useCallback((locationFilter?: {ccaa?: string, provincia?: string, municipio?: string}) => {
    // Fetch fresh data first to ensure we're working with complete dataset
    fetchRegulations()
      .then(data => {
        let filteredResults = [...data];
        
        // Filter by search query if active
        if (searchQuery) {
          filteredResults = filteredResults.filter(reg => 
            reg.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
            reg.ciudad.toLowerCase().includes(searchQuery.toLowerCase()) ||
            reg.ambito.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }
        
        // Apply section filters
        if (filters.ambito.length > 0) {
          filteredResults = filteredResults.filter(reg => {
            // Check if any of the ambito filters match
            if (filters.ambito.includes('economic') && reg.sostenibilidad_economica) return true;
            if (filters.ambito.includes('environmental') && reg.sostenibilidad_ambiental) return true;
            if (filters.ambito.includes('climate') && reg.cambio_climatico) return true;
            if (filters.ambito.includes('social') && reg.sostenibilidad_social) return true;
            if (filters.ambito.includes('urban') && reg.gobernanza_urbana) return true;
            
            return false;
          });
        }
        
        // Apply scale filters (escala normativa)
        if (filters.scale.length > 0) {
          filteredResults = filteredResults.filter(reg => 
            filters.scale.includes(reg.escala_normativa)
          );
        }
        
        // Apply territorial filters
        if (filters.territorial.length > 0) {
          filteredResults = filteredResults.filter(reg => {
            if (filters.territorial.includes('comunitario')) return true;
            if (filters.territorial.includes('estatal')) return true;
            if (filters.territorial.includes('autonomico') && reg.ccaa) return true;
            if (filters.territorial.includes('provincial') && reg.provincia) return true;
            if (filters.territorial.includes('municipal') && reg.ciudad) return true;
            
            return false;
          });
        }
        
        // Apply location filters
        if (locationFilter) {
          if (locationFilter.ccaa) {
            filteredResults = filteredResults.filter(reg => 
              reg.ccaa.toLowerCase() === locationFilter.ccaa?.toLowerCase()
            );
          }
          
          if (locationFilter.provincia) {
            filteredResults = filteredResults.filter(reg => 
              reg.provincia.toLowerCase() === locationFilter.provincia?.toLowerCase()
            );
          }
          
          if (locationFilter.municipio) {
            filteredResults = filteredResults.filter(reg => 
              reg.ciudad.toLowerCase() === locationFilter.municipio?.toLowerCase()
            );
          }
        }
        
        setRegulations(filteredResults);
        setFilterActive(
          Boolean(filters.ambito.length > 0 || 
          filters.scale.length > 0 || 
          filters.territorial.length > 0 || 
          (locationFilter && (locationFilter.ccaa || locationFilter.provincia || locationFilter.municipio)))
        );
      })
      .catch(err => {
        setError('Error al aplicar los filtros. Por favor, inténtelo de nuevo más tarde.');
        console.error(err);
      });
  }, [filters, searchQuery]);

  return (
    <RegulationsContext.Provider
      value={{
        regulations,
        selectedRegulation,
        filters,
        filterActive,
        selectRegulation,
        clearSelectedRegulation,
        updateFilters,
        searchRegulations,
        applyFilters,
        isLoading,
        error
      }}
    >
      {children}
    </RegulationsContext.Provider>
  );
};

export const useRegulations = () => {
  const context = useContext(RegulationsContext);
  if (context === undefined) {
    throw new Error('useRegulations must be used within a RegulationsProvider');
  }
  return context;
};