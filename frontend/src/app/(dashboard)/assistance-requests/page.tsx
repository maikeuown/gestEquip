'use client';

import { useEffect, useState } from 'react';
import { ChevronRight, Plus, Search, AlertCircle, ChevronLeft, Check, ArrowRight } from 'lucide-react';
import Header from '@/components/layout/Header';
import { assistanceRequestsApi, roomsApi, equipmentApi } from '@/lib/api';
import type { Room, Equipment, AssistanceRequest, AssistanceProblem } from '@/types';
import toast from 'react-hot-toast';

const problemLabels: Record<AssistanceProblem, string> = {
  NOT_TURNING_ON: 'Não liga',
  NOT_WORKING: 'Não está funcionando',
  CONNECTIVITY_ISSUE: 'Problema de conectividade',
  AUDIO_PROBLEM: 'Problema de som',
  DISPLAY_PROBLEM: 'Problema de ecrã',
  OTHER: 'Outro',
};

const problemKeys = Object.keys(problemLabels) as AssistanceProblem[];

type Step = 'list' | 'room-select' | 'equipment-select' | 'problem-describe' | 'confirmation';

export default function AssistanceRequestsPage() {
  const [requests, setRequests] = useState<AssistanceRequest[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomEquipment, setRoomEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [step, setStep] = useState<Step>('list');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [selectedProblem, setSelectedProblem] = useState<AssistanceProblem>('NOT_WORKING');
  const [customDescription, setCustomDescription] = useState('');
  const [searchRoom, setSearchRoom] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [reqData, roomsData] = await Promise.all([
          assistanceRequestsApi.list(),
          roomsApi.list(),
        ]);
        setRequests(reqData);
        setRooms(roomsData);
      } catch (err) {
        console.error(err);
        toast.error('Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const loadRoomEquipment = async (roomId: string) => {
    try {
      const equipment = await assistanceRequestsApi.getEquipmentByRoom(roomId);
      setRoomEquipment(equipment);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar equipamentos');
    }
  };

  const handleSelectRoom = (room: Room) => {
    setSelectedRoom(room);
    loadRoomEquipment(room.id);
    setStep('equipment-select');
  };

  const handleSelectEquipment = (equipment: Equipment) => {
    setSelectedEquipment(equipment);
    setStep('problem-describe');
  };

  const handleSubmitRequest = async () => {
    if (!selectedRoom || !selectedProblem) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setSubmitting(true);
    try {
      const description = selectedProblem === 'OTHER' ? customDescription : problemLabels[selectedProblem];

      const newRequest = await assistanceRequestsApi.create({
        title: `Pedido de Assistência - ${selectedRoom.name}`,
        description,
        problemType: selectedProblem,
        roomId: selectedRoom.id,
        equipmentId: selectedEquipment?.id,
      });

      setRequests(prev => [newRequest, ...prev]);
      toast.success('Pedido de assistência criado com sucesso');

      // Reset form
      setStep('list');
      setSelectedRoom(null);
      setSelectedEquipment(null);
      setSelectedProblem('NOT_WORKING');
      setCustomDescription('');
      setSearchRoom('');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao criar pedido');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" /></div>;

  // List View
  if (step === 'list') {
    return (
      <div>
        <Header title="Pedidos de Assistência" />
        <div className="p-6 space-y-4">
          <button
            onClick={() => setStep('room-select')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Novo Pedido
          </button>

          <div className="space-y-3">
            {requests.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Nenhum pedido de assistência ainda</p>
            ) : (
              requests.map(req => (
                <div key={req.id} className="card p-4 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{req.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{req.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span>{req.room?.name}</span>
                        <span>•</span>
                        <span>{new Date(req.createdAt).toLocaleDateString('pt-PT')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        req.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                        req.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                        req.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {req.status === 'PENDING' ? 'Pendente' :
                         req.status === 'IN_PROGRESS' ? 'Em Progresso' :
                         req.status === 'COMPLETED' ? 'Concluído' : req.status}
                      </span>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // Room Selection
  if (step === 'room-select') {
    const filteredRooms = rooms.filter(r =>
      r.name.toLowerCase().includes(searchRoom.toLowerCase()) ||
      r.code?.toLowerCase().includes(searchRoom.toLowerCase()) ||
      r.building?.toLowerCase().includes(searchRoom.toLowerCase())
    );

    return (
      <div>
        <Header title="Selecionar Sala" />
        <div className="p-6 space-y-4">
          <button
            onClick={() => setStep('list')}
            className="text-sm text-primary-600 hover:underline"
          >
            ← Voltar
          </button>

          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Pesquisar sala..."
              value={searchRoom}
              onChange={(e) => setSearchRoom(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-600"
            />
          </div>

          <div className="space-y-2">
            {filteredRooms.map(room => (
              <button
                key={room.id}
                onClick={() => handleSelectRoom(room)}
                className="w-full text-left card p-4 hover:shadow-lg hover:bg-primary-50 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{room.name}</p>
                    <p className="text-sm text-gray-600">{room.building} • {room.code}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Equipment Selection
  if (step === 'equipment-select') {
    return (
      <div>
        <Header title={`Equipamentos - ${selectedRoom?.name}`} />
        <div className="p-6 space-y-4">
          <button
            onClick={() => setStep('room-select')}
            className="text-sm text-primary-600 hover:underline"
          >
            ← Voltar
          </button>

          {roomEquipment.length === 0 ? (
            <div className="card p-6 text-center">
              <p className="text-gray-600 mb-3">Nenhum equipamento nesta sala</p>
              <button
                onClick={() => setStep('problem-describe')}
                className="px-4 py-2 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700"
              >
                Continuar Sem Equipamento
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {roomEquipment.map(eq => (
                <button
                  key={eq.id}
                  onClick={() => handleSelectEquipment(eq)}
                  className="w-full text-left card p-4 hover:shadow-lg hover:bg-primary-50 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{eq.name}</p>
                      <p className="text-sm text-gray-600">{eq.brand} • {eq.model}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Problem Description - STYLED VERSION
  if (step === 'problem-describe') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Descrever Problema" />
        
        <div className="p-6 max-w-2xl mx-auto space-y-6">
          {/* Back Button */}
          <button
            onClick={() => setStep('equipment-select')}
            className="group flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Voltar
          </button>

          {/* Selected Context Card */}
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Reportando problema em</p>
                <p className="font-semibold text-gray-900">
                  {selectedRoom?.name}
                  {selectedEquipment && (
                    <span className="text-gray-500 font-normal"> → {selectedEquipment.name}</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Problem Selection */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              Tipo de Problema
            </h3>
            
            <div className="grid gap-3">
              {problemKeys.map(key => {
                const isSelected = selectedProblem === key;
                
                return (
                  <label 
                    key={key} 
                    className={`relative flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
                      ${isSelected 
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' 
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                      }`}
                  >
                    {/* Custom Radio */}
                    <div className={`relative flex-shrink-0 w-5 h-5 rounded-full border-2 transition-all duration-200
                      ${isSelected 
                        ? 'border-indigo-600 bg-indigo-600' 
                        : 'border-gray-300 bg-white'
                      }`}>
                      {isSelected && (
                        <div className="absolute inset-1 rounded-full bg-white" />
                      )}
                    </div>
                    
                    {/* Hidden native input for accessibility */}
                    <input
                      type="radio"
                      name="problem"
                      value={key}
                      checked={isSelected}
                      onChange={(e) => setSelectedProblem(e.target.value as AssistanceProblem)}
                      className="sr-only"
                    />
                    
                    {/* Label */}
                    <span className={`font-medium flex-1 ${isSelected ? 'text-indigo-900' : 'text-gray-700'}`}>
                      {problemLabels[key]}
                    </span>
                    
                    {/* Checkmark for selected */}
                    {isSelected && (
                      <Check className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Custom Description (when OTHER selected) */}
          <div className={`transition-all duration-300 overflow-hidden ${
            selectedProblem === 'OTHER' ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}>
            <div className="space-y-2 pt-2">
              <label className="text-sm font-medium text-gray-700">
                Descrição Detalhada
              </label>
              <textarea
                placeholder="Descreva o problema em detalhes para ajudar a equipa técnica..."
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                rows={4}
                className="w-full p-4 rounded-xl border border-gray-200 bg-white 
                  focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 
                  resize-none transition-all placeholder:text-gray-400"
              />
              <p className="text-xs text-gray-500">
                Mínimo 10 caracteres recomendado
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              onClick={handleSubmitRequest}
              disabled={submitting || (selectedProblem === 'OTHER' && customDescription.length < 5)}
              className="w-full px-6 py-3.5 rounded-xl bg-indigo-600 text-white font-semibold 
                hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-200 shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  A criar pedido...
                </>
              ) : (
                <>
                  Criar Pedido
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}