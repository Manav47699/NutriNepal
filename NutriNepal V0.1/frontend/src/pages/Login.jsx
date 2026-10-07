import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';

const KNOWN_FIELDS = ['email', 'password'];

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [generalError, setGeneralError] = useState(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting }
  } = useForm();

  const onSubmit = async (data) => {
    setGeneralError(null);

    const payload = {
      email: data.email,
      password: data.password
    };

    try {
      const response = await apiClient.post('/api/accounts/login/', payload);

      if (response.data) {
        const { access, refresh, user } = response.data;
        login({ access, refresh }, user || null);
      }

      navigate('/dashboard');
    } catch (error) {
      if (error.response?.data?.errors) {
        const serverErrors = error.response.data.errors;
        let hasFieldErrors = false;
        const nonFieldMessages = [];

        Object.entries(serverErrors).forEach(([field, messages]) => {
          const message = Array.isArray(messages) ? messages[0] : String(messages);
          if (KNOWN_FIELDS.includes(field)) {
            setError(field, { type: 'server', message });
            hasFieldErrors = true;
          } else {
            nonFieldMessages.push(message);
          }
        });

        if (nonFieldMessages.length > 0) {
          setGeneralError(nonFieldMessages.join(' '));
        } else if (!hasFieldErrors) {
          setGeneralError(error.response.data.message || 'Login failed. Please check your credentials.');
        }
      } else if (error.response?.data?.message) {
        setGeneralError(error.response.data.message);
      } else if (error.response?.data?.detail) {
        setGeneralError(error.response.data.detail);
      } else if (error.request) {
        setGeneralError('Unable to connect to the server. Please check your connection and try again.');
      } else {
        setGeneralError('An unexpected error occurred. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#181715] flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-12 px-6">
        <div className="max-w-md w-full bg-[#FAF8F5] border border-[#E5E1D8] p-8 rounded-xs">
          <div className="mb-6">
            <span className="font-code text-xs text-[#85837C] uppercase tracking-wider block mb-1">
              Login Portal
            </span>
            <h1 className="font-editorial text-3xl text-[#181715] font-normal">
              Welcome back
            </h1>
            <p className="font-ui text-sm text-[#57554F] mt-1">
              Enter your credentials to access your dietary dashboard.
            </p>
          </div>

          {generalError && (
            <div className="p-3 mb-4 bg-[#FDF2F2] border border-[#9B2C2C]/20 text-[#9B2C2C] text-xs font-ui rounded-xs">
              {generalError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="block font-ui text-xs font-semibold uppercase tracking-wider text-[#57554F] mb-1">
                Email <span className="text-[#9B2C2C]">*</span>
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="himalbhandari342@gmail.com"
                className={`w-full font-ui text-sm bg-white border px-3.5 py-2.5 rounded-xs transition-colors focus:outline-none focus:ring-1 ${
                  errors.email ? 'border-[#9B2C2C] focus:ring-[#9B2C2C]' : 'border-[#E5E1D8] focus:border-[#244234] focus:ring-[#244234]'
                }`}
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address'
                  }
                })}
              />
              {errors.email && (
                <p className="font-ui text-xs text-[#9B2C2C] mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block font-ui text-xs font-semibold uppercase tracking-wider text-[#57554F] mb-1">
                Password <span className="text-[#9B2C2C]">*</span>
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                className={`w-full font-ui text-sm bg-white border px-3.5 py-2.5 rounded-xs transition-colors focus:outline-none focus:ring-1 ${
                  errors.password ? 'border-[#9B2C2C] focus:ring-[#9B2C2C]' : 'border-[#E5E1D8] focus:border-[#244234] focus:ring-[#244234]'
                }`}
                {...register('password', {
                  required: 'Password is required',
                  minLength: {
                    value: 5,
                    message: 'Password must be at least 5 characters'
                  }
                })}
              />
              {errors.password && (
                <p className="font-ui text-xs text-[#9B2C2C] mt-1">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full font-ui text-sm font-medium bg-[#181715] hover:bg-[#244234] text-[#FAF8F5] py-2.5 px-4 rounded-xs transition-colors mt-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Logging in...' : 'Sign In'}
            </button>
          </form>

          <p className="font-ui text-sm text-[#57554F] text-center mt-6 pt-4 border-t border-[#E5E1D8]">
            Don't have an account?{' '}
            <Link to="/register" className="text-[#181715] hover:text-[#244234] underline font-medium">
              Register
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default Login;
