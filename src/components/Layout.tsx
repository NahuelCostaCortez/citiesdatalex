import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from './Header';
import Sidebar from './Sidebar';
import RegulationsPanel from './RegulationsPanel';
import MapView from './MapView';
import { useRegulations } from '../context/RegulationsContext';
import RegulationDetail from './RegulationDetail';

const Layout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('filter');
  const { selectedRegulation } = useRegulations();
  
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <Header toggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
      
      <div className="flex-1 overflow-hidden relative">
        {/* Fixed sidebar container */}
        <div style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 10,
          width: isSidebarOpen ? 'auto' : 0,
          overflow: 'hidden'
        }}>
          <AnimatePresence>
            {isSidebarOpen && (
              <Sidebar isOpen={true} activeTab={activeTab} setActiveTab={setActiveTab} />
            )}
          </AnimatePresence>
        </div>
        
        {/* Content that expands */}
        <div style={{ 
          marginLeft: isSidebarOpen ? '240px' : '0',
          width: isSidebarOpen ? 'calc(100% - 240px)' : '100%',
          height: '100%',
          transition: 'all 0.3s ease-in-out',
          padding: '16px'
        }}>
          <AnimatePresence mode="wait">
            {activeTab === 'map' && isSidebarOpen ? (
              <motion.div 
                key="map"
                className="h-full glass-panel overflow-hidden"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <MapView />
              </motion.div>
            ) : (
              <motion.div 
                key="regulations"
                className="h-full"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <RegulationsPanel />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {selectedRegulation && <RegulationDetail />}
    </div>
  );
};

export default Layout;