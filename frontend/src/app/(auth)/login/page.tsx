'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { Eye, EyeOff, Monitor, Laptop, Shield, BarChart3 } from 'lucide-react';

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Palavra-passe obrigatória'),
});
type FormData = z.infer<typeof schema>;

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [showPw, setShowPw] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const handleAuthSuccess = useCallback((res: any) => {
    setAuth(res.user, res.accessToken, res.refreshToken);
    toast.success(`Bem-vindo, ${res.user.firstName}!`);
    const redirectUrl = res.user.role === 'TEACHER' ? '/schedules' : '/dashboard';
    router.replace(redirectUrl);
  }, [setAuth, router]);

  const onSubmit = async (data: FormData) => {
    try {
      const res: any = await authApi.login(data as any);
      handleAuthSuccess(res);
    } catch (err: any) {
      toast.error(err.message || 'Credenciais inválidas');
    }
  };

  // Google Sign-In
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    script.onload = () => {
      (window as any).google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
      });
      (window as any).google?.accounts.id.renderButton(
        document.getElementById('google-signin-btn'),
        {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          width: '100%',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'center',
        },
      );
    };

    return () => { script.remove(); };
  }, []);

  const handleGoogleResponse = async (response: any) => {
    try {
      const res: any = await authApi.google(response.credential);
      handleAuthSuccess(res);
    } catch (err: any) {
      toast.error(err.message || 'Erro na autenticação com Google');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-400 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Monitor className="w-5 h-5 text-white" />
              </div>
              <span className="text-white text-xl font-bold tracking-tight">SGEI</span>
            </div>
            <p className="text-blue-200 text-sm ml-[52px]">Sistema de Gestão de Equipamentos</p>
          </div>

          <div className="space-y-8">
            <h2 className="text-3xl font-bold text-white leading-tight">
              Gestão inteligente<br />do seu parque<br />informático
            </h2>
            <div className="space-y-4">
              <Feature icon={<Laptop className="w-5 h-5" />} title="Inventário Completo" desc="Controle todos os equipamentos com QR codes e rastreio em tempo real" />
              <Feature icon={<Shield className="w-5 h-5" />} title="Manutenção Proativa" desc="Tickets, histórico e agendamento de manutenções preventivas" />
              <Feature icon={<BarChart3 className="w-5 h-5" />} title="Relatórios Detalhados" desc="Dashboards e métricas para decisões informadas" />
            </div>
          </div>

          <p className="text-blue-300/60 text-xs">© 2026 SGEI — Todos os direitos reservados</p>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-gray-50">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Monitor className="w-5 h-5 text-white" />
            </div>
            <span className="text-gray-900 text-xl font-bold">SGEI</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Bem-vindo de volta</h1>
            <p className="text-gray-500 mt-1 text-sm">Introduza as suas credenciais para aceder à plataforma</p>
          </div>

          {/* Google Sign-In */}
          {GOOGLE_CLIENT_ID && (
            <>
              <div id="google-signin-btn" className="w-full [&>div]:!w-full mb-5" />
              <div className="relative mb-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-gray-50 px-3 text-gray-400 uppercase tracking-wider">ou</span>
                </div>
              </div>
            </>
          )}

          {/* Email/Password form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                {...register('email')}
                type="email"
                className="block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="nome@instituicao.pt"
                autoComplete="email"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1.5">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">Palavra-passe</label>
              </div>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPw ? 'text' : 'password'}
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 pr-10 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1.5">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  A entrar...
                </>
              ) : 'Entrar'}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 p-3.5 bg-blue-50 border border-blue-100 rounded-lg">
            <p className="text-xs text-blue-700">
              <span className="font-semibold">Demo:</span>{' '}
              <code className="bg-blue-100 px-1.5 py-0.5 rounded text-[11px]">admin@sgei.pt</code>{' / '}
              <code className="bg-blue-100 px-1.5 py-0.5 rounded text-[11px]">Admin@1234</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex gap-4 items-start">
      <div className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0 text-blue-200">
        {icon}
      </div>
      <div>
        <h3 className="text-white font-semibold text-sm">{title}</h3>
        <p className="text-blue-200/70 text-sm mt-0.5">{desc}</p>
      </div>
    </div>
  );
}
