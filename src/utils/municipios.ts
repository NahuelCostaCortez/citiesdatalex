import { useEffect, useState } from 'react';

export interface Municipio {
  nombre: string;
  lat: number;
  lng: number;
  provincia: string;
}

// Cache for municipios data to avoid repeated parsing
let municipiosCache: Municipio[] | null = null;

export const useMunicipios = (): {
  municipios: Municipio[];
  loading: boolean;
  error: string | null;
  getMunicipioByName: (name: string) => Municipio | undefined;
} => {
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // If we've already loaded the data, use the cache
        if (municipiosCache) {
          setMunicipios(municipiosCache);
          setLoading(false);
          return;
        }

        const response = await fetch('/data/municipios.csv');
        if (!response.ok) {
          throw new Error('Failed to fetch municipios data');
        }

        const csvText = await response.text();
        const lines = csvText.split('\n');
        
        // Skip header
        const parsed: Municipio[] = [];
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (!line.trim()) continue;
          
          const columns = line.split(';');
          
          if (columns.length >= 15) {
            const nombre = columns[5]; // NOMBRE_ACTUAL
            const provincia = columns[4]; // PROVINCIA
            
            // Convert coordinates from string to number
            // Replace comma with dot for decimal separator
            const latStr = columns[14].replace(',', '.'); // LATITUD_ETRS89
            const lngStr = columns[13].replace(',', '.'); // LONGITUD_ETRS89
            
            const lat = parseFloat(latStr);
            const lng = parseFloat(lngStr);
            
            if (!isNaN(lat) && !isNaN(lng) && nombre) {
              
              parsed.push({
                nombre,
                lat,
                lng,
                provincia
              });
            }
          }
        }
        
        // Update cache
        municipiosCache = parsed;
        setMunicipios(parsed);
      } catch (err) {
        console.error('Error loading municipios data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getMunicipioByName = (name: string): Municipio | undefined => {
    if (!name) return undefined;
    
    // Normalize names for comparison
    const normalizedName = name.toLowerCase().trim();
    
    // Try exact match first
    let result = municipios.find(m => 
      m.nombre.toLowerCase().trim() === normalizedName
    );
    
    // If no exact match, try a fuzzy match
    if (!result) {
      result = municipios.find(m => 
        m.nombre.toLowerCase().trim().includes(normalizedName) ||
        normalizedName.includes(m.nombre.toLowerCase().trim())
      );
    }
    
    return result;
  };

  return { municipios, loading, error, getMunicipioByName };
}; 