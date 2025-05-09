import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useRegulations } from '../context/RegulationsContext';
import autonomiasData from '../data/autonomias.json';
import provinciasData from '../data/provincias.json';
import municipiosData from '../data/municipios.json';

type FilterOption = {
  id: string;
  label: string;
};

type FilterSection = {
  id: string;
  label: string;
  options: FilterOption[];
};

// Format the data from JSON files
const autonomias = autonomiasData.map(item => ({
  id: item.autonomia_id,
  label: item.nombre
}));

// Create a function to get provinces by autonomia ID
const getProvinciasByAutonomia = (autonomiaId: string) => {
  return provinciasData
    .filter(provincia => provincia.comunidad_id === autonomiaId)
    .map(provincia => ({
      id: provincia.provincia_id,
      label: provincia.nombre
    }));
};

// Create a function to get municipalities by province ID
const getMunicipiosByProvincia = (provinciaId: string) => {
  return municipiosData
    .filter(municipio => municipio.provincia_id === provinciaId)
    .map(municipio => ({
      id: municipio.municipio_id,
      label: municipio.nombre
    }));
};

const FilterPanel: React.FC = () => {
  const [expandedSections, setExpandedSections] = useState<string[]>(['ambito']);
  const { 
    filters, 
    updateFilters, 
    applyFilters, 
    clearSearchQuery, 
    resetFilters,
    forceResetRegulations,
    regulations,
  } = useRegulations();
  
  // State for hierarchical location selections
  const [selectedCCAA, setSelectedCCAA] = useState<string>("");
  const [selectedProvincia, setSelectedProvincia] = useState<string>("");
  const [selectedMunicipio, setSelectedMunicipio] = useState<string>("");
  
  const filterSections: FilterSection[] = [
    {
      id: 'ambito',
      label: 'Ámbito temático',
      options: [
        { id: 'economic', label: 'Sostenibilidad Económica' },
        { id: 'environmental', label: 'Sostenibilidad Ambiental' },
		{ id: 'climate', label: 'Cambio Climático' },
		{ id: 'social', label: 'Sostenibilidad Social' },
        { id: 'urban', label: 'Gobernanza Urbana' },
      ],
    },
    {
      id: 'scale',
      label: 'Escala normativa',
      options: [
        { id: 'DOC_UE', label: 'Documento UE' },
        { id: 'REG_UE', label: 'Reglamento UE' },
        { id: 'DIR_UE', label: 'Directiva UE' },
        { id: 'UNE_ISO', label: 'Norma ISO' },
        { id: 'DOC_NA', label: 'Documento Nacional' },
        { id: 'LEY_EST', label: 'Ley Estatal' },
        { id: 'REG_EST', label: 'Reglamento Estatal' },
        { id: 'LEY_CCAA', label: 'Ley CCAA' },
        { id: 'REG_CCAA', label: 'Reglamento CCAA' },
        { id: 'PLAN_TER', label: 'Plan Territorial' },
		{ id: 'PLAN_URB', label: 'Plan Urbano' },
		{ id: 'WHITE_PAPER', label: 'White Paper' },
		{ id: 'NOTICIA', label: 'Noticia' },
		{ id: 'DECISION', label: 'Decisión' },
		{ id: 'INST_AGREE', label: 'Acuerdo Institucional' },
		{ id: 'OTROS', label: 'Otros' },
      ],
    },
    {
      id: 'territorial',
      label: 'Ámbito territorial',
      options: [
        { id: 'comunitario', label: 'Comunitario' },
        { id: 'estatal', label: 'Estatal' },
        { id: 'autonomico', label: 'Autonómico' },
        { id: 'municipal', label: 'Municipal' },
      ],
    },
  ];

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const toggleFilter = (sectionId: string, optionId: string) => {
    updateFilters(sectionId, optionId);
  };

  const isFilterSelected = (sectionId: string, optionId: string) => {
    return filters[sectionId]?.includes(optionId) || false;
  };
  
  const handleCCAAChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const ccaaId = e.target.value;
    setSelectedCCAA(ccaaId);
    setSelectedProvincia("");
    setSelectedMunicipio("");
    
    // Log the selected CCAA ID and name
    const selectedAutonomia = autonomiasData.find(ccaa => ccaa.autonomia_id === ccaaId);
  };
  
  const handleProvinciaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provinciaId = e.target.value;
    setSelectedProvincia(provinciaId);
    setSelectedMunicipio("");
    
    // Log the selected provincia ID and name
    const selectedProvincia = provinciasData.find(prov => prov.provincia_id === provinciaId);
  };
  
  const handleMunicipioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const municipioId = e.target.value;
    setSelectedMunicipio(municipioId);
    
    // Log the selected municipio ID and name
    const selectedMunicipio = municipiosData.find(mun => mun.municipio_id === municipioId);
  };
  
  const handleApplyFilters = () => {
    // Before creating the filter, log the values to see what's going on
    
    // Get the name of the CCAA from its ID for filtering
    let ccaaName = '';
    if (selectedCCAA) {
      const selectedAutonomia = autonomiasData.find(ccaa => ccaa.autonomia_id === selectedCCAA);
      ccaaName = selectedAutonomia?.nombre || '';
    }
    
    // Get the name of the provincia from its ID for filtering
    let provinciaName = '';
    if (selectedProvincia) {
      const selectedProv = provinciasData.find(prov => prov.provincia_id === selectedProvincia);
      provinciaName = selectedProv?.nombre || '';
    }
    
    // Get the name of the municipio from its ID for filtering
    let municipioName = '';
    if (selectedMunicipio) {
      const selectedMun = municipiosData.find(mun => mun.municipio_id === selectedMunicipio);
      municipioName = selectedMun?.nombre || '';
    }
    
    const locationFilter = {
      ccaa: ccaaName || undefined,
      provincia: provinciaName || undefined,
      municipio: municipioName || undefined
    };
    
    // Remove empty values from the location filter
    Object.keys(locationFilter).forEach(key => {
      if (!locationFilter[key as keyof typeof locationFilter]) {
        delete locationFilter[key as keyof typeof locationFilter];
      }
    });
        
    // Apply filters with the location filter
    applyFilters(Object.keys(locationFilter).length > 0 ? locationFilter : undefined);
  };
  
  // Create an enhanced clear filters function
  const handleClearFilters = () => {    
    // 1. Reset UI state (dropdown values)
    setSelectedCCAA("");
    setSelectedProvincia("");
    setSelectedMunicipio("");
    
    // 2. Clear all filters in the context
    Object.keys(filters).forEach(section => {
      updateFilters(section, '', true);
    });
    
    // 3. Clear any search query
    clearSearchQuery();
    
    // 4. Use the direct force reset method to bypass all filtering logic
    forceResetRegulations();
  };

  // Get currently available provinces based on selected CCAA
  const availableProvincias = selectedCCAA ? getProvinciasByAutonomia(selectedCCAA) : [];
  
  // Get currently available municipalities based on selected province
  const availableMunicipios = selectedProvincia ? getMunicipiosByProvincia(selectedProvincia) : [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-4"
    >
      <motion.div 
        className="mb-3"
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Filtros</h3>
        <p className="text-xs text-muted-foreground mt-1">Refina aquí tu búsqueda</p>
      </motion.div>
      
      {/* Regular Filter Sections */}
      {filterSections.map((section, index) => (
        <motion.div 
          key={section.id}
          className="glass-surface p-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <motion.button
            className="w-full flex items-center justify-between p-1 text-sm font-medium"
            onClick={() => toggleSection(section.id)}
            whileTap={{ scale: 0.98 }}
          >
            {section.label}
            <ChevronDown 
              size={16} 
              className={`transition-transform ${expandedSections.includes(section.id) ? 'rotate-180' : ''}`} 
            />
          </motion.button>

          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ 
              height: expandedSections.includes(section.id) ? 'auto' : 0,
              opacity: expandedSections.includes(section.id) ? 1 : 0,
            }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="pt-2 space-y-1">
              {section.options.map((option) => (
                <motion.div
                  key={option.id}
                  className="flex items-center"
                  whileHover={{ x: 2 }}
                  transition={{ duration: 0.1 }}
                >
                  <button
                    onClick={() => toggleFilter(section.id, option.id)}
                    className={`w-full flex items-center px-2 py-1.5 text-xs rounded-md ${
                      isFilterSelected(section.id, option.id)
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted/70'
                    }`}
                  >
                    <span className={`w-4 h-4 mr-2 rounded flex items-center justify-center border ${
                      isFilterSelected(section.id, option.id)
                        ? 'border-primary bg-primary/20'
                        : 'border-muted-foreground'
                    }`}>
                      {isFilterSelected(section.id, option.id) && (
                        <Check size={12} className="text-primary" />
                      )}
                    </span>
                    {option.label}
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      ))}
      
      {/* Location Filter */}
      <motion.div 
        className="glass-surface p-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <motion.button
          className="w-full flex items-center justify-between p-1 text-sm font-medium"
          onClick={() => toggleSection('ubicacion')}
          whileTap={{ scale: 0.98 }}
        >
          Ubicación
          <ChevronDown 
            size={16} 
            className={`transition-transform ${expandedSections.includes('ubicacion') ? 'rotate-180' : ''}`} 
          />
        </motion.button>

        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ 
            height: expandedSections.includes('ubicacion') ? 'auto' : 0,
            opacity: expandedSections.includes('ubicacion') ? 1 : 0,
          }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden"
        >
          <div className="pt-2 space-y-3 px-2">
            {/* CCAA Select */}
            <div>
              <label htmlFor="ccaa-select" className="block text-xs text-muted-foreground mb-1">
                Comunidad Autónoma
              </label>
              <select
                id="ccaa-select"
                className="w-full p-2 text-xs rounded-md bg-muted border border-border"
                value={selectedCCAA}
                onChange={handleCCAAChange}
              >
                <option value="">Selecciona una CCAA</option>
                {autonomias.map(ccaa => (
                  <option key={ccaa.id} value={ccaa.id}>{ccaa.label}</option>
                ))}
              </select>
            </div>
            
            {/* Provincia Select - Only show if CCAA is selected */}
            {selectedCCAA && availableProvincias.length > 0 && (
              <div>
                <label htmlFor="provincia-select" className="block text-xs text-muted-foreground mb-1">
                  Provincia
                </label>
                <select
                  id="provincia-select"
                  className="w-full p-2 text-xs rounded-md bg-muted border border-border"
                  value={selectedProvincia}
                  onChange={handleProvinciaChange}
                >
                  <option value="">Selecciona una provincia</option>
                  {availableProvincias.map(provincia => (
                    <option key={provincia.id} value={provincia.id}>{provincia.label}</option>
                  ))}
                </select>
              </div>
            )}
            
            {/* Municipio Select - Only show if Provincia is selected */}
            {selectedProvincia && availableMunicipios.length > 0 && (
              <div>
                <label htmlFor="municipio-select" className="block text-xs text-muted-foreground mb-1">
                  Ciudad/Municipio
                </label>
                <select
                  id="municipio-select"
                  className="w-full p-2 text-xs rounded-md bg-muted border border-border"
                  value={selectedMunicipio}
                  onChange={handleMunicipioChange}
                >
                  <option value="">Selecciona un municipio</option>
                  {availableMunicipios.map(municipio => (
                    <option key={municipio.id} value={municipio.id}>{municipio.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>

      <motion.div 
        className="flex justify-between mt-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <button 
          className="px-3 py-1.5 text-xs rounded-md bg-muted hover:bg-muted/70 transition-colors"
          onClick={handleClearFilters}
        >
          Limpiar todo
        </button>
        <button 
          className="px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          onClick={handleApplyFilters}
        >
          Aplicar filtros
        </button>
      </motion.div>
    </motion.div>
  );
};

export default FilterPanel;