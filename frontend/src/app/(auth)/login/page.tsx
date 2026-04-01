'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { Eye, EyeOff, Monitor } from 'lucide-react';

const schema = z.object({ email: z.string().email('Email inválido'), password: z.string().min(1, 'Palavra-passe obrigatória') });
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [showPw, setShowPw] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      const res: any = await authApi.login(data as any);
      setAuth(res.user, res.accessToken, res.refreshToken);
      toast.success(`Bem-vindo, ${res.user.firstName}!`);

      // Redirect based on user role
      const redirectUrl = res.user.role === 'TEACHER' ? '/schedules' : '/dashboard';
      router.replace(redirectUrl);
    } catch (err: any) {
      toast.error(err.message || 'Credenciais inválidas');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-700 to-primary-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <Monitor className="w-8 h-8 text-primary-600" />
          </div>
          <h1 className="text-3xl font-bold text-white">SGEI</h1>
          <p className="text-primary-200 mt-1 text-sm">Sistema de Gestão de Equipamentos Informáticos</p>
        </div>

        <div className="card p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Entrar na conta</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input {...register('email')} type="email" className="input" placeholder="admin@sgei.pt" autoComplete="email" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="label">Palavra-passe</label>
              <div className="relative">
                <input {...register('password')} type={showPw ? 'text' : 'password'} className="input pr-10" placeholder="••••••••" autoComplete="current-password" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>
            <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center py-2.5 mt-2">
              {isSubmitting ? 'A entrar...' : 'Entrar'}
            </button>
          </form>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
            <strong>Demo:</strong> admin@sgei.pt / Admin@1234
          </div>
        </div>
      </div>
    </div>
  );
}
