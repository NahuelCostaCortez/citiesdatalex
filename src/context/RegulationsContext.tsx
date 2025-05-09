import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from 'react';
import { fetchRegulations, fetchRegulationById, testConnection } from '../services/api';

// Helper function to safely access values with fallbacks
const safeGetValue = (obj: any, key: string, defaultValue: string = ''): string => {
  if (!obj) return defaultValue;
  const value = obj[key];
  if (value === null || value === undefined) return defaultValue;
  return String(value);
};

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
  clearSearchQuery: () => void;
  resetFilters: () => void;
  forceResetRegulations: () => void;
  applyFilters: (locationFilter?: {ccaa?: string, provincia?: string, municipio?: string}) => void;
}

const RegulationsContext = createContext<RegulationsContextType | undefined>(undefined);

export const RegulationsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [allRegulations, setAllRegulations] = useState<Regulation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
  
  // Track if data has been loaded
  const dataLoaded = useRef(false);

  // Test connection and fetch regulations when component mounts
  useEffect(() => {
    const initialize = async () => {
      if (dataLoaded.current) {
        console.log('Data already loaded, skipping initialization');
        return; // Prevent multiple loads
      }
      
      console.log('Initializing RegulationsContext and loading data');
      setIsLoading(true);
      setError(null);
      
      try {
        // Test connection first
        const connectionSuccess = await testConnection();
        
        if (!connectionSuccess) {
          console.error('Connection test failed');
          setError('No se pudo conectar a la base de datos. Por favor, inténtelo de nuevo más tarde.');
          setIsLoading(false);
          return;
        }
        
        // Then fetch regulations
        const data = await fetchRegulations();
        
        if (data.length === 0) {
          console.warn('No regulations found in the database');
          setError('No se encontraron datos en la base de datos.');
        } else {
          setRegulations(data);
          setAllRegulations(data); // Cache all regulations
          dataLoaded.current = true;
          console.log('Data loaded successfully');
          setError(null);
        }
      } catch (err) {
        console.error('Error during initialization:', err);
        setError('Error al cargar los datos. Por favor, inténtelo de nuevo más tarde.');
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
    // Only set loading state if we have data to work with
    if (allRegulations.length > 0) {
      setIsLoading(true);
    } else {
      setError('Esperando datos. Por favor, espere un momento.');
      return; // Don't proceed if we don't have data yet
    }
    
    setSearchQuery(query);
    
    try {
      // Use the cached allRegulations instead of fetching from API
      if (!query) {
        setRegulations(allRegulations);
      } else {
        const lowerQuery = query.toLowerCase();
        const filtered = allRegulations.filter(reg => {
          // Use safe value getter to handle null/undefined values
          const titulo = safeGetValue(reg, 'titulo').toLowerCase();
          const ciudad = safeGetValue(reg, 'ciudad').toLowerCase();
          const ambito = safeGetValue(reg, 'ambito').toLowerCase();
          
          return titulo.includes(lowerQuery) || 
                 ciudad.includes(lowerQuery) || 
                 ambito.includes(lowerQuery);
        });
        
        setRegulations(filtered);
      }
      // Clear any previous error
      setError(null);
    } catch (err) {
      console.error('Error filtering regulations:', err);
      setError('Error al filtrar los datos. Por favor, inténtelo de nuevo más tarde.');
    } finally {
      setIsLoading(false);
    }
  }, [allRegulations]);

  const clearSearchQuery = useCallback(() => {
    setSearchQuery('');
    // Reset to all regulations when search query is cleared
    setRegulations(allRegulations);
  }, [allRegulations]);

  const resetFilters = useCallback(() => {
    
    // First, ensure we have data to reset to
    if (allRegulations.length === 0) {
      return;
    }
    
    // 1. Explicitly clear all filters
    setFilters({
      ambito: [],
      ciudad: [],
      scale: [],
      territorial: [],
    });
    
    // 2. Clear any search query
    setSearchQuery('');
    
    // 3. Clear filter active flag
    setFilterActive(false);
    
    // 4. MOST IMPORTANT: Directly set the displayed regulations
    //    to ALL regulations without any filtering logic
    setRegulations(allRegulations);
    
  }, [allRegulations]);

  const applyFilters = useCallback((locationFilter?: {ccaa?: string, provincia?: string, municipio?: string}) => {
    // Only set loading state if we have data to work with
    if (allRegulations.length > 0) {
      setIsLoading(true);
    } else {
      setError('Esperando datos. Por favor, espere un momento.');
      return; // Don't proceed if we don't have data yet
    }
    
    try {
      // Check if any filters are active
      const anyFiltersActive = 
        searchQuery || 
        filters.ambito.length > 0 || 
        filters.scale.length > 0 || 
        filters.territorial.length > 0 || 
        (locationFilter && Object.keys(locationFilter).length > 0);
      
      // If no filters are active, immediately show all regulations
      if (!anyFiltersActive) {
        setRegulations(allRegulations);
        setFilterActive(false);
        setError(null);
        setIsLoading(false);
        return;
      }
      
      // Use the cached allRegulations instead of fetching from API
      let filteredResults = [...allRegulations];
      
      // Filter by search query if active
      if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase();
        filteredResults = filteredResults.filter(reg => {
          const titulo = safeGetValue(reg, 'titulo').toLowerCase();
          const ciudad = safeGetValue(reg, 'ciudad').toLowerCase();
          const ambito = safeGetValue(reg, 'ambito').toLowerCase();
          
          return titulo.includes(lowerQuery) || 
                 ciudad.includes(lowerQuery) || 
                 ambito.includes(lowerQuery);
        });
      }
      
      // Apply section filters
      if (filters.ambito.length > 0) {
        filteredResults = filteredResults.filter(reg => {
          // Check if any of the ambito filters match
          if (filters.ambito.includes('economic') && safeGetValue(reg, 'sostenibilidad_economica')) return true;
          if (filters.ambito.includes('environmental') && safeGetValue(reg, 'sostenibilidad_ambiental')) return true;
          if (filters.ambito.includes('climate') && safeGetValue(reg, 'cambio_climatico')) return true;
          if (filters.ambito.includes('social') && safeGetValue(reg, 'sostenibilidad_social')) return true;
          if (filters.ambito.includes('urban') && safeGetValue(reg, 'gobernanza_urbana')) return true;
          
          return false;
        });
      }
      
      // Apply scale filters (escala normativa)
      if (filters.scale.length > 0) {
        filteredResults = filteredResults.filter(reg => 
          filters.scale.includes(safeGetValue(reg, 'escala_normativa'))
        );
      }
      
      // Apply territorial filters
      if (filters.territorial.length > 0) {
        filteredResults = filteredResults.filter(reg => {
          const ambitoValue = safeGetValue(reg, 'ambito').toUpperCase();
          
          if (filters.territorial.includes('comunitario') && ambitoValue === 'COM') return true;
          if (filters.territorial.includes('estatal') && ambitoValue === 'EST') return true;
          if (filters.territorial.includes('autonomico') && ambitoValue === 'CCAA') return true;
          if (filters.territorial.includes('municipal') && ambitoValue === 'MUN') return true;
          
          return false;
        });
      }
      
      // Apply location filters
      if (locationFilter) {
        
        if (locationFilter.ccaa) {

          // Get the CCAA name by looking up the ID
          let ccaaName = locationFilter.ccaa;
          
          // First try a direct match (case insensitive)
          filteredResults = filteredResults.filter(reg => {
            const regCcaa = safeGetValue(reg, 'ccaa').toLowerCase().trim();
            const filterCcaa = ccaaName.toLowerCase().trim();
            
            const isMatch = regCcaa === filterCcaa;
            if (isMatch) {
              console.log('Found match for CCAA:', reg.ccaa, 'with filter:', ccaaName);
            }
            return isMatch;
          });
          
        }
        
        if (locationFilter.provincia) {
          const lowerProvincia = locationFilter.provincia.toLowerCase().trim();
          
          filteredResults = filteredResults.filter(reg => 
            safeGetValue(reg, 'provincia').toLowerCase().trim() === lowerProvincia
          );
        }
        
        if (locationFilter.municipio) {
          const lowerMunicipio = locationFilter.municipio.toLowerCase().trim();

          filteredResults = filteredResults.filter(reg => 
            safeGetValue(reg, 'ciudad').toLowerCase().trim() === lowerMunicipio
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
      
      // Clear any previous error
      setError(null);
    } catch (err) {
      console.error('Error applying filters:', err);
      setError('Error al aplicar los filtros. Por favor, inténtelo de nuevo más tarde.');
    } finally {
      setIsLoading(false);
    }
  }, [filters, searchQuery, allRegulations]);

  // Add a new force reset function
  const forceResetRegulations = useCallback(() => {
    if (allRegulations.length > 0) {
      // Force update by creating a new array reference
      setRegulations([...allRegulations]);
      console.log('FORCE RESET: Regulations have been force reset');
    } else {
      console.log('FORCE RESET: No data available in allRegulations');
    }
  }, [allRegulations]);

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
        clearSearchQuery,
        resetFilters,
        forceResetRegulations,
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