'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { Eye, EyeOff, Monitor, Laptop, Shield, BarChart3 } from 'lucide-react';
import clsx from 'clsx';

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
  const [shakeError, setShakeError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const handleAuthSuccess = useCallback((res: any) => {
    setAuth(res.user, res.accessToken, res.refreshToken);
    toast.success(`Bem-vindo, ${res.user.firstName}!`);
    if (
      (res.user.role === 'TEACHER' || res.user.role === 'STAFF') &&
      !res.user.roleConfirmed
    ) {
      router.replace('/onboarding/role');
      return;
    }
    const redirectUrl = res.user.role === 'TEACHER' ? '/schedules' : '/dashboard';
    router.replace(redirectUrl);
  }, [setAuth, router]);

  const onSubmit = async (data: FormData) => {
    setShakeError(false);
    try {
      const res: any = await authApi.login(data as any);
      handleAuthSuccess(res);
    } catch (err: any) {
      setShakeError(true);
      setTimeout(() => setShakeError(false), 600);
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
      {/* ===== KEYFRAMES ===== */}
      <style>{`
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes blobFloat1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(30px, -40px) scale(1.05); }
          50% { transform: translate(-20px, 20px) scale(0.95); }
          75% { transform: translate(15px, 35px) scale(1.02); }
        }
        @keyframes blobFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(-40px, 25px) scale(1.08); }
          50% { transform: translate(25px, -30px) scale(0.92); }
          75% { transform: translate(-20px, -15px) scale(1.04); }
        }
        @keyframes blobFloat3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(40px, 30px) scale(0.96); }
          66% { transform: translate(-30px, -20px) scale(1.06); }
        }
        @keyframes cardFloat {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.7; }
          50% { transform: translateY(-12px) rotate(1deg); opacity: 1; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes taglineFade {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes dotPulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.3); }
        }
        @keyframes shakeX {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-6px); }
          30% { transform: translateX(5px); }
          45% { transform: translateX(-4px); }
          60% { transform: translateX(3px); }
          75% { transform: translateX(-2px); }
          90% { transform: translateX(1px); }
        }
        @keyframes gridMove {
          0% { transform: translateY(0); }
          100% { transform: translateY(40px); }
        }
        .animate-gradient-shift {
          background-size: 200% 200%;
          animation: gradientShift 8s ease infinite;
        }
        .animate-blob-1 { animation: blobFloat1 14s ease-in-out infinite; }
        .animate-blob-2 { animation: blobFloat2 18s ease-in-out infinite; }
        .animate-blob-3 { animation: blobFloat3 16s ease-in-out infinite; }
        .animate-card-float-1 { animation: cardFloat 6s ease-in-out 0s infinite; }
        .animate-card-float-2 { animation: cardFloat 7s ease-in-out 1.5s infinite; }
        .animate-card-float-3 { animation: cardFloat 5s ease-in-out 3s infinite; }
        .animate-fade-in-up { animation: fadeInUp 0.7s ease-out forwards; }
        .animate-fade-in-scale { animation: fadeInScale 0.6s ease-out forwards; }
        .animate-tagline { animation: taglineFade 0.8s ease-out 0.6s both; }
        .animate-dot-1 { animation: dotPulse 3s ease-in-out 0s infinite; }
        .animate-dot-2 { animation: dotPulse 3s ease-in-out 1s infinite; }
        .animate-dot-3 { animation: dotPulse 3s ease-in-out 2s infinite; }
        .animate-shake { animation: shakeX 0.5s ease-in-out; }
        .animate-grid-move { animation: gridMove 20s linear infinite; }
      `}</style>

      {/* ===== LEFT PANEL ===== */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-950 relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 animate-gradient-shift" />

        {/* Subtle grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

        {/* Floating blobs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="animate-blob-1 absolute -top-20 -left-20 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px]" />
          <div className="animate-blob-2 absolute top-1/2 -right-32 w-[600px] h-[600px] bg-indigo-500/15 rounded-full blur-[120px]" />
          <div className="animate-blob-3 absolute -bottom-32 left-1/3 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[80px]" />
        </div>

        {/* Subtle dot grid */}
        <div className="absolute inset-0 overflow-hidden opacity-[0.06]">
          <div className="animate-grid-move absolute -top-10 -left-10 w-[120%] h-[120%]" style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }} />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Top: Logo */}
          <div className="animate-fade-in-up">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/10">
                <Monitor className="w-5 h-5 text-blue-300" />
              </div>
              <span className="text-white text-xl font-bold tracking-tight">SGEI</span>
            </div>
            <p className="text-blue-300/60 text-sm ml-[52px]">Sistema de Gestão de Equipamentos</p>
          </div>

          {/* Middle: Heading + Features */}
          <div className="space-y-10">
            <div className="animate-fade-in-up" style={{ animationDelay: '0.2s', opacity: 0, animationFillMode: 'forwards' }}>
              <h2 className="text-3xl font-bold text-white leading-tight">
                Gestão inteligente
                <br />
                do seu parque
                <br />
                <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                  informático
                </span>
              </h2>
            </div>

            <div className="space-y-4">
              <FeatureCard
                icon={<Laptop className="w-5 h-5" />}
                title="Inventário Completo"
                desc="Controle todos os equipamentos com QR codes e rastreio em tempo real"
                delay={0.4}
              />
              <FeatureCard
                icon={<Shield className="w-5 h-5" />}
                title="Manutenção Proativa"
                desc="Tickets, histórico e agendamento de manutenções preventivas"
                delay={0.6}
              />
              <FeatureCard
                icon={<BarChart3 className="w-5 h-5" />}
                title="Relatórios Detalhados"
                desc="Dashboards e métricas para decisões informadas"
                delay={0.8}
              />
            </div>
          </div>

          {/* Bottom: Footer */}
          <div className="flex items-center justify-between">
            <p className="text-blue-300/40 text-xs">© 2026 SGEI — Todos os direitos reservados</p>
            <div className="flex gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400/40 animate-dot-1" />
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400/40 animate-dot-2" />
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400/40 animate-dot-3" />
            </div>
          </div>
        </div>

        {/* Floating glassmorphism cards */}
        <div className="absolute top-28 right-8 animate-card-float-1">
          <div className="bg-white/5 backdrop-blur-md rounded-lg px-3 py-2 border border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-white/60 text-[10px] font-mono">247 ativos</span>
            </div>
          </div>
        </div>
        <div className="absolute bottom-40 left-8 animate-card-float-2">
          <div className="bg-white/5 backdrop-blur-md rounded-lg px-3 py-2 border border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-white/60 text-[10px] font-mono">3 pendentes</span>
            </div>
          </div>
        </div>
        <div className="absolute top-1/2 right-16 animate-card-float-3">
          <div className="bg-white/5 backdrop-blur-md rounded-lg px-3 py-2 border border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-white/60 text-[10px] font-mono">12 salas</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== RIGHT PANEL — Login Form ===== */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-white relative">
        {/* Subtle top-right decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-50/50 to-transparent rounded-bl-full pointer-events-none" />

        <div className={clsx(
          'w-full max-w-[420px] relative z-10',
          shakeError && 'animate-shake',
        )} ref={containerRef}>
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Monitor className="w-5 h-5 text-white" />
            </div>
            <span className="text-gray-900 text-xl font-bold">SGEI</span>
          </div>

          {/* Header */}
          <div className="mb-8 animate-fade-in-scale">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Monitor className="w-4 h-4 text-white" />
              </div>
              <span className="text-gray-900 text-lg font-bold tracking-tight">SGEI</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Entrar</h1>
            <p className="text-gray-500 mt-2 text-base">Bem-vindo de volta. Inicie sessão para continuar.</p>
          </div>

          {/* Google Sign-In */}
          {GOOGLE_CLIENT_ID && (
            <div className="mb-6">
              <div id="google-signin-btn" className="w-full [&>div]:!w-full" />
              <div className="relative mt-5 mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-gray-400">ou continue com email</span>
                </div>
              </div>
            </div>
          )}

          {/* Email/Password form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="nome@instituicao.pt"
                autoComplete="email"
                className={clsx(
                  'w-full px-4 py-3 rounded-xl border text-gray-900 placeholder-gray-400 bg-white',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500',
                  'transition-all duration-200 text-sm',
                  errors.email ? 'border-red-300 bg-red-50/50' : 'border-gray-200',
                )}
                {...register('email')}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Palavra-passe
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={clsx(
                    'w-full px-4 py-3 pr-11 rounded-xl border text-gray-900 placeholder-gray-400 bg-white',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500',
                    'transition-all duration-200 text-sm',
                    errors.password ? 'border-red-300 bg-red-50/50' : 'border-gray-200',
                  )}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-0.5"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={clsx(
                'w-full py-3 rounded-xl font-semibold text-sm text-white transition-all duration-200',
                'bg-blue-600 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.98]',
                'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:ring-offset-2',
                isSubmitting && 'opacity-80 cursor-not-allowed',
              )}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  A entrar...
                </span>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl">
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

/* ===== Feature Card Component ===== */
function FeatureCard({ icon, title, desc, delay }: { icon: React.ReactNode; title: string; desc: string; delay: number }) {
  return (
    <div
      className="animate-fade-in-up flex gap-4 items-start"
      style={{ animationDelay: `${delay}s`, opacity: 0, animationFillMode: 'forwards' }}
    >
      <div className="w-10 h-10 rounded-lg bg-white/[0.07] backdrop-blur-sm flex items-center justify-center flex-shrink-0 text-blue-300/80 border border-white/[0.06]">
        {icon}
      </div>
      <div>
        <h3 className="text-white font-semibold text-sm">{title}</h3>
        <p className="text-blue-300/50 text-sm mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
