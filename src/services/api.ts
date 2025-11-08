import { Regulation } from '../context/RegulationsContext';
import { buildApiUrl, API_ENDPOINTS, getApiConfig } from '../config/api';

/**
 * Normalize regulation data from backend
 */
const normalizeRegulation = (reg: any): Regulation => {
  // Convert disponible string to boolean
  if (typeof reg.disponible === 'string') {
    reg.disponible = reg.disponible.toLowerCase() === 'true';
  }
  
  // Ensure id is a string
  if (typeof reg.id === 'number') {
    reg.id = String(reg.id);
  }
  
  return reg;
};

/**
 * Test connection to backend
 */
export const testConnection = async (): Promise<boolean> => {
  try {
    const url = buildApiUrl(API_ENDPOINTS.REGULATIONS_COUNT);
    const response = await fetch(url, getApiConfig('GET'));
    
    if (!response.ok) {
      console.error('Connection test failed:', response.status, response.statusText);
      return false;
    }
    
    console.log('Backend connection successful!');
    return true;
  } catch (error) {
    console.error('Connection test failed:', error);
    return false;
  }
};

/**
 * Get the total count of regulations
 */
export const getRegulationsCount = async (): Promise<number> => {
  try {
    const url = buildApiUrl(API_ENDPOINTS.REGULATIONS_COUNT);
    const response = await fetch(url, getApiConfig('GET'));
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Regulations count:', data.count);
    return data.count || 0;
  } catch (error) {
    console.error('Error fetching regulations count:', error);
    throw error;
  }
};

/**
 * Fetch regulations with pagination
 */
export const fetchPaginatedRegulations = async (
  page: number = 1, 
  pageSize: number = 60
): Promise<Regulation[]> => {
  try {
    const url = `${buildApiUrl(API_ENDPOINTS.REGULATIONS_LIST)}?page=${page}&limit=${pageSize}`;
    const response = await fetch(url, getApiConfig('GET'));
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Handle both response formats: {results: [...]} and {data: [...]}
    const regulations = data.results || data.data || [];
    
    // Normalize each regulation
    const normalizedRegulations = regulations.map(normalizeRegulation);
    
    console.log(`Fetched ${normalizedRegulations.length} regulations for page ${page}`);
    return normalizedRegulations;
  } catch (error) {
    console.error('Error fetching paginated regulations:', error);
    throw error;
  }
};

/**
 * Fetch a single regulation by ID
 */
export const fetchRegulationById = async (id: string): Promise<Regulation> => {
  try {
    const url = `${buildApiUrl(API_ENDPOINTS.REGULATIONS_DETAIL)}/${id}`;
    const response = await fetch(url, getApiConfig('GET'));
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const responseData = await response.json();
    
    // Handle both response formats: direct object or {data: {...}}
    const regulation = responseData.data || responseData;
    
    // Normalize the regulation data
    const normalizedRegulation = normalizeRegulation(regulation);
    
    console.log('Fetched regulation by id:', id, normalizedRegulation);
    return normalizedRegulation;
  } catch (error) {
    console.error(`Failed to fetch regulation with id ${id}:`, error);
    throw error;
  }
};

/**
 * Search/filter regulations (legacy function - kept for compatibility)
 */
export const fetchRegulations = async (): Promise<Regulation[]> => {
  console.warn('fetchRegulations is deprecated, use fetchPaginatedRegulations instead');
  return fetchPaginatedRegulations(1, 1000);
}; 