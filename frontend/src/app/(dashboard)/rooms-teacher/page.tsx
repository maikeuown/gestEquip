'use client';

import { useEffect, useState } from 'react';
import { Heart, Search, Clock, Users, Monitor, X, ChevronDown, MapPin, Calendar } from 'lucide-react';
import Header from '@/components/layout/Header';
import { roomsApi, favoriteRoomsApi, schedulesApi } from '@/lib/api';
import type { Room, FavoriteRoom, Schedule } from '@/types';
import { isRoomAvailable, getRoomStatus } from '@/lib/room-utils';
import toast from 'react-hot-toast';

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [roomsData, schedulesData, favoritesData] = await Promise.all([
          roomsApi.list(),
          schedulesApi.list(),
          favoriteRoomsApi.list(),
        ]);
        setRooms(roomsData);
        setSchedules(schedulesData);
        setFavorites(new Set((favoritesData as FavoriteRoom[]).map(f => f.roomId)));
      } catch (err) {
        console.error(err);
        toast.error('Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const toggleFavorite = async (roomId: string) => {
    try {
      await favoriteRoomsApi.toggle(roomId);
      setFavorites(prev => {
        const newSet = new Set(prev);
        if (newSet.has(roomId)) {
          newSet.delete(roomId);
        } else {
          newSet.add(roomId);
        }
        return newSet;
      });
      toast.success('Sala favorita atualizada');
    } catch (err) {
      toast.error('Erro ao atualizar favorita');
    }
  };

  const toggleExpand = (roomId: string) => {
    setExpandedRoom(expandedRoom === roomId ? null : roomId);
  };

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = !searchQuery ||
      room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.building?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.code?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFavorite = !showFavoritesOnly || favorites.has(room.id);

    return matchesSearch && matchesFavorite;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Salas" />
      
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              placeholder="Pesquisar por nome, bloco..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white 
                focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 
                transition-all shadow-sm"
            />
          </div>
          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-200 flex items-center gap-2
              shadow-sm active:scale-95 ${
              showFavoritesOnly
                ? 'bg-pink-500 text-white shadow-pink-500/25 hover:bg-pink-600'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
            }`}
          >
            <Heart className={`w-4 h-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
            Apenas Favoritas
          </button>
        </div>

        {/* Rooms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRooms.map(room => {
            const available = isRoomAvailable(schedules, room.id);
            const status = getRoomStatus(schedules, room.id);
            const isFavorite = favorites.has(room.id);
            const isExpanded = expandedRoom === room.id;

            return (
              <div 
                key={room.id} 
                className={`group bg-white rounded-2xl border transition-all duration-300 ease-out
                  ${isExpanded 
                    ? 'border-indigo-200 shadow-xl ring-1 ring-indigo-100' 
                    : 'border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200'
                  }`}
              >
                {/* Card Header */}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-lg truncate group-hover:text-indigo-600 transition-colors">
                        {room.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="truncate">{room.building} • {room.code}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleFavorite(room.id)}
                      className="p-2 -mr-2 -mt-1 rounded-full hover:bg-pink-50 transition-colors active:scale-90"
                    >
                      <Heart
                        className={`w-5 h-5 transition-all duration-200 ${
                          isFavorite 
                            ? 'fill-pink-500 text-pink-500 scale-110' 
                            : 'text-gray-400 hover:text-pink-400'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                      ${available 
                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20' 
                        : 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/20'
                      }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${available ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                      {available ? 'Disponível' : 'Ocupada'}
                    </span>
                    
                    {!available && status.nextClass && (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                        <Clock className="w-3 h-3" />
                        Livre às {status.nextClass.endTime}
                      </span>
                    )}
                  </div>

                  {/* Quick Info */}
                  <div className="space-y-2">
                    {room.capacity && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span>Capacidade: <span className="font-medium text-gray-900">{room.capacity}</span> pessoas</span>
                      </div>
                    )}
                    {room._count?.equipment > 0 && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Monitor className="w-4 h-4 text-gray-400" />
                        <span><span className="font-medium text-gray-900">{room._count.equipment}</span> equipamentos</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Expandable Details Section */}
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}>
                  <div className="px-5 pb-5 pt-0 border-t border-gray-100">
                    <div className="pt-4 space-y-4">
                      {/* Description */}
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                          Descrição
                        </h4>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {room.description || 'Sala equipada para aulas teóricas e práticas. Ambiente climatizado com iluminação adequada.'}
                        </p>
                      </div>

                      {/* Equipment List */}
                      {room.equipment && room.equipment.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                            Equipamentos Disponíveis
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {room.equipment.map((item, idx) => (
                              <span 
                                key={idx}
                                className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded-lg font-medium"
                              >
                                {item.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Today's Schedule Preview */}
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          Horários Hoje
                        </h4>
                        <div className="space-y-1.5">
                          {schedules
                            .filter(s => s.roomId === room.id)
                            .slice(0, 3)
                            .map((schedule, idx) => (
                              <div 
                                key={idx} 
                                className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg bg-gray-50"
                              >
                                <span className="font-medium text-gray-700">{schedule.subject}</span>
                                <span className="text-gray-500">{schedule.startTime} - {schedule.endTime}</span>
                              </div>
                            ))}
                          {schedules.filter(s => s.roomId === room.id).length === 0 && (
                            <p className="text-xs text-gray-400 italic">Nenhuma aula agendada para hoje</p>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-2">
                        <button 
                          onClick={() => window.location.href = `/rooms/${room.id}`}
                          className="flex-1 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg
                            hover:bg-indigo-700 active:scale-95 transition-all shadow-sm shadow-indigo-600/20"
                        >
                          Ver Página Completa
                        </button>
                        <button 
                          onClick={() => window.location.href = `/rooms/${room.id}/book`}
                          className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg
                            hover:bg-gray-50 hover:border-gray-300 active:scale-95 transition-all"
                        >
                          Reservar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Toggle Button */}
                <button
                  onClick={() => toggleExpand(room.id)}
                  className={`w-full px-5 py-3 flex items-center justify-center gap-2 text-sm font-medium 
                    transition-all duration-200 border-t ${
                    isExpanded 
                      ? 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200 rounded-b-2xl' 
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 border-indigo-600 rounded-b-2xl'
                  }`}
                >
                  {isExpanded ? (
                    <>
                      <X className="w-4 h-4" />
                      Fechar Detalhes
                    </>
                  ) : (
                    <>
                      Ver Detalhes
                      <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredRooms.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-gray-900 font-medium mb-1">Nenhuma sala encontrada</h3>
            <p className="text-gray-500 text-sm mb-4">Tente ajustar seus filtros ou termos de busca</p>
            <button 
              onClick={() => {setSearchQuery(''); setShowFavoritesOnly(false);}}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium 
                rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all"
            >
              Limpar Filtros
            </button>
          </div>
        )}
      </div>
    </div>
  );
}