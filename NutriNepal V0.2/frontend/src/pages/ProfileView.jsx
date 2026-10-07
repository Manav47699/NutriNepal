import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import apiClient from '../api/client';
import {
  GENDER_CHOICES,
  ACTIVITY_LEVEL_CHOICES,
  FITNESS_GOAL_CHOICES,
  DIETARY_PREFERENCE_CHOICES,
  HEALTH_RESTRICTIONS_CONFIG,
  SOCIAL_RESTRICTIONS_CONFIG,
} from '../constants/profileChoices';

const KNOWN_FIELDS = [
  'age',
  'gender',
  'height_cm',
  'weight_kg',
  'activity_level',
  'fitness_goal',
  'dietary_preference',
  'health_restrictions',
  'social_restrictions',
];

const DEFAULT_HEALTH_RESTRICTIONS = {
  diabetes: 'allowed',
  uric_acid: 'allowed',
  hypertension: 'allowed',
  kidney_disease: 'allowed',
};

const DEFAULT_SOCIAL_RESTRICTIONS = {
  shrawan: 'allowed',
  chaturmas: 'allowed',
  mourning: 'allowed',
  no_onion_garlic: 'allowed',
};

function ProfileView() {
  const navigate = useNavigate();
  const [initialLoading, setInitialLoading] = useState(true);
  const [initialError, setInitialError] = useState(null);
  const [generalError, setGeneralError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    reset,
    setError,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm({
    defaultValues: {
      age: '',
      gender: '',
      height_cm: '',
      weight_kg: '',
      activity_level: '',
      fitness_goal: '',
      dietary_preference: '',
      health_restrictions: DEFAULT_HEALTH_RESTRICTIONS,
      social_restrictions: DEFAULT_SOCIAL_RESTRICTIONS,
    },
  });

  const watchedHealthRestrictions = watch('health_restrictions') || DEFAULT_HEALTH_RESTRICTIONS;
  const watchedSocialRestrictions = watch('social_restrictions') || DEFAULT_SOCIAL_RESTRICTIONS;

  const fetchProfile = async () => {
    setInitialLoading(true);
    setInitialError(null);

    try {
      const profileRes = await apiClient.get('/api/profiles/user-profile/');
      const profile = profileRes.data?.data || {};

      reset({
        age: profile.age ?? '',
        gender: profile.gender ?? '',
        height_cm: profile.height_cm ?? '',
        weight_kg: profile.weight_kg ?? '',
        activity_level: profile.activity_level ?? '',
        fitness_goal: profile.fitness_goal ?? '',
        dietary_preference: profile.dietary_preference ?? '',
        health_restrictions: {
          ...DEFAULT_HEALTH_RESTRICTIONS,
          ...(profile.health_restrictions || {}),
        },
        social_restrictions: {
          ...DEFAULT_SOCIAL_RESTRICTIONS,
          ...(profile.social_restrictions || {}),
        },
      });
    } catch (error) {
      if (error.response?.status === 404) {
        navigate('/profile/setup', { replace: true });
        return;
      }
      setInitialError(
        error.response?.data?.message ||
          'Failed to load profile data. Please check your connection and try again.'
      );
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleRestrictionToggle = (type, key, value) => {
    const current = getValues(type) || {};
    setValue(
      type,
      {
        ...current,
        [key]: value,
      },
      { shouldDirty: true, shouldValidate: true }
    );
  };

  const onSubmit = async (data) => {
    setGeneralError(null);
    setSuccessMessage(null);

    const dirtyKeys = Object.keys(dirtyFields);
    if (dirtyKeys.length === 0) {
      setSuccessMessage('No changes to save.');
      return;
    }

    const payload = {};

    if (dirtyFields.age) {
      payload.age = Number(data.age);
    }
    if (dirtyFields.gender) {
      payload.gender = data.gender;
    }
    if (dirtyFields.height_cm) {
      payload.height_cm = Number(data.height_cm);
    }
    if (dirtyFields.weight_kg) {
      payload.weight_kg = Number(data.weight_kg);
    }
    if (dirtyFields.activity_level) {
      payload.activity_level = data.activity_level;
    }
    if (dirtyFields.fitness_goal) {
      payload.fitness_goal = data.fitness_goal;
    }
    if (dirtyFields.dietary_preference) {
      payload.dietary_preference = data.dietary_preference;
    }
    if (dirtyFields.health_restrictions) {
      payload.health_restrictions = data.health_restrictions;
    }
    if (dirtyFields.social_restrictions) {
      payload.social_restrictions = data.social_restrictions;
    }

    try {
      const response = await apiClient.patch('/api/profiles/user-profile/', payload);

      if (response.data?.data) {
        const updated = response.data.data;
        reset({
          age: updated.age ?? '',
          gender: updated.gender ?? '',
          height_cm: updated.height_cm ?? '',
          weight_kg: updated.weight_kg ?? '',
          activity_level: updated.activity_level ?? '',
          fitness_goal: updated.fitness_goal ?? '',
          dietary_preference: updated.dietary_preference ?? '',
          health_restrictions: {
            ...DEFAULT_HEALTH_RESTRICTIONS,
            ...(updated.health_restrictions || {}),
          },
          social_restrictions: {
            ...DEFAULT_SOCIAL_RESTRICTIONS,
            ...(updated.social_restrictions || {}),
          },
        });
        setSuccessMessage('Profile updated successfully.');
      }
    } catch (error) {
      if (error.response?.data) {
        const responseData = error.response.data;

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

        if (responseData.message) {
          setGeneralError(responseData.message);
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
    <div className="min-h-screen bg-[#FAF8F5] text-[#181715] flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-12 px-6">
        <div className="max-w-2xl w-full bg-[#FAF8F5] border border-[#E5E1D8] p-8 rounded-xs">
          <div className="mb-6">
            <span className="font-code text-xs text-[#85837C] uppercase tracking-wider block mb-1">
              User Profile
            </span>
            <h1 className="font-editorial text-3xl text-[#181715] font-normal">
              Profile &amp; Preferences
            </h1>
            <p className="font-ui text-sm text-[#57554F] mt-1">
              View and manage your health metrics, fitness objectives, and dietary needs.
            </p>
          </div>

          {initialLoading ? (
            <div className="py-12 text-center">
              <span className="font-code text-xs text-[#85837C] uppercase tracking-wider">
                Loading profile data...
              </span>
            </div>
          ) : initialError ? (
            <div className="py-8 text-center space-y-4">
              <div className="p-4 bg-[#FDF2F2] border border-[#9B2C2C]/20 text-[#9B2C2C] text-sm font-ui rounded-xs">
                {initialError}
              </div>
              <button
                type="button"
                onClick={fetchProfileAndReferences}
                className="font-ui text-xs font-medium bg-[#181715] hover:bg-[#244234] text-[#FAF8F5] py-2 px-4 rounded-xs transition-colors cursor-pointer"
              >
                Retry Loading
              </button>
            </div>
          ) : (
            <>
              {generalError && (
                <div className="p-3 mb-4 bg-[#FDF2F2] border border-[#9B2C2C]/20 text-[#9B2C2C] text-xs font-ui rounded-xs">
                  {generalError}
                </div>
              )}

              {successMessage && (
                <div className="p-3 mb-4 bg-[#F3F0EA] border border-[#244234]/30 text-[#244234] text-xs font-ui rounded-xs">
                  {successMessage}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
                {/* Section 1: Physical Metrics */}
                <div className="space-y-4">
                  <span className="font-code text-xs text-[#85837C] uppercase tracking-wider block border-b border-[#E5E1D8] pb-1">
                    01 / Physical Metrics
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="age" className="block font-ui text-xs font-semibold uppercase tracking-wider text-[#57554F] mb-1">
                        Age <span className="text-[#9B2C2C]">*</span>
                      </label>
                      <input
                        id="age"
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
                      <label htmlFor="gender" className="block font-ui text-xs font-semibold uppercase tracking-wider text-[#57554F] mb-1">
                        Gender <span className="text-[#9B2C2C]">*</span>
                      </label>
                      <select
                        id="gender"
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="height_cm" className="block font-ui text-xs font-semibold uppercase tracking-wider text-[#57554F] mb-1">
                        Height (cm) <span className="text-[#9B2C2C]">*</span>
                      </label>
                      <input
                        id="height_cm"
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
                      <label htmlFor="weight_kg" className="block font-ui text-xs font-semibold uppercase tracking-wider text-[#57554F] mb-1">
                        Weight (kg) <span className="text-[#9B2C2C]">*</span>
                      </label>
                      <input
                        id="weight_kg"
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
                </div>

                {/* Section 2: Lifestyle & Goals */}
                <div className="space-y-4 pt-2">
                  <span className="font-code text-xs text-[#85837C] uppercase tracking-wider block border-b border-[#E5E1D8] pb-1">
                    02 / Lifestyle &amp; Objectives
                  </span>

                  <div>
                    <label htmlFor="activity_level" className="block font-ui text-xs font-semibold uppercase tracking-wider text-[#57554F] mb-1">
                      Activity Level <span className="text-[#9B2C2C]">*</span>
                    </label>
                    <select
                      id="activity_level"
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

                  <div>
                    <label htmlFor="fitness_goal" className="block font-ui text-xs font-semibold uppercase tracking-wider text-[#57554F] mb-1">
                      Fitness Goal <span className="text-[#9B2C2C]">*</span>
                    </label>
                    <select
                      id="fitness_goal"
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

                  <div>
                    <label htmlFor="dietary_preference" className="block font-ui text-xs font-semibold uppercase tracking-wider text-[#57554F] mb-1">
                      Dietary Preference <span className="text-[#9B2C2C]">*</span>
                    </label>
                    <select
                      id="dietary_preference"
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
                </div>

                {/* Section 3: Health Conditions & Medical Restrictions */}
                <div className="space-y-4 pt-2">
                  <span className="font-code text-xs text-[#85837C] uppercase tracking-wider block border-b border-[#E5E1D8] pb-1">
                    03 / Medical &amp; Health Restrictions
                  </span>
                  <p className="font-ui text-xs text-[#57554F]">
                    Mark any medical condition as &quot;Restricted&quot; to automatically cross-check nutritional hazards.
                  </p>

                  <div className="space-y-2 bg-white border border-[#E5E1D8] p-3 rounded-xs">
                    {HEALTH_RESTRICTIONS_CONFIG.map((item) => {
                      const currentVal = watchedHealthRestrictions[item.key] || 'allowed';
                      const isRestricted = currentVal === 'restricted';
                      return (
                        <div
                          key={item.key}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-xs border border-[#E5E1D8]/60 hover:border-[#E5E1D8] transition-colors gap-2"
                        >
                          <div>
                            <span className="font-ui text-xs font-semibold text-[#181715] block">
                              {item.label}
                            </span>
                            <span className="font-ui text-[11px] text-[#85837C] block">
                              {item.description}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => handleRestrictionToggle('health_restrictions', item.key, 'allowed')}
                              className={`px-3 py-1 text-xs font-ui rounded-xs transition-colors cursor-pointer border ${
                                !isRestricted
                                  ? 'bg-[#181715] text-[#FAF8F5] border-[#181715]'
                                  : 'bg-[#FAF8F5] text-[#57554F] border-[#E5E1D8] hover:text-[#181715]'
                              }`}
                            >
                              Allowed
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRestrictionToggle('health_restrictions', item.key, 'restricted')}
                              className={`px-3 py-1 text-xs font-ui rounded-xs transition-colors cursor-pointer border ${
                                isRestricted
                                  ? 'bg-[#9B2C2C] text-white border-[#9B2C2C]'
                                  : 'bg-[#FAF8F5] text-[#57554F] border-[#E5E1D8] hover:text-[#9B2C2C]'
                              }`}
                            >
                              Restricted
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Section 4: Dietary & Social Observances */}
                <div className="space-y-4 pt-2">
                  <span className="font-code text-xs text-[#85837C] uppercase tracking-wider block border-b border-[#E5E1D8] pb-1">
                    04 / Cultural &amp; Social Restrictions
                  </span>
                  <p className="font-ui text-xs text-[#57554F]">
                    Configure fasting periods, social observances, or spice exclusions.
                  </p>

                  <div className="space-y-2 bg-white border border-[#E5E1D8] p-3 rounded-xs">
                    {SOCIAL_RESTRICTIONS_CONFIG.map((item) => {
                      const currentVal = watchedSocialRestrictions[item.key] || 'allowed';
                      const isRestricted = currentVal === 'restricted';
                      return (
                        <div
                          key={item.key}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-xs border border-[#E5E1D8]/60 hover:border-[#E5E1D8] transition-colors gap-2"
                        >
                          <div>
                            <span className="font-ui text-xs font-semibold text-[#181715] block">
                              {item.label}
                            </span>
                            <span className="font-ui text-[11px] text-[#85837C] block">
                              {item.description}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => handleRestrictionToggle('social_restrictions', item.key, 'allowed')}
                              className={`px-3 py-1 text-xs font-ui rounded-xs transition-colors cursor-pointer border ${
                                !isRestricted
                                  ? 'bg-[#181715] text-[#FAF8F5] border-[#181715]'
                                  : 'bg-[#FAF8F5] text-[#57554F] border-[#E5E1D8] hover:text-[#181715]'
                              }`}
                            >
                              Allowed
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRestrictionToggle('social_restrictions', item.key, 'restricted')}
                              className={`px-3 py-1 text-xs font-ui rounded-xs transition-colors cursor-pointer border ${
                                isRestricted
                                  ? 'bg-[#9B2C2C] text-white border-[#9B2C2C]'
                                  : 'bg-[#FAF8F5] text-[#57554F] border-[#E5E1D8] hover:text-[#9B2C2C]'
                              }`}
                            >
                              Restricted
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full font-ui text-sm font-medium bg-[#181715] hover:bg-[#244234] text-[#FAF8F5] py-2.5 px-4 rounded-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default ProfileView;
