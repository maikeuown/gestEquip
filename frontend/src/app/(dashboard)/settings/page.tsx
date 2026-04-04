'use client';
import { useState } from 'react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import Header from '@/components/layout/Header';
import { FormInput } from '@/components/ui/FormInput';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const pwSchema = z.object({
  currentPassword: z.string().min(1, 'Obrigatório'),
  newPassword: z.string().min(6, 'Mínimo 6 caracteres'),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, { message: 'As palavras-passe não coincidem', path: ['confirmPassword'] });

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(pwSchema) });

  const onSubmit = async (data: any) => {
    try {
      await authApi.changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword });
      toast.success('Palavra-passe alterada com sucesso');
      reset();
    } catch (e: any) { toast.error(e.message || 'Erro'); }
  };

  return (
    <div>
      <Header title="Definições" />
      <div className="p-6 space-y-6 max-w-2xl">
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Perfil</h2>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-2xl font-bold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div>
              <div className="text-xl font-semibold">{user?.firstName} {user?.lastName}</div>
              <div className="text-gray-500">{user?.email}</div>
              <div className="text-sm text-gray-400">{user?.role} · {user?.institution?.name}</div>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Alterar Palavra-passe</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-sm">
            <FormInput
              label="Palavra-passe atual"
              type="password"
              required
              {...register('currentPassword')}
              error={errors.currentPassword?.message as string}
            />
            <FormInput
              label="Nova palavra-passe"
              type="password"
              required
              {...register('newPassword')}
              error={errors.newPassword?.message as string}
            />
            <FormInput
              label="Confirmar nova palavra-passe"
              type="password"
              required
              {...register('confirmPassword')}
              error={errors.confirmPassword?.message as string}
            />
            <Button type="submit" loading={isSubmitting}>
              {isSubmitting ? 'A alterar...' : 'Alterar Palavra-passe'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
