'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { usersApi } from '@/lib/api';
import { Monitor, Users } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

type RoleOption = 'TEACHER' | 'STAFF';

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
  const { user, updateUser, setAuth, accessToken, refreshToken } = useAuthStore();
  const [selected, setSelected] = useState<RoleOption | null>(null);
  const [confirming, setConfirming] = useState(false);

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

  const handleConfirm = async () => {
    if (!selected || !user) return;
    setConfirming(true);
    try {
      const updatedUser = await usersApi.confirmRole(user.id, selected);
      updateUser({ role: selected, roleConfirmed: true });
      toast.success('Função selecionada com sucesso!');
      router.replace('/dashboard');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao confirmar função. Tente novamente.');
    } finally {
      setConfirming(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
            <Monitor className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Bem-vindo ao SGEI</h1>
          <p className="text-gray-500 text-lg">
            Olá, {user.firstName}! Antes de começar, escolha a sua função.
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          {roles.map(({ role, title, subtitle, icon: Icon }) => (
            <button
              key={role}
              type="button"
              onClick={() => setSelected(role)}
              className={clsx(
                'relative flex flex-col items-center p-8 rounded-2xl border-2 transition-all duration-200 cursor-pointer text-left',
                'bg-white hover:shadow-lg hover:-translate-y-0.5',
                selected === role
                  ? 'border-primary-500 shadow-lg shadow-primary-500/10 ring-4 ring-primary-500/20'
                  : 'border-gray-200 hover:border-gray-300 shadow-sm'
              )}
            >
              {/* Selected indicator */}
              {selected === role && (
                <div className="absolute top-4 right-4 w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}

              <div className={clsx(
                'w-16 h-16 rounded-xl flex items-center justify-center mb-5 transition-colors duration-200',
                selected === role
                  ? 'bg-primary-100 text-primary-600'
                  : 'bg-gray-100 text-gray-500'
              )}>
                <Icon className="w-8 h-8" />
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed text-center">{subtitle}</p>
            </button>
          ))}
        </div>

        {/* Confirm Button */}
        <div className="flex justify-center">
          <button
            onClick={handleConfirm}
            disabled={!selected || confirming}
            className={clsx(
              'px-10 py-3.5 rounded-xl font-semibold text-base transition-all duration-200',
              selected && !confirming
                ? 'bg-primary-600 text-white hover:bg-primary-700 hover:shadow-lg active:scale-[0.98]'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
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
    </div>
  );
}
