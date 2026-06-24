import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';

interface LoginFormData {
  email: string;
  password: string;
}

export function LoginForm() {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success(t('auth.login.title'));
      navigate('/');
    } catch (error) {
      console.error('Login error:', error);
      toast.error(t('errors.somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900">{t('auth.login.title')}</h2>
        <p className="text-gray-600 mt-2">{t('auth.login.subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('auth.login.email')}
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="email"
              {...register('email', { 
                required: t('auth.errors.emailRequired'),
                pattern: {
                  value: /^\S+@\S+$/i,
                  message: t('auth.errors.invalidEmail')
                }
              })}
              className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder={t('auth.login.email')}
            />
          </div>
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('auth.login.password')}
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type={showPassword ? 'text' : 'password'}
              {...register('password', { 
                required: t('auth.errors.passwordRequired')
              })}
              className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.password ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder={t('auth.login.password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {loading ? t('common.loading') : t('auth.login.signIn')}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-gray-600">
          {t('auth.login.noAccount')}{' '}
          <Link to="/signup" className="text-blue-600 hover:text-blue-700 font-medium">
            {t('auth.login.signUp')}
          </Link>
        </p>
      </div>
    </div>
  );
}