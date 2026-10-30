import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  DoorOpen,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Building2,
  Users,
  Layers,
  Sparkles,
  Trash2,
  RefreshCw,
  X,
  Calendar,
  Clock,
  Wrench,
  BookOpen,
} from 'lucide-react';

interface Room {
  id: string;
  node_code: string;
  name: string;
  building_code: string;
  floor_number: number;
  room_capacity: number;
  room_type: string;
  room_features: string[];
  is_operational: boolean;
  criticality_weight: number;
}

interface Booking {
  id: string;
  room_node_id: string;
  room_code?: string;
  room_name?: string;
  building_code?: string;
  booking_type: string;
  course_or_event_title: string;
  student_count: number;
  start_time: string;
  end_time: string;
  status: string;
}

const AVAILABLE_BLOCKS = [
  { code: 'EEC-MAIN', name: 'Main Administrative Block' },
  { code: 'EEC-ACAD', name: 'Academic Tech Block (CSE/IT/AI&DS)' },
  { code: 'EEC-MECH-PG', name: 'Mechanical, Civil & Central PG Library' },
  { code: 'EEC-ROBOTICS', name: 'ABB Robotics Research & Automation' },
  { code: 'EEC-AUD-FC', name: 'TRP Auditorium & Food Court' },
];

const ROOM_TYPES = [
  { value: 'CLASSROOM', label: 'Classroom / Lecture Hall', color: 'bg-white/10 text-white border-white/20' },
  { value: 'LAB', label: 'Laboratory / Research Facility', color: 'bg-white/10 text-neutral-300 border-white/20' },
  { value: 'AUDITORIUM', label: 'Auditorium / Amphitheatre', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  { value: 'SEMINAR_HALL', label: 'Seminar Hall / Boardroom', color: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
  { value: 'WORKSHOP', label: 'Workshop / Fabrication Bay', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
];

const FEATURE_OPTIONS = [
  'PROJECTOR',
  'AC',
  'COMPUTERS',
  'AUDIO_SYSTEM',
  'SMART_BOARD',
  'WIFI_AP',
  'RAMP_ACCESS',
  '3_PHASE_POWER',
];

const getNowPlusHours = (hours: number) => {
  const d = new Date();
  d.setHours(d.getHours() + hours);
  d.setMinutes(0);
  d.setSeconds(0);
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
};

export const RoomManagementView: React.FC = () => {
  const { currentUser } = useAuth();
  const isAdmin = currentUser.role === 'SYS_ADMIN' || currentUser.role === 'FACILITIES_ADMIN';

  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBlock, setSelectedBlock] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal: Register Room
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [roomFormData, setRoomFormData] = useState({
    node_code: '',
    name: '',
    building_code: 'EEC-ACAD',
    floor_number: 1,
    room_capacity: 60,
    room_type: 'CLASSROOM',
    room_features: ['PROJECTOR', 'AC'],
    is_operational: true,
  });

  // Modal: Schedule Class / Maintenance Work
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleFormData, setScheduleFormData] = useState({
    room_node_id: '',
    booking_type: 'MAINTENANCE_BLOCK',
    course_or_event_title: '',
    student_count: 30,
    start_time: getNowPlusHours(1),
    end_time: getNowPlusHours(3),
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [roomsData, bookingsData] = await Promise.all([
        api.get<Room[]>('/campus/rooms'),
        api.get<Booking[]>('/bookings'),
      ]);
      setRooms(roomsData);
      setBookings(bookingsData);
    } catch (err: any) {
      console.error('Failed to load room data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleFeature = (feat: string) => {
    setRoomFormData((prev) => ({
      ...prev,
      room_features: prev.room_features.includes(feat)
        ? prev.room_features.filter((f) => f !== feat)
        : [...prev.room_features, feat],
    }));
  };

  const handleRegisterRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);

    if (!roomFormData.node_code.trim() || !roomFormData.name.trim()) {
      setActionMessage({ type: 'error', text: 'Room Code and Room Name are required.' });
      return;
    }

    try {
      await api.post('/campus/rooms', {
        node_code: roomFormData.node_code.trim().toUpperCase(),
        name: roomFormData.name.trim(),
        building_code: roomFormData.building_code,
        floor_number: Number(roomFormData.floor_number),
        room_capacity: Number(roomFormData.room_capacity),
        room_type: roomFormData.room_type,
        room_features: roomFormData.room_features,
        is_operational: roomFormData.is_operational,
      });

      setActionMessage({
        type: 'success',
        text: `Room ${roomFormData.node_code.toUpperCase()} registered successfully!`,
      });
      setIsRoomModalOpen(false);
      setRoomFormData({
        node_code: '',
        name: '',
        building_code: 'EEC-ACAD',
        floor_number: 1,
        room_capacity: 60,
        room_type: 'CLASSROOM',
        room_features: ['PROJECTOR', 'AC'],
        is_operational: true,
      });
      fetchData();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || 'Failed to register room. Ensure room code is unique.',
      });
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);

    if (!scheduleFormData.room_node_id) {
      setActionMessage({ type: 'error', text: 'Please select a room to schedule.' });
      return;
    }
    if (!scheduleFormData.course_or_event_title.trim()) {
      setActionMessage({ type: 'error', text: 'Title or maintenance description is required.' });
      return;
    }

    try {
      const startIso = new Date(scheduleFormData.start_time).toISOString();
      const endIso = new Date(scheduleFormData.end_time).toISOString();

      if (new Date(endIso) <= new Date(startIso)) {
        setActionMessage({ type: 'error', text: 'End timing must be later than start timing.' });
        return;
      }

      await api.post('/bookings', {
        room_node_id: scheduleFormData.room_node_id,
        booking_type: scheduleFormData.booking_type,
        course_or_event_title: scheduleFormData.course_or_event_title.trim(),
        student_count: Number(scheduleFormData.student_count),
        start_time: startIso,
        end_time: endIso,
        required_features: [],
      });

      setActionMessage({
        type: 'success',
        text: scheduleFormData.booking_type === 'MAINTENANCE_BLOCK'
          ? 'Room maintenance schedule created! Room locked during window.'
          : 'Class timing scheduled successfully!',
      });
      setIsScheduleModalOpen(false);
      fetchData();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || 'Scheduling conflict: Room is already booked during this window.',
      });
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm('Cancel and release this room schedule window?')) return;
    try {
      await api.delete(`/bookings/${bookingId}`);
      setActionMessage({ type: 'success', text: 'Room timing released successfully.' });
      fetchData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to release booking.' });
    }
  };

  const handleOpenScheduleForRoom = (room: Room) => {
    setScheduleFormData((prev) => ({
      ...prev,
      room_node_id: room.id,
      booking_type: 'MAINTENANCE_BLOCK',
      course_or_event_title: `Maintenance & Repairs in ${room.node_code}`,
      start_time: getNowPlusHours(1),
      end_time: getNowPlusHours(3),
    }));
    setIsScheduleModalOpen(true);
  };

  const handleToggleOperational = async (room: Room) => {
    try {
      await api.patch(`/campus/rooms/${room.id}`, {
        is_operational: !room.is_operational,
      });
      setRooms((prev) =>
        prev.map((r) => (r.id === room.id ? { ...r, is_operational: !r.is_operational } : r))
      );
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to update room status.' });
    }
  };

  const handleDeleteRoom = async (room: Room) => {
    if (!window.confirm(`Are you sure you want to delete room ${room.node_code} (${room.name})?`)) {
      return;
    }
    try {
      await api.delete(`/campus/rooms/${room.id}`);
      setActionMessage({ type: 'success', text: `Room ${room.node_code} deleted successfully.` });
      setRooms((prev) => prev.filter((r) => r.id !== room.id));
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to delete room.' });
    }
  };

  const filteredRooms = rooms.filter((r) => {
    const matchesSearch =
      r.node_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.building_code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBlock = selectedBlock === 'ALL' || r.building_code === selectedBlock;
    const matchesType = selectedType === 'ALL' || r.room_type === selectedType;
    return matchesSearch && matchesBlock && matchesType;
  });

  const totalCapacity = rooms.reduce((acc, r) => acc + (r.room_capacity || 0), 0);
  const maintenanceCount = bookings.filter((b) => b.booking_type === 'MAINTENANCE_BLOCK').length;
  const activeClassesCount = bookings.filter((b) => b.booking_type === 'CLASS').length;

  return (
    <div className="h-full flex flex-col bg-transparent text-white overflow-y-auto p-4 space-y-4 font-sans">
      {/* Top Controls Strip */}
      <div className="nothing-widget rounded-3xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-white/10 text-white rounded-2xl border border-white/20 shadow-sm spring-interactive">
            <Building2 className="w-5 h-5 text-nothing-red" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white uppercase tracking-wider font-ndot">
              Campus Spaces & Maintenance Windows
            </h1>
            <p className="text-xs text-neutral-400 font-sans mt-0.5">
              Live room capacity, scheduled classes, and maintenance lockouts.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={fetchData}
            className="p-2 bg-[#121215] hover:bg-white/10 text-white rounded-full border border-white/15 text-xs transition spring-interactive"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => {
              if (rooms.length > 0) {
                setScheduleFormData((prev) => ({
                  ...prev,
                  room_node_id: rooms[0].id,
                }));
              }
              setIsScheduleModalOpen(true);
            }}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 nothing-btn-outline text-white rounded-full text-xs font-semibold shadow transition spring-interactive"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Schedule Work / Class</span>
          </button>

          <button
            onClick={() => setIsRoomModalOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-1.5 nothing-btn-primary text-black rounded-full text-xs font-bold shadow transition spring-interactive"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Room</span>
          </button>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionMessage && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-ndot border flex items-center justify-between ${
            actionMessage.type === 'error'
              ? 'bg-nothing-red/20 border-nothing-red/50 text-white'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          }`}
        >
          <div className="flex items-center space-x-2">
            {actionMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-nothing-red shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-neutral-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="nothing-widget p-4 rounded-3xl shadow spring-interactive">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-neutral-400 font-ndot uppercase tracking-widest">Total Rooms</span>
            <DoorOpen className="w-4 h-4 text-white" />
          </div>
          <div className="text-2xl font-bold text-white mt-1 font-ndot">{rooms.length}</div>
          <span className="text-[11px] text-neutral-500">Across 5 campus blocks</span>
        </div>

        <div className="nothing-widget p-4 rounded-3xl shadow spring-interactive">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-neutral-400 font-ndot uppercase tracking-widest">Capacity</span>
            <Users className="w-4 h-4 text-white" />
          </div>
          <div className="text-2xl font-bold text-white mt-1 font-ndot">{totalCapacity.toLocaleString()}</div>
          <span className="text-[11px] text-neutral-500">Total seating capacity</span>
        </div>

        <div className="nothing-widget p-4 rounded-3xl shadow spring-interactive">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-neutral-400 font-ndot uppercase tracking-widest">Under Work</span>
            <Wrench className="w-4 h-4 text-nothing-red" />
          </div>
          <div className="text-2xl font-bold text-nothing-red mt-1 font-ndot">{maintenanceCount}</div>
          <span className="text-[11px] text-neutral-500">Maintenance lockouts</span>
        </div>

        <div className="nothing-widget p-4 rounded-3xl shadow spring-interactive">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-neutral-400 font-ndot uppercase tracking-widest">Active Classes</span>
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <div className="text-2xl font-bold text-white mt-1 font-ndot">{activeClassesCount}</div>
          <span className="text-[11px] text-neutral-500">Scheduled lectures</span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="nothing-widget rounded-3xl p-3 shadow flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search room code, name, or block..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#121215] border border-white/15 rounded-full pl-9 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white font-mono"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center space-x-1">
            <span className="text-xs text-neutral-400 font-ndot mr-1">Block:</span>
            <select
              value={selectedBlock}
              onChange={(e) => setSelectedBlock(e.target.value)}
              className="bg-[#121215] border border-white/15 text-xs text-white rounded-full px-3 py-1.5 focus:outline-none font-sans cursor-pointer"
            >
              <option value="ALL" className="bg-black text-white">All Blocks</option>
              {AVAILABLE_BLOCKS.map((b) => (
                <option key={b.code} value={b.code} className="bg-black text-white">
                  {b.code}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-1">
            <span className="text-xs text-neutral-400 font-ndot mr-1">Type:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-[#121215] border border-white/15 text-xs text-white rounded-full px-3 py-1.5 focus:outline-none font-sans cursor-pointer"
            >
              <option value="ALL" className="bg-black text-white">All Types</option>
              {ROOM_TYPES.map((t) => (
                <option key={t.value} value={t.value} className="bg-black text-white">
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Dual Space-Efficient Split: Rooms Ledger (7 Cols) + Active Schedules & Work Windows (5 Cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 flex-1 overflow-hidden min-h-[460px]">
        {/* Left: Registered Campus Rooms */}
        <div className="xl:col-span-7 nothing-widget rounded-3xl flex flex-col overflow-hidden shadow-lg">
          <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2">
              <DoorOpen className="w-4 h-4 text-nothing-red" />
              <h3 className="font-bold text-white text-xs uppercase tracking-wider font-ndot">
                Registered Campus Rooms ({rooms.length})
              </h3>
            </div>
            {isAdmin && (
              <button
                onClick={() => setIsRoomModalOpen(true)}
                className="px-3 py-1 nothing-btn-primary text-black font-bold text-xs rounded-full spring-interactive shadow"
              >
                + Add Room
              </button>
            )}
          </div>

          <div className="overflow-auto flex-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#121215] text-neutral-400 border-b border-white/10 font-ndot text-[10px] sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="py-2.5 px-3 w-28 border-r border-white/10">Room Code</th>
                  <th className="py-2.5 px-3 border-r border-white/10">Room Name</th>
                  <th className="py-2.5 px-3 w-24 border-r border-white/10">Block</th>
                  <th className="py-2.5 px-3 w-28 border-r border-white/10">Type</th>
                  <th className="py-2.5 px-3 w-16 border-r border-white/10 text-right">Cap</th>
                  <th className="py-2.5 px-3 w-24 border-r border-white/10 text-right">Status</th>
                  <th className="py-2.5 px-3 w-20 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {filteredRooms.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-neutral-500 font-ndot text-xs">
                      No registered rooms found. Click "+ Add Room" to register spaces.
                    </td>
                  </tr>
                ) : (
                  filteredRooms.map((room) => {
                    const typeObj = ROOM_TYPES.find((t) => t.value === room.room_type) || {
                      color: 'bg-white/10 text-white border-white/20',
                      label: room.room_type,
                    };

                    const hasMaintenance = bookings.some(
                      (b) => b.room_node_id === room.id && b.booking_type === 'MAINTENANCE_BLOCK'
                    );

                    return (
                      <tr key={room.id} className="hover:bg-white/[0.03] transition spring-row h-9">
                        <td className="py-1.5 px-3 font-ndot font-bold text-white border-r border-white/10 truncate">
                          {room.node_code}
                        </td>
                        <td className="py-1.5 px-3 font-semibold text-white border-r border-white/10 truncate">
                          {room.name}
                        </td>
                        <td className="py-1.5 px-3 font-mono text-neutral-300 border-r border-white/10">
                          {room.building_code}
                        </td>
                        <td className="py-1.5 px-3 border-r border-white/10">
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-ndot border ${typeObj.color}`}>
                            {room.room_type}
                          </span>
                        </td>
                        <td className="py-1.5 px-3 font-ndot font-bold text-white text-right border-r border-white/10">
                          {room.room_capacity}
                        </td>
                        <td className="py-1.5 px-3 text-right border-r border-white/10">
                          {hasMaintenance ? (
                            <span className="inline-flex items-center space-x-1 text-[9px] px-2 py-0.5 rounded-full font-ndot bg-nothing-red/20 text-nothing-red border border-nothing-red/40">
                              <Wrench className="w-2.5 h-2.5 text-nothing-red" />
                              <span>WORK</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => handleToggleOperational(room)}
                              className={`inline-flex items-center space-x-1 text-[9px] px-2 py-0.5 rounded-full font-ndot border transition spring-interactive ${
                                room.is_operational
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                                  : 'bg-nothing-red/20 text-nothing-red border-nothing-red/40 hover:bg-nothing-red/30'
                              }`}
                            >
                              <span>{room.is_operational ? 'OK' : 'OFFLINE'}</span>
                            </button>
                          )}
                        </td>
                        <td className="py-1.5 px-3 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => handleOpenScheduleForRoom(room)}
                              className="p-1 hover:bg-white/10 text-neutral-300 rounded-full transition spring-interactive"
                              title="Schedule Work / Class"
                            >
                              <Clock className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRoom(room)}
                              className="p-1 hover:bg-nothing-red/20 text-neutral-400 hover:text-nothing-red rounded-full transition spring-interactive"
                              title="Delete Room"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Active Schedules & Under Work Windows */}
        <div className="xl:col-span-5 nothing-widget rounded-3xl flex flex-col overflow-hidden shadow-lg">
          <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-nothing-red" />
              <h3 className="font-bold text-white text-xs uppercase tracking-wider font-ndot">
                Schedules & Maintenance ({bookings.length})
              </h3>
            </div>
            {isAdmin && (
              <button
                onClick={() => setIsScheduleModalOpen(true)}
                className="px-3 py-1 nothing-btn-outline text-white text-xs rounded-full font-ndot spring-interactive shadow"
              >
                + Schedule
              </button>
            )}
          </div>

          <div className="overflow-auto flex-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#121215] text-neutral-400 border-b border-white/10 font-ndot text-[10px] sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="py-2.5 px-3 w-24 border-r border-white/10">Room</th>
                  <th className="py-2.5 px-3 w-20 border-r border-white/10">Type</th>
                  <th className="py-2.5 px-3 border-r border-white/10">Activity Title</th>
                  <th className="py-2.5 px-3 w-28 border-r border-white/10">Window</th>
                  <th className="py-2.5 px-3 w-16 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-neutral-500 font-ndot text-xs">
                      No active bookings or maintenance lockouts.
                    </td>
                  </tr>
                ) : (
                  bookings.map((b) => {
                    const isMaintenance = b.booking_type === 'MAINTENANCE_BLOCK';
                    return (
                      <tr key={b.id} className="hover:bg-white/[0.03] transition spring-row h-9">
                        <td className="py-1.5 px-3 font-ndot font-bold text-white border-r border-white/10">
                          {b.room_code || 'Room'}
                        </td>
                        <td className="py-1.5 px-3 border-r border-white/10">
                          <span
                            className={`text-[9px] px-2 py-0.5 rounded-full font-ndot border ${
                              isMaintenance
                                ? 'bg-nothing-red/20 text-nothing-red border-nothing-red/40 font-bold'
                                : 'bg-white/10 text-white border-white/20'
                            }`}
                          >
                            {isMaintenance ? 'WORK' : 'CLASS'}
                          </span>
                        </td>
                        <td className="py-1.5 px-3 font-semibold text-white border-r border-white/10 truncate">
                          {b.course_or_event_title}
                        </td>
                        <td className="py-1.5 px-3 font-mono text-[10px] text-neutral-300 border-r border-white/10 truncate">
                          {new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                          {new Date(b.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-1.5 px-3 text-right">
                          <button
                            onClick={() => handleCancelBooking(b.id)}
                            className="px-2 py-0.5 nothing-btn-outline text-white hover:text-nothing-red rounded-full text-[10px] font-semibold transition spring-interactive"
                          >
                            Cancel
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal: Schedule Class or Maintenance Work */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="nothing-widget rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2.5 bg-white/10 text-white rounded-2xl border border-white/20">
                  <Calendar className="w-5 h-5 text-nothing-red" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm font-ndot">Schedule Class or Work Window</h3>
                  <p className="text-xs text-neutral-400 font-sans">
                    Schedule lectures or lock a room for maintenance & repair work.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1.5 rounded-full hover:bg-white/10 spring-interactive"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-ndot uppercase tracking-widest text-neutral-400 mb-1">
                  Select Room *
                </label>
                {rooms.length === 0 ? (
                  <div className="p-3 bg-nothing-red/20 border border-nothing-red/40 rounded-2xl text-xs text-white">
                    No rooms registered yet! Please add a room first before scheduling.
                  </div>
                ) : (
                  <select
                    required
                    value={scheduleFormData.room_node_id}
                    onChange={(e) => setScheduleFormData({ ...scheduleFormData, room_node_id: e.target.value })}
                    className="w-full bg-black/80 border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-white"
                  >
                    <option value="" className="bg-black text-white">-- Choose Room --</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id} className="bg-black text-white">
                        {r.node_code} - {r.name} ({r.building_code}, Cap: {r.room_capacity})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-ndot uppercase tracking-widest text-neutral-400 mb-1">
                  Schedule Type *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setScheduleFormData({
                      ...scheduleFormData,
                      booking_type: 'MAINTENANCE_BLOCK',
                      course_or_event_title: 'Room Under Maintenance & Work',
                    })}
                    className={`flex items-center space-x-2 p-3 rounded-2xl border text-xs font-semibold spring-interactive transition ${
                      scheduleFormData.booking_type === 'MAINTENANCE_BLOCK'
                        ? 'bg-nothing-red/20 border-nothing-red text-white'
                        : 'bg-black/60 border-white/15 text-neutral-400 hover:border-white/30'
                    }`}
                  >
                    <Wrench className="w-4 h-4 text-nothing-red" />
                    <span>Maintenance Lockout</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScheduleFormData({
                      ...scheduleFormData,
                      booking_type: 'CLASS',
                      course_or_event_title: 'Class Lecture',
                    })}
                    className={`flex items-center space-x-2 p-3 rounded-2xl border text-xs font-semibold spring-interactive transition ${
                      scheduleFormData.booking_type === 'CLASS'
                        ? 'bg-white/20 border-white text-white'
                        : 'bg-black/60 border-white/15 text-neutral-400 hover:border-white/30'
                    }`}
                  >
                    <BookOpen className="w-4 h-4 text-white" />
                    <span>Class Lecture</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-ndot uppercase tracking-widest text-neutral-400 mb-1">
                  {scheduleFormData.booking_type === 'MAINTENANCE_BLOCK'
                    ? 'Work / Maintenance Description *'
                    : 'Course / Class Title *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    scheduleFormData.booking_type === 'MAINTENANCE_BLOCK'
                      ? 'e.g. Electrical wiring & HVAC overhaul'
                      : 'e.g. CS8501 Web Technology Lecture'
                  }
                  value={scheduleFormData.course_or_event_title}
                  onChange={(e) => setScheduleFormData({ ...scheduleFormData, course_or_event_title: e.target.value })}
                  className="w-full bg-black/80 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-ndot uppercase tracking-widest text-neutral-400 mb-1">
                    Start Timing *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={scheduleFormData.start_time}
                    onChange={(e) => setScheduleFormData({ ...scheduleFormData, start_time: e.target.value })}
                    className="w-full bg-black/80 border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-ndot uppercase tracking-widest text-neutral-400 mb-1">
                    End Timing *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={scheduleFormData.end_time}
                    onChange={(e) => setScheduleFormData({ ...scheduleFormData, end_time: e.target.value })}
                    className="w-full bg-black/80 border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-ndot uppercase tracking-widest text-neutral-400 mb-1">
                  Expected Attendees
                </label>
                <input
                  type="number"
                  min={1}
                  value={scheduleFormData.student_count}
                  onChange={(e) => setScheduleFormData({ ...scheduleFormData, student_count: parseInt(e.target.value) || 1 })}
                  className="w-full bg-black/80 border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-white"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-4 py-2 nothing-btn-outline text-white rounded-full text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rooms.length === 0}
                  className="px-5 py-2 nothing-btn-primary text-black font-bold rounded-full text-xs shadow disabled:opacity-50 transition"
                >
                  Confirm Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Register New Room */}
      {isRoomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="nothing-widget rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2.5 bg-white/10 text-white rounded-2xl border border-white/20">
                  <DoorOpen className="w-5 h-5 text-nothing-red" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm font-ndot">Register Campus Room</h3>
                  <p className="text-xs text-neutral-400 font-sans">
                    Add room code, name, capacity, and building location.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsRoomModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1.5 rounded-full hover:bg-white/10 spring-interactive"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterRoom} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-ndot uppercase tracking-widest text-neutral-400 mb-1">
                    Room Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. RM-ACAD-305"
                    value={roomFormData.node_code}
                    onChange={(e) => setRoomFormData({ ...roomFormData, node_code: e.target.value })}
                    className="w-full bg-black/80 border border-white/15 rounded-xl px-3 py-2 text-xs text-white uppercase font-mono placeholder-neutral-500 focus:outline-none focus:border-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-ndot uppercase tracking-widest text-neutral-400 mb-1">
                    Seating Capacity *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={2000}
                    placeholder="e.g. 60"
                    value={roomFormData.room_capacity}
                    onChange={(e) => setRoomFormData({ ...roomFormData, room_capacity: parseInt(e.target.value) || 0 })}
                    className="w-full bg-black/80 border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-ndot uppercase tracking-widest text-neutral-400 mb-1">
                  Room Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Advanced AI Research & Computing Lab"
                  value={roomFormData.name}
                  onChange={(e) => setRoomFormData({ ...roomFormData, name: e.target.value })}
                  className="w-full bg-black/80 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-ndot uppercase tracking-widest text-neutral-400 mb-1">
                    Room Type *
                  </label>
                  <select
                    value={roomFormData.room_type}
                    onChange={(e) => setRoomFormData({ ...roomFormData, room_type: e.target.value })}
                    className="w-full bg-black/80 border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-sans focus:outline-none focus:border-white cursor-pointer"
                  >
                    {ROOM_TYPES.map((t) => (
                      <option key={t.value} value={t.value} className="bg-black text-white">
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-ndot uppercase tracking-widest text-neutral-400 mb-1">
                    Building Block *
                  </label>
                  <select
                    value={roomFormData.building_code}
                    onChange={(e) => setRoomFormData({ ...roomFormData, building_code: e.target.value })}
                    className="w-full bg-black/80 border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-sans focus:outline-none focus:border-white cursor-pointer"
                  >
                    {AVAILABLE_BLOCKS.map((b) => (
                      <option key={b.code} value={b.code} className="bg-black text-white">
                        {b.code} - {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-ndot uppercase tracking-widest text-neutral-400 mb-1">
                    Floor Number
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={6}
                    value={roomFormData.floor_number}
                    onChange={(e) => setRoomFormData({ ...roomFormData, floor_number: parseInt(e.target.value) || 1 })}
                    className="w-full bg-black/80 border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-ndot uppercase tracking-widest text-neutral-400 mb-1">
                    Initial Status
                  </label>
                  <select
                    value={roomFormData.is_operational ? 'true' : 'false'}
                    onChange={(e) => setRoomFormData({ ...roomFormData, is_operational: e.target.value === 'true' })}
                    className="w-full bg-black/80 border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-sans focus:outline-none focus:border-white cursor-pointer"
                  >
                    <option value="true" className="bg-black text-white">Operational</option>
                    <option value="false" className="bg-black text-white">Under Maintenance</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-ndot uppercase tracking-widest text-neutral-400 mb-2">
                  Room Features & Amenities
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {FEATURE_OPTIONS.map((feat) => {
                    const isSelected = roomFormData.room_features.includes(feat);
                    return (
                      <button
                        type="button"
                        key={feat}
                        onClick={() => handleToggleFeature(feat)}
                        className={`text-left px-3 py-2 rounded-xl border text-xs font-ndot transition flex items-center justify-between spring-interactive ${
                          isSelected
                            ? 'bg-white/20 border-white text-white'
                            : 'bg-black/60 border-white/15 text-neutral-400 hover:border-white/30'
                        }`}
                      >
                        <span>{feat}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsRoomModalOpen(false)}
                  className="px-4 py-2 nothing-btn-outline text-white rounded-full text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 nothing-btn-primary text-black font-bold rounded-full text-xs shadow transition"
                >
                  Register Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
