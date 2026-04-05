'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { usersApi, institutionsApi } from '@/lib/api';
import { Monitor, Users, Search, Building2 } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

type RoleOption = 'TEACHER' | 'STAFF';
interface Institution {
  id: string;
  name: string;
  shortName?: string;
  city?: string;
  address?: string;
}

interface RoleCard {
  role: RoleOption;
  title: string;
  subtitle: string;
  icon: React.ElementType;
}

const roles: RoleCard[] = [
  {
    role: 'TEACHER',
    title: 'Professor',
    subtitle: 'Aceda às suas salas, horários e submeta requisições de equipamentos e pedidos de assistência.',
    icon: Monitor,
  },
  {
    role: 'STAFF',
    title: 'Funcionário',
    subtitle: 'Gerir salas, requisições de equipamentos e pedidos de assistência da instituição.',
    icon: Users,
  },
];

export default function RoleSelectionPage() {
  const router = useRouter();
  const { user, updateUser } = useAuthStore();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedRole, setSelectedRole] = useState<RoleOption | null>(null);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInstitution, setSelectedInstitution] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);

  // Redirect if user is not TEACHER or STAFF, or already confirmed
  useEffect(() => {
    if (!user) return;
    if (user.roleConfirmed) {
      router.replace('/dashboard');
      return;
    }
    if (user.role !== 'TEACHER' && user.role !== 'STAFF') {
      router.replace('/dashboard');
      return;
    }
  }, [user, router]);

  // Fetch institutions on mount
  useEffect(() => {
    const fetch = async () => {
      setLoadingInstitutions(true);
      try {
        const data = await institutionsApi.list();
        setInstitutions(Array.isArray(data) ? data : []);
      } catch {
        toast.error('Erro ao carregar instituições.');
      } finally {
        setLoadingInstitutions(false);
      }
    };
    fetch();
  }, []);

  const filteredInstitutions = useMemo(() => {
    if (!searchQuery.trim()) return institutions;
    const q = searchQuery.toLowerCase();
    return institutions.filter(
      (inst) =>
        inst.name.toLowerCase().includes(q) ||
        (inst.city && inst.city.toLowerCase().includes(q)) ||
        (inst.shortName && inst.shortName.toLowerCase().includes(q)),
    );
  }, [institutions, searchQuery]);

  const handleRoleSelect = (role: RoleOption) => {
    setSelectedRole(role);
  };

  const handleNextStep = () => {
    if (selectedRole) setStep(2);
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleConfirm = async () => {
    if (!selectedRole || !selectedInstitution || !user) return;
    setConfirming(true);
    try {
      const updatedUser = await usersApi.confirmRoleSelf(selectedRole, selectedInstitution);
      updateUser({ role: selectedRole, roleConfirmed: true, institutionId: selectedInstitution });
      toast.success('Função e instituição selecionadas com sucesso!');
      router.replace('/dashboard');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao confirmar. Tente novamente.');
    } finally {
      setConfirming(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
            <Monitor className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Bem-vindo ao SGEI</h1>
          <p className="text-gray-500 text-lg">
            Olá, {user.firstName}! Antes de começar, escolha a sua função e instituição.
          </p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="flex items-center gap-2">
            <div className={clsx(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors',
              step === 1 ? 'bg-primary-600 text-white' : 'bg-primary-200 text-primary-700',
            )}>
              {step > 1 ? '✓' : '1'}
            </div>
            <span className={clsx('text-sm font-medium', step === 1 ? 'text-primary-700' : 'text-gray-500')}>
              Função
            </span>
          </div>
          <div className={clsx('w-12 h-0.5', step > 1 ? 'bg-primary-400' : 'bg-gray-300')} />
          <div className="flex items-center gap-2">
            <div className={clsx(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors',
              step === 2 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500',
            )}>
              2
            </div>
            <span className={clsx('text-sm font-medium', step === 2 ? 'text-primary-700' : 'text-gray-500')}>
              Instituição
            </span>
          </div>
        </div>

        {/* Step 1: Role Selection */}
        {step === 1 && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
              {roles.map(({ role, title, subtitle, icon: Icon }) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleRoleSelect(role)}
                  className={clsx(
                    'relative flex flex-col items-center p-8 rounded-2xl border-2 transition-all duration-200 cursor-pointer text-left',
                    'bg-white hover:shadow-lg hover:-translate-y-0.5',
                    selectedRole === role
                      ? 'border-primary-500 shadow-lg shadow-primary-500/10 ring-4 ring-primary-500/20'
                      : 'border-gray-200 hover:border-gray-300 shadow-sm',
                  )}
                >
                  {selectedRole === role && (
                    <div className="absolute top-4 right-4 w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}

                  <div className={clsx(
                    'w-16 h-16 rounded-xl flex items-center justify-center mb-5 transition-colors duration-200',
                    selectedRole === role
                      ? 'bg-primary-100 text-primary-600'
                      : 'bg-gray-100 text-gray-500',
                  )}>
                    <Icon className="w-8 h-8" />
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed text-center">{subtitle}</p>
                </button>
              ))}
            </div>

            <div className="flex justify-center">
              <button
                onClick={handleNextStep}
                disabled={!selectedRole}
                className={clsx(
                  'px-10 py-3.5 rounded-xl font-semibold text-base transition-all duration-200',
                  selectedRole
                    ? 'bg-primary-600 text-white hover:bg-primary-700 hover:shadow-lg active:scale-[0.98]'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed',
                )}
              >
                Seguinte →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Institution Selection */}
        {step === 2 && (
          <div>
            {/* Search */}
            <div className="relative mb-5">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar instituição por nome, cidade ou sigla..."
                className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
              />
            </div>

            {/* Institution List */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm max-h-72 overflow-y-auto mb-6">
              {loadingInstitutions ? (
                <div className="flex items-center justify-center py-12">
                  <svg className="animate-spin h-8 w-8 text-primary-600" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              ) : filteredInstitutions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Building2 className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">{searchQuery ? 'Nenhuma instituição encontrada.' : 'Nenhuma instituição disponível.'}</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {filteredInstitutions.map((inst) => (
                    <li key={inst.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedInstitution(inst.id)}
                        className={clsx(
                          'w-full flex items-center gap-4 p-4 text-left transition-colors',
                          selectedInstitution === inst.id
                            ? 'bg-primary-50 text-primary-700'
                            : 'hover:bg-gray-50 text-gray-900',
                        )}
                      >
                        <div className={clsx(
                          'w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0',
                          selectedInstitution === inst.id
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 text-gray-600',
                        )}>
                          {(inst.shortName || inst.name).substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{inst.name}</p>
                          {inst.city && (
                            <p className="text-sm text-gray-500">{inst.city}</p>
                          )}
                        </div>
                        {selectedInstitution === inst.id && (
                          <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleBack}
                className="px-6 py-3 rounded-xl font-semibold text-base text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                ← Voltar
              </button>
              <button
                onClick={handleConfirm}
                disabled={!selectedInstitution || confirming}
                className={clsx(
                  'px-10 py-3.5 rounded-xl font-semibold text-base transition-all duration-200',
                  selectedInstitution && !confirming
                    ? 'bg-primary-600 text-white hover:bg-primary-700 hover:shadow-lg active:scale-[0.98]'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed',
                )}
              >
                {confirming ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    A confirmar...
                  </span>
                ) : (
                  'Confirmar'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
