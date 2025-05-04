import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRegulations } from '../context/RegulationsContext';
import { BarChart3, CalendarDays, FileSymlink, MapPin, Filter, ArrowDownUp, ChevronLeft, ChevronRight, AlertCircle, Loader2 } from 'lucide-react';
import { getAmbitoDescription, getEscalaNormativaDescription } from '../utils/lookupUtils';

interface RegulationWithLabels {
  id: string;
  escala_normativa: string;
  escala_normativa_label?: string;
  ambito: string;
  ambito_label?: string;
  [key: string]: any;
}

const ITEMS_PER_PAGE = 12;

const RegulationsPanel: React.FC = () => {
  const { regulations, selectRegulation, filterActive, isLoading, error } = useRegulations();
  const [sortOption, setSortOption] = useState('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [regulationsWithLabels, setRegulationsWithLabels] = useState<RegulationWithLabels[]>([]);
  const [labelsLoading, setLabelsLoading] = useState(false);

  // Load descriptive labels for regulations
  useEffect(() => {
    if (regulations.length > 0) {
      setLabelsLoading(true);
      
      const loadLabels = async () => {
        const updatedRegulations = await Promise.all(
          regulations.map(async (reg) => {
            const regulationWithLabels = { ...reg } as RegulationWithLabels;
            
            try {
              if (reg.ambito) {
                regulationWithLabels.ambito_label = await getAmbitoDescription(reg.ambito);
              }
              
              if (reg.escala_normativa) {
                regulationWithLabels.escala_normativa_label = await getEscalaNormativaDescription(reg.escala_normativa);
              }
            } catch (error) {
              console.error('Error loading labels:', error);
            }
            
            return regulationWithLabels;
          })
        );
        
        setRegulationsWithLabels(updatedRegulations);
        setLabelsLoading(false);
      };
      
      loadLabels();
    } else {
      setRegulationsWithLabels([]);
    }
  }, [regulations]);

  // Sort regulations based on selected option
  const sortedRegulations = useMemo(() => {
    const regulationsCopy = [...regulationsWithLabels];
    
    switch (sortOption) {
      case 'recent':
        return regulationsCopy.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      case 'oldest':
        return regulationsCopy.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      case 'name a-z':
        return regulationsCopy.sort((a, b) => a.titulo.localeCompare(b.titulo));
      default:
        return regulationsCopy;
    }
  }, [regulationsWithLabels, sortOption]);

  // Calculate pagination values
  const totalPages = Math.ceil(sortedRegulations.length / ITEMS_PER_PAGE);
  const currentPageItems = sortedRegulations.slice(
    (currentPage - 1) * ITEMS_PER_PAGE, 
    currentPage * ITEMS_PER_PAGE
  );
  
  // Handle page navigation
  const goToPage = (page: number) => {
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    setCurrentPage(page);
  };
  
  // Calculate the range of items being displayed
  const startItem = Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, sortedRegulations.length);
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, sortedRegulations.length);

  // Debug logging for pagination issue
  useEffect(() => {
    // Check for duplicate IDs
    const ids = sortedRegulations.map(reg => reg.id);
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      console.warn("Duplicate regulation IDs found:", duplicateIds);
    }
  }, [currentPageItems, sortedRegulations, currentPage]);

  return (
    <div className="glass-panel flex flex-col h-full overflow-hidden w-full">
      <div className="p-4 border-b border-border/50">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Resultados</h2>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center">
              {filterActive ? (
                <span className="flex items-center"><Filter size={12} className="mr-1 text-primary" /> {regulations.length} resultados encontrados</span>
              ) : (
                <span>{regulations.length} resultados encontrados</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <motion.button
                className="p-1.5 rounded-md bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center text-xs"
                whileTap={{ scale: 0.95 }}
                onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
              >
                <ArrowDownUp size={14} className="mr-1" />
                <span>Sort</span>
              </motion.button>
              
              <AnimatePresence>
                {sortDropdownOpen && (
                  <motion.div
                    className="absolute right-0 top-full mt-1 glass-panel p-1 z-10 min-w-32"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                  >
                    {['Recent', 'Oldest', 'Relevance', 'Name A-Z'].map((option) => (
                      <button
                        key={option}
                        className="block w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted"
                        onClick={() => {
                          setSortOption(option.toLowerCase());
                          setSortDropdownOpen(false);
                        }}
                      >
                        {option}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex bg-muted/50 rounded-md p-0.5">
              <button
                className={`p-1 rounded ${viewMode === 'grid' ? 'bg-secondary text-primary' : 'text-muted-foreground'}`}
                onClick={() => setViewMode('grid')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
                  <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
                  <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
                  <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
                </svg>
              </button>
              <button
                className={`p-1 rounded ${viewMode === 'list' ? 'bg-secondary text-primary' : 'text-muted-foreground'}`}
                onClick={() => setViewMode('list')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 6H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M8 12H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M8 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M3 6H3.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M3 12H3.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M3 18H3.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto scrollbar-thin">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
            <p className="text-sm text-muted-foreground">Cargando normativas...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full">
            <AlertCircle className="w-8 h-8 text-destructive mb-2" />
            <p className="text-sm text-destructive">{error}</p>
            <button 
              className="mt-4 px-4 py-2 bg-muted hover:bg-muted/80 text-sm rounded-md"
              onClick={() => window.location.reload()}
            >
              Intentar de nuevo
            </button>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-3'}>
            <AnimatePresence>
              {currentPageItems.map((regulation, i) => (
                <motion.article
                  key={`${regulation.id}-${i}`}
                  className={`glass-surface cursor-pointer group hover:border-primary/50 transition-all duration-300 ${
                    viewMode === 'grid' ? 'p-4' : 'p-3 flex items-start'
                  }`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => selectRegulation(regulation.id)}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {viewMode === 'grid' ? (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <span className="text-xs text-muted-foreground">
                            {regulation.ambito_label || regulation.ambito}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">
                          {regulation.escala_normativa_label || regulation.escala_normativa}
                        </span>
                      </div>
                      
                      <h3 className="font-medium mb-2 group-hover:text-primary transition-colors line-clamp-2">{regulation.titulo}</h3>
                      
                      {(regulation.ciudad || regulation.ccaa || regulation.provincia) && (
                        <div className="flex items-center text-xs text-muted-foreground mb-3">
                          <MapPin size={12} className="mr-1" />
                          <span>
                            {[
                              regulation.ccaa, 
                              regulation.provincia, 
                              regulation.ciudad
                            ].filter(Boolean).join(', ')}
                          </span>
                        </div>
                      )}
                      
                      {/* Tags for sustainability and governance */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {regulation.sostenibilidad_ambiental && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-100/50 text-emerald-700">
                            Sost. Ambiental
                          </span>
                        )}
                        {regulation.cambio_climatico && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100/50 text-blue-700">
                            Cambio Climático
                          </span>
                        )}
                        {regulation.sostenibilidad_social && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100/50 text-amber-700">
                            Sost. Social
                          </span>
                        )}
                        {regulation.gobernanza_urbana && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100/50 text-purple-700">
                            Gobernanza
                          </span>
                        )}
                      </div>
                      
                      <div className="flex justify-between text-xs mt-auto">
                        {regulation.date ? (
                          <div className="flex items-center text-muted-foreground">
                            <CalendarDays size={12} className="mr-1" />
                            <span>{regulation.date}</span>
                          </div>
                        ) : (
                          <div></div> 
                        )}
                        
                        <span className="text-primary/80 group-hover:text-primary transition-colors">View detalles</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex-shrink-0 w-10 h-10 rounded bg-muted flex items-center justify-center mr-3">
                        <FileSymlink className="text-primary/80" size={18} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">
                            {regulation.escala_normativa_label || regulation.escala_normativa}
                          </span>
                          {regulation.date && (
                            <span className="text-xs text-muted-foreground">{regulation.date}</span>
                          )}
                        </div>
                        
                        <h3 className="font-medium mb-1 group-hover:text-primary transition-colors line-clamp-1">{regulation.titulo}</h3>
                        
                        <div className="flex flex-wrap items-center gap-1 mb-1">
                          {(regulation.ciudad || regulation.ccaa || regulation.provincia) && (
                            <>
                              <MapPin size={12} className="text-muted-foreground" />
                              <span className="text-muted-foreground mr-2">
                                {[
                                  regulation.ccaa, 
                                  regulation.provincia, 
                                  regulation.ciudad
                                ].filter(Boolean).join(', ')}
                              </span>
                            </>
                          )}
                          
                          {/* Tags for sustainability and governance */}
                          {regulation.sostenibilidad_ambiental && (
                            <span className="px-1.5 py-0.5 text-xs rounded-full bg-emerald-100/50 text-emerald-700">
                              SA
                            </span>
                          )}
                          {regulation.cambio_climatico && (
                            <span className="px-1.5 py-0.5 text-xs rounded-full bg-blue-100/50 text-blue-700">
                              CC
                            </span>
                          )}
                          {regulation.sostenibilidad_social && (
                            <span className="px-1.5 py-0.5 text-xs rounded-full bg-amber-100/50 text-amber-700">
                              SS
                            </span>
                          )}
                          {regulation.gobernanza_urbana && (
                            <span className="px-1.5 py-0.5 text-xs rounded-full bg-purple-100/50 text-purple-700">
                              GU
                            </span>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </motion.article>
              ))}
            </AnimatePresence>
          </div>
        )}
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex justify-between items-center">
            <div className="text-xs text-muted-foreground">
              Mostrando {startItem} - {endItem} de {sortedRegulations.length} resultados
            </div>
            
            <div className="flex items-center space-x-1">
              <button
                className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:pointer-events-none"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={16} />
              </button>
              
              {/* Page numbers */}
              <div className="flex items-center">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  // Logic to show current page in the middle when possible
                  let pageNum = currentPage;
                  if (currentPage < 3) {
                    pageNum = i + 1;
                  } else if (currentPage > totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  // Ensure we're showing valid page numbers
                  if (pageNum > 0 && pageNum <= totalPages) {
                    return (
                      <button
                        key={pageNum}
                        className={`w-7 h-7 flex items-center justify-center rounded-md text-xs ${
                          pageNum === currentPage
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted text-muted-foreground'
                        }`}
                        onClick={() => goToPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                  return null;
                })}
              </div>
              
              <button
                className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:pointer-events-none"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegulationsPanel;