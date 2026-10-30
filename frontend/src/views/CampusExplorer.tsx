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
          'line-color': '#93c5fd',
          'line-width': 1.5,
          'line-opacity': 0.6,
        },
      });

      // Click event for building inspection drawer
      map.on('click', 'buildings-extrusion', async (e: any) => {
        if (!e.features || e.features.length === 0) return;
        const feat = e.features[0];
        const bCode = feat.properties.building_code;
        handleBlockClick(bCode);
      });

      map.on('mouseenter', 'buildings-extrusion', () => {
        map.getCanvas().style.cursor = 'pointer';
      });

      map.on('mouseleave', 'buildings-extrusion', () => {
        map.getCanvas().style.cursor = '';
      });

      // Update colors from live database
      fetchStatus();
    });

    return () => {
      map.remove();
    };
  }, []);

  const handleBlockClick = async (bCode: string) => {
    setSelectedBlock(bCode);
    setLoadingDetails(true);
    try {
      const details = await api.get(`/campus/blocks/${bCode}`);
      setBlockDetails(details);
    } catch (err) {
      console.error('Error fetching block details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const togglePitch = () => {
    if (!mapRef.current) return;
    if (is3D) {
      mapRef.current.easeTo({ pitch: 0, bearing: 0, duration: 800 });
      setIs3D(false);
    } else {
      mapRef.current.easeTo({ pitch: 58, bearing: -22, duration: 800 });
      setIs3D(true);
    }
  };

  return (
    <div className="relative h-[calc(100vh-140px)] w-full rounded-xl overflow-hidden border border-[#9c6c4c]/30 shadow-2xl bg-[#180f0a]">
      {/* Map Container */}
      <div ref={mapContainer} className="h-full w-full" />

      {/* Floating Controls & Legend */}
      <div className="absolute top-4 left-4 z-10 space-y-3">
        {/* Pitch Toggle Pill */}
        <div className="glass-panel bg-[#24160f]/85 backdrop-blur-xl border border-[#9c6c4c]/40 p-1.5 rounded-lg flex items-center space-x-1 shadow-lg">
          <button
            onClick={togglePitch}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold spring-interactive transition ${
              is3D ? 'bg-gradient-to-r from-[#ec9665] to-[#f4aa7f] text-[#180f0a] font-bold shadow-md shadow-[#ec9665]/20' : 'text-[#d8bca4]/70 hover:text-[#d8bca4]'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>3D View</span>
          </button>
          <button
            onClick={togglePitch}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold spring-interactive transition ${
              !is3D ? 'bg-gradient-to-r from-[#ec9665] to-[#f4aa7f] text-[#180f0a] font-bold shadow-md shadow-[#ec9665]/20' : 'text-[#d8bca4]/70 hover:text-[#d8bca4]'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>2D View</span>
          </button>
        </div>

        {/* Live Map Legend */}
        <div className="glass-panel bg-[#24160f]/85 backdrop-blur-xl border border-[#9c6c4c]/40 p-3 rounded-lg shadow-lg text-xs space-y-2">
          <div className="text-[11px] font-bold text-[#f4aa7f] uppercase tracking-wider">
            Building Status
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded bg-rose-500 shadow-sm" />
            <span className="text-[#d8bca4]">Critical Alert</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded bg-[#ec9665] shadow-sm" />
            <span className="text-[#d8bca4]">Waiting on Parts</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded bg-[#f4aa7f] shadow-sm" />
            <span className="text-[#d8bca4]">Under Maintenance</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded bg-emerald-500 shadow-sm" />
            <span className="text-[#d8bca4]">Operational</span>
          </div>
        </div>
      </div>

      {/* Building Inspector Slide-Over Drawer */}
      {selectedBlock && (
        <div className="absolute top-0 right-0 h-full w-96 glass-drawer bg-[#24160f]/95 backdrop-blur-2xl border-l border-[#9c6c4c]/40 shadow-2xl z-20 p-5 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#9c6c4c]/30">
            <div className="flex items-center space-x-2">
              <Building className="w-5 h-5 text-[#ec9665]" />
              <div>
                <h3 className="font-bold text-[#d8bca4] text-sm">{blockDetails?.metadata?.name || selectedBlock}</h3>
                <span className="text-[11px] font-mono text-[#d8bca4]/60">Code: {selectedBlock}</span>
              </div>
            </div>
            <button
              onClick={() => setSelectedBlock(null)}
              className="p-1 rounded-md text-[#d8bca4]/60 hover:text-[#d8bca4] hover:bg-[#523624]/40 spring-interactive"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {loadingDetails ? (
            <div className="text-xs text-[#d8bca4]/60 text-center py-10 font-mono">Loading building topology...</div>
          ) : (
            <>
              {/* Building Structural Stats */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-[#180f0a]/60 p-2.5 rounded-lg border border-[#9c6c4c]/30">
                  <span className="text-[#d8bca4]/50 block">Floors</span>
                  <span className="text-[#d8bca4] font-bold">{blockDetails?.metadata?.floors} Stories</span>
                </div>
                <div className="bg-[#180f0a]/60 p-2.5 rounded-lg border border-[#9c6c4c]/30">
                  <span className="text-[#d8bca4]/50 block">Height</span>
                  <span className="text-[#d8bca4] font-bold">{blockDetails?.metadata?.height_m}m</span>
                </div>
              </div>

              {/* Active Incidents inside this block */}
              <div>
                <h4 className="text-xs font-bold text-[#f4aa7f] uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#ec9665]" />
                  <span>Active Disruption Tickets ({blockDetails?.active_work_orders?.length || 0})</span>
                </h4>
                {blockDetails?.active_work_orders?.length === 0 ? (
                  <div className="text-xs text-[#d8bca4]/60 bg-[#180f0a]/60 p-3 rounded-lg border border-[#9c6c4c]/30 font-mono">
                    No active maintenance tickets in this block.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {blockDetails?.active_work_orders?.map((wo: any) => (
                      <div key={wo.id} className="p-2.5 bg-[#180f0a]/60 border border-[#9c6c4c]/30 rounded-lg text-xs space-y-1 spring-interactive">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[#ec9665] font-bold">#{wo.ticket_number} ({wo.node_code})</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                            wo.calculated_priority === 'P0_CRITICAL' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-[#ec9665]/20 text-[#f4aa7f] border border-[#ec9665]/30'
                          }`}>
                            {wo.state}
                          </span>
                        </div>
                        <p className="text-[#d8bca4]/70 text-[11px] truncate">{wo.raw_description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Campus Nodes / Rooms list */}
              <div>
                <h4 className="text-xs font-bold text-[#f4aa7f] uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                  <Wrench className="w-3.5 h-3.5 text-[#ec9665]" />
                  <span>Rooms & Key Equipment ({blockDetails?.nodes?.length || 0})</span>
                </h4>
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {blockDetails?.nodes?.map((n: any) => (
                    <div
                      key={n.id}
                      className="p-2 bg-[#180f0a]/60 border border-[#9c6c4c]/30 rounded-lg flex items-center justify-between text-xs spring-interactive"
                    >
                      <div>
                        <div className="font-mono font-bold text-[#d8bca4]">{n.node_code}</div>
                        <div className="text-[10px] text-[#d8bca4]/60">{n.name} &bull; Floor {n.floor_number}</div>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        n.is_operational ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>
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

