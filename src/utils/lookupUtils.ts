interface LookupItem {
  id: string;
  descripcion: string;
}

// Cache for loaded data to avoid frequent fetches
let ambitoCache: LookupItem[] | null = null;
let escalaNormativaCache: LookupItem[] | null = null;

/**
 * Fetch ambito data from public/data/ambito.json
 */
export const fetchAmbito = async (): Promise<LookupItem[]> => {
  if (ambitoCache) {
    return ambitoCache;
  }

  try {
    const response = await fetch('/data/ambito.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch ambito data: ${response.status}`);
    }
    
    const data = await response.json();
    ambitoCache = data;
    return data;
  } catch (error) {
    console.error('Error fetching ambito data:', error);
    return [];
  }
};

/**
 * Fetch escala normativa data from public/data/escala_normativa.json
 */
export const fetchEscalaNormativa = async (): Promise<LookupItem[]> => {
  if (escalaNormativaCache) {
    return escalaNormativaCache;
  }

  try {
    const response = await fetch('/data/escala_normativa.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch escala normativa data: ${response.status}`);
    }
    
    const data = await response.json();
    escalaNormativaCache = data;
    return data;
  } catch (error) {
    console.error('Error fetching escala normativa data:', error);
    return [];
  }
};

/**
 * Get a readable description for an ambito ID
 */
export const getAmbitoDescription = async (ambitoId: string): Promise<string> => {
  if (!ambitoId) return '';
  
  const ambitoData = await fetchAmbito();
  const item = ambitoData.find(item => item.id === ambitoId);
  return item ? item.descripcion : ambitoId;
};

/**
 * Get a readable description for an escala normativa ID
 */
export const getEscalaNormativaDescription = async (escalaId: string): Promise<string> => {
  if (!escalaId) return '';
  
  const escalaNormativaData = await fetchEscalaNormativa();
  const item = escalaNormativaData.find(item => item.id === escalaId);
  return item ? item.descripcion : escalaId;
}; 