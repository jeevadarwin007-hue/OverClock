import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { api } from '../api/client';
import {
  Layers,
  Eye,
  Building,
  Info,
  X,
  AlertTriangle,
  Wrench,
  CheckCircle,
  Compass,
} from 'lucide-react';

export const CampusExplorer: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const [is3D, setIs3D] = useState(true);
  const [mapStatus, setMapStatus] = useState<any>(null);
  const [selectedBlock, setSelectedBlock] = useState<any>(null);
  const [blockDetails, setBlockDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Fetch live block status colors from backend
  const fetchStatus = async () => {
    try {
      const data: any = await api.get('/campus/map-status');
      setMapStatus(data);
      updateBuildingColors(data);
    } catch (err) {
      console.error('Failed to load campus map status:', err);
    }
  };

  const updateBuildingColors = (data: any) => {
    if (!mapRef.current || !mapRef.current.getLayer('buildings-extrusion')) return;

    const matchExpression: any[] = ['match', ['get', 'building_code']];
    data.blocks.forEach((b: any) => {
      matchExpression.push(b.building_code, b.color);
    });
    matchExpression.push('#3b82f6'); // fallback blue

    mapRef.current.setPaintProperty('buildings-extrusion', 'fill-extrusion-color', matchExpression);
  };

  useEffect(() => {
    if (!mapContainer.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [80.1810, 13.0324],
      zoom: 17.2,
      pitch: 58,
      bearing: -22,
      antialias: true,
    });

    mapRef.current = map;

    map.on('load', async () => {
      // Add SRM Easwari GeoJSON Source
      map.addSource('easwari-buildings', {
        type: 'geojson',
        data: '/data/easwari_buildings.geojson',
      });

      // 2.5D Extruded Buildings Layer
      map.addLayer({
        id: 'buildings-extrusion',
        type: 'fill-extrusion',
        source: 'easwari-buildings',
        paint: {
          'fill-extrusion-color': [
            'match',
            ['get', 'building_code'],
            'EEC-ACAD', '#ef4444',
            'EEC-MAIN', '#3b82f6',
            'EEC-MECH-PG', '#3b82f6',
            'EEC-ROBOTICS', '#3b82f6',
            'EEC-AUD-FC', '#3b82f6',
            '#3b82f6'
          ],
          'fill-extrusion-height': ['get', 'height_m'],
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.88,
        },
      });

      // Building Outline Stroke
      map.addLayer({
        id: 'buildings-outline',
        type: 'line',
        source: 'easwari-buildings',
        paint: {
          'line-color': '#ffffff',
          'line-width': 1.5,
          'line-opacity': 0.4,
        },
      });

      // Click to inspect building
      map.on('click', 'buildings-extrusion', async (e) => {
        if (!e.features || e.features.length === 0) return;
        const bCode = e.features[0].properties?.building_code;
        if (bCode) {
          setSelectedBlock(bCode);
          setLoadingDetails(true);
          try {
            const details = await api.get(`/campus/blocks/${bCode}`);
            setBlockDetails(details);
          } catch (err) {
            console.error('Failed to load block details:', err);
          } finally {
            setLoadingDetails(false);
          }
        }
      });

      map.on('mouseenter', 'buildings-extrusion', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'buildings-extrusion', () => {
        map.getCanvas().style.cursor = '';
      });

      fetchStatus();
    });

    return () => {
      map.remove();
    };
  }, []);

  const togglePitch = () => {
    if (!mapRef.current) return;
    if (is3D) {
      mapRef.current.easeTo({ pitch: 0, bearing: 0, duration: 1000 });
      setIs3D(false);
    } else {
      mapRef.current.easeTo({ pitch: 58, bearing: -22, duration: 1000 });
      setIs3D(true);
    }
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden select-none">
      {/* Map Container */}
      <div ref={mapContainer} className="w-full h-full" />

          {/* Map Floating HUD Controls */}
          <div className="absolute top-4 right-4 z-10 flex items-center space-x-2">
            <button
              onClick={togglePitch}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-black/80 backdrop-blur-xl border border-white/20 rounded-full text-xs font-ndot text-white hover:bg-white/10 transition spring-interactive shadow-lg"
            >
              <Compass className="w-3.5 h-3.5 text-nothing-red" />
              <span>{is3D ? '2D View' : '3D Extrusion'}</span>
            </button>
          </div>

          {/* Real-time Status Legend Overlay */}
          <div className="absolute bottom-4 left-4 z-10 bg-black/80 backdrop-blur-xl border border-white/20 rounded-3xl p-3.5 text-xs font-ndot text-white space-y-2 shadow-2xl">
            <div className="font-bold uppercase tracking-wider text-[10px] text-neutral-400">
              Live Block Health Status
            </div>
            <div className="flex items-center space-x-4 text-[11px] font-sans">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-nothing-red nothing-red-dot" />
                <span className="text-white">Active P0 Disruption</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                <span className="text-white">Nominal</span>
              </div>
            </div>
          </div>

          {/* Building Inspector Slide-Over Drawer */}
          {selectedBlock && (
            <div className="absolute top-0 right-0 h-full w-[420px] bg-[#0c0c0e]/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl z-20 p-5 overflow-y-auto space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center space-x-2">
                  <Building className="w-5 h-5 text-nothing-red" />
                  <div>
                    <h3 className="font-bold text-white text-sm font-ndot">
                      {blockDetails?.metadata?.name || selectedBlock}
                    </h3>
                    <span className="text-[11px] font-mono text-neutral-400">
                      Code: {selectedBlock}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedBlock(null)}
                  className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 spring-interactive"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {loadingDetails ? (
                <div className="text-xs text-neutral-400 text-center py-10 font-ndot">
                  Loading building topology...
                </div>
              ) : (
                <>
                  {/* Building Structural Stats */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="bg-black/60 p-3 rounded-2xl border border-white/10">
                      <span className="text-neutral-500 block font-ndot text-[10px]">Floors</span>
                      <span className="text-white font-bold font-ndot text-base">
                        {blockDetails?.metadata?.floors} Stories
                      </span>
                    </div>
                    <div className="bg-black/60 p-3 rounded-2xl border border-white/10">
                      <span className="text-neutral-500 block font-ndot text-[10px]">Height</span>
                      <span className="text-white font-bold font-ndot text-base">
                        {blockDetails?.metadata?.height_m}m
                      </span>
                    </div>
                  </div>

                  {/* Active Incidents inside this block */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-ndot flex items-center space-x-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-nothing-red" />
                      <span>Active Incidents ({blockDetails?.active_work_orders?.length || 0})</span>
                    </h4>
                    {blockDetails?.active_work_orders?.length === 0 ? (
                      <div className="text-xs text-neutral-400 bg-black/60 p-3 rounded-2xl border border-white/10 font-mono">
                        No active maintenance tickets in this block.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {blockDetails?.active_work_orders?.map((wo: any) => (
                          <div
                            key={wo.id}
                            className="p-3 bg-black/60 border border-white/10 rounded-2xl text-xs space-y-1 spring-interactive"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-ndot text-white font-bold">
                                #{wo.ticket_number} ({wo.node_code})
                              </span>
                              <span
                                className={`text-[9px] px-2 py-0.5 rounded-full font-ndot ${
                                  wo.calculated_priority === 'P0_CRITICAL'
                                    ? 'bg-nothing-red/20 text-nothing-red border border-nothing-red/50'
                                    : 'bg-white/10 text-white border border-white/20'
                                }`}
                              >
                                {wo.state}
                              </span>
                            </div>
                            <p className="text-neutral-300 text-[11px] truncate">{wo.raw_description}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Campus Nodes / Rooms list */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-ndot flex items-center space-x-1.5">
                      <Wrench className="w-3.5 h-3.5 text-white" />
                      <span>Rooms & Key Equipment ({blockDetails?.nodes?.length || 0})</span>
                    </h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {blockDetails?.nodes?.map((n: any) => (
                        <div
                          key={n.id}
                          className="p-2.5 bg-black/60 border border-white/10 rounded-2xl flex items-center justify-between text-xs spring-interactive"
                        >
                          <div>
                            <div className="font-ndot font-bold text-white">{n.node_code}</div>
                            <div className="text-[10px] text-neutral-400">
                              {n.name} &bull; Floor {n.floor_number}
                            </div>
                          </div>
                          <span
                            className={`text-[9px] px-2 py-0.5 rounded-full font-ndot ${
                              n.is_operational
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-nothing-red/20 text-nothing-red border border-nothing-red/50'
                            }`}
                          >
                            {n.is_operational ? 'OPERATIONAL' : 'OFFLINE'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
    </div>
  );
};
