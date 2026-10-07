import { useState, useEffect } from 'react';
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
  'target_weight_kg',
  'activity_level',
  'fitness_goal',
  'dietary_preference',
  'medical_conditions',
  'allergies',
  'dietary_restrictions',
  'social_religious_constraints',
];

export default function ProfileSetupForm({ onSuccess }) {
  const { refreshProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [generalError, setGeneralError] = useState(null);

  const [medicalConditionsList, setMedicalConditionsList] = useState([]);
  const [allergiesList, setAllergiesList] = useState([]);
  const [dietaryRestrictionsList, setDietaryRestrictionsList] = useState([]);
  const [socialReligiousConstraintsList, setSocialReligiousConstraintsList] = useState([]);
  const [loadingReferences, setLoadingReferences] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    trigger,
    setError,
    formState: { errors, isSubmitting },
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

  useEffect(() => {
    let isMounted = true;
    const fetchReferences = async () => {
      try {
        const [medRes, allergyRes, dietRes, socialRes] = await Promise.all([
          apiClient.get('/api/profiles/medical-conditions/'),
          apiClient.get('/api/profiles/allergies/'),
          apiClient.get('/api/profiles/dietary-restrictions/'),
          apiClient.get('/api/profiles/social-religious-constraints/'),
        ]);

        if (isMounted) {
          setMedicalConditionsList(medRes.data?.data || []);
          setAllergiesList(allergyRes.data?.data || []);
          setDietaryRestrictionsList(dietRes.data?.data || []);
          setSocialReligiousConstraintsList(socialRes.data?.data || []);
        }
      } catch (err) {
        console.error('Failed to load profile reference options:', err);
      } finally {
        if (isMounted) {
          setLoadingReferences(false);
        }
      }
    };

    fetchReferences();
    return () => {
      isMounted = false;
    };
  }, []);

  const watchedMedicalConditions = watch('medical_conditions') || [];
  const watchedAllergies = watch('allergies') || [];
  const watchedDietaryRestrictions = watch('dietary_restrictions') || [];
  const watchedSocialReligiousConstraints = watch('social_religious_constraints') || [];

  const handleCheckboxToggle = (fieldName, id) => {
    const current = getValues(fieldName) || [];
    const numId = Number(id);
    const updated = current.includes(numId)
      ? current.filter((item) => item !== numId)
      : [...current, numId];
    setValue(fieldName, updated, { shouldDirty: true, shouldValidate: true });
  };

  const handleNext = async (e) => {
    if (e) e.preventDefault();
    setGeneralError(null);

    const step1Valid = await trigger([
      'age',
      'gender',
      'height_cm',
      'weight_kg',
      'target_weight_kg',
      'activity_level',
      'fitness_goal',
      'dietary_preference',
    ]);

    if (step1Valid) {
      setCurrentStep(2);
    }
  };

  const handleBack = () => {
    setGeneralError(null);
    setCurrentStep(1);
  };

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
      medical_conditions: (data.medical_conditions || []).map(Number),
      allergies: (data.allergies || []).map(Number),
      dietary_restrictions: (data.dietary_restrictions || []).map(Number),
      social_religious_constraints: (data.social_religious_constraints || []).map(Number),
    };

    if (
      data.target_weight_kg !== '' &&
      data.target_weight_kg !== null &&
      data.target_weight_kg !== undefined
    ) {
      payload.target_weight_kg = Number(data.target_weight_kg);
    }

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
          let step1ErrorFound = false;
          const nonFieldMessages = [];

          Object.entries(responseData.errors).forEach(([field, messages]) => {
            const message = Array.isArray(messages) ? messages[0] : String(messages);
            if (KNOWN_FIELDS.includes(field)) {
              setError(field, { type: 'server', message });
              hasFieldErrors = true;
              if (
                [
                  'age',
                  'gender',
                  'height_cm',
                  'weight_kg',
                  'target_weight_kg',
                  'activity_level',
                  'fitness_goal',
                  'dietary_preference',
                ].includes(field)
              ) {
                step1ErrorFound = true;
              }
            } else {
              nonFieldMessages.push(message);
            }
          });

          if (step1ErrorFound) {
            setCurrentStep(1);
          }

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
        setGeneralError(
          'Unable to connect to the server. Please check your connection and try again.'
        );
      } else {
        setGeneralError('An unexpected error occurred. Please try again.');
      }
    }
  };

  return (
    <div>
      {/* Step Progress Indicator */}
      <div className="flex items-center justify-between border-b border-[#E5E1D8] pb-3 mb-5">
        <div className="flex items-center gap-2">
          <span
            className={`font-code text-xs px-2 py-0.5 rounded-xs ${
              currentStep === 1
                ? 'bg-[#244234] text-[#FAF8F5] font-semibold'
                : 'bg-[#FAF8F5] text-[#57554F] border border-[#E5E1D8]'
            }`}
          >
            01
          </span>
          <span className="font-ui text-xs font-medium text-[#57554F]">
            Basic Profile
          </span>
          <span className="text-[#85837C] text-xs">→</span>
          <span
            className={`font-code text-xs px-2 py-0.5 rounded-xs ${
              currentStep === 2
                ? 'bg-[#244234] text-[#FAF8F5] font-semibold'
                : 'bg-[#FAF8F5] text-[#85837C] border border-[#E5E1D8]'
            }`}
          >
            02
          </span>
          <span className="font-ui text-xs font-medium text-[#57554F]">
            Requirements
          </span>
        </div>
        <span className="font-code text-xs text-[#85837C]">
          Step {currentStep} of 2
        </span>
      </div>

      {generalError && (
        <div className="p-3 mb-4 bg-[#FDF2F2] border border-[#9B2C2C]/20 text-[#9B2C2C] text-xs font-ui rounded-xs">
          {generalError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {currentStep === 1 && (
          <div className="space-y-4">
            {/* Age & Gender */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="setup_age"
                  className="block font-ui text-xs font-semibold uppercase tracking-wider text-[#57554F] mb-1"
                >
                  Age <span className="text-[#9B2C2C]">*</span>
                </label>
                <input
                  id="setup_age"
                  type="number"
                  placeholder="e.g. 25"
                  className={`w-full font-ui text-sm bg-white border px-3.5 py-2.5 rounded-xs transition-colors focus:outline-none focus:ring-1 ${
                    errors.age
                      ? 'border-[#9B2C2C] focus:ring-[#9B2C2C]'
                      : 'border-[#E5E1D8] focus:border-[#244234] focus:ring-[#244234]'
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
                <label
                  htmlFor="setup_gender"
                  className="block font-ui text-xs font-semibold uppercase tracking-wider text-[#57554F] mb-1"
                >
                  Gender <span className="text-[#9B2C2C]">*</span>
                </label>
                <select
                  id="setup_gender"
                  className={`w-full font-ui text-sm bg-white border px-3.5 py-2.5 rounded-xs transition-colors focus:outline-none focus:ring-1 ${
                    errors.gender
                      ? 'border-[#9B2C2C] focus:ring-[#9B2C2C]'
                      : 'border-[#E5E1D8] focus:border-[#244234] focus:ring-[#244234]'
                  }`}
                  {...register('gender', { required: 'Please select a gender' })}
                >
                  <option value="" disabled>
                    Select gender
                  </option>
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
                <label
                  htmlFor="setup_height_cm"
                  className="block font-ui text-xs font-semibold uppercase tracking-wider text-[#57554F] mb-1"
                >
                  Height (cm) <span className="text-[#9B2C2C]">*</span>
                </label>
                <input
                  id="setup_height_cm"
                  type="number"
                  step="0.01"
                  placeholder="e.g. 175"
                  className={`w-full font-ui text-sm bg-white border px-3.5 py-2.5 rounded-xs transition-colors focus:outline-none focus:ring-1 ${
                    errors.height_cm
                      ? 'border-[#9B2C2C] focus:ring-[#9B2C2C]'
                      : 'border-[#E5E1D8] focus:border-[#244234] focus:ring-[#244234]'
                  }`}
                  {...register('height_cm', {
                    required: 'Height is required',
                    min: { value: 50, message: 'Height must be at least 50 cm' },
                    max: { value: 250, message: 'Height must be at most 250 cm' },
                  })}
                />
                {errors.height_cm && (
                  <p className="font-ui text-xs text-[#9B2C2C] mt-1">
                    {errors.height_cm.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="setup_weight_kg"
                  className="block font-ui text-xs font-semibold uppercase tracking-wider text-[#57554F] mb-1"
                >
                  Weight (kg) <span className="text-[#9B2C2C]">*</span>
                </label>
                <input
                  id="setup_weight_kg"
                  type="number"
                  step="0.01"
                  placeholder="e.g. 68.5"
                  className={`w-full font-ui text-sm bg-white border px-3.5 py-2.5 rounded-xs transition-colors focus:outline-none focus:ring-1 ${
                    errors.weight_kg
                      ? 'border-[#9B2C2C] focus:ring-[#9B2C2C]'
                      : 'border-[#E5E1D8] focus:border-[#244234] focus:ring-[#244234]'
                  }`}
                  {...register('weight_kg', {
                    required: 'Weight is required',
                    min: { value: 20, message: 'Weight must be at least 20 kg' },
                    max: { value: 300, message: 'Weight must be at most 300 kg' },
                  })}
                />
                {errors.weight_kg && (
                  <p className="font-ui text-xs text-[#9B2C2C] mt-1">
                    {errors.weight_kg.message}
                  </p>
                )}
              </div>
            </div>

            {/* Target Weight (Optional) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="setup_target_weight_kg"
                  className="block font-ui text-xs font-semibold uppercase tracking-wider text-[#57554F]"
                >
                  Target Weight (kg)
                </label>
                <span className="font-code text-[11px] text-[#85837C]">Optional</span>
              </div>
              <input
                id="setup_target_weight_kg"
                type="number"
                step="0.01"
                placeholder="e.g. 65"
                className={`w-full font-ui text-sm bg-white border px-3.5 py-2.5 rounded-xs transition-colors focus:outline-none focus:ring-1 ${
                  errors.target_weight_kg
                    ? 'border-[#9B2C2C] focus:ring-[#9B2C2C]'
                    : 'border-[#E5E1D8] focus:border-[#244234] focus:ring-[#244234]'
                }`}
                {...register('target_weight_kg', {
                  min: { value: 20, message: 'Target weight must be at least 20 kg' },
                  max: { value: 300, message: 'Target weight must be at most 300 kg' },
                })}
              />
              {errors.target_weight_kg && (
                <p className="font-ui text-xs text-[#9B2C2C] mt-1">
                  {errors.target_weight_kg.message}
                </p>
              )}
            </div>

            {/* Activity Level */}
            <div>
              <label
                htmlFor="setup_activity_level"
                className="block font-ui text-xs font-semibold uppercase tracking-wider text-[#57554F] mb-1"
              >
                Activity Level <span className="text-[#9B2C2C]">*</span>
              </label>
              <select
                id="setup_activity_level"
                className={`w-full font-ui text-sm bg-white border px-3.5 py-2.5 rounded-xs transition-colors focus:outline-none focus:ring-1 ${
                  errors.activity_level
                    ? 'border-[#9B2C2C] focus:ring-[#9B2C2C]'
                    : 'border-[#E5E1D8] focus:border-[#244234] focus:ring-[#244234]'
                }`}
                {...register('activity_level', {
                  required: 'Please select your activity level',
                })}
              >
                <option value="" disabled>
                  Select activity level
                </option>
                {ACTIVITY_LEVEL_CHOICES.map((choice) => (
                  <option key={choice.value} value={choice.value}>
                    {choice.label}
                  </option>
                ))}
              </select>
              {errors.activity_level && (
                <p className="font-ui text-xs text-[#9B2C2C] mt-1">
                  {errors.activity_level.message}
                </p>
              )}
            </div>

            {/* Fitness Goal */}
            <div>
              <label
                htmlFor="setup_fitness_goal"
                className="block font-ui text-xs font-semibold uppercase tracking-wider text-[#57554F] mb-1"
              >
                Fitness Goal <span className="text-[#9B2C2C]">*</span>
              </label>
              <select
                id="setup_fitness_goal"
                className={`w-full font-ui text-sm bg-white border px-3.5 py-2.5 rounded-xs transition-colors focus:outline-none focus:ring-1 ${
                  errors.fitness_goal
                    ? 'border-[#9B2C2C] focus:ring-[#9B2C2C]'
                    : 'border-[#E5E1D8] focus:border-[#244234] focus:ring-[#244234]'
                }`}
                {...register('fitness_goal', {
                  required: 'Please select a fitness goal',
                })}
              >
                <option value="" disabled>
                  Select fitness goal
                </option>
                {FITNESS_GOAL_CHOICES.map((choice) => (
                  <option key={choice.value} value={choice.value}>
                    {choice.label}
                  </option>
                ))}
              </select>
              {errors.fitness_goal && (
                <p className="font-ui text-xs text-[#9B2C2C] mt-1">
                  {errors.fitness_goal.message}
                </p>
              )}
            </div>

            {/* Dietary Preference */}
            <div>
              <label
                htmlFor="setup_dietary_preference"
                className="block font-ui text-xs font-semibold uppercase tracking-wider text-[#57554F] mb-1"
              >
                Dietary Preference <span className="text-[#9B2C2C]">*</span>
              </label>
              <select
                id="setup_dietary_preference"
                className={`w-full font-ui text-sm bg-white border px-3.5 py-2.5 rounded-xs transition-colors focus:outline-none focus:ring-1 ${
                  errors.dietary_preference
                    ? 'border-[#9B2C2C] focus:ring-[#9B2C2C]'
                    : 'border-[#E5E1D8] focus:border-[#244234] focus:ring-[#244234]'
                }`}
                {...register('dietary_preference', {
                  required: 'Please select a dietary preference',
                })}
              >
                <option value="" disabled>
                  Select dietary preference
                </option>
                {DIETARY_PREFERENCE_CHOICES.map((choice) => (
                  <option key={choice.value} value={choice.value}>
                    {choice.label}
                  </option>
                ))}
              </select>
              {errors.dietary_preference && (
                <p className="font-ui text-xs text-[#9B2C2C] mt-1">
                  {errors.dietary_preference.message}
                </p>
              )}
            </div>

            {/* Next Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleNext}
                className="w-full font-ui text-sm font-medium bg-[#181715] hover:bg-[#244234] text-[#FAF8F5] py-2.5 px-4 rounded-xs transition-colors mt-2 cursor-pointer flex items-center justify-center gap-1.5"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-5">
            <div className="text-xs text-[#57554F] font-ui bg-[#FAF8F5] p-3 border border-[#E5E1D8] rounded-xs">
              Select any applicable conditions, allergies, or restrictions. All sections are optional.
            </div>

            {/* Medical Conditions */}
            <div>
              <span className="block font-ui text-xs font-semibold uppercase tracking-wider text-[#57554F] mb-2">
                Medical Conditions
              </span>
              {loadingReferences ? (
                <p className="font-ui text-xs text-[#85837C]">Loading conditions...</p>
              ) : medicalConditionsList.length === 0 ? (
                <p className="font-ui text-xs text-[#85837C]">No medical conditions listed.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white border border-[#E5E1D8] p-3 rounded-xs max-h-48 overflow-y-auto">
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
              {loadingReferences ? (
                <p className="font-ui text-xs text-[#85837C]">Loading allergies...</p>
              ) : allergiesList.length === 0 ? (
                <p className="font-ui text-xs text-[#85837C]">No allergies listed.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white border border-[#E5E1D8] p-3 rounded-xs max-h-48 overflow-y-auto">
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
              {loadingReferences ? (
                <p className="font-ui text-xs text-[#85837C]">Loading dietary restrictions...</p>
              ) : dietaryRestrictionsList.length === 0 ? (
                <p className="font-ui text-xs text-[#85837C]">No dietary restrictions listed.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white border border-[#E5E1D8] p-3 rounded-xs max-h-48 overflow-y-auto">
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
              {loadingReferences ? (
                <p className="font-ui text-xs text-[#85837C]">Loading constraints...</p>
              ) : socialReligiousConstraintsList.length === 0 ? (
                <p className="font-ui text-xs text-[#85837C]">No social or religious constraints listed.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white border border-[#E5E1D8] p-3 rounded-xs max-h-48 overflow-y-auto">
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

            {/* Action Buttons */}
            <div className="pt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={handleBack}
                disabled={isSubmitting}
                className="font-ui text-sm font-medium border border-[#E5E1D8] hover:border-[#244234] bg-white text-[#181715] hover:text-[#244234] py-2.5 px-5 rounded-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 font-ui text-sm font-medium bg-[#181715] hover:bg-[#244234] text-[#FAF8F5] py-2.5 px-4 rounded-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-center"
              >
                {isSubmitting ? 'Saving Profile...' : 'Complete Profile Setup'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
