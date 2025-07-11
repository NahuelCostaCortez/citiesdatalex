import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useRegulations } from '../context/RegulationsContext';
import { Globe } from 'lucide-react';
import { useMunicipios } from '../utils/municipios';
import ClientOnly from './ClientOnly';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

// Simple map implementation to avoid react-leaflet issues
const MapView: React.FC = () => {
  const { regulations, selectRegulation } = useRegulations();
  const [showControls, setShowControls] = useState(false);
  const { municipios, loading, error, getMunicipioByName } = useMunicipios();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerClusterGroupRef = useRef<any>(null);
  
  // Filter regulations that have a city field
  const regulationsWithCity = regulations.filter(reg => reg.ciudad?.trim());
  
  // Component to load and initialize the map on the client side only
  const MapInstance = () => {
    useEffect(() => {
      // Only run this effect on the client side
      if (typeof window !== 'undefined' && mapRef.current) {
        const initMap = async () => {
          try {
            // Clear any existing map instance
            if (mapInstanceRef.current) {
              mapInstanceRef.current.remove();
            }
            
            // Create map instance
            mapInstanceRef.current = L.map(mapRef.current!).setView([40.416775, -3.70379], 6);
            
            // Add tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(mapInstanceRef.current);
            
            // Create marker cluster group
            markerClusterGroupRef.current = L.markerClusterGroup({
              chunkedLoading: true,
              maxClusterRadius: 30,
              spiderfyOnMaxZoom: true,
              showCoverageOnHover: true,
              zoomToBoundsOnClick: true,
              removeOutsideVisibleBounds: true,
              animate: true,
              disableClusteringAtZoom: 15,
              spiderLegPolylineOptions: { weight: 1.5 },
              iconCreateFunction: function(cluster: any) {
                const childCount = cluster.getChildCount();
                let size = 'small';
                if (childCount > 100) size = 'large';
                else if (childCount > 10) size = 'medium';
                
                return L.divIcon({
                  html: `<div><span>${childCount}</span></div>`,
                  className: `marker-cluster marker-cluster-${size}`,
                  iconSize: L.point(40, 40)
                });
              }
            });
            
            // Agrupar regulaciones por comunidad autónoma
            const regulationsByCCAA = regulationsWithCity.reduce((acc, reg) => {
              if (!reg.ccaa) return acc;
              if (!acc[reg.ccaa]) {
                acc[reg.ccaa] = [];
              }
              acc[reg.ccaa].push(reg);
              return acc;
            }, {} as Record<string, typeof regulationsWithCity>);

            // Crear un cluster group para cada comunidad autónoma
            Object.entries(regulationsByCCAA).forEach(([ccaa, regs]) => {
              const markers = regs
                .map(reg => {
                  const municipio = getMunicipioByName(reg.ciudad);
                  if (!municipio) return null;
                  
                  const marker = L.marker([municipio.lat, municipio.lng]);
                  
                  // Create popup content
                  const popupContent = document.createElement('div');
                  popupContent.innerHTML = `
                    <div class="p-1">
                      <h3 class="font-medium text-sm">${reg.titulo}</h3>
                      <p class="text-xs text-muted mt-1">${reg.ciudad}, ${reg.ccaa}</p>
                      <p class="text-xs mt-2">
                        <a 
                          href="#" 
                          class="text-blue-500 hover:underline view-document-link"
                          data-regulation-id="${reg.id}"
                        >
                          Ver documento
                        </a>
                      </p>
                    </div>
                  `;
                  
                  // Add click handler to the link
                  const link = popupContent.querySelector('.view-document-link') as HTMLElement;
                  if (link) {
                    L.DomEvent.on(link, 'click', (e: Event) => {
                      L.DomEvent.preventDefault(e);
                      const regId = link.getAttribute('data-regulation-id');
                      if (regId) {
                        selectRegulation(regId);
                        marker.closePopup();
                      }
                    });
                  }
                  
                  marker.bindPopup(popupContent);
                  return marker;
                })
                .filter(Boolean);

              // Añadir todos los marcadores de esta comunidad al cluster group
              markers.forEach(marker => {
                if (marker) {
                  markerClusterGroupRef.current.addLayer(marker);
                }
              });
            });
            
            // Add marker cluster group to map
            mapInstanceRef.current.addLayer(markerClusterGroupRef.current);
            
          } catch (err) {
            console.error('Error initializing map:', err);
          }
        };
        
        initMap();
        
        // Cleanup function
        return () => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
          }
          if (markerClusterGroupRef.current) {
            markerClusterGroupRef.current.clearLayers();
            markerClusterGroupRef.current = null;
          }
        };
      }
    }, [regulationsWithCity]);
    
    return null;
  };
  
  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center text-destructive">
        <p>Error loading map data: {error}</p>
      </div>
    );
  }

  return (
    <div 
      className="relative w-full h-full overflow-hidden"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <div ref={mapRef} className="w-full h-full z-10">
        <ClientOnly>
          <MapInstance />
        </ClientOnly>
      </div>
      
      <div className="absolute bottom-8 left-4 z-20">
        <motion.div
          className="glass-surface p-2 text-xs text-muted-foreground"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {regulationsWithCity.filter(reg => getMunicipioByName(reg.ciudad)).length} regulaciones visibles en el mapa
        </motion.div>
      </div>
    </div>
  );
};

export default MapView;