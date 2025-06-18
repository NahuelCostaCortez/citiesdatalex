import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, ChevronRight, Calendar, MapPin, Clock, MessageSquare, ArrowDownSquare, Zap, Loader2, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { useRegulations } from '../context/RegulationsContext';
import { processCodesString } from '../utils/tesauroUtils';
import { getAmbitoDescription, getEscalaNormativaDescription } from '../utils/lookupUtils';
import { buildApiUrl, API_ENDPOINTS, getApiConfig } from '../config/api';

interface DescriptorData {
  code: string;
  descripcion: string;
}

interface ChatMessage {
  text: string;
  sender: 'user' | 'ai';
  id?: number;
  isTyping?: boolean;
}

const RegulationDetail: React.FC = () => {
  const { selectedRegulation, clearSelectedRegulation, isLoading, error } = useRegulations();
  const [activeTab, setActiveTab] = useState('información');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { text: 'Hola! Estoy aquí para ayudarte a entender este documento. ¿Qué te gustaría saber?', sender: 'ai' }
  ]);
  const [inputValue, setInputValue] = useState('');
  
  // New state for chat session
  const [chatSessionReady, setChatSessionReady] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [sessionNotification, setSessionNotification] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  
  // State to store descriptor data
  const [sostenibilidadAmbiental, setSostenibilidadAmbiental] = useState<DescriptorData[]>([]);
  const [sostenibilidadSocial, setSostenibilidadSocial] = useState<DescriptorData[]>([]);
  const [sostenibilidadEconomica, setSostenibilidadEconomica] = useState<DescriptorData[]>([]);
  const [cambioclimatico, setCambioClimatico] = useState<DescriptorData[]>([]);
  const [gobernanzaUrbana, setGobernanzaUrbana] = useState<DescriptorData[]>([]);
  const [descriptorsLoading, setDescriptorsLoading] = useState(false);
  
  // State for lookup data
  const [ambitoLabel, setAmbitoLabel] = useState('');
  const [escalaNormativaLabel, setEscalaNormativaLabel] = useState('');
  const [metadataLoading, setMetadataLoading] = useState(false);
  
  // Fetch lookup data when selectedRegulation changes
  useEffect(() => {
    if (selectedRegulation) {
      setMetadataLoading(true);
      
      const fetchMetadata = async () => {
        try {
          // Get ambito description
          if (selectedRegulation.ambito) {
            const ambitoDesc = await getAmbitoDescription(selectedRegulation.ambito);
            setAmbitoLabel(ambitoDesc);
          }
          
          // Get escala normativa description
          if (selectedRegulation.escala_normativa) {
            const escalaNormativaDesc = await getEscalaNormativaDescription(selectedRegulation.escala_normativa);
            setEscalaNormativaLabel(escalaNormativaDesc);
          }
        } catch (error) {
          console.error('Error fetching metadata:', error);
        } finally {
          setMetadataLoading(false);
        }
      };
      
      fetchMetadata();
    }
  }, [selectedRegulation]);
  
  // Fetch descriptor data when selectedRegulation changes
  useEffect(() => {
    if (selectedRegulation) {
      setDescriptorsLoading(true);
      
      const fetchDescriptors = async () => {
        try {
          // Process each descriptor field that may contain multiple codes
          if (selectedRegulation.sostenibilidad_ambiental) {
            const data = await processCodesString(selectedRegulation.sostenibilidad_ambiental);
            setSostenibilidadAmbiental(data);
          }
          
          if (selectedRegulation.sostenibilidad_social) {
            const data = await processCodesString(selectedRegulation.sostenibilidad_social);
            setSostenibilidadSocial(data);
          }
          
          if (selectedRegulation.sostenibilidad_economica) {
            const data = await processCodesString(selectedRegulation.sostenibilidad_economica);
            setSostenibilidadEconomica(data);
          }
          
          if (selectedRegulation.cambio_climatico) {
            const data = await processCodesString(selectedRegulation.cambio_climatico);
            setCambioClimatico(data);
          }
          
          if (selectedRegulation.gobernanza_urbana) {
            const data = await processCodesString(selectedRegulation.gobernanza_urbana);
            setGobernanzaUrbana(data);
          }
        } catch (error) {
          console.error('Error processing descriptors:', error);
        } finally {
          setDescriptorsLoading(false);
        }
      };
      
      fetchDescriptors();
    }
  }, [selectedRegulation]);
  
  // Reset chat session state when selectedRegulation changes
  useEffect(() => {
    if (selectedRegulation) {
      setChatSessionReady(false);
      setSessionStatus('idle');
      setSessionNotification('');
      setSessionId(null);
      setIsSendingMessage(false);
    }
  }, [selectedRegulation]);
  
  if (!selectedRegulation && !isLoading && !error) return null;

  const createChatSession = async (documentId: string) => {
    try {
      const sessionData = { document_id: String(documentId) };
      const url = buildApiUrl(API_ENDPOINTS.CHAT_CREATE_SESSION);
      const config = getApiConfig('POST', sessionData);
      
      // Debug logging
      console.log('🔍 Chat Session Debug Info:');
      console.log('URL:', url);
      console.log('Request body:', sessionData);
      console.log('Request config:', config);
      console.log('Document ID being sent:', documentId);
      
      const response = await fetch(url, config);
      
      // Log response details
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      const result = await response.json();
      console.log('Response body:', result);
      
      if (!response.ok) {
        console.error(`❌ Request failed with status ${response.status}:`, result);
        if (result.detail && Array.isArray(result.detail)) {
          console.error('🔍 Validation errors:');
          result.detail.forEach((error: any, index: number) => {
            console.error(`  ${index + 1}.`, error);
          });
        }
        return { success: false };
      }
      
      if (result.status === 'success') {
        return { 
          success: true, 
          sessionId: result.session_id 
        };
      } else {
        return { success: false };
      }
          } catch (error) {
        console.error('❌ Error creating chat session:', error);
        return { success: false };
      }
  };

  const handleStartChat = async () => {
    if (!selectedRegulation?.id) return;
    
    setIsCreatingSession(true);
    setSessionNotification('Preparando documento para el chat...');
    
    try {
      const result = await createChatSession(String(selectedRegulation.id));
      
              if (result.success) {
          setSessionStatus('success');
          setSessionNotification('¡Documento preparado! Ya puedes hacer preguntas.');
          setChatSessionReady(true);
          setSessionId(result.sessionId); // Store the session ID
          
          // Update initial AI message
          setChatMessages([
            { text: `He procesado el documento "${selectedRegulation.titulo}" y estoy listo para responder tus preguntas. ¿Qué te gustaría saber?`, sender: 'ai' }
          ]);
              } else {
          setSessionStatus('error');
          setSessionNotification('Error al preparar el documento');
        }
    } catch (error) {
      setSessionStatus('error');
      setSessionNotification('Error de conexión');
    } finally {
      setIsCreatingSession(false);
      // Clear notification after different times based on status
      const clearDelay = sessionStatus === 'success' ? 5000 : 10000; // Success messages stay longer
      setTimeout(() => {
        setSessionNotification('');
        setSessionStatus('idle');
      }, clearDelay);
    }
  };

  const sendChatQuery = async (sessionId: string, question: string) => {
    try {
      const queryData = { 
        session_id: sessionId, 
        question: question 
      };
      const url = buildApiUrl(API_ENDPOINTS.CHAT_QUERY);
      const config = getApiConfig('POST', queryData);
      
      console.log('🔍 Sending chat query:', { sessionId, question });
      
      const response = await fetch(url, config);
      const result = await response.json();
      
      console.log('Chat query response:', result);
      
      if (!response.ok) {
        console.error(`❌ Chat query failed with status ${response.status}:`, result);
        return { success: false, error: 'Error en la consulta' };
      }
      
      return { success: true, answer: result.answer || result.response };
    } catch (error) {
      console.error('❌ Error sending chat query:', error);
      return { success: false, error: 'Error de conexión' };
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !chatSessionReady || !sessionId) return;
    
    const userMessage = inputValue;
    
    // Add user message
    setChatMessages(prev => [...prev, { text: userMessage, sender: 'user' }]);
    
    // Reset input and show loading state
    setInputValue('');
    setIsSendingMessage(true);
    
    // Add typing indicator immediately
    const typingMessageId = Date.now(); // Unique ID for the typing message
    setChatMessages(prev => [...prev, { 
      text: 'typing', 
      sender: 'ai',
      id: typingMessageId,
      isTyping: true
    }]);

    try {
      // Send query to backend
      const result = await sendChatQuery(sessionId, userMessage);
      
      if (result.success) {
        // Replace typing indicator with actual AI response
        setChatMessages(prev => prev.map(msg => 
          msg.id === typingMessageId 
            ? { text: result.answer, sender: 'ai', id: typingMessageId }
            : msg
        ));
      } else {
        // Replace typing indicator with error response
        setChatMessages(prev => prev.map(msg => 
          msg.id === typingMessageId 
            ? { text: `Lo siento, hubo un error al procesar tu pregunta: ${result.error}. Por favor, inténtalo de nuevo.`, sender: 'ai', id: typingMessageId }
            : msg
        ));
      }
    } catch (error) {
      // Replace typing indicator with connection error
      setChatMessages(prev => prev.map(msg => 
        msg.id === typingMessageId 
          ? { text: 'Lo siento, hubo un error de conexión. Por favor, inténtalo de nuevo.', sender: 'ai', id: typingMessageId }
          : msg
      ));
    } finally {
      setIsSendingMessage(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="fixed inset-y-0 right-0 w-full max-w-2xl bg-card border-l border-border shadow-xl flex flex-col"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ url: 'spring', damping: 30, stiffness: 300 }}
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
              <p className="text-base text-muted-foreground">Cargando detalles de normativa...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full p-6">
              <AlertCircle className="w-12 h-12 text-destructive mb-4" />
              <p className="text-lg font-semibold text-destructive mb-2">Error al cargar los detalles</p>
              <p className="text-base text-muted-foreground mb-6 text-center">{error}</p>
              <div className="flex gap-4">
                <button 
                  className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-md"
                  onClick={() => window.location.reload()}
                >
                  Intentar de nuevo
                </button>
                <button 
                  className="px-4 py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-md"
                  onClick={clearSelectedRegulation}
                >
                  Cerrar
                </button>
              </div>
            </div>
          ) : selectedRegulation && (
            <>
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-2 max-w-[calc(100%-48px)]">
                  <div className="p-2 rounded-full bg-primary/10 flex-shrink-0">
                    <FileText className="text-primary" size={20} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xl font-semibold tracking-tight line-clamp-2">{selectedRegulation.titulo}</h2>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      {selectedRegulation.date && (
                        <div className="flex items-center">
                          <Calendar size={12} className="mr-1" />
                          <span>{selectedRegulation.date}</span>
                        </div>
                      )}
                      {selectedRegulation.ciudad && (
                        <div className="flex items-center">
                          <MapPin size={12} className="mr-1" />
                          <span>{selectedRegulation.ciudad}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={clearSelectedRegulation}
                  className="p-2 hover:bg-muted rounded-full flex-shrink-0"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="border-b border-border bg-muted/30">
                <div className="px-4 py-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-1">Escala Normativa</h4>
                      <div className="flex items-center">
                        {metadataLoading ? (
                          <div className="flex items-center">
                            <Loader2 className="w-3 h-3 text-muted-foreground animate-spin mr-1" />
                            <span className="text-sm text-muted-foreground">Cargando...</span>
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 text-sm rounded-md bg-muted">
                            {escalaNormativaLabel || selectedRegulation.escala_normativa}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-1">Ámbito</h4>
                      <div className="flex items-center">
                        {selectedRegulation.ambito && (
                          metadataLoading ? (
                            <div className="flex items-center">
                              <Loader2 className="w-3 h-3 text-muted-foreground animate-spin mr-1" />
                              <span className="text-sm text-muted-foreground">Cargando...</span>
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 text-sm rounded-md bg-blue-100/50 text-blue-700">
                              {ambitoLabel || selectedRegulation.ambito}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                    
                    {(selectedRegulation.ccaa || selectedRegulation.provincia || selectedRegulation.ciudad) && (
                      <div className="col-span-2 mt-1">
                        <h4 className="text-xs font-medium text-muted-foreground mb-1">Ámbito Territorial</h4>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                          {selectedRegulation.ccaa && (
                            <div className="flex items-center">
                              <span className="text-xs font-medium text-muted-foreground mr-1">CCAA:</span>
                              <span>{selectedRegulation.ccaa}</span>
                            </div>
                          )}
                          {selectedRegulation.provincia && (
                            <div className="flex items-center">
                              <span className="text-xs font-medium text-muted-foreground mr-1">Provincia:</span>
                              <span>{selectedRegulation.provincia}</span>
                            </div>
                          )}
                          {selectedRegulation.ciudad && (
                            <div className="flex items-center">
                              <span className="text-xs font-medium text-muted-foreground mr-1">Ciudad:</span>
                              <span>{selectedRegulation.ciudad}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-b border-border">
                <div className="flex">
                  {['información', 'ai'].map((tab) => (
                    <button 
                      key={tab}
                      className={`px-4 py-3 text-sm font-medium relative ${
                        activeTab === tab ? 'text-primary' : 'text-muted-foreground'
                      }`}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab === 'ai' ? (
                        <div className="flex items-center gap-1">
                          <Zap size={16} />
                          <span>Consultar</span>
                        </div>
                      ) : (
                        <span className="capitalize">{tab}</span>
                      )}
                      {activeTab === tab && (
                        <motion.div
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                          layoutId="tab-indicator"
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
                <AnimatePresence mode="wait">
                  {activeTab === 'información' && (
                    <motion.div
                      key="información"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      <div className="glass-surface p-4">
                        <h3 className="text-base font-semibold mb-2">Resumen</h3>
                        {!selectedRegulation.disponible && (
                          <div className="mb-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 flex items-center">
                            <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                            <span className="text-sm">El documento puede no estar actualizado o disponible</span>
                          </div>
                        )}
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {selectedRegulation.resumen}
                        </p>
                        
                        <div className="mt-4 pt-3 border-t border-border/30">
                          <a 
                            href={selectedRegulation.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flex items-center text-sm text-primary hover:text-primary/80 transition-colors"
                          >
                            <ArrowDownSquare size={16} className="mr-2" />
                            <span>Ir al documento oficial</span>
                          </a>
                        </div>
                      </div>
                      
                      <div className="glass-surface p-4">
                        <h3 className="text-base font-semibold mb-2">Descriptores</h3>
                        
                        {descriptorsLoading ? (
                          <div className="flex justify-center py-4">
                            <Loader2 className="w-5 h-5 text-primary animate-spin" />
                            <span className="ml-2 text-sm text-muted-foreground">Cargando descriptores...</span>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {sostenibilidadAmbiental.length > 0 && (
                              <div className="w-full">
                                <h4 className="text-sm font-medium mb-1 text-emerald-700">Sostenibilidad Ambiental</h4>
                                <div className="flex flex-wrap gap-2">
                                  {sostenibilidadAmbiental.map((item, idx) => (
                                    <span key={`amb-${idx}`} className="px-3 py-1.5 text-sm rounded-full bg-emerald-100/50 text-emerald-700 flex items-center">
                                      <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>
                                      {item.descripcion}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {sostenibilidadEconomica.length > 0 && (
                              <div className="w-full">
                                <h4 className="text-sm font-medium mb-1 text-yellow-700">Sostenibilidad Económica</h4>
                                <div className="flex flex-wrap gap-2">
                                  {sostenibilidadEconomica.map((item, idx) => (
                                    <span key={`eco-${idx}`} className="px-3 py-1.5 text-sm rounded-full bg-yellow-100/50 text-yellow-700 flex items-center">
                                      <span className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></span>
                                      {item.descripcion}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {cambioclimatico.length > 0 && (
                              <div className="w-full">
                                <h4 className="text-sm font-medium mb-1 text-blue-700">Cambio Climático</h4>
                                <div className="flex flex-wrap gap-2">
                                  {cambioclimatico.map((item, idx) => (
                                    <span key={`cli-${idx}`} className="px-3 py-1.5 text-sm rounded-full bg-blue-100/50 text-blue-700 flex items-center">
                                      <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
                                      {item.descripcion}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {sostenibilidadSocial.length > 0 && (
                              <div className="w-full">
                                <h4 className="text-sm font-medium mb-1 text-amber-700">Sostenibilidad Social</h4>
                                <div className="flex flex-wrap gap-2">
                                  {sostenibilidadSocial.map((item, idx) => (
                                    <span key={`soc-${idx}`} className="px-3 py-1.5 text-sm rounded-full bg-amber-100/50 text-amber-700 flex items-center">
                                      <span className="w-2 h-2 rounded-full bg-amber-500 mr-2"></span>
                                      {item.descripcion}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {gobernanzaUrbana.length > 0 && (
                              <div className="w-full">
                                <h4 className="text-sm font-medium mb-1 text-purple-700">Gobernanza Urbana</h4>
                                <div className="flex flex-wrap gap-2">
                                  {gobernanzaUrbana.map((item, idx) => (
                                    <span key={`gob-${idx}`} className="px-3 py-1.5 text-sm rounded-full bg-purple-100/50 text-purple-700 flex items-center">
                                      <span className="w-2 h-2 rounded-full bg-purple-500 mr-2"></span>
                                      {item.descripcion}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {sostenibilidadAmbiental.length === 0 &&
                             sostenibilidadEconomica.length === 0 &&
                             cambioclimatico.length === 0 &&
                             sostenibilidadSocial.length === 0 &&
                             gobernanzaUrbana.length === 0 && (
                              <span className="text-sm text-muted-foreground italic">
                                No se han definido descriptores para esta regulación
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'ai' && (
                    <motion.div
                      key="ai"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col h-full"
                    >
                      <div className="flex items-center mb-4">
                        <Zap size={18} className="text-primary mr-2" />
                        <h3 className="text-base font-semibold">Consulta a la Inteligencia Artificial</h3>
                      </div>
                      
                      {/* Upload Status Notification */}
                      {(isCreatingSession || sessionNotification) && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className={`mb-4 p-3 rounded-lg border flex items-center ${
                            sessionStatus === 'success' 
                              ? 'bg-green-50 border-green-200 text-green-800' 
                              : sessionStatus === 'error'
                              ? 'bg-red-50 border-red-200 text-red-800'
                              : 'bg-blue-50 border-blue-200 text-blue-800'
                          }`}
                        >
                          {isCreatingSession ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : sessionStatus === 'success' ? (
                            <CheckCircle className="w-4 h-4 mr-2" />
                          ) : sessionStatus === 'error' ? (
                            <XCircle className="w-4 h-4 mr-2" />
                          ) : null}
                          <span className="text-sm font-medium">{sessionNotification}</span>
                        </motion.div>
                      )}
                      
                      {!chatSessionReady && !isCreatingSession && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex flex-col items-center justify-center py-8 text-center"
                        >
                          <div className="mb-4">
                            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                            <h4 className="text-lg font-semibold mb-2">Iniciar Chat con IA</h4>
                            {!selectedRegulation.disponible ? (
                              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 flex items-center">
                                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                                <span className="text-sm">No es posible iniciar el chat porque el documento no está disponible</span>
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground max-w-md">
                                Para comenzar a hacer preguntas sobre este documento, primero necesito procesarlo. 
                                Esto puede tomar unos segundos.
                              </p>
                            )}
                          </div>
                          <button
                            onClick={handleStartChat}
                            disabled={isCreatingSession || !selectedRegulation.disponible}
                            className="bg-primary text-primary-foreground rounded-lg px-6 py-3 text-sm font-medium hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Zap className="w-4 h-4" />
                            Empezar Chat
                          </button>
                        </motion.div>
                      )}
                      
                      {chatSessionReady && (
                        <div className="flex-1 glass-surface p-4 rounded-lg overflow-y-auto">
                          <div className="space-y-4">
                            {chatMessages.map((message, i) => (
                              <motion.div
                                key={message.id || i}
                                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                              >
                                <div 
                                  className={`max-w-[80%] p-3 rounded-lg text-sm ${
                                    message.sender === 'user' 
                                      ? 'bg-primary/20 text-primary rounded-tr-none' 
                                      : 'bg-muted text-foreground rounded-tl-none'
                                  }`}
                                >
                                  {message.isTyping ? (
                                    <div className="flex items-center gap-2">
                                      <div className="flex space-x-1">
                                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                      </div>
                                    </div>
                                  ) : (
                                    message.text
                                  )}
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              {activeTab === 'ai' && (
                <div className="border-t border-border p-4 bg-card">
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder={
                        isCreatingSession 
                          ? "Preparando documento..." 
                          : !chatSessionReady
                          ? "Inicia el chat para comenzar..."
                          : "Pregunta sobre este documento..."
                      }
                      disabled={isCreatingSession || !chatSessionReady}
                      className={`flex-1 bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 ${
                        (isCreatingSession || !chatSessionReady) ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    />
                    <button 
                      type="submit"
                      disabled={isCreatingSession || !inputValue.trim() || !chatSessionReady || isSendingMessage}
                      className={`bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary/90 ${
                        (isCreatingSession || !inputValue.trim() || !chatSessionReady || isSendingMessage) ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {isCreatingSession ? (
                        <div className="flex items-center">
                          <Loader2 className="w-4 h-4 animate-spin mr-1" />
                          Preparando
                        </div>
                      ) : isSendingMessage ? (
                        <div className="flex items-center">
                          <Loader2 className="w-4 h-4 animate-spin mr-1" />
                          Enviando
                        </div>
                      ) : (
                        'Enviar'
                      )}
                    </button>
                  </form>
                </div>
              )}
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default RegulationDetail;