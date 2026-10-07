import { useState } from 'react';
import { useForm } from 'react-hook-form';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  GENDER_CHOICES,
  ACTIVITY_LEVEL_CHOICES,
  FITNESS_GOAL_CHOICES,
  DIETARY_PREFERENCE_CHOICES,
} from '../constants/profileChoices';

const KNOWN_FIELDS = [
  'age',
  'gender',
  'height_cm',
  'weight_kg',
  'activity_level',
  'fitness_goal',
  'dietary_preference',
];

export default function ProfileSetupForm({ onSuccess }) {
  const { refreshProfile } = useAuth();
  const [generalError, setGeneralError] = useState(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      age: '',
      gender: '',
      height_cm: '',
      weight_kg: '',
      activity_level: '',
      fitness_goal: '',
      dietary_preference: '',
    },
  });

  const onSubmit = async (data) => {
    setGeneralError(null);

    const payload = {
      age: Number(data.age),
      gender: data.gender,
      height_cm: Number(data.height_cm),
      weight_kg: Number(data.weight_kg),
      activity_level: data.activity_level,
      fitness_goal: data.fitness_goal,
      dietary_preference: data.dietary_preference,
    };


    try {
      const response = await apiClient.post('/api/profiles/user-profile/', payload);
      await refreshProfile();
      if (onSuccess) {
        onSuccess(response.data);
      }
    } catch (error) {
      if (error.response?.data) {
        const responseData = error.response.data;

        if (responseData.message && !responseData.errors) {
          setGeneralError(responseData.message);
          return;
        }

        if (responseData.errors) {
          let hasFieldErrors = false;
          const nonFieldMessages = [];

          Object.entries(responseData.errors).forEach(([field, messages]) => {
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
          } else if (!hasFieldErrors && responseData.message) {
            setGeneralError(responseData.message);
          } else if (!hasFieldErrors) {
            setGeneralError('Please check the entered profile information.');
          }
          return;
        }
      }

      if (error.request) {
        setGeneralError('Unable to connect to the server. Please check your connection and try again.');
      } else {
        setGeneralError('An unexpected error occurred. Please try again.');
      }
    }
  };

  return (
    <div>
      {generalError && (
        <div className="p-3 mb-4 bg-[#FDF2F2] border border-[#9B2C2C]/20 text-[#9B2C2C] text-xs font-ui rounded-xs">
          {generalError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Age & Gender */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="setup_age" className="block font-ui text-xs font-semibold uppercase tracking-wider text-[#57554F] mb-1">
              Age <span className="text-[#9B2C2C]">*</span>
            </label>
            <input
              id="setup_age"
              type="number"
              placeholder="e.g. 25"
              className={`w-full font-ui text-sm bg-white border px-3.5 py-2.5 rounded-xs transition-colors focus:outline-none focus:ring-1 ${
                errors.age ? 'border-[#9B2C2C] focus:ring-[#9B2C2C]' : 'border-[#E5E1D8] focus:border-[#244234] focus:ring-[#244234]'
              }`}
              {...register('age', {
                required: 'Age is required',
                min: { value: 10, message: 'Age must be at least 10' },
                max: { value: 120, message: 'Age must be at most 120' },
              })}
            />
            {errors.age && (
              <p className="font-ui text-xs text-[#9B2C2C] mt-1">{errors.age.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="setup_gender" className="block font-ui text-xs font-semibold uppercase tracking-wider text-[#57554F] mb-1">
              Gender <span className="text-[#9B2C2C]">*</span>
            </label>
            <select
              id="setup_gender"
              className={`w-full font-ui text-sm bg-white border px-3.5 py-2.5 rounded-xs transition-colors focus:outline-none focus:ring-1 ${
                errors.gender ? 'border-[#9B2C2C] focus:ring-[#9B2C2C]' : 'border-[#E5E1D8] focus:border-[#244234] focus:ring-[#244234]'
              }`}
              {...register('gender', { required: 'Please select a gender' })}
            >
              <option value="" disabled>Select gender</option>
              {GENDER_CHOICES.map((choice) => (
                <option key={choice.value} value={choice.value}>
                  {choice.label}
                </option>
              ))}
            </select>
            {errors.gender && (
              <p className="font-ui text-xs text-[#9B2C2C] mt-1">{errors.gender.message}</p>
            )}
          </div>
        </div>

        {/* Height & Weight */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="setup_height_cm" className="block font-ui text-xs font-semibold uppercase tracking-wider text-[#57554F] mb-1">
              Height (cm) <span className="text-[#9B2C2C]">*</span>
            </label>
            <input
              id="setup_height_cm"
              type="number"
              step="0.01"
              placeholder="e.g. 175"
              className={`w-full font-ui text-sm bg-white border px-3.5 py-2.5 rounded-xs transition-colors focus:outline-none focus:ring-1 ${
                errors.height_cm ? 'border-[#9B2C2C] focus:ring-[#9B2C2C]' : 'border-[#E5E1D8] focus:border-[#244234] focus:ring-[#244234]'
              }`}
              {...register('height_cm', {
                required: 'Height is required',
                min: { value: 50, message: 'Height must be at least 50 cm' },
                max: { value: 250, message: 'Height must be at most 250 cm' },
              })}
            />
            {errors.height_cm && (
              <p className="font-ui text-xs text-[#9B2C2C] mt-1">{errors.height_cm.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="setup_weight_kg" className="block font-ui text-xs font-semibold uppercase tracking-wider text-[#57554F] mb-1">
              Weight (kg) <span className="text-[#9B2C2C]">*</span>
            </label>
            <input
              id="setup_weight_kg"
              type="number"
              step="0.01"
              placeholder="e.g. 68.5"
              className={`w-full font-ui text-sm bg-white border px-3.5 py-2.5 rounded-xs transition-colors focus:outline-none focus:ring-1 ${
                errors.weight_kg ? 'border-[#9B2C2C] focus:ring-[#9B2C2C]' : 'border-[#E5E1D8] focus:border-[#244234] focus:ring-[#244234]'
              }`}
              {...register('weight_kg', {
                required: 'Weight is required',
                min: { value: 20, message: 'Weight must be at least 20 kg' },
                max: { value: 300, message: 'Weight must be at most 300 kg' },
              })}
            />
            {errors.weight_kg && (
              <p className="font-ui text-xs text-[#9B2C2C] mt-1">{errors.weight_kg.message}</p>
            )}
          </div>
        </div>



        {/* Activity Level */}
        <div>
          <label htmlFor="setup_activity_level" className="block font-ui text-xs font-semibold uppercase tracking-wider text-[#57554F] mb-1">
            Activity Level <span className="text-[#9B2C2C]">*</span>
          </label>
          <select
            id="setup_activity_level"
            className={`w-full font-ui text-sm bg-white border px-3.5 py-2.5 rounded-xs transition-colors focus:outline-none focus:ring-1 ${
              errors.activity_level ? 'border-[#9B2C2C] focus:ring-[#9B2C2C]' : 'border-[#E5E1D8] focus:border-[#244234] focus:ring-[#244234]'
            }`}
            {...register('activity_level', { required: 'Please select your activity level' })}
          >
            <option value="" disabled>Select activity level</option>
            {ACTIVITY_LEVEL_CHOICES.map((choice) => (
              <option key={choice.value} value={choice.value}>
                {choice.label}
              </option>
            ))}
          </select>
          {errors.activity_level && (
            <p className="font-ui text-xs text-[#9B2C2C] mt-1">{errors.activity_level.message}</p>
          )}
        </div>

        {/* Fitness Goal */}
        <div>
          <label htmlFor="setup_fitness_goal" className="block font-ui text-xs font-semibold uppercase tracking-wider text-[#57554F] mb-1">
            Fitness Goal <span className="text-[#9B2C2C]">*</span>
          </label>
          <select
            id="setup_fitness_goal"
            className={`w-full font-ui text-sm bg-white border px-3.5 py-2.5 rounded-xs transition-colors focus:outline-none focus:ring-1 ${
              errors.fitness_goal ? 'border-[#9B2C2C] focus:ring-[#9B2C2C]' : 'border-[#E5E1D8] focus:border-[#244234] focus:ring-[#244234]'
            }`}
            {...register('fitness_goal', { required: 'Please select a fitness goal' })}
          >
            <option value="" disabled>Select fitness goal</option>
            {FITNESS_GOAL_CHOICES.map((choice) => (
              <option key={choice.value} value={choice.value}>
                {choice.label}
              </option>
            ))}
          </select>
          {errors.fitness_goal && (
            <p className="font-ui text-xs text-[#9B2C2C] mt-1">{errors.fitness_goal.message}</p>
          )}
        </div>

        {/* Dietary Preference */}
        <div>
          <label htmlFor="setup_dietary_preference" className="block font-ui text-xs font-semibold uppercase tracking-wider text-[#57554F] mb-1">
            Dietary Preference <span className="text-[#9B2C2C]">*</span>
          </label>
          <select
            id="setup_dietary_preference"
            className={`w-full font-ui text-sm bg-white border px-3.5 py-2.5 rounded-xs transition-colors focus:outline-none focus:ring-1 ${
              errors.dietary_preference ? 'border-[#9B2C2C] focus:ring-[#9B2C2C]' : 'border-[#E5E1D8] focus:border-[#244234] focus:ring-[#244234]'
            }`}
            {...register('dietary_preference', { required: 'Please select a dietary preference' })}
          >
            <option value="" disabled>Select dietary preference</option>
            {DIETARY_PREFERENCE_CHOICES.map((choice) => (
              <option key={choice.value} value={choice.value}>
                {choice.label}
              </option>
            ))}
          </select>
          {errors.dietary_preference && (
            <p className="font-ui text-xs text-[#9B2C2C] mt-1">{errors.dietary_preference.message}</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full font-ui text-sm font-medium bg-[#181715] hover:bg-[#244234] text-[#FAF8F5] py-2.5 px-4 rounded-xs transition-colors mt-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving Profile...' : 'Complete Profile Setup'}
        </button>
      </form>
    </div>
  );
}
