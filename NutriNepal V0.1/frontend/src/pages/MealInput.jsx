import { useState, useRef, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import apiClient from '../api/client';
import { MEAL_TYPE_CHOICES, INPUT_MODES } from '../constants/mealChoices';

const KNOWN_FIELDS = ['meal_type', 'description', 'image'];

export default function MealInput() {
  const navigate = useNavigate();
  const [selectedMode, setSelectedMode] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [generalError, setGeneralError] = useState(null);
  const fileInputRef = useRef(null);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    clearErrors,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      meal_type: '',
      input_mode: '',
      description: '',
      image: null,
    },
  });

  const watchedMealType = useWatch({ control, name: 'meal_type' });

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleModeChange = (mode) => {
    setSelectedMode(mode);
    setValue('input_mode', mode, { shouldValidate: true });
    clearErrors(['input_mode', 'description', 'image']);
    setGeneralError(null);

    // Clear previously entered value so only active mode's input is kept
    setValue('description', '');
    setValue('image', null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setValue('image', file, { shouldValidate: true });
      clearErrors('image');
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleClearImage = () => {
    setValue('image', null, { shouldValidate: true });
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onSubmit = async (data) => {
    setGeneralError(null);

    // Validate that input mode is selected
    if (!selectedMode) {
      setError('input_mode', {
        type: 'manual',
        message: 'Please choose an input method (Description or Photo)',
      });
      return;
    }

    // Validate active mode's field
    if (selectedMode === INPUT_MODES.DESCRIPTION) {
      const desc = data.description?.trim();
      if (!desc) {
        setError('description', {
          type: 'manual',
          message: 'Please provide a description of your meal',
        });
        return;
      }
    } else if (selectedMode === INPUT_MODES.PHOTO) {
      if (!data.image) {
        setError('image', {
          type: 'manual',
          message: 'Please select or capture a photo of your meal',
        });
        return;
      }
    }

    const formData = new FormData();
    formData.append('meal_type', data.meal_type);

    if (selectedMode === INPUT_MODES.DESCRIPTION) {
      formData.append('description', data.description.trim());
    } else if (selectedMode === INPUT_MODES.PHOTO) {
      formData.append('image', data.image);
    }

    try {
      const response = await apiClient.post('/api/meals/', formData);
      const createdMeal = response.data?.data;
      const mealId = createdMeal?.id;

      if (mealId) {
        navigate(`/meals/${mealId}`);
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      if (error.response?.data?.data && typeof error.response.data.data === 'object') {
        const serverErrors = error.response.data.data;
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
          setGeneralError(
            error.response.data.message || 'Failed to create meal log. Please check your submission.'
          );
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

      <main className="flex-1 max-w-2xl w-full mx-auto py-10 px-6 sm:px-8">
        {/* Navigation Breadcrumb */}
        <div className="mb-6">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 font-ui text-xs font-medium text-[#57554F] hover:text-[#181715] transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Page Container */}
        <div className="bg-[#FAF8F5] border border-[#E5E1D8] p-6 sm:p-8 rounded-xs space-y-6">
          {/* Header */}
          <div className="border-b border-[#E5E1D8] pb-5">
            <span className="font-code text-xs text-[#85837C] uppercase tracking-wider block mb-1">
              05 / Meal Logging
            </span>
            <h1 className="font-editorial text-3xl sm:text-4xl text-[#181715] font-normal">
              Log Your Meal
            </h1>
            <p className="font-ui text-sm text-[#57554F] mt-1">
              Record your meal using a text description or a food plate photo for nutritional analysis.
            </p>
          </div>

          {/* General Error Banner */}
          {generalError && (
            <div className="p-3 bg-[#FDF2F2] border border-[#9B2C2C]/20 text-[#9B2C2C] text-xs font-ui rounded-xs">
              {generalError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
            {/* 1. Meal Type Selection (Always Visible) */}
            <div>
              <label className="block font-ui text-xs font-semibold uppercase tracking-wider text-[#57554F] mb-2">
                Meal Type <span className="text-[#9B2C2C]">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {MEAL_TYPE_CHOICES.map((choice) => {
                  const isSelected = watchedMealType === choice.value;
                  return (
                    <label
                      key={choice.value}
                      className={`flex items-center justify-center text-center p-3 border rounded-xs cursor-pointer transition-colors font-ui text-sm ${
                        isSelected
                          ? 'bg-[#181715] text-[#FAF8F5] border-[#181715]'
                          : 'bg-white text-[#181715] border-[#E5E1D8] hover:border-[#244234]'
                      }`}
                    >
                      <input
                        type="radio"
                        value={choice.value}
                        className="sr-only"
                        disabled={isSubmitting}
                        {...register('meal_type', {
                          required: 'Please select a meal type',
                        })}
                      />
                      {choice.label}
                    </label>
                  );
                })}
              </div>
              {errors.meal_type && (
                <p className="font-ui text-xs text-[#9B2C2C] mt-1.5">
                  {errors.meal_type.message}
                </p>
              )}
            </div>

            {/* 2. Input Mode Toggle */}
            <div className="border-t border-[#E5E1D8] pt-5">
              <label className="block font-ui text-xs font-semibold uppercase tracking-wider text-[#57554F] mb-1">
                Input Method <span className="text-[#9B2C2C]">*</span>
              </label>
              <p className="font-ui text-xs text-[#85837C] mb-3">
                Choose whether to describe your food in text or upload a plate photo.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleModeChange(INPUT_MODES.DESCRIPTION)}
                  className={`py-2.5 px-4 font-ui text-sm border rounded-xs transition-colors text-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    selectedMode === INPUT_MODES.DESCRIPTION
                      ? 'bg-[#181715] text-[#FAF8F5] border-[#181715]'
                      : 'bg-white text-[#181715] border-[#E5E1D8] hover:border-[#244234]'
                  }`}
                >
                  Text Description
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleModeChange(INPUT_MODES.PHOTO)}
                  className={`py-2.5 px-4 font-ui text-sm border rounded-xs transition-colors text-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    selectedMode === INPUT_MODES.PHOTO
                      ? 'bg-[#181715] text-[#FAF8F5] border-[#181715]'
                      : 'bg-white text-[#181715] border-[#E5E1D8] hover:border-[#244234]'
                  }`}
                >
                  Plate Photo
                </button>
              </div>

              {errors.input_mode && (
                <p className="font-ui text-xs text-[#9B2C2C] mt-1.5">
                  {errors.input_mode.message}
                </p>
              )}
            </div>

            {/* 3. Conditional Mode: Description */}
            {selectedMode === INPUT_MODES.DESCRIPTION && (
              <div className="border-t border-[#E5E1D8] pt-5">
                <label
                  htmlFor="description"
                  className="block font-ui text-xs font-semibold uppercase tracking-wider text-[#57554F] mb-1"
                >
                  Meal Description <span className="text-[#9B2C2C]">*</span>
                </label>
                <p className="font-ui text-xs text-[#85837C] mb-2">
                  List items and estimated quantities (e.g., cups, pieces, bowls).
                </p>
                <textarea
                  id="description"
                  rows={4}
                  disabled={isSubmitting}
                  placeholder="e.g. 1 plate Dal Bhat (steamed rice, yellow lentil soup), Saag (mustard greens), Achar, and Chicken curry"
                  className={`w-full font-ui text-sm bg-white border px-3.5 py-2.5 rounded-xs transition-colors focus:outline-none focus:ring-1 disabled:bg-[#F3F0EA] disabled:cursor-not-allowed ${
                    errors.description
                      ? 'border-[#9B2C2C] focus:ring-[#9B2C2C]'
                      : 'border-[#E5E1D8] focus:border-[#244234] focus:ring-[#244234]'
                  }`}
                  {...register('description')}
                />
                {errors.description && (
                  <p className="font-ui text-xs text-[#9B2C2C] mt-1">
                    {errors.description.message}
                  </p>
                )}
              </div>
            )}

            {/* 4. Conditional Mode: Photo Upload */}
            {selectedMode === INPUT_MODES.PHOTO && (
              <div className="border-t border-[#E5E1D8] pt-5 space-y-4">
                <div>
                  <label
                    htmlFor="meal_image"
                    className="block font-ui text-xs font-semibold uppercase tracking-wider text-[#57554F] mb-1"
                  >
                    Food Plate Photo <span className="text-[#9B2C2C]">*</span>
                  </label>
                  <p className="font-ui text-xs text-[#85837C] mb-3">
                    Take or select a clear top-down photo of your food plate.
                  </p>

                  <input
                    id="meal_image"
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    disabled={isSubmitting}
                    onChange={handleImageChange}
                    className="block w-full text-sm font-ui text-[#57554F] file:mr-4 file:py-2 file:px-4 file:rounded-xs file:border-0 file:text-xs file:font-semibold file:bg-[#181715] file:text-[#FAF8F5] hover:file:bg-[#244234] file:cursor-pointer border border-[#E5E1D8] bg-white p-2 rounded-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  {errors.image && (
                    <p className="font-ui text-xs text-[#9B2C2C] mt-1.5">
                      {errors.image.message}
                    </p>
                  )}
                </div>

                {/* Image Preview */}
                {previewUrl && (
                  <div className="border border-[#E5E1D8] bg-white p-4 rounded-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-code text-xs text-[#85837C] uppercase tracking-wider">
                        Image Preview
                      </span>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={handleClearImage}
                        className="font-ui text-xs font-medium text-[#9B2C2C] hover:underline cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Remove Photo
                      </button>
                    </div>
                    <div className="overflow-hidden rounded-xs border border-[#E5E1D8] bg-[#FAF8F5] flex items-center justify-center max-h-80">
                      <img
                        src={previewUrl}
                        alt="Meal Preview"
                        className="w-full h-auto max-h-80 object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* AI Analysis Processing Indicator */}
            {isSubmitting && selectedMode === INPUT_MODES.PHOTO && (
              <div className="p-3.5 bg-[#F3F0EA] border border-[#E5E1D8] text-[#181715] text-xs font-ui rounded-xs flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#244234] animate-pulse shrink-0" />
                <div>
                  <span className="font-semibold block text-[#181715]">
                    AI Food Analysis in Progress
                  </span>
                  <span className="text-[#57554F] text-[11px]">
                    Segmenting food items, estimating portion weights, and calculating nutrition...
                  </span>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full font-ui text-sm font-medium bg-[#181715] hover:bg-[#244234] text-[#FAF8F5] py-2.5 px-4 rounded-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>
                      {selectedMode === INPUT_MODES.PHOTO
                        ? 'Analyzing & Saving Meal...'
                        : 'Saving Meal Entry...'}
                    </span>
                  </>
                ) : (
                  'Save Meal Entry'
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
