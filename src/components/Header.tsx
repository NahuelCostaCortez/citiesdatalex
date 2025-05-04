import React from 'react';
import { motion } from 'framer-motion';
import { Search, Settings, Menu, X, Lightbulb, Activity, Sun, Moon } from 'lucide-react';
import SearchBar from './SearchBar';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar, isSidebarOpen }) => {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <motion.header 
      className="glass-panel py-3 px-4 m-3 mb-0 flex items-center justify-between gap-4"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <div className="flex items-center gap-3">
        <motion.button
          onClick={toggleSidebar}
          className="p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          whileTap={{ scale: 0.95 }}
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </motion.button>
        
        <motion.div 
          className="flex items-center gap-2"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          {/* Replace the Activity icon with an img tag */}
          <img src="/logo.png" alt="CitiesDatalex Logo" className="h-10 w-30" /> 
        </motion.div>
      </div>
      
      <div className="flex-1 max-w-xl">
        <SearchBar />
      </div>
      
      <div className="flex items-center gap-3">
        <motion.button
          onClick={toggleTheme}
          className="p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          whileTap={{ scale: 0.95 }}
        >
          {theme === 'dark' ? (
            <Sun size={20} className="text-primary" />
          ) : (
            <Moon size={20} className="text-primary" />
          )}
        </motion.button>
        
      </div>
    </motion.header>
  );
};

export default Header