import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  DoorOpen,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
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
  { value: 'CLASSROOM', label: 'Classroom / Lecture Hall', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  { value: 'LAB', label: 'Laboratory / Research Facility', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  { value: 'AUDITORIUM', label: 'Auditorium / Amphitheatre', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  { value: 'SEMINAR_HALL', label: 'Seminar Hall / Boardroom', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  { value: 'WORKSHOP', label: 'Workshop / Fabrication Bay', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
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
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBlock, setSelectedBlock] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  
  // Modals state
  const [isRoomModalOpen, setIsRoomModalOpen] = useState<boolean>(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State for Registering a New Room
  const [roomFormData, setRoomFormData] = useState({
    node_code: '',
    name: '',
    room_capacity: 60,
    room_type: 'CLASSROOM',
    building_code: 'EEC-ACAD',
    floor_number: 1,
    room_features: ['AC', 'PROJECTOR'] as string[],
    is_operational: true,
  });

  // Form State for Scheduling Timing (Class or Under Work Maintenance Block)
  const [scheduleFormData, setScheduleFormData] = useState({
    room_node_id: '',
    booking_type: 'MAINTENANCE_BLOCK', // MAINTENANCE_BLOCK, CLASS, EXAM
    course_or_event_title: 'Room Under Maintenance & Electrical Repairs',
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
      console.error('Failed to load rooms or bookings:', err);
      setActionMessage({ type: 'error', text: err.message || 'Failed to fetch data.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  const handleToggleFeature = (feature: string) => {
    setRoomFormData((prev) => {
      const exists = prev.room_features.includes(feature);
      return {
        ...prev,
        room_features: exists
          ? prev.room_features.filter((f) => f !== feature)
          : [...prev.room_features, feature],
      };
    });
  };

  const handleRegisterRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);

    if (!roomFormData.node_code.trim()) {
      setActionMessage({ type: 'error', text: 'Room Code is required (e.g. RM-ACAD-305).' });
      return;
    }
    if (!roomFormData.name.trim()) {
      setActionMessage({ type: 'error', text: 'Room Name is required.' });
      return;
    }

    try {
      await api.post('/campus/rooms', {
        node_code: roomFormData.node_code.trim().toUpperCase(),
        name: roomFormData.name.trim(),
        room_capacity: Number(roomFormData.room_capacity),
        room_type: roomFormData.room_type,
        building_code: roomFormData.building_code,
        floor_number: Number(roomFormData.floor_number),
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
        room_capacity: 60,
        room_type: 'CLASSROOM',
        building_code: 'EEC-ACAD',
        floor_number: 1,
        room_features: ['AC', 'PROJECTOR'],
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
          ? 'Room maintenance schedule successfully created! Room locked during this window.'
          : 'Class timing scheduled successfully!',
      });
      setIsScheduleModalOpen(false);
      fetchData();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || 'Scheduling conflict: Room is already booked or under work during this window.',
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

  // Filtered rooms
  const filteredRooms = rooms.filter((room) => {
    const matchesSearch =
      room.node_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.building_code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBlock = selectedBlock === 'ALL' || room.building_code === selectedBlock;
    const matchesType = selectedType === 'ALL' || room.room_type === selectedType;
    return matchesSearch && matchesBlock && matchesType;
  });

  // Aggregated Stats
  const totalCapacity = rooms.reduce((acc, r) => acc + (r.room_capacity || 0), 0);
  const maintenanceCount = bookings.filter((b) => b.booking_type === 'MAINTENANCE_BLOCK').length;
  const activeClassesCount = bookings.filter((b) => b.booking_type === 'CLASS').length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <DoorOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center space-x-2">
              <span>Rooms & Facility Scheduling</span>
              <span className="text-xs px-2 py-0.5 rounded font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20">
                SRM Easwari
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Manage physical rooms, schedule class lectures, and lock rooms under maintenance work.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={fetchData}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {/* Schedule Timing Button */}
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
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold shadow-md shadow-amber-500/20 transition"
          >
            <Calendar className="w-4 h-4" />
            <span>Schedule Class / Work</span>
          </button>

          {/* Add Room Button */}
          <button
            onClick={() => setIsRoomModalOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Room</span>
          </button>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl text-xs font-mono border flex items-center justify-between ${
            actionMessage.type === 'error'
              ? 'bg-rose-950/40 border-rose-500/50 text-rose-300'
              : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            {actionMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Total Rooms</span>
            <DoorOpen className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-1">{rooms.length}</div>
          <span className="text-[11px] text-slate-500">Across 5 campus blocks</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Campus Capacity</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{totalCapacity.toLocaleString()}</div>
          <span className="text-[11px] text-slate-500">Total seating capacity</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Under Work / Maintenance</span>
            <Wrench className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-1">{maintenanceCount}</div>
          <span className="text-[11px] text-slate-500">Scheduled maintenance windows</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Scheduled Classes</span>
            <BookOpen className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-cyan-400 mt-1">{activeClassesCount}</div>
          <span className="text-[11px] text-slate-500">Active class lectures</span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search room code, name, or block..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center space-x-1">
            <span className="text-xs text-slate-400 mr-1">Block:</span>
            <select
              value={selectedBlock}
              onChange={(e) => setSelectedBlock(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Blocks</option>
              {AVAILABLE_BLOCKS.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.code}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-1">
            <span className="text-xs text-slate-400 mr-1">Type:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Types</option>
              {ROOM_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Registered Rooms Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <DoorOpen className="w-4 h-4 text-blue-400" />
            <h3 className="font-bold text-white text-sm">
              Registered Campus Rooms ({rooms.length})
            </h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono">
              <tr>
                <th className="py-3 px-4">Room Code</th>
                <th className="py-3 px-4">Room Name</th>
                <th className="py-3 px-4">Block</th>
                <th className="py-3 px-4">Floor</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Capacity</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredRooms.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500 font-sans">
                    No registered rooms found. Click <button onClick={() => setIsRoomModalOpen(true)} className="text-blue-400 font-semibold underline hover:text-blue-300">Add Room</button> to create rooms.
                  </td>
                </tr>
              ) : (
                filteredRooms.map((room) => {
                  const typeObj = ROOM_TYPES.find((t) => t.value === room.room_type) || {
                    color: 'bg-slate-800 text-slate-300 border-slate-700',
                    label: room.room_type,
                  };

                  // Check if room has an active maintenance block
                  const hasMaintenance = bookings.some(
                    (b) => b.room_node_id === room.id && b.booking_type === 'MAINTENANCE_BLOCK'
                  );

                  return (
                    <tr key={room.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-4 font-mono font-bold text-blue-400">
                        {room.node_code}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-100">{room.name}</td>
                      <td className="py-3 px-4 font-mono text-slate-300">{room.building_code}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">Floor {room.floor_number}</td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-mono border ${typeObj.color}`}>
                          {room.room_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                        {room.room_capacity} seats
                      </td>
                      <td className="py-3 px-4">
                        {hasMaintenance ? (
                          <span className="flex items-center space-x-1 text-[10px] px-2.5 py-1 rounded-full font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            <Wrench className="w-3 h-3 text-amber-400" />
                            <span>UNDER WORK</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleToggleOperational(room)}
                            className={`flex items-center space-x-1.5 text-[11px] px-2.5 py-1 rounded-full font-mono border transition ${
                              room.is_operational
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${room.is_operational ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                            <span>{room.is_operational ? 'Operational' : 'Maintenance'}</span>
                          </button>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => handleOpenScheduleForRoom(room)}
                            className="flex items-center space-x-1 px-2.5 py-1 bg-slate-800 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded text-[11px] font-semibold transition"
                            title="Schedule class timing or maintenance under work"
                          >
                            <Clock className="w-3 h-3" />
                            <span>Schedule</span>
                          </button>
                          <button
                            onClick={() => handleDeleteRoom(room)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded transition"
                            title="Delete room"
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

      {/* Active Schedules & Under Work Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-white text-sm">
              Active Schedules & Under Work Windows ({bookings.length})
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            GiST conflict prevention active &bull; Overlapping times automatically protected
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono">
              <tr>
                <th className="py-2.5 px-3">Room</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Activity / Course Title</th>
                <th className="py-2.5 px-3">Start Time</th>
                <th className="py-2.5 px-3">End Time</th>
                <th className="py-2.5 px-3">Attendees</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No scheduled classes or maintenance work active. Click "Schedule Class / Work" to lock timings!
                  </td>
                </tr>
              ) : (
                bookings.map((b) => {
                  const isMaintenance = b.booking_type === 'MAINTENANCE_BLOCK';
                  const isClass = b.booking_type === 'CLASS';

                  return (
                    <tr key={b.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-400">
                        {b.room_code || 'Room'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-mono border ${
                          isMaintenance
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : isClass
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                            : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                        }`}>
                          {isMaintenance ? 'UNDER WORK' : b.booking_type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-200">
                        {b.course_or_event_title}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-300">
                        {new Date(b.start_time).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-300">
                        {new Date(b.end_time).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-emerald-400 font-bold">
                        {b.student_count}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-mono">
                          {b.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => handleCancelBooking(b.id)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-rose-900 text-slate-300 hover:text-white rounded text-[11px] font-semibold border border-slate-700 transition"
                        >
                          Release / Cancel
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

      {/* Modal: Schedule Class or Maintenance (Under Work) */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in duration-200">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-amber-600/20 text-amber-400 rounded-lg border border-amber-500/30">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Schedule Class or Work Timing</h3>
                  <p className="text-xs text-slate-400">
                    Schedule lectures or lock a room for maintenance & repair work.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  Select Room *
                </label>
                {rooms.length === 0 ? (
                  <div className="p-3 bg-rose-950/20 border border-rose-500/30 rounded-lg text-xs text-rose-300">
                    No rooms registered yet! Please add a room first before scheduling.
                  </div>
                ) : (
                  <select
                    required
                    value={scheduleFormData.room_node_id}
                    onChange={(e) => setScheduleFormData({ ...scheduleFormData, room_node_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Choose Room --</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.node_code} - {r.name} ({r.building_code}, Cap: {r.room_capacity})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
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
                    className={`flex items-center space-x-2 p-2.5 rounded-lg border text-xs font-semibold transition ${
                      scheduleFormData.booking_type === 'MAINTENANCE_BLOCK'
                        ? 'bg-amber-600/20 border-amber-500 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Wrench className="w-4 h-4 text-amber-400" />
                    <span>Under Work / Maintenance</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScheduleFormData({
                      ...scheduleFormData,
                      booking_type: 'CLASS',
                      course_or_event_title: 'Class Lecture',
                    })}
                    className={`flex items-center space-x-2 p-2.5 rounded-lg border text-xs font-semibold transition ${
                      scheduleFormData.booking_type === 'CLASS'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <BookOpen className="w-4 h-4 text-blue-400" />
                    <span>Class Lecture</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  {scheduleFormData.booking_type === 'MAINTENANCE_BLOCK'
                    ? 'Work / Maintenance Description *'
                    : 'Course / Class Title *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    scheduleFormData.booking_type === 'MAINTENANCE_BLOCK'
                      ? 'e.g. Electrical wiring & HVAC filter overhaul'
                      : 'e.g. CS8501 Web Technology Lecture'
                  }
                  value={scheduleFormData.course_or_event_title}
                  onChange={(e) => setScheduleFormData({ ...scheduleFormData, course_or_event_title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    Start Timing *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={scheduleFormData.start_time}
                    onChange={(e) => setScheduleFormData({ ...scheduleFormData, start_time: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    End Timing *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={scheduleFormData.end_time}
                    onChange={(e) => setScheduleFormData({ ...scheduleFormData, end_time: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  Expected Attendees / Students
                </label>
                <input
                  type="number"
                  min={1}
                  value={scheduleFormData.student_count}
                  onChange={(e) => setScheduleFormData({ ...scheduleFormData, student_count: parseInt(e.target.value) || 1 })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-xs font-semibold border border-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rooms.length === 0}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-md shadow-amber-500/20 transition"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in duration-200">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
                  <DoorOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Register New Campus Room</h3>
                  <p className="text-xs text-slate-400">
                    Add room code, name, capacity, and building location.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsRoomModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterRoom} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    Room Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. RM-ACAD-305"
                    value={roomFormData.node_code}
                    onChange={(e) => setRoomFormData({ ...roomFormData, node_code: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white uppercase font-mono placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
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
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  Room Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Advanced AI Research & Computing Lab"
                  value={roomFormData.name}
                  onChange={(e) => setRoomFormData({ ...roomFormData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    Room Type *
                  </label>
                  <select
                    value={roomFormData.room_type}
                    onChange={(e) => setRoomFormData({ ...roomFormData, room_type: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  >
                    {ROOM_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    Building Block *
                  </label>
                  <select
                    value={roomFormData.building_code}
                    onChange={(e) => setRoomFormData({ ...roomFormData, building_code: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  >
                    {AVAILABLE_BLOCKS.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.code} - {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    Floor Number
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={6}
                    value={roomFormData.floor_number}
                    onChange={(e) => setRoomFormData({ ...roomFormData, floor_number: parseInt(e.target.value) || 1 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    Initial Status
                  </label>
                  <select
                    value={roomFormData.is_operational ? 'true' : 'false'}
                    onChange={(e) => setRoomFormData({ ...roomFormData, is_operational: e.target.value === 'true' })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  >
                    <option value="true">Operational</option>
                    <option value="false">Under Maintenance</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-2">
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
                        className={`text-left px-2.5 py-1.5 rounded-lg border text-xs font-mono transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <span>{feat}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsRoomModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-xs font-semibold border border-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-500/20 transition"
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
