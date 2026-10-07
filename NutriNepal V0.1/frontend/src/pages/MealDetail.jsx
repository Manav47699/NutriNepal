import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import apiClient from '../api/client';
import { getMediaUrl } from '../utils/mediaUrl';
import { MEAL_TYPE_CHOICES } from '../constants/mealChoices';

export default function MealDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [meal, setMeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Nutritional Analysis retry state
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [analyzeError, setAnalyzeError] = useState(null);

  const fetchMealDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(`/api/meals/${id}/`);
      if (response.data?.data) {
        setMeal(response.data.data);
      } else {
        setError('Meal details not found.');
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setError('The requested meal entry could not be found.');
      } else {
        setError(
          err.response?.data?.message ||
          'Unable to load meal details. Please check your connection and try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMealDetail();
  }, [id]);

  const handleDeleteMeal = async () => {
    setIsDeleting(true);
    try {
      await apiClient.delete(`/api/meals/${id}/`);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Failed to delete meal entry. Please try again.'
      );
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleRunAnalysis = async () => {
    setAnalyzeLoading(true);
    setAnalyzeError(null);
    try {
      const response = await apiClient.post(`/api/meals/${id}/analyze/`);
      if (response.data?.data) {
        setMeal(response.data.data);
      }
    } catch (err) {
      setAnalyzeError(
        err.response?.data?.message ||
        'Failed to perform AI nutritional analysis. Please verify that the AI service is active and try again.'
      );
    } finally {
      setAnalyzeLoading(false);
    }
  };

  const getMealTypeLabel = (type) => {
    const match = MEAL_TYPE_CHOICES.find((c) => c.value === type);
    return match ? match.label : type;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const analysis = meal?.analysis;
  const foodItems = analysis?.food_items || [];

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#181715] flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto py-10 px-6 sm:px-8 space-y-6">
        {/* Navigation Breadcrumb & Actions */}
        <div className="flex items-center justify-between">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 font-ui text-xs font-medium text-[#57554F] hover:text-[#181715] transition-colors"
          >
            ← Back to Dashboard
          </Link>
          <Link
            to="/meals/new"
            className="inline-flex items-center gap-1 font-ui text-xs font-medium text-[#244234] hover:text-[#181715] transition-colors"
          >
            + Log Another Meal
          </Link>
        </div>

        {loading ? (
          <div className="bg-white border border-[#E5E1D8] p-12 rounded-xs text-center">
            <span className="font-code text-xs text-[#85837C] uppercase tracking-wider block">
              Loading meal details &amp; nutrition analysis...
            </span>
          </div>
        ) : error ? (
          <div className="bg-white border border-[#E5E1D8] p-8 rounded-xs space-y-4 text-center">
            <div className="p-4 bg-[#FDF2F2] border border-[#9B2C2C]/20 text-[#9B2C2C] text-sm font-ui rounded-xs max-w-md mx-auto">
              {error}
            </div>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={fetchMealDetail}
                className="font-ui text-xs font-medium bg-[#181715] hover:bg-[#244234] text-[#FAF8F5] py-2 px-4 rounded-xs transition-colors cursor-pointer"
              >
                Retry
              </button>
              <Link
                to="/dashboard"
                className="font-ui text-xs font-medium border border-[#E5E1D8] bg-white hover:border-[#181715] text-[#181715] py-2 px-4 rounded-xs transition-colors"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        ) : meal ? (
          <>
            {/* Header Card */}
            <div className="bg-white border border-[#E5E1D8] p-6 sm:p-8 rounded-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-[#E5E1D8] pb-4">
                <div>
                  <span className="font-code text-xs text-[#85837C] uppercase tracking-wider block mb-1">
                    06 / Meal Analysis Record #{meal.id}
                  </span>
                  <h1 className="font-editorial text-3xl sm:text-4xl text-[#181715] font-normal">
                    {getMealTypeLabel(meal.meal_type)}
                  </h1>
                  <span className="font-ui text-xs text-[#85837C] block mt-1">
                    Logged on {formatDate(meal.created_at)}
                  </span>
                </div>

                {/* Delete Trigger / Confirmation */}
                <div className="shrink-0">
                  {showDeleteConfirm ? (
                    <div className="flex items-center gap-2">
                      <span className="font-ui text-xs text-[#9B2C2C]">Delete?</span>
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={handleDeleteMeal}
                        className="font-ui text-xs font-medium bg-[#9B2C2C] hover:bg-[#742020] text-white px-3 py-1.5 rounded-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isDeleting ? 'Deleting...' : 'Confirm'}
                      </button>
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => setShowDeleteConfirm(false)}
                        className="font-ui text-xs font-medium border border-[#E5E1D8] bg-white text-[#57554F] hover:text-[#181715] px-2.5 py-1.5 rounded-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="font-ui text-xs font-medium text-[#9B2C2C] hover:text-[#742020] border border-[#9B2C2C]/20 hover:border-[#9B2C2C] px-3.5 py-1.5 rounded-xs transition-colors bg-white cursor-pointer"
                    >
                      Delete Meal
                    </button>
                  )}
                </div>
              </div>

              {/* Description if present */}
              {meal.description && (
                <div className="pt-1">
                  <span className="font-code text-[11px] text-[#85837C] uppercase tracking-wider block mb-1">
                    User Description
                  </span>
                  <p className="font-ui text-sm text-[#57554F] leading-relaxed">
                    {meal.description}
                  </p>
                </div>
              )}
            </div>

            {/* Meal Photo Section if available */}
            {meal.image && (
              <div className="bg-white border border-[#E5E1D8] p-6 sm:p-8 rounded-xs space-y-3">
                <span className="font-code text-[11px] text-[#85837C] uppercase tracking-wider block">
                  Food Plate Photo
                </span>
                <div className="overflow-hidden rounded-xs border border-[#E5E1D8] bg-[#FAF8F5] flex items-center justify-center max-h-96">
                  <img
                    src={getMediaUrl(meal.image)}
                    alt={`${getMealTypeLabel(meal.meal_type)} photo`}
                    className="w-full h-auto max-h-96 object-contain"
                  />
                </div>
              </div>
            )}

            {/* Total Nutritional Analysis */}
            {analysis ? (
              <div className="space-y-6">
                {/* Aggregate Totals Overview */}
                <div className="bg-white border border-[#E5E1D8] p-6 sm:p-8 rounded-xs space-y-6">
                  <div className="border-b border-[#E5E1D8] pb-4">
                    <span className="font-code text-xs text-[#85837C] uppercase tracking-wider block mb-0.5">
                      Nutritional Summary
                    </span>
                    <h2 className="font-editorial text-2xl text-[#181715] font-normal">
                      Aggregated Meal Nutrition
                    </h2>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    {/* Calories */}
                    <div className="bg-[#FAF8F5] border border-[#E5E1D8] p-4 rounded-xs">
                      <span className="font-ui text-[11px] text-[#85837C] uppercase tracking-wider block">
                        Total Calories
                      </span>
                      <span className="font-editorial text-2xl sm:text-3xl font-medium text-[#181715] mt-1 block">
                        {analysis.total_calories}{' '}
                        <span className="font-ui text-xs text-[#85837C] font-normal">kcal</span>
                      </span>
                    </div>

                    {/* Protein */}
                    <div className="bg-[#FAF8F5] border border-[#E5E1D8] p-4 rounded-xs">
                      <span className="font-ui text-[11px] text-[#85837C] uppercase tracking-wider block">
                        Protein
                      </span>
                      <span className="font-editorial text-2xl sm:text-3xl font-medium text-[#244234] mt-1 block">
                        {analysis.total_protein}{' '}
                        <span className="font-ui text-xs text-[#85837C] font-normal">g</span>
                      </span>
                    </div>

                    {/* Carbohydrates */}
                    <div className="bg-[#FAF8F5] border border-[#E5E1D8] p-4 rounded-xs">
                      <span className="font-ui text-[11px] text-[#85837C] uppercase tracking-wider block">
                        Carbohydrates
                      </span>
                      <span className="font-editorial text-2xl sm:text-3xl font-medium text-[#181715] mt-1 block">
                        {analysis.total_carbs}{' '}
                        <span className="font-ui text-xs text-[#85837C] font-normal">g</span>
                      </span>
                    </div>

                    {/* Fats */}
                    <div className="bg-[#FAF8F5] border border-[#E5E1D8] p-4 rounded-xs">
                      <span className="font-ui text-[11px] text-[#85837C] uppercase tracking-wider block">
                        Total Fats
                      </span>
                      <span className="font-editorial text-2xl sm:text-3xl font-medium text-[#181715] mt-1 block">
                        {analysis.total_fats}{' '}
                        <span className="font-ui text-xs text-[#85837C] font-normal">g</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Detected Food Items Breakdown */}
                <div className="bg-white border border-[#E5E1D8] p-6 sm:p-8 rounded-xs space-y-6">
                  <div className="border-b border-[#E5E1D8] pb-4">
                    <span className="font-code text-xs text-[#85837C] uppercase tracking-wider block mb-0.5">
                      Identified Components
                    </span>
                    <h2 className="font-editorial text-2xl text-[#181715] font-normal">
                      Detected Food Items &amp; Quantities
                    </h2>
                    <p className="font-ui text-xs text-[#57554F] mt-1">
                      Individual items segmented by AI with calculated portion weights and macronutrient profiles.
                    </p>
                  </div>

                  {foodItems.length === 0 ? (
                    <div className="py-8 text-center bg-[#FAF8F5] border border-[#E5E1D8] rounded-xs">
                      <span className="font-ui text-xs text-[#85837C]">
                        No individual food items were segmented for this meal.
                      </span>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-ui text-sm border-collapse">
                        <thead>
                          <tr className="border-b border-[#E5E1D8] text-[11px] text-[#85837C] uppercase tracking-wider font-semibold">
                            <th className="pb-3 pr-4">Food Item</th>
                            <th className="pb-3 px-4">Portion / Weight</th>
                            <th className="pb-3 px-4 text-right">Calories</th>
                            <th className="pb-3 px-4 text-right">Protein</th>
                            <th className="pb-3 px-4 text-right">Carbs</th>
                            <th className="pb-3 pl-4 text-right">Fat</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5E1D8]">
                          {foodItems.map((item) => (
                            <tr key={item.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                              <td className="py-3.5 pr-4 font-medium text-[#181715]">
                                {item.food_name}
                              </td>
                              <td className="py-3.5 px-4 text-[#57554F] font-code text-xs">
                                {item.food_quantity} {item.food_quantity_unit}
                              </td>
                              <td className="py-3.5 px-4 text-right font-medium text-[#181715]">
                                {item.food_calories}{' '}
                                <span className="text-[11px] text-[#85837C] font-normal">kcal</span>
                              </td>
                              <td className="py-3.5 px-4 text-right text-[#244234] font-medium">
                                {item.food_protein}{' '}
                                <span className="text-[11px] text-[#85837C] font-normal">g</span>
                              </td>
                              <td className="py-3.5 px-4 text-right text-[#57554F]">
                                {item.food_carbs}{' '}
                                <span className="text-[11px] text-[#85837C] font-normal">g</span>
                              </td>
                              <td className="py-3.5 pl-4 text-right text-[#57554F]">
                                {item.food_fats}{' '}
                                <span className="text-[11px] text-[#85837C] font-normal">g</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white border border-[#E5E1D8] p-8 rounded-xs text-center space-y-4">
                {analyzeError && (
                  <div className="p-3 bg-[#FDF2F2] border border-[#9B2C2C]/20 text-[#9B2C2C] text-xs font-ui rounded-xs max-w-md mx-auto">
                    {analyzeError}
                  </div>
                )}

                {analyzeLoading ? (
                  <div className="py-6 space-y-3">
                    <div className="inline-block w-6 h-6 border-2 border-[#244234] border-t-transparent rounded-full animate-spin"></div>
                    <span className="font-editorial text-xl text-[#181715] block">
                      Calculating Nutritional Analysis...
                    </span>
                    <p className="font-ui text-xs text-[#57554F] max-w-md mx-auto">
                      Parsing meal composition, estimating portion weights, and matching canonical nutrition data.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <span className="font-editorial text-xl text-[#181715] block">
                      No Nutritional Analysis Available
                    </span>
                    <p className="font-ui text-xs text-[#85837C] max-w-md mx-auto">
                      This meal has not been analyzed yet or the initial analysis attempt was interrupted.
                    </p>
                    {(meal.image || (meal.description && meal.description.trim())) && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={handleRunAnalysis}
                          className="inline-flex items-center justify-center font-ui text-xs font-medium bg-[#244234] hover:bg-[#181715] text-[#FAF8F5] px-4 py-2 rounded-xs transition-colors cursor-pointer"
                        >
                          Run Nutritional Analysis ⚡
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        ) : null}
      </main>
    </div>
  );
}
