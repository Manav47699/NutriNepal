import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import apiClient from '../api/client';

const KNOWN_FIELDS = ['username', 'email', 'first_name', 'last_name', 'password'];

function Register() {
  const navigate = useNavigate();
  const [generalError, setGeneralError] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting }
  } = useForm();

  const password = watch('password');

  const onSubmit = async (data) => {
    setGeneralError(null);

    const payload = {
      username: data.username,
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name,
      password: data.password
    };

    try {
      await apiClient.post('/api/accounts/register/', payload);
      navigate('/login');
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
          setGeneralError(error.response.data.message || 'Registration failed. Please check your information.');
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
        <div className="max-w-lg w-full bg-[#FAF8F5] border border-[#E5E1D8] p-8 rounded-xs">
          <div className="mb-6">
            <span className="font-code text-xs text-[#85837C] uppercase tracking-wider block mb-1">
              Account Setup
            </span>
            <h1 className="font-editorial text-3xl text-[#181715] font-normal">
              Create your account
            </h1>
            <p className="font-ui text-sm text-[#57554F] mt-1">
              Enter your details to register for personalized dietary guidance.
            </p>
          </div>

          {generalError && (
            <div className="p-3 mb-4 bg-[#FDF2F2] border border-[#9B2C2C]/20 text-[#9B2C2C] text-xs font-ui rounded-xs">
              {generalError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="first_name" className="block font-ui text-xs font-semibold uppercase tracking-wider text-[#57554F] mb-1">
                  First Name <span className="text-[#9B2C2C]">*</span>
                </label>
                <input
                  id="first_name"
                  type="text"
                  placeholder="Himal"
                  className={`w-full font-ui text-sm bg-white border px-3.5 py-2.5 rounded-xs transition-colors focus:outline-none focus:ring-1 ${errors.first_name ? 'border-[#9B2C2C] focus:ring-[#9B2C2C]' : 'border-[#E5E1D8] focus:border-[#244234] focus:ring-[#244234]'
                    }`}
                  {...register('first_name', { required: 'First name is required' })}
                />
                {errors.first_name && (
                  <p className="font-ui text-xs text-[#9B2C2C] mt-1">{errors.first_name.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="last_name" className="block font-ui text-xs font-semibold uppercase tracking-wider text-[#57554F] mb-1">
                  Last Name <span className="text-[#9B2C2C]">*</span>
                </label>
                <input
                  id="last_name"
                  type="text"
                  placeholder="Bhandari"
                  className={`w-full font-ui text-sm bg-white border px-3.5 py-2.5 rounded-xs transition-colors focus:outline-none focus:ring-1 ${errors.last_name ? 'border-[#9B2C2C] focus:ring-[#9B2C2C]' : 'border-[#E5E1D8] focus:border-[#244234] focus:ring-[#244234]'
                    }`}
                  {...register('last_name', { required: 'Last name is required' })}
                />
                {errors.last_name && (
                  <p className="font-ui text-xs text-[#9B2C2C] mt-1">{errors.last_name.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="username" className="block font-ui text-xs font-semibold uppercase tracking-wider text-[#57554F] mb-1">
                Username <span className="text-[#9B2C2C]">*</span>
              </label>
              <input
                id="username"
                type="text"
                placeholder="himalbhandari05"
                className={`w-full font-ui text-sm bg-white border px-3.5 py-2.5 rounded-xs transition-colors focus:outline-none focus:ring-1 ${errors.username ? 'border-[#9B2C2C] focus:ring-[#9B2C2C]' : 'border-[#E5E1D8] focus:border-[#244234] focus:ring-[#244234]'
                  }`}
                {...register('username', {
                  required: 'Username is required',
                  minLength: { value: 3, message: 'Must be at least 3 characters' }
                })}
              />
              {errors.username && (
                <p className="font-ui text-xs text-[#9B2C2C] mt-1">{errors.username.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block font-ui text-xs font-semibold uppercase tracking-wider text-[#57554F] mb-1">
                Email Address <span className="text-[#9B2C2C]">*</span>
              </label>
              <input
                id="email"
                type="email"
                placeholder="himalbhandari342@gmail.com"
                className={`w-full font-ui text-sm bg-white border px-3.5 py-2.5 rounded-xs transition-colors focus:outline-none focus:ring-1 ${errors.email ? 'border-[#9B2C2C] focus:ring-[#9B2C2C]' : 'border-[#E5E1D8] focus:border-[#244234] focus:ring-[#244234]'
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
                placeholder="At least 8 characters"
                className={`w-full font-ui text-sm bg-white border px-3.5 py-2.5 rounded-xs transition-colors focus:outline-none focus:ring-1 ${errors.password ? 'border-[#9B2C2C] focus:ring-[#9B2C2C]' : 'border-[#E5E1D8] focus:border-[#244234] focus:ring-[#244234]'
                  }`}
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 8, message: 'Password must be at least 8 characters' }
                })}
              />
              {errors.password && (
                <p className="font-ui text-xs text-[#9B2C2C] mt-1">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirm_password" className="block font-ui text-xs font-semibold uppercase tracking-wider text-[#57554F] mb-1">
                Confirm Password <span className="text-[#9B2C2C]">*</span>
              </label>
              <input
                id="confirm_password"
                type="password"
                placeholder="Repeat your password"
                className={`w-full font-ui text-sm bg-white border px-3.5 py-2.5 rounded-xs transition-colors focus:outline-none focus:ring-1 ${errors.confirm_password ? 'border-[#9B2C2C] focus:ring-[#9B2C2C]' : 'border-[#E5E1D8] focus:border-[#244234] focus:ring-[#244234]'
                  }`}
                {...register('confirm_password', {
                  required: 'Please confirm your password',
                  validate: (val) => val === password || 'Passwords do not match'
                })}
              />
              {errors.confirm_password && (
                <p className="font-ui text-xs text-[#9B2C2C] mt-1">{errors.confirm_password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full font-ui text-sm font-medium bg-[#181715] hover:bg-[#244234] text-[#FAF8F5] py-2.5 px-4 rounded-xs transition-colors mt-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Registering...' : 'Register'}
            </button>
          </form>

          <p className="font-ui text-sm text-[#57554F] text-center mt-6 pt-4 border-t border-[#E5E1D8]">
            Already have an account?{' '}
            <Link to="/login" className="text-[#181715] hover:text-[#244234] underline font-medium">
              Login
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default Register;