import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Map, Filter, BarChart, Settings, Upload, Zap, Search, X, MessageSquare, Send, AlertTriangle, Loader2, CheckCircle, XCircle } from 'lucide-react';
import FilterPanel from './FilterPanel';
import { buildApiUrl, API_ENDPOINTS, getApiConfig } from '../config/api';

interface SidebarProps {
  isOpen: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

interface ChatMessage {
  text: string;
  sender: 'user' | 'ai';
  id?: number;
  isTyping?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, activeTab, setActiveTab }) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [showWarningMessage, setShowWarningMessage] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { text: '¡Hola! Puedo ayudarte a analizar este documento. ¿Qué te gustaría saber?', sender: 'ai' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // New state for chat session (similar to RegulationDetail)
  const [chatSessionReady, setChatSessionReady] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [sessionNotification, setSessionNotification] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  
  const sidebarTabs = [
    { id: 'filter', icon: Filter, label: 'Filters' },
    { id: 'regulations', icon: FileText, label: 'Regulations' },
    { id: 'map', icon: Map, label: 'Map View' },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setUploadedFile(files[0]);
    }
  };

  const triggerFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const removeUploadedFile = () => {
    setUploadedFile(null);
    setShowAiPanel(false);
    setChatSessionReady(false);
    setSessionStatus('idle');
    setSessionNotification('');
    setSessionId(null);
    setIsSendingMessage(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConsultAI = () => {
    setShowAiPanel(true);
  };

  const handleFindSimilar = () => {
    setShowWarningMessage(true);
  };

  // Effect to hide warning message after 3 seconds
  useEffect(() => {
    if (showWarningMessage) {
      const timer = setTimeout(() => {
        setShowWarningMessage(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [showWarningMessage]);

  // Reset chat session state when uploadedFile changes
  useEffect(() => {
    if (uploadedFile) {
      setChatSessionReady(false);
      setSessionStatus('idle');
      setSessionNotification('');
      setSessionId(null);
      setIsSendingMessage(false);
    }
  }, [uploadedFile]);

  const uploadPdfFile = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const url = buildApiUrl(API_ENDPOINTS.UPLOAD_PDF);
      
      console.log('🔍 Upload PDF Debug Info:');
      console.log('URL:', url);
      console.log('File name:', file.name);
      console.log('File size:', file.size);
      
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      const result = await response.json();
      console.log('Response body:', result);
      
      if (!response.ok) {
        console.error(`❌ Request failed with status ${response.status}:`, result);
        return { success: false, error: result.detail || 'Error uploading file' };
      }
      
      if (result.status === 'success' && result.document_id) {
        return { 
          success: true, 
          documentId: result.document_id 
        };
      } else {
        return { success: false, error: result.message || 'Upload failed' };
      }
    } catch (error) {
      console.error('❌ Error uploading PDF:', error);
      return { success: false, error: 'Connection error' };
    }
  };

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
    if (!uploadedFile) return;
    
    setIsCreatingSession(true);
    setSessionNotification('Subiendo documento...');
    
    try {
      // Step 1: Upload the PDF file to get document_id
      const uploadResult = await uploadPdfFile(uploadedFile);
      
      if (!uploadResult.success) {
        setSessionStatus('error');
        setSessionNotification(uploadResult.error || 'Error al subir el documento');
        return;
      }
      
      // Step 2: Create chat session using the document_id
      setSessionNotification('Preparando documento para el chat...');
      const sessionResult = await createChatSession(uploadResult.documentId);
      
      if (sessionResult.success) {
        setSessionStatus('success');
        setSessionNotification('¡Documento procesado! Ya puedes hacer preguntas.');
        setChatSessionReady(true);
        setSessionId(sessionResult.sessionId);
        
        // Update initial AI message
        setChatMessages([
          { text: `He procesado el documento "${uploadedFile.name}" y estoy listo para responder tus preguntas. ¿Qué te gustaría saber?`, sender: 'ai' }
        ]);
      } else {
        setSessionStatus('error');
        setSessionNotification('Error al preparar el documento para el chat');
      }
    } catch (error) {
      setSessionStatus('error');
      setSessionNotification('Error de conexión');
    } finally {
      setIsCreatingSession(false);
      // Clear notification after different times based on status
      const clearDelay = sessionStatus === 'success' ? 5000 : 10000;
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
    <>
      <motion.div
        className="w-60 h-full overflow-hidden flex flex-col glass-panel m-3 mr-0"
        initial={{ x: -280, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -280, opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <div className="flex border-b border-border/50">
          {sidebarTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <motion.button
                key={tab.id}
                className={`flex-1 relative py-3 px-1 transition-colors ${
                  activeTab === tab.id ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab(tab.id)}
                whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                whileTap={{ scale: 0.95 }}
              >
                <Icon size={18} className="mx-auto" />
                {activeTab === tab.id && (
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                    layoutId="sidebar-tab-indicator"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        <div className="p-3 flex-1 overflow-auto scrollbar-thin">
          <AnimatePresence mode="wait">
            {activeTab === 'filter' && <FilterPanel key="filter" />}
            {activeTab === 'regulations' && (
              <motion.div
                key="regulations"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm"
              >
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Cargar documento</h3>
                
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                />
                
                {!uploadedFile ? (
                  <motion.button
                    onClick={triggerFileUpload}
                    className="w-full flex items-center justify-center gap-2 p-3 border border-dashed border-border rounded-md hover:bg-muted/30 transition-colors"
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Upload size={16} />
                    <span>Seleccionar documento</span>
                  </motion.button>
                ) : (
                  <div className="space-y-3">
                    <div className="glass-surface p-3 rounded-md relative">
                      <button 
                        onClick={removeUploadedFile}
                        className="absolute top-1 right-1 p-1 rounded-full hover:bg-muted/50"
                      >
                        <X size={14} />
                      </button>
                      <FileText size={20} className="text-primary mb-2" />
                      <p className="text-xs font-medium truncate pr-4">{uploadedFile.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(uploadedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <motion.button
                        onClick={handleConsultAI}
                        className={`w-full flex items-center gap-2 p-2 rounded-md ${
                          showAiPanel ? 'bg-primary/20 text-primary' : 'hover:bg-muted/50'
                        }`}
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Zap size={16} />
                        <span>Consultar con IA</span>
                      </motion.button>
                      
                      <motion.button
                        onClick={handleFindSimilar}
                        className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted/50"
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Search size={16} />
                        <span>Documentos similares</span>
                      </motion.button>
                    </div>
                    
                    {/* Warning message */}
                    <AnimatePresence>
                      {showWarningMessage && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="mt-3 p-3 bg-orange-100 text-orange-800 rounded-md border border-orange-300 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <AlertTriangle size={14} />
                            <span className="font-medium">Funcionalidad disponible próximamente</span>
                          </div>
                          <p className="mt-1 text-orange-700">
                            Esta característica se encuentra en desarrollo y estará disponible en una futura actualización.
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            )}
            {activeTab === 'map' && (
              <motion.div
                key="map"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm"
              >
                <div className="mb-3 p-2 bg-yellow-100 text-yellow-800 rounded text-xs border border-yellow-300">
                  Solo se mostrarán en el mapa las regulaciones asociadas a una localidad concreta. Si una regulación no tiene municipio, no aparecerá geolocalizada.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <div className="mt-auto p-3 border-t border-border/50">
          <div className="text-xs text-muted-foreground">
            CitiesDatalex v1.0.0
          </div>
        </div>
      </motion.div>
      
      {/* AI Chat Side Panel */}
      <AnimatePresence>
        {showAiPanel && uploadedFile && (
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
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-2 max-w-[calc(100%-48px)]">
                  <div className="p-2 rounded-full bg-primary/10 flex-shrink-0">
                    <Zap className="text-primary" size={20} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xl font-semibold tracking-tight line-clamp-2">Consulta IA: {uploadedFile.name}</h2>
                    <p className="text-xs text-muted-foreground">
                      Pregúntame cualquier cosa sobre este documento
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => setShowAiPanel(false)}
                  className="p-2 hover:bg-muted rounded-full flex-shrink-0"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
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
                      <p className="text-sm text-muted-foreground max-w-md">
                        Para comenzar a hacer preguntas sobre este documento, primero necesito procesarlo. 
                        Esto puede tomar unos segundos.
                      </p>
                    </div>
                    <button
                      onClick={handleStartChat}
                      disabled={isCreatingSession}
                      className="bg-primary text-primary-foreground rounded-lg px-6 py-3 text-sm font-medium hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Zap className="w-4 h-4" />
                      Empezar Chat
                    </button>
                  </motion.div>
                )}
                
                {chatSessionReady && (
                  <div className="flex-1 glass-surface p-4 rounded-lg overflow-y-auto min-h-[300px]">
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
              </div>
              
              {chatSessionReady && (
                <div className="border-t border-border p-4 bg-card">
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder={
                        isCreatingSession 
                          ? "Procesando documento..." 
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
                          Procesando
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;