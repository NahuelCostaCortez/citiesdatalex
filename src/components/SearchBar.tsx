import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { useRegulations } from '../context/RegulationsContext';

const SearchBar: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const { searchRegulations, isLoading, error } = useRegulations();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchRegulations(query);
  };

  const clearSearch = () => {
    setQuery('');
    searchRegulations('');
  };

  return (
    <motion.div 
      className="relative"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.3 }}
    >
      <form onSubmit={handleSearch} className="relative">
        <div 
          className={`flex items-center p-1 pl-3 pr-2 rounded-lg transition-all duration-300 ${
            isFocused 
              ? 'bg-secondary border border-primary/50 shadow-glow' 
              : 'bg-muted/50 border border-transparent'
          }`}
        >
          <Search 
            size={18} 
            className={`mr-2 transition-colors ${isFocused ? 'text-primary' : 'text-muted-foreground'} ${isLoading ? 'animate-pulse' : ''}`} 
          />
          
          <input
            type="text"
            placeholder="Buscar regulaciones, normativas, localizaciones..."
            className="flex-1 bg-transparent border-none outline-none placeholder:text-muted-foreground text-sm py-1.5"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={isLoading}
          />
          
          <AnimatePresence>
            {query && (
              <motion.button
                type="button"
                onClick={clearSearch}
                className="p-1 rounded-md hover:bg-muted"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                disabled={isLoading}
              >
                <X size={16} className="text-muted-foreground" />
              </motion.button>
            )}
          </AnimatePresence>
          
          {isLoading && (
            <span className="ml-2 text-xs text-muted-foreground animate-pulse">Buscando...</span>
          )}
        </div>
        
        {error && (
          <div className="absolute top-full left-0 right-0 mt-1 p-2 text-xs bg-destructive/10 text-destructive rounded-md">
            {error}
          </div>
        )}
      </form>
    </motion.div>
  );
};

export default SearchBar;