import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRegulations } from '../context/RegulationsContext';
import { BarChart3, CalendarDays, FileSymlink, MapPin, Filter, ArrowDownUp, ChevronLeft, ChevronRight, AlertCircle, Loader2, MessageCircle, X, Send, Lock, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import { getAmbitoDescription, getEscalaNormativaDescription } from '../utils/lookupUtils';

import { buildApiUrl, API_ENDPOINTS, getApiConfig, API_BASE_URL } from '../config/api';

interface RegulationWithLabels {
  id: string;
  escala_normativa: string;
  escala_normativa_label?: string;
  ambito: string;
  ambito_label?: string;
  [key: string]: any;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  queryType?: 'count' | 'display';
  documentIds?: string[];
  documents?: any[];
}

const ITEMS_PER_PAGE = 12;

// Function to query the database with natural language
async function queryDatabase(question: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/query-database/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question: question
      })
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error querying database:', error);
    throw error;
  }
}

// Function to login to chatbot
async function loginChatbot(email: string, password: string) {
  try {
    const loginData = { email, password };
    const url = buildApiUrl(API_ENDPOINTS.CHATBOT_LOGIN);
    const config = getApiConfig('POST', loginData);
    
    console.log('🔍 Chatbot Login Debug Info:');
    console.log('URL:', url);
    console.log('Request body:', loginData);
    
    const response = await fetch(url, config);
    const result = await response.json();
    
    console.log('Login response status:', response.status);
    console.log('Login response body:', result);
    
    if (!response.ok) {
      console.error(`❌ Login failed with status ${response.status}:`, result);
      return { success: false, message: result.message || 'Error de autenticación' };
    }
    
    return { success: true, message: result.message || 'Login exitoso' };
  } catch (error) {
    console.error('❌ Error during login:', error);
    return { success: false, message: 'Error de conexión' };
  }
}



const RegulationsPanel: React.FC = () => {
  const { 
    regulations, 
    selectRegulation, 
    filterActive, 
    isLoading, 
    error, 
    totalCount, 
    loadNextPage, 
    loadPage,
    hasMore
  } = useRegulations();
  
  const [sortOption, setSortOption] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [regulationsWithLabels, setRegulationsWithLabels] = useState<RegulationWithLabels[]>([]);
  const [labelsLoading, setLabelsLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isQueryLoading, setIsQueryLoading] = useState(false);
  
  // Login state for chat
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginStatus, setLoginStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [loginNotification, setLoginNotification] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Function to handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    
    setIsLoggingIn(true);
    setLoginNotification('Autenticando...');
    
    try {
      const result = await loginChatbot(email, password);
      
      if (result.success) {
        setLoginStatus('success');
        setLoginNotification('¡Autenticación exitosa!');
        setIsAuthenticated(true);
        setShowLoginForm(false);
        
        // Clear form
        setEmail('');
        setPassword('');
      } else {
        setLoginStatus('error');
        setLoginNotification(result.message || 'Error de autenticación');
      }
    } catch (error) {
      setLoginStatus('error');
      setLoginNotification('Error de conexión');
    } finally {
      setIsLoggingIn(false);
      // Clear notification after 5 seconds
      setTimeout(() => {
        setLoginNotification('');
        setLoginStatus('idle');
      }, 5000);
    }
  };

  // Function to handle sending a message
  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return;
    
    // Check if user is authenticated
    if (!isAuthenticated) {
      setShowLoginForm(true);
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: chatMessage.trim(),
      timestamp: new Date()
    };

    // Add user message to history
    setChatHistory(prev => [...prev, userMessage]);
    setChatMessage('');
    setIsQueryLoading(true);

    try {
      const result = await queryDatabase(userMessage.content);
      
      let documents: any[] = [];
      
              // If we have document IDs, filter from the already loaded regulations
        if (result.status === 'success' && result.query_type === 'display' && result.document_ids && result.document_ids.length > 0) {
          console.log('Query result:', result);
          console.log('Document IDs from result:', result.document_ids);
          console.log('Available regulations:', regulationsWithLabels.length);
          console.log('Sample regulation IDs:', regulationsWithLabels.slice(0, 3).map(r => ({ id: r.id, type: typeof r.id })));
          
          // Convert all IDs to strings for comparison
          const documentIdsAsString = result.document_ids.map((id: any) => String(id));
          
          documents = regulationsWithLabels.filter(reg => 
            documentIdsAsString.includes(String(reg.id))
          );
          
          console.log('Filtered documents:', documents.length);
          console.log('Found documents:', documents.map(d => ({ id: d.id, titulo: d.titulo })));
          
          // If no documents found in regulationsWithLabels, try with the base regulations array
          if (documents.length === 0 && regulations.length > 0) {
            console.log('Trying with base regulations array...');
            console.log('Base regulations sample:', regulations.slice(0, 3).map(r => ({ id: r.id, type: typeof r.id })));
            documents = regulations.filter(reg => 
              documentIdsAsString.includes(String(reg.id))
            );
            console.log('Filtered from base regulations:', documents.length);
          }
        }
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: result.status === 'success' ? result.answer : `Error: ${result.message || 'No se pudo procesar la consulta'}`,
        timestamp: new Date(),
        queryType: result.status === 'success' ? result.query_type : undefined,
        documentIds: result.status === 'success' ? result.document_ids : undefined,
        documents: documents
      };

      setChatHistory(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Lo siento, hubo un error al procesar tu consulta. Por favor, intenta de nuevo.',
        timestamp: new Date()
      };

      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsQueryLoading(false);
    }
  };

  // Reset login state when chat is closed
  useEffect(() => {
    if (!isChatOpen) {
      setShowLoginForm(false);
      setIsAuthenticated(false);
      setLoginStatus('idle');
      setLoginNotification('');
      setEmail('');
      setPassword('');
      setShowPassword(false);
    }
  }, [isChatOpen]);

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

  // Sort regulations based on selected option, but only if a sort option is selected
  const sortedRegulations = useMemo(() => {
    const regulationsCopy = [...regulationsWithLabels];
    
    // Only sort if user has explicitly selected a sort option
    if (!sortOption) {
      return regulationsCopy;
    }
    
    switch (sortOption) {
      case 'a-z':
        return regulationsCopy.sort((a, b) => a.titulo.localeCompare(b.titulo));
      case 'z-a':
        return regulationsCopy.sort((a, b) => b.titulo.localeCompare(a.titulo));
      default:
        return regulationsCopy;
    }
  }, [regulationsWithLabels, sortOption]);

  // Calculate pagination values
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
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
              {isLoading && regulations.length === 0 ? (
                <span className="flex items-center">
                  <Loader2 size={12} className="mr-1 animate-spin" /> Cargando...
                </span>
              ) : filterActive ? (
                <span className="flex items-center">
                  <Filter size={12} className="mr-1 text-primary" /> {totalCount} resultados encontrados
                </span>
              ) : (
                <>
                  <span>{totalCount} resultados encontrados</span>
                </>
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
                <span>Ordenar</span>
              </motion.button>
              
              <AnimatePresence>
                {sortDropdownOpen && (
                  <motion.div
                    className="absolute right-0 top-full mt-1 glass-panel p-1 z-10 min-w-32"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                  >
                    {[
                      { id: '', label: 'Sin ordenar' },
                      { id: 'a-z', label: 'Nombre A-Z' },
                      { id: 'z-a', label: 'Nombre Z-A' }
                    ].map((option) => (
                      <button
                        key={option.id}
                        className={`block w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted ${
                          sortOption === option.id ? 'bg-muted/70 font-medium' : ''
                        }`}
                        onClick={() => {
                          setSortOption(option.id);
                          setSortDropdownOpen(false);
                        }}
                      >
                        {option.label}
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
        {error ? (
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
            {isLoading && regulations.length === 0 ? (
              // Skeleton loaders for initial load
              Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
                <div key={index} className="glass-surface p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-4 bg-muted/70 rounded w-1/3 animate-pulse"></div>
                    <div className="h-5 bg-muted/70 rounded-full w-1/4 animate-pulse"></div>
                  </div>
                  <div className="h-5 bg-muted/70 rounded w-full mb-3 animate-pulse"></div>
                  <div className="h-4 bg-muted/70 rounded w-3/4 mb-3 animate-pulse"></div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    <div className="h-5 bg-muted/70 rounded-full w-1/3 animate-pulse"></div>
                    <div className="h-5 bg-muted/70 rounded-full w-1/4 animate-pulse"></div>
                  </div>
                  <div className="flex justify-between">
                    <div className="h-4 bg-muted/70 rounded w-1/4 animate-pulse"></div>
                    <div className="h-4 bg-muted/70 rounded w-1/5 animate-pulse"></div>
                  </div>
                </div>
              ))
            ) : (
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
                          {regulation.sostenibilidad_economica && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100/50 text-yellow-700">
                              Sostenibilidad Económica
                            </span>
                          )}
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
                          
                          <span className="text-primary/80 group-hover:text-primary transition-colors">Ver detalles</span>
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
                            {regulation.sostenibilidad_economica && (
                              <span className="px-1.5 py-0.5 text-xs rounded-full bg-yellow-100/50 text-yellow-700">
                                SE
                              </span>
                            )}
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
            )}
          </div>
        )}

        {/* Show loading indicator when fetching more data */}
        {isLoading && regulations.length > 0 && (
          <div className="flex justify-center mt-4">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex justify-between items-center">
            <div className="text-xs text-muted-foreground">
              Mostrando {startItem} - {endItem} de {totalCount} resultados
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

      {/* Floating Chat Button */}
      <motion.button
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-lg flex items-center justify-center z-50 transition-colors"
        onClick={() => setIsChatOpen(!isChatOpen)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        style={{ zIndex: 1000 }}
      >
        <AnimatePresence mode="wait">
          {isChatOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X size={24} />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <MessageCircle size={24} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat Box */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            className="fixed bottom-24 right-6 w-96 h-[32rem] glass-panel flex flex-col shadow-xl z-40"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={{ zIndex: 999 }}
          >
            {/* Chat Header */}
            <div className="p-4 border-b border-border/50">
              <h3 className="font-semibold text-sm">Asistente</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Pregunta información relativa a la base de datos
              </p>
            </div>

            {/* Chat Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto scrollbar-thin">
              <div className="space-y-3">
                {showLoginForm ? (
                  <>
                    {/* Login Form */}
                    <div className="flex flex-col items-center justify-center py-4">
                      <div className="w-full max-w-sm">
                        <div className="text-center mb-6">
                          <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                          <h4 className="text-lg font-semibold mb-2">Autenticación Requerida</h4>
                          <p className="text-sm text-muted-foreground">
                            Ingresa tus credenciales para acceder al chat
                          </p>
                        </div>

                        {/* Login Status Notification */}
                        {(isLoggingIn || loginNotification) && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={`mb-4 p-3 rounded-lg border flex items-center ${
                              loginStatus === 'success' 
                                ? 'bg-green-50 border-green-200 text-green-800' 
                                : loginStatus === 'error'
                                ? 'bg-red-50 border-red-200 text-red-800'
                                : 'bg-blue-50 border-blue-200 text-blue-800'
                            }`}
                          >
                            {isLoggingIn ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : loginStatus === 'success' ? (
                              <CheckCircle className="w-4 h-4 mr-2" />
                            ) : loginStatus === 'error' ? (
                              <XCircle className="w-4 h-4 mr-2" />
                            ) : null}
                            <span className="text-sm font-medium">{loginNotification}</span>
                          </motion.div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-4">
                          <div>
                            <label htmlFor="chat-email" className="block text-sm font-medium text-foreground mb-1">
                              Email
                            </label>
                            <input
                              type="email"
                              id="chat-email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              disabled={isLoggingIn}
                              placeholder="tu@email.com"
                              className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
                              required
                            />
                          </div>
                          
                          <div>
                            <label htmlFor="chat-password" className="block text-sm font-medium text-foreground mb-1">
                              Contraseña
                            </label>
                            <div className="relative">
                              <input
                                type={showPassword ? "text" : "password"}
                                id="chat-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isLoggingIn}
                                placeholder="••••••••"
                                className="w-full bg-muted border border-border rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
                                required
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                disabled={isLoggingIn}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                          
                          <div className="flex gap-3 pt-2">
                            <button
                              type="button"
                              onClick={() => setShowLoginForm(false)}
                              disabled={isLoggingIn}
                              className="flex-1 bg-muted text-muted-foreground rounded-lg px-4 py-2 text-sm font-medium hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              disabled={isLoggingIn || !email.trim() || !password.trim()}
                              className="flex-1 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary/90 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isLoggingIn ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Autenticando
                                </>
                              ) : (
                                <>
                                  <Lock className="w-4 h-4" />
                                  Ingresar
                                </>
                              )}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </>
                ) : chatHistory.length === 0 ? (
                  <>
                    {/* Welcome Message */}
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Aquí puedes consultar información relativa a:
                      </p>
                      <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                        <li>• Tipos de normativas disponibles</li>
                        <li>• Búsquedas específicas por región</li>
                        <li>• Categorías de sostenibilidad</li>
                        <li>• Explicación de campos y filtros</li>
                      </ul>
                    </div>
                    
                    {/* Placeholder for future chat messages */}
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <MessageCircle size={32} className="mb-2 opacity-50" />
                      <p className="text-xs">Escribe tu pregunta aquí abajo</p>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Chat Messages */}
                    {chatHistory.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[90%] ${
                            message.type === 'user'
                              ? 'bg-primary text-primary-foreground p-3 rounded-lg'
                              : 'w-full'
                          }`}
                        >
                          {message.type === 'user' ? (
                            <>
                              <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                              <p className="text-xs mt-1 opacity-70 text-primary-foreground/70">
                                {message.timestamp.toLocaleTimeString()}
                              </p>
                            </>
                          ) : (
                            <div className="space-y-3">
                              {/* Text Answer */}
                              <div className="bg-muted/50 text-foreground p-3 rounded-lg">
                                <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                                <p className="text-xs mt-1 opacity-70 text-muted-foreground">
                                  {message.timestamp.toLocaleTimeString()}
                                </p>
                              </div>
                              
                              {/* Structured Data - Documents */}
                              {message.queryType === 'display' && message.documents && message.documents.length > 0 && (
                                <div className="space-y-2">
                                  <h4 className="text-xs font-medium text-muted-foreground px-1">
                                    Documentos encontrados:
                                  </h4>
                                  {message.documents.map((doc, index) => (
                                    <motion.div
                                      key={doc.id || index}
                                      className="bg-background/50 border border-border/50 rounded-lg p-3 cursor-pointer hover:border-primary/50 transition-all duration-200"
                                      onClick={() => selectRegulation(doc.id)}
                                      whileHover={{ scale: 1.02 }}
                                      whileTap={{ scale: 0.98 }}
                                    >
                                      <div className="flex items-start justify-between mb-2">
                                        <span className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">
                                          {doc.escala_normativa || 'N/A'}
                                        </span>
                                        {doc.date && (
                                          <span className="text-xs text-muted-foreground">{doc.date}</span>
                                        )}
                                      </div>
                                      
                                      <h5 className="font-medium text-sm mb-2 line-clamp-2 hover:text-primary transition-colors">
                                        {doc.titulo || doc.title || 'Título no disponible'}
                                      </h5>
                                      
                                      {(doc.ciudad || doc.ccaa || doc.provincia) && (
                                        <div className="flex items-center text-xs text-muted-foreground mb-2">
                                          <MapPin size={10} className="mr-1" />
                                          <span>
                                            {[doc.ccaa, doc.provincia, doc.ciudad].filter(Boolean).join(', ')}
                                          </span>
                                        </div>
                                      )}
                                      
                                      {/* Tags for sustainability and governance */}
                                      <div className="flex flex-wrap gap-1">
                                        {doc.sostenibilidad_economica && (
                                          <span className="px-1.5 py-0.5 text-xs rounded-full bg-yellow-100/50 text-yellow-700">
                                            SE
                                          </span>
                                        )}
                                        {doc.sostenibilidad_ambiental && (
                                          <span className="px-1.5 py-0.5 text-xs rounded-full bg-emerald-100/50 text-emerald-700">
                                            SA
                                          </span>
                                        )}
                                        {doc.cambio_climatico && (
                                          <span className="px-1.5 py-0.5 text-xs rounded-full bg-blue-100/50 text-blue-700">
                                            CC
                                          </span>
                                        )}
                                        {doc.sostenibilidad_social && (
                                          <span className="px-1.5 py-0.5 text-xs rounded-full bg-amber-100/50 text-amber-700">
                                            SS
                                          </span>
                                        )}
                                        {doc.gobernanza_urbana && (
                                          <span className="px-1.5 py-0.5 text-xs rounded-full bg-purple-100/50 text-purple-700">
                                            GU
                                          </span>
                                        )}
                                      </div>
                                    </motion.div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {/* Loading indicator */}
                    {isQueryLoading && (
                      <div className="flex justify-start">
                        <div className="bg-muted/50 p-3 rounded-lg text-sm flex items-center">
                          <Loader2 size={16} className="mr-2 animate-spin" />
                          <span className="text-muted-foreground">Buscando...</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-border/50">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={
                    showLoginForm 
                      ? "Inicia sesión para continuar..." 
                      : isQueryLoading
                      ? "Enviando mensaje..."
                      : "Escribe tu pregunta..."
                  }
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  className={`flex-1 px-3 py-2 bg-muted/50 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary ${
                    (showLoginForm || isQueryLoading) ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !isQueryLoading && !showLoginForm) {
                      handleSendMessage();
                    }
                  }}
                  disabled={showLoginForm || isQueryLoading}
                />
                <motion.button
                  className="px-3 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none"
                  whileTap={{ scale: 0.95 }}
                  disabled={showLoginForm || !chatMessage.trim() || isQueryLoading}
                  onClick={handleSendMessage}
                >
                  {isQueryLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                </motion.button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {!isAuthenticated && !showLoginForm ? 
                  "Escribe cualquier mensaje para iniciar sesión" : 
                  "Presiona Enter o el botón para enviar"
                }
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Show subtle background loading indicator */}
      {hasMore && !isLoading && regulations.length > 0 && (
        <div className="fixed bottom-4 left-4 bg-background/80 border border-border rounded-full p-2 shadow-md flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary"></div>
          <span className="text-xs text-muted-foreground">Cargando todos los datos...</span>
        </div>
      )}
      {/* Feedback Link at the bottom */}
      <div className="w-full flex justify-center py-4">
        <a
          href="/feedback"
          className="text-sm text-primary underline hover:text-primary/80 transition-colors"
          style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', textAlign: 'center', background: 'rgba(255,255,255,0.7)', zIndex: 10 }}
        >
          ¿Tienes comentarios sobre la web? ¡Envíalos aquí!
        </a>
      </div>
    </div>
  );
};

export default RegulationsPanel;