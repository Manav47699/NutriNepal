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
} from '../constants/profileChoices';

const KNOWN_FIELDS = [
  'age',
  'gender',
  'height_cm',
  'weight_kg',
  'target_weight_kg',
  'activity_level',
  'fitness_goal',
  'dietary_preference',
  'medical_conditions',
  'allergies',
  'dietary_restrictions',
  'social_religious_constraints',
];

function ProfileView() {
  const navigate = useNavigate();
  const [initialLoading, setInitialLoading] = useState(true);
  const [initialError, setInitialError] = useState(null);
  const [generalError, setGeneralError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const [medicalConditionsList, setMedicalConditionsList] = useState([]);
  const [allergiesList, setAllergiesList] = useState([]);
  const [dietaryRestrictionsList, setDietaryRestrictionsList] = useState([]);
  const [socialReligiousConstraintsList, setSocialReligiousConstraintsList] = useState([]);

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
      target_weight_kg: '',
      activity_level: '',
      fitness_goal: '',
      dietary_preference: '',
      medical_conditions: [],
      allergies: [],
      dietary_restrictions: [],
      social_religious_constraints: [],
    },
  });

  const watchedMedicalConditions = watch('medical_conditions') || [];
  const watchedAllergies = watch('allergies') || [];
  const watchedDietaryRestrictions = watch('dietary_restrictions') || [];
  const watchedSocialReligiousConstraints = watch('social_religious_constraints') || [];

  const fetchProfileAndReferences = async () => {
    setInitialLoading(true);
    setInitialError(null);

    try {
      const [profileRes, medRes, allergyRes, dietRes, socialRes] = await Promise.all([
        apiClient.get('/api/profiles/user-profile/'),
        apiClient.get('/api/profiles/medical-conditions/'),
        apiClient.get('/api/profiles/allergies/'),
        apiClient.get('/api/profiles/dietary-restrictions/'),
        apiClient.get('/api/profiles/social-religious-constraints/'),
      ]);

      setMedicalConditionsList(medRes.data?.data || []);
      setAllergiesList(allergyRes.data?.data || []);
      setDietaryRestrictionsList(dietRes.data?.data || []);
      setSocialReligiousConstraintsList(socialRes.data?.data || []);

      const profile = profileRes.data?.data || {};
      reset({
        age: profile.age ?? '',
        gender: profile.gender ?? '',
        height_cm: profile.height_cm ?? '',
        weight_kg: profile.weight_kg ?? '',
        target_weight_kg: profile.target_weight_kg ?? '',
        activity_level: profile.activity_level ?? '',
        fitness_goal: profile.fitness_goal ?? '',
        dietary_preference: profile.dietary_preference ?? '',
        medical_conditions: profile.medical_conditions || [],
        allergies: profile.allergies || [],
        dietary_restrictions: profile.dietary_restrictions || [],
        social_religious_constraints: profile.social_religious_constraints || [],
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
    fetchProfileAndReferences();
  }, []);

  const handleCheckboxToggle = (fieldName, id) => {
    const current = getValues(fieldName) || [];
    const numId = Number(id);
    const updated = current.includes(numId)
      ? current.filter((item) => item !== numId)
      : [...current, numId];
    setValue(fieldName, updated, { shouldDirty: true, shouldValidate: true });
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
    if (dirtyFields.target_weight_kg) {
      if (
        data.target_weight_kg === '' ||
        data.target_weight_kg === null ||
        data.target_weight_kg === undefined
      ) {
        payload.target_weight_kg = null;
      } else {
        payload.target_weight_kg = Number(data.target_weight_kg);
      }
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
    if (dirtyFields.medical_conditions) {
      payload.medical_conditions = (data.medical_conditions || []).map(Number);
    }
    if (dirtyFields.allergies) {
      payload.allergies = (data.allergies || []).map(Number);
    }
    if (dirtyFields.dietary_restrictions) {
      payload.dietary_restrictions = (data.dietary_restrictions || []).map(Number);
    }
    if (dirtyFields.social_religious_constraints) {
      payload.social_religious_constraints = (data.social_religious_constraints || []).map(Number);
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
          target_weight_kg: updated.target_weight_kg ?? '',
          activity_level: updated.activity_level ?? '',
          fitness_goal: updated.fitness_goal ?? '',
          dietary_preference: updated.dietary_preference ?? '',
          medical_conditions: updated.medical_conditions || [],
          allergies: updated.allergies || [],
          dietary_restrictions: updated.dietary_restrictions || [],
          social_religious_constraints: updated.social_religious_constraints || [],
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

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="target_weight_kg" className="block font-ui text-xs font-semibold uppercase tracking-wider text-[#57554F]">
                        Target Weight (kg)
                      </label>
                      <span className="font-code text-[11px] text-[#85837C]">Optional</span>
                    </div>
                    <input
                      id="target_weight_kg"
                      type="number"
                      step="0.01"
                      placeholder="e.g. 65"
                      className={`w-full font-ui text-sm bg-white border px-3.5 py-2.5 rounded-xs transition-colors focus:outline-none focus:ring-1 ${
                        errors.target_weight_kg ? 'border-[#9B2C2C] focus:ring-[#9B2C2C]' : 'border-[#E5E1D8] focus:border-[#244234] focus:ring-[#244234]'
                      }`}
                      {...register('target_weight_kg', {
                        min: { value: 20, message: 'Target weight must be at least 20 kg' },
                        max: { value: 300, message: 'Target weight must be at most 300 kg' },
                      })}
                    />
                    {errors.target_weight_kg && (
                      <p className="font-ui text-xs text-[#9B2C2C] mt-1">{errors.target_weight_kg.message}</p>
                    )}
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

                {/* Section 3: Health & Dietary Requirements */}
                <div className="space-y-4 pt-2">
                  <span className="font-code text-xs text-[#85837C] uppercase tracking-wider block border-b border-[#E5E1D8] pb-1">
                    03 / Health &amp; Dietary Requirements
                  </span>

                  {/* Medical Conditions */}
                  <div>
                    <span className="block font-ui text-xs font-semibold uppercase tracking-wider text-[#57554F] mb-2">
                      Medical Conditions
                    </span>
                    {medicalConditionsList.length === 0 ? (
                      <p className="font-ui text-xs text-[#85837C]">No medical conditions listed.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white border border-[#E5E1D8] p-3 rounded-xs">
                        {medicalConditionsList.map((item) => {
                          const isChecked = watchedMedicalConditions.includes(item.id);
                          return (
                            <label
                              key={item.id}
                              className="flex items-start gap-2 text-xs font-ui text-[#181715] cursor-pointer hover:text-[#244234] transition-colors p-1"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleCheckboxToggle('medical_conditions', item.id)}
                                className="mt-0.5 accent-[#244234] cursor-pointer"
                              />
                              <div>
                                <span className="font-medium">{item.name}</span>
                                {item.description && (
                                  <span className="block text-[11px] text-[#85837C] leading-tight mt-0.5">
                                    {item.description}
                                  </span>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Allergies */}
                  <div>
                    <span className="block font-ui text-xs font-semibold uppercase tracking-wider text-[#57554F] mb-2">
                      Allergies
                    </span>
                    {allergiesList.length === 0 ? (
                      <p className="font-ui text-xs text-[#85837C]">No allergies listed.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white border border-[#E5E1D8] p-3 rounded-xs">
                        {allergiesList.map((item) => {
                          const isChecked = watchedAllergies.includes(item.id);
                          return (
                            <label
                              key={item.id}
                              className="flex items-start gap-2 text-xs font-ui text-[#181715] cursor-pointer hover:text-[#244234] transition-colors p-1"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleCheckboxToggle('allergies', item.id)}
                                className="mt-0.5 accent-[#244234] cursor-pointer"
                              />
                              <div>
                                <span className="font-medium">{item.name}</span>
                                {item.description && (
                                  <span className="block text-[11px] text-[#85837C] leading-tight mt-0.5">
                                    {item.description}
                                  </span>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Dietary Restrictions */}
                  <div>
                    <span className="block font-ui text-xs font-semibold uppercase tracking-wider text-[#57554F] mb-2">
                      Dietary Restrictions
                    </span>
                    {dietaryRestrictionsList.length === 0 ? (
                      <p className="font-ui text-xs text-[#85837C]">No dietary restrictions listed.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white border border-[#E5E1D8] p-3 rounded-xs">
                        {dietaryRestrictionsList.map((item) => {
                          const isChecked = watchedDietaryRestrictions.includes(item.id);
                          return (
                            <label
                              key={item.id}
                              className="flex items-start gap-2 text-xs font-ui text-[#181715] cursor-pointer hover:text-[#244234] transition-colors p-1"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleCheckboxToggle('dietary_restrictions', item.id)}
                                className="mt-0.5 accent-[#244234] cursor-pointer"
                              />
                              <div>
                                <span className="font-medium">{item.name}</span>
                                {item.description && (
                                  <span className="block text-[11px] text-[#85837C] leading-tight mt-0.5">
                                    {item.description}
                                  </span>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Social & Religious Constraints */}
                  <div>
                    <span className="block font-ui text-xs font-semibold uppercase tracking-wider text-[#57554F] mb-2">
                      Social &amp; Religious Constraints
                    </span>
                    {socialReligiousConstraintsList.length === 0 ? (
                      <p className="font-ui text-xs text-[#85837C]">No social or religious constraints listed.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white border border-[#E5E1D8] p-3 rounded-xs">
                        {socialReligiousConstraintsList.map((item) => {
                          const isChecked = watchedSocialReligiousConstraints.includes(item.id);
                          return (
                            <label
                              key={item.id}
                              className="flex items-start gap-2 text-xs font-ui text-[#181715] cursor-pointer hover:text-[#244234] transition-colors p-1"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleCheckboxToggle('social_religious_constraints', item.id)}
                                className="mt-0.5 accent-[#244234] cursor-pointer"
                              />
                              <div>
                                <span className="font-medium">{item.name}</span>
                                {item.description && (
                                  <span className="block text-[11px] text-[#85837C] leading-tight mt-0.5">
                                    {item.description}
                                  </span>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
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
