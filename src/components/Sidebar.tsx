import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Map, Filter, BarChart, Settings, Upload, Zap, Search, X, MessageSquare, Send } from 'lucide-react';
import FilterPanel from './FilterPanel';

interface SidebarProps {
  isOpen: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, activeTab, setActiveTab }) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [chatMessages, setChatMessages] = useState<{text: string, sender: 'user' | 'ai'}[]>([
    { text: '¡Hola! Puedo ayudarte a analizar este documento. ¿Qué te gustaría saber?', sender: 'ai' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConsultAI = () => {
    setShowAiPanel(true);
  };

  const handleFindSimilar = () => {
    // This would be implemented later to search for similar documents
    console.log("Searching for documents similar to:", uploadedFile?.name);
  };
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    
    // Add user message
    setChatMessages(prev => [...prev, { text: inputValue, sender: 'user' }]);
    
    // Reset input
    setInputValue('');
    
    // Simulate AI response
    setTimeout(() => {
      setChatMessages(prev => [...prev, { 
        text: `He analizado ${uploadedFile?.name}. Este documento habla sobre desarrollo urbano sostenible y planificación territorial.`, 
        sender: 'ai' 
      }]);
    }, 1000);
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
                <div className="space-y-4">
                  {chatMessages.map((message, i) => (
                    <motion.div
                      key={i}
                      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <div 
                        className={`max-w-[80%] p-3 rounded-lg text-sm ${
                          message.sender === 'user' 
                            ? 'bg-primary/20 text-primary rounded-tr-none' 
                            : 'bg-muted text-foreground rounded-tl-none'
                        }`}
                      >
                        {message.text}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
              
              <div className="border-t border-border p-4 bg-card">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Pregunta sobre este documento..."
                    className="flex-1 bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                  />
                  <button 
                    type="submit"
                    className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary/90 flex items-center gap-2"
                  >
                    Enviar
                    <Send size={14} />
                  </button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;