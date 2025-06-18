// API Configuration
// Centralized configuration for all backend service endpoints

// Base URL for the main backend API
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://vies163146.edv.uniovi.es:8000';//'http://localhost:8000';

// API endpoints
export const API_ENDPOINTS = {
  // Chat endpoints
  CHAT_CREATE_SESSION: '/chat/create-session/',
  CHAT_QUERY: '/chat/query/',
  CHAT_SEND_MESSAGE: '/chat/send-message/',
  
  // Document processing endpoints
  UPLOAD_URL: '/upload-url/',
  UPLOAD_PDF: '/upload-pdf/',
  PROCESS_DOCUMENT: '/process-document/',
  
  // Future endpoints can be added here
  // SEARCH: '/search/',
  // ANALYTICS: '/analytics/',
} as const;

// Helper function to build complete URL
export const buildApiUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint}`;
};

// Helper function for common fetch configuration
export const getApiConfig = (method: string = 'GET', body?: any): RequestInit => {
  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  return config;
}; 