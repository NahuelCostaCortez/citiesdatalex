interface TesauroItem {
  id: string;
  descripcion: string;
  categoria_padre: string;
}

// Cache for tesauro data to avoid frequent fetches
let tesauroCache: TesauroItem[] | null = null;

/**
 * Fetch tesauro data from public/data/tesauro.json
 */
export const fetchTesauro = async (): Promise<TesauroItem[]> => {
  // Return cached data if available
  if (tesauroCache) {
    return tesauroCache;
  }

  try {
    const response = await fetch('/data/tesauro.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch tesauro: ${response.status}`);
    }
    
    const data = await response.json();
    tesauroCache = data;
    return data;
  } catch (error) {
    console.error('Error fetching tesauro data:', error);
    return [];
  }
};

/**
 * Get description for a tesauro code
 */
export const getDescripcionForCode = async (code: string): Promise<string> => {
  const tesauro = await fetchTesauro();
  const item = tesauro.find(item => item.id === code);
  return item ? item.descripcion : code;
};

/**
 * Process a string that may contain multiple codes separated by semicolons
 * Returns an array of { code, descripcion } objects
 */
export const processCodesString = async (codesString: string): Promise<Array<{ code: string, descripcion: string }>> => {
  if (!codesString) return [];
  
  const codes = codesString.split(';').map(code => code.trim()).filter(Boolean);
  const tesauro = await fetchTesauro();
  
  return codes.map(code => {
    const item = tesauro.find(item => item.id === code);
    return {
      code,
      descripcion: item ? item.descripcion : code
    };
  });
}; 