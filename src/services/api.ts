import { Regulation } from '../context/RegulationsContext';
import { supabase } from '../lib/supabase';

/**
 * Test connection to Supabase
 */
export const testConnection = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.from('registros').select('count');
    
    if (error) {
      console.error('Connection test failed:', error);
      return false;
    }
    
    console.log('Supabase connection successful!', data);
    return true;
  } catch (error) {
    console.error('Connection test failed:', error);
    return false;
  }
};

/**
 * Fetch all regulations from Supabase
 */
export const fetchRegulations = async (): Promise<Regulation[]> => {
  try {
    let allData: Regulation[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('registros')
        .select('*')
        .range(page * pageSize, (page + 1) * pageSize - 1);
      
      if (error) {
        throw new Error(`Error fetching regulations: ${error.message}`);
      }
      
      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        allData = [...allData, ...data];
        page++;
      }
    }
    
    return allData;
  } catch (error) {
    console.error('Failed to fetch regulations:', error);
    throw error;
  }
};

/**
 * Fetch a single regulation by ID from Supabase
 */
export const fetchRegulationById = async (id: string): Promise<Regulation> => {
  try {
    const { data, error } = await supabase
      .from('registros')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      throw new Error(`Error fetching regulation: ${error.message}`);
    }
    
    if (!data) {
      throw new Error(`Regulation with id ${id} not found`);
    }
    
    return data;
  } catch (error) {
    console.error(`Failed to fetch regulation with id ${id}:`, error);
    throw error;
  }
};

/**
 * Get the total count of regulations
 */
export const getRegulationsCount = async (): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('registros')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      throw new Error(`Error getting regulations count: ${error.message}`);
    }
    
    return count || 0;
  } catch (error) {
    console.error('Failed to get regulations count:', error);
    throw error;
  }
};

/**
 * Fetch regulations with pagination
 */
export const fetchPaginatedRegulations = async (
  page: number = 1, 
  pageSize: number = 12,
  filters?: any
): Promise<Regulation[]> => {
  try {
    let query = supabase
      .from('registros')
      .select('*')
      .range((page - 1) * pageSize, page * pageSize - 1);
    
    // Apply filters if provided
    if (filters?.searchQuery) {
      const searchTerm = `%${filters.searchQuery}%`;
      query = query.or(`titulo.ilike.${searchTerm},ciudad.ilike.${searchTerm},ambito.ilike.${searchTerm}`);
    }
    
    if (filters?.ambito?.length > 0) {
      // Add ambito filters
      // Note: Implement specific filter logic based on your schema
    }
    
    // Add other filters as needed
    
    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Error fetching paginated regulations: ${error.message}`);
    }
    
    return data || [];
  } catch (error) {
    console.error('Failed to fetch paginated regulations:', error);
    throw error;
  }
}; 