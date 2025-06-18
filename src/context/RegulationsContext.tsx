import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from 'react';
import { fetchRegulations, fetchRegulationById, testConnection, getRegulationsCount, fetchPaginatedRegulations } from '../services/api';

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
  disponible: boolean;
  resumen: string;
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
  totalCount: number;
  currentPage: number;
  hasMore: boolean;
  selectRegulation: (id: string) => void;
  clearSelectedRegulation: () => void;
  updateFilters: (section: string, option: string, clear?: boolean) => void;
  searchRegulations: (query: string) => void;
  clearSearchQuery: () => void;
  resetFilters: () => void;
  forceResetRegulations: () => void;
  applyFilters: (locationFilter?: {ccaa?: string, provincia?: string, municipio?: string}) => void;
  loadNextPage: () => void;
  loadPage: (page: number) => void;
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
  
  // Pagination state
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [pageSize] = useState(60); // Load 5 pages worth of data (12 * 5)
  
  // Track if data has been loaded
  const dataLoaded = useRef(false);
  const loadingAllData = useRef(false);

  // Test connection and fetch initial data when component mounts
  useEffect(() => {
    const initialize = async () => {
      if (dataLoaded.current) {
        console.log('Metadata already loaded, skipping initialization');
        return; // Prevent multiple loads
      }
      
      console.log('Initializing RegulationsContext and loading initial data');
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
        
        // First, get the total count
        const count = await getRegulationsCount();
        setTotalCount(count);
        
        if (count === 0) {
          console.warn('No regulations found in the database');
          setError('No se encontraron datos en la base de datos.');
          setHasMore(false);
        } else {
          // Then fetch first page(s) of data
          const initialData = await fetchPaginatedRegulations(1, pageSize);
          
          setRegulations(initialData);
          setAllRegulations(initialData); // Cache initial regulations
          dataLoaded.current = true;
          console.log('Initial data loaded successfully, total count:', count);
          setError(null);
          setHasMore(initialData.length < count);
          
          // Load all remaining data in the background without blocking UI
          if (initialData.length < count) {
            loadAllRemainingData();
          }
        }
      } catch (err) {
        console.error('Error during initialization:', err);
        setError('Error al cargar los datos. Por favor, inténtelo de nuevo más tarde.');
      } finally {
        setIsLoading(false);
      }
    };
    
    initialize();
  }, [pageSize]);

  // Load all remaining data in background
  const loadAllRemainingData = useCallback(async () => {
    if (loadingAllData.current) {
      console.log('Already loading all data in background');
      return;
    }
    
    loadingAllData.current = true;
    console.log('Starting background load of all remaining data');
    
    try {
      let allLoaded = false;
      let currentPage = 2; // Start from second batch since first batch is already loaded
      
      while (!allLoaded) {
        console.log(`Loading batch ${currentPage} in background`);
        const batchData = await fetchPaginatedRegulations(currentPage, pageSize);
        
        if (batchData.length === 0) {
          allLoaded = true;
          console.log('All data loaded successfully in background');
        } else {
          // Merge with existing data, avoiding duplicates
          const existingIds = new Set(allRegulations.map(reg => reg.id));
          const uniqueNewData = batchData.filter(reg => !existingIds.has(reg.id));
          
          setAllRegulations(prevData => {
            const updatedData = [...prevData, ...uniqueNewData];
            
            // If no filters active, also update the displayed regulations
            if (!filterActive && !searchQuery) {
              setRegulations(updatedData);
            }
            
            return updatedData;
          });
          
          currentPage++;
        }
      }
      
      // Once all data is loaded, set hasMore to false
      setHasMore(false);
      console.log('Background loading complete, all data loaded');
    } catch (err) {
      console.error('Error loading all data in background:', err);
      // Don't set error in UI since this is background loading
    } finally {
      loadingAllData.current = false;
    }
  }, [pageSize, allRegulations, filterActive, searchQuery]);

  // Load more data function
  const loadNextPage = useCallback(async () => {
    if (!hasMore || isLoading) return;
    
    setIsLoading(true);
    
    try {
      const nextPage = Math.ceil(allRegulations.length / pageSize) + 1;
      const newData = await fetchPaginatedRegulations(nextPage, pageSize);
      
      if (newData.length === 0) {
        setHasMore(false);
      } else {
        // Append new data to existing data
        const updatedAllRegulations = [...allRegulations, ...newData];
        setAllRegulations(updatedAllRegulations);
        
        // Update current regulations based on filtering
        if (!filterActive && !searchQuery) {
          setRegulations(updatedAllRegulations);
        } else {
          // If filters are active, we need to reapply them with the new data
          applyFilters();
        }
        
        // Check if we have all the data
        setHasMore(updatedAllRegulations.length < totalCount);
      }
    } catch (err) {
      console.error('Error loading more data:', err);
      setError('Error al cargar más datos. Por favor, inténtelo de nuevo más tarde.');
    } finally {
      setIsLoading(false);
    }
  }, [hasMore, isLoading, allRegulations, pageSize, filterActive, searchQuery, totalCount]);

  // Load a specific page (modified to check if we're already loading all data)
  const loadPage = useCallback(async (page: number) => {
    if (isLoading || loadingAllData.current) return;
    
    setIsLoading(true);
    setCurrentPage(page);
    
    try {
      // Calculate if we already have this page data
      const startIndex = (page - 1) * (pageSize / 5); // Assuming pageSize is 5x the display size
      const endIndex = startIndex + (pageSize / 5);
      
      // If we already have this page in our cached data
      if (allRegulations.length >= endIndex) {
        console.log('Page already loaded, using cached data');
        setIsLoading(false);
        return;
      }
      
      // Otherwise, fetch this page and following pages
      const data = await fetchPaginatedRegulations(page, pageSize);
      
      if (data.length === 0) {
        setHasMore(false);
      } else {
        // Merge with existing data, avoiding duplicates
        const existingIds = new Set(allRegulations.map(reg => reg.id));
        const uniqueNewData = data.filter(reg => !existingIds.has(reg.id));
        
        const updatedAllRegulations = [...allRegulations, ...uniqueNewData];
        setAllRegulations(updatedAllRegulations);
        
        // Update current regulations based on filtering
        if (!filterActive && !searchQuery) {
          setRegulations(updatedAllRegulations);
        } else {
          // If filters are active, we need to reapply them with the new data
          applyFilters();
        }
        
        // Check if we have all the data
        setHasMore(updatedAllRegulations.length < totalCount);
      }
    } catch (err) {
      console.error('Error loading page:', err);
      setError('Error al cargar la página. Por favor, inténtelo de nuevo más tarde.');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, allRegulations, pageSize, filterActive, searchQuery, totalCount]);

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
        setTotalCount(allRegulations.length); // Reset total count to all regulations
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
        setTotalCount(filtered.length); // Update total count to match filtered results
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
    setTotalCount(allRegulations.length); // Reset total count
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
    
    // 5. Reset total count to match all regulations
    setTotalCount(allRegulations.length);
    
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
        setTotalCount(allRegulations.length); // Reset to total count
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
          // Check if ALL selected ambito filters match
          return filters.ambito.every(filter => {
            switch (filter) {
              case 'economic':
                return safeGetValue(reg, 'sostenibilidad_economica') !== '';
              case 'environmental':
                return safeGetValue(reg, 'sostenibilidad_ambiental') !== '';
              case 'climate':
                return safeGetValue(reg, 'cambio_climatico') !== '';
              case 'social':
                return safeGetValue(reg, 'sostenibilidad_social') !== '';
              case 'urban':
                return safeGetValue(reg, 'gobernanza_urbana') !== '';
              default:
                return false;
            }
          });
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
      // Update totalCount to reflect the number of filtered results
      setTotalCount(filteredResults.length);
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
  }, [allRegulations, filters, searchQuery]);

  // Add a new force reset function
  const forceResetRegulations = useCallback(() => {
    if (allRegulations.length > 0) {
      // Force update by creating a new array reference
      setRegulations([...allRegulations]);
      setTotalCount(allRegulations.length); // Reset total count
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
        error,
        totalCount,
        currentPage,
        hasMore,
        loadNextPage,
        loadPage
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