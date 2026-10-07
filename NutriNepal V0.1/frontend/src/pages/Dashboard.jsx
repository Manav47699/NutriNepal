import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { getMediaUrl } from '../utils/mediaUrl';
import { MEAL_TYPE_CHOICES } from '../constants/mealChoices';
import {
  GENDER_CHOICES,
  ACTIVITY_LEVEL_CHOICES,
  FITNESS_GOAL_CHOICES,
  DIETARY_PREFERENCE_CHOICES,
  getChoiceLabel,
} from '../constants/profileChoices';

export default function Dashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState(null);

  const [meals, setMeals] = useState([]);
  const [mealsLoading, setMealsLoading] = useState(true);
  const [mealsError, setMealsError] = useState(null);

  const [dailyRec, setDailyRec] = useState(null);
  const [dailyRecLoading, setDailyRecLoading] = useState(true);
  const [dailyRecGenerating, setDailyRecGenerating] = useState(false);
  const [dailyRecError, setDailyRecError] = useState(null);

  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fetchProfile = async () => {
    setProfileLoading(true);
    setProfileError(null);
    try {
      const response = await apiClient.get('/api/profiles/user-profile/');
      if (response.data?.data) {
        setProfile(response.data.data);
      }
    } catch (err) {
      setProfileError(
        err.response?.data?.message ||
        'Unable to load your profile summary. Please try again.'
      );
    } finally {
      setProfileLoading(false);
    }
  };

  const fetchMeals = async () => {
    setMealsLoading(true);
    setMealsError(null);
    try {
      const response = await apiClient.get('/api/meals/');
      if (response.data?.data) {
        setMeals(response.data.data);
      }
    } catch (err) {
      setMealsError(
        err.response?.data?.message ||
        'Unable to load your meal history. Please try again.'
      );
    } finally {
      setMealsLoading(false);
    }
  };

  const fetchDailyRecommendation = async (dateStr) => {
    const targetDate = dateStr || getTodayDateString();
    setDailyRecLoading(true);
    setDailyRecError(null);
    try {
      const response = await apiClient.get(
        `/api/meals/daily-recommendation/?date=${targetDate}`
      );
      if (response.data?.data) {
        setDailyRec(response.data.data);
      } else {
        setDailyRec(null);
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setDailyRec(null);
      } else {
        setDailyRecError(
          err.response?.data?.message ||
          'Unable to load daily advisory. Please try again.'
        );
      }
    } finally {
      setDailyRecLoading(false);
    }
  };

  const handleGenerateDailyRecommendation = async () => {
    if (dailyRecGenerating) return;
    const dateStr = getTodayDateString();
    setDailyRecGenerating(true);
    setDailyRecError(null);
    try {
      const response = await apiClient.post(
        '/api/meals/daily-recommendation/',
        { date: dateStr }
      );
      if (response.data?.data) {
        setDailyRec(response.data.data);
      }
    } catch (err) {
      setDailyRecError(
        err.response?.data?.message ||
        'Failed to generate daily recommendation. Please verify the AI service is active and try again.'
      );
    } finally {
      setDailyRecGenerating(false);
    }
  };

  useEffect(() => {
    const todayStr = getTodayDateString();
    fetchProfile();
    fetchMeals();

    if (location.state?.triggerDailyRec) {
      // Clear trigger state so page refresh won't re-trigger
      navigate(location.pathname, { replace: true, state: {} });
      handleGenerateDailyRecommendation();
    } else {
      fetchDailyRecommendation(todayStr);
    }
  }, []);


  const greetingName = user?.first_name
    ? user.first_name
    : user?.username || 'there';

  const isToday = (dateStr) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const getMealTypeLabel = (type) => {
    const match = MEAL_TYPE_CHOICES.find((c) => c.value === type);
    return match ? match.label : type;
  };

  const formatMealTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const today = new Date();
    const isSameDay =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    const timeStr = date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });

    if (isSameDay) {
      return `Today at ${timeStr}`;
    }

    return `${date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })} at ${timeStr}`;
  };

  const getVerdictBadge = (verdict) => {
    const v = (verdict || '').toUpperCase();
    if (v === 'OPTIMAL' || v === 'ALIGNED') {
      return {
        label: v === 'OPTIMAL' ? 'Optimal Choice' : 'Goal Aligned',
        classes: 'bg-[#244234]/10 text-[#244234] border-[#244234]/20',
      };
    }
    if (v === 'MODERATELY_ALIGNED' || v === 'MODERATE') {
      return {
        label: 'Moderately Aligned',
        classes: 'bg-[#B45309]/10 text-[#B45309] border-[#B45309]/20',
      };
    }
    if (v === 'NEEDS_IMPROVEMENT') {
      return {
        label: 'Needs Portion Adjustment',
        classes: 'bg-[#9B2C2C]/10 text-[#9B2C2C] border-[#9B2C2C]/20',
      };
    }
    if (v === 'RESTRICTED') {
      return {
        label: 'Medically Restricted',
        classes: 'bg-[#9B2C2C]/15 text-[#9B2C2C] border-[#9B2C2C]/30',
      };
    }
    return {
      label: verdict || 'Assessed',
      classes: 'bg-[#57554F]/10 text-[#57554F] border-[#E5E1D8]',
    };
  };

  const formatRecDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Compute today's totals strictly from persisted values returned by Django
  const todayMeals = meals.filter((m) => isToday(m.created_at));
  const todayAnalyzedMeals = todayMeals.filter((m) => m.analysis);
  const todayNutrition = todayMeals.reduce(
    (acc, meal) => {
      if (meal.analysis) {
        acc.calories += Number(meal.analysis.total_calories || 0);
        acc.protein += Number(meal.analysis.total_protein || 0);
        acc.carbs += Number(meal.analysis.total_carbs || 0);
        acc.fats += Number(meal.analysis.total_fats || 0);
      }
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );

  const latestMealTime = todayMeals.reduce((max, m) => {
    const t = new Date(m.created_at).getTime();
    return t > max ? t : max;
  }, 0);
  const recGeneratedTime = dailyRec?.generated_at
    ? new Date(dailyRec.generated_at).getTime()
    : 0;
  const hasNewMealSinceRec =
    dailyRec && recGeneratedTime > 0 && latestMealTime > recGeneratedTime;


  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#181715] flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto py-10 px-6 sm:px-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-[#E5E1D8] pb-6">
          <div>
            <span className="font-code text-xs text-[#85837C] uppercase tracking-wider block mb-1">
              04 / Overview
            </span>
            <h1 className="font-editorial text-3xl sm:text-4xl text-[#181715] font-normal">
              Welcome back, {greetingName}
            </h1>
            <p className="font-ui text-sm text-[#57554F] mt-1">
              Your personalized Nepali diet and lifestyle advisory dashboard.
            </p>
          </div>

          <Link
            to="/meals/new"
            className="inline-flex items-center justify-center font-ui text-sm font-medium bg-[#181715] hover:bg-[#244234] text-[#FAF8F5] px-5 py-2.5 rounded-xs transition-colors shadow-xs shrink-0 cursor-pointer"
          >
            + Log a Meal
          </Link>
        </div>

        {/* Today's Aggregate Nutrition Section */}
        <div className="bg-white border border-[#E5E1D8] p-6 sm:p-8 rounded-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-[#E5E1D8] pb-4">
            <div>
              <span className="font-code text-[11px] text-[#85837C] uppercase tracking-wider block mb-0.5">
                Daily Nutrition
              </span>
              <h2 className="font-editorial text-2xl text-[#181715] font-normal">
                Today&apos;s Nutritional Intake
              </h2>
            </div>
            <span className="font-code text-xs text-[#85837C]">
              {todayMeals.length} {todayMeals.length === 1 ? 'meal' : 'meals'} logged today
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {/* Calories */}
            <div className="bg-[#FAF8F5] border border-[#E5E1D8] p-4 rounded-xs">
              <span className="font-ui text-[11px] text-[#85837C] uppercase tracking-wider block">
                Total Calories
              </span>
              <span className="font-editorial text-2xl sm:text-3xl font-medium text-[#181715] mt-1 block">
                {Math.round(todayNutrition.calories)}{' '}
                <span className="font-ui text-xs text-[#85837C] font-normal">kcal</span>
              </span>
            </div>

            {/* Protein */}
            <div className="bg-[#FAF8F5] border border-[#E5E1D8] p-4 rounded-xs">
              <span className="font-ui text-[11px] text-[#85837C] uppercase tracking-wider block">
                Protein
              </span>
              <span className="font-editorial text-2xl sm:text-3xl font-medium text-[#244234] mt-1 block">
                {todayNutrition.protein.toFixed(1)}{' '}
                <span className="font-ui text-xs text-[#85837C] font-normal">g</span>
              </span>
            </div>

            {/* Carbohydrates */}
            <div className="bg-[#FAF8F5] border border-[#E5E1D8] p-4 rounded-xs">
              <span className="font-ui text-[11px] text-[#85837C] uppercase tracking-wider block">
                Carbohydrates
              </span>
              <span className="font-editorial text-2xl sm:text-3xl font-medium text-[#181715] mt-1 block">
                {todayNutrition.carbs.toFixed(1)}{' '}
                <span className="font-ui text-xs text-[#85837C] font-normal">g</span>
              </span>
            </div>

            {/* Fats */}
            <div className="bg-[#FAF8F5] border border-[#E5E1D8] p-4 rounded-xs">
              <span className="font-ui text-[11px] text-[#85837C] uppercase tracking-wider block">
                Total Fats
              </span>
              <span className="font-editorial text-2xl sm:text-3xl font-medium text-[#181715] mt-1 block">
                {todayNutrition.fats.toFixed(1)}{' '}
                <span className="font-ui text-xs text-[#85837C] font-normal">g</span>
              </span>
            </div>
          </div>
        </div>

        {/* Two-Column Section: Recent Meals (Left) & Daily Recommendation (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* LEFT: Recent Meals Section */}
          <div className="bg-white border border-[#E5E1D8] p-6 sm:p-8 rounded-xs space-y-6">
            <div className="flex items-center justify-between border-b border-[#E5E1D8] pb-4">
              <div>
                <span className="font-code text-xs text-[#85837C] uppercase tracking-wider block mb-0.5">
                  Meal Log History
                </span>
                <h2 className="font-editorial text-2xl text-[#181715] font-normal">
                  Recent Meals
                </h2>
              </div>
              <Link
                to="/meals/new"
                className="font-ui text-xs font-medium text-[#244234] hover:text-[#181715] border border-[#E5E1D8] hover:border-[#244234] px-3.5 py-1.5 rounded-xs transition-colors bg-white cursor-pointer"
              >
                + Log Meal
              </Link>
            </div>

            {mealsLoading ? (
              <div className="py-8 text-center">
                <span className="font-code text-xs text-[#85837C] uppercase tracking-wider">
                  Loading meals history...
                </span>
              </div>
            ) : mealsError ? (
              <div className="py-4 space-y-3">
                <div className="p-3 bg-[#FDF2F2] border border-[#9B2C2C]/20 text-[#9B2C2C] text-xs font-ui rounded-xs">
                  {mealsError}
                </div>
                <button
                  type="button"
                  onClick={fetchMeals}
                  className="font-ui text-xs font-medium bg-[#181715] text-[#FAF8F5] py-1.5 px-3 rounded-xs cursor-pointer"
                >
                  Retry
                </button>
              </div>
            ) : meals.length === 0 ? (
              <div className="py-10 px-4 text-center bg-[#FAF8F5] border border-[#E5E1D8] rounded-xs space-y-3">
                <span className="font-editorial text-xl text-[#181715] block">
                  No Meals Logged Yet
                </span>
                <p className="font-ui text-sm text-[#57554F] max-w-md mx-auto">
                  Start tracking your daily meals with AI-powered nutritional analysis for traditional Nepali food.
                </p>
                <div className="pt-2">
                  <Link
                    to="/meals/new"
                    className="inline-flex items-center justify-center font-ui text-xs font-medium bg-[#244234] hover:bg-[#181715] text-[#FAF8F5] px-4 py-2 rounded-xs transition-colors cursor-pointer"
                  >
                    Log Your First Meal →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-[#E5E1D8]">
                {meals.map((meal) => {
                  const analysis = meal.analysis;
                  const foodItems = analysis?.food_items || [];

                  return (
                    <Link
                      key={meal.id}
                      to={`/meals/${meal.id}`}
                      className="group block py-4 hover:bg-[#FAF8F5] transition-colors rounded-xs px-2 -mx-2"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        {/* Left: Thumbnail & Details */}
                        <div className="flex items-start gap-4">
                          {meal.image ? (
                            <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 overflow-hidden rounded-xs border border-[#E5E1D8] bg-[#FAF8F5]">
                              <img
                                src={getMediaUrl(meal.image)}
                                alt={getMealTypeLabel(meal.meal_type)}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                            </div>
                          ) : (
                            <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-xs border border-[#E5E1D8] bg-[#FAF8F5] flex items-center justify-center text-[#85837C] font-code text-xs">
                              Text
                            </div>
                          )}

                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-ui text-xs font-semibold uppercase tracking-wider text-[#244234] bg-[#244234]/10 px-2 py-0.5 rounded-xs">
                                {getMealTypeLabel(meal.meal_type)}
                              </span>
                              <span className="font-ui text-xs text-[#85837C]">
                                {formatMealTime(meal.created_at)}
                              </span>
                            </div>

                            {meal.description && (
                              <p className="font-ui text-sm text-[#181715] line-clamp-1">
                                {meal.description}
                              </p>
                            )}

                            {foodItems.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {foodItems.slice(0, 3).map((item) => (
                                  <span
                                    key={item.id}
                                    className="font-ui text-[11px] text-[#57554F] bg-[#FAF8F5] border border-[#E5E1D8] px-2 py-0.5 rounded-xs"
                                  >
                                    {item.food_name} ({item.food_quantity}g)
                                  </span>
                                ))}
                                {foodItems.length > 3 && (
                                  <span className="font-ui text-[11px] text-[#85837C] px-1 py-0.5">
                                    +{foodItems.length - 3} more
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right: Macro Summary & Arrow */}
                        <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E5E1D8]">
                          {analysis ? (
                            <div className="text-right">
                              <span className="font-editorial text-lg font-medium text-[#181715] block">
                                {Math.round(analysis.total_calories)}{' '}
                                <span className="font-ui text-xs text-[#85837C] font-normal">kcal</span>
                              </span>
                              <span className="font-ui text-xs text-[#57554F] block">
                                {analysis.total_protein}g P • {analysis.total_carbs}g C • {analysis.total_fats}g F
                              </span>
                            </div>
                          ) : (
                            <span className="font-ui text-xs text-[#85837C]">
                              No analysis data
                            </span>
                          )}

                          <span className="text-[#85837C] group-hover:text-[#181715] group-hover:translate-x-0.5 transition-all text-sm">
                            →
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT: Daily Personalized Recommendation Panel */}
          <div className="bg-white border border-[#E5E1D8] p-6 sm:p-8 rounded-xs space-y-6">
            <div className="flex items-center justify-between border-b border-[#E5E1D8] pb-4">
              <div>
                <span className="font-code text-xs text-[#85837C] uppercase tracking-wider block mb-0.5">
                  05 / Daily Advisory
                </span>
                <h2 className="font-editorial text-2xl text-[#181715] font-normal">
                  {dailyRec ? 'Personalized Day Report' : 'Daily Recommendation'}
                </h2>
              </div>

              {dailyRec && !dailyRecGenerating && (
                <button
                  type="button"
                  onClick={handleGenerateDailyRecommendation}
                  className="font-ui text-xs font-medium text-[#244234] hover:text-[#181715] border border-[#E5E1D8] hover:border-[#244234] px-3.5 py-1.5 rounded-xs transition-colors bg-white cursor-pointer shrink-0"
                >
                  Regenerate Advisory ⟳
                </button>
              )}
            </div>

            {/* New meal logged since advisory notification */}
            {hasNewMealSinceRec && !dailyRecGenerating && (
              <div className="p-3 bg-[#FAF8F5] border border-[#B45309]/30 rounded-xs flex items-center justify-between gap-3 text-xs font-ui">
                <span className="text-[#B45309]">
                  New meal logged since this advisory was generated.
                </span>
                <button
                  type="button"
                  onClick={handleGenerateDailyRecommendation}
                  className="font-semibold text-[#B45309] hover:text-[#181715] underline shrink-0 cursor-pointer"
                >
                  Update Now
                </button>
              </div>
            )}

            {dailyRecLoading ? (
              <div className="py-12 text-center">
                <span className="font-code text-xs text-[#85837C] uppercase tracking-wider">
                  Loading daily advisory...
                </span>
              </div>
            ) : dailyRecGenerating ? (
              /* STATE 2: Generating */
              <div className="py-12 text-center bg-[#FAF8F5] border border-[#E5E1D8] rounded-xs space-y-4">
                <div className="inline-block w-7 h-7 border-2 border-[#244234] border-t-transparent rounded-full animate-spin"></div>
                <span className="font-editorial text-xl text-[#181715] block">
                  Analyzing Daily Intake...
                </span>
                <p className="font-ui text-xs text-[#57554F] max-w-sm mx-auto leading-relaxed">
                  Synthesizing whole-day dietary and fitness advisory based on today&apos;s meals, personal goals, and health constraints.
                </p>
              </div>
            ) : dailyRecError ? (
              /* STATE 4: Error */
              <div className="space-y-4">
                <div className="p-4 bg-[#FDF2F2] border border-[#9B2C2C]/20 text-[#9B2C2C] text-xs font-ui rounded-xs leading-relaxed">
                  {dailyRecError}
                </div>
                <button
                  type="button"
                  onClick={handleGenerateDailyRecommendation}
                  className="w-full font-ui text-xs font-medium bg-[#181715] hover:bg-[#244234] text-[#FAF8F5] py-2.5 px-4 rounded-xs transition-colors cursor-pointer"
                >
                  Retry Generation
                </button>
              </div>
            ) : dailyRec ? (
              /* STATE 3 & 5: Successfully Generated or Existing Report */
              <div className="space-y-6">
                {/* Overall Verdict & Summary */}
                <div className="bg-[#FAF8F5] border border-[#E5E1D8] p-4 sm:p-5 rounded-xs space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="font-ui text-xs text-[#85837C] uppercase tracking-wider">
                      Verdict:
                    </span>
                    <span
                      className={`font-ui text-xs font-semibold px-2.5 py-0.5 rounded-xs border ${
                        getVerdictBadge(dailyRec.overall_verdict).classes
                      }`}
                    >
                      {getVerdictBadge(dailyRec.overall_verdict).label}
                    </span>
                  </div>
                  <p className="font-ui text-sm text-[#181715] leading-relaxed">
                    {dailyRec.summary}
                  </p>
                </div>

                {/* Macronutrient Assessment Grid */}
                {dailyRec.macro_assessment && (
                  <div className="space-y-2">
                    <span className="font-code text-[11px] text-[#85837C] uppercase tracking-wider block">
                      Daily Macronutrient Assessment
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {dailyRec.macro_assessment.calories_evaluation && (
                        <div className="bg-[#FAF8F5] border border-[#E5E1D8] p-3 rounded-xs">
                          <span className="font-ui text-[11px] text-[#85837C] uppercase tracking-wider block">
                            Calories
                          </span>
                          <p className="font-ui text-xs text-[#181715] mt-0.5 leading-normal">
                            {dailyRec.macro_assessment.calories_evaluation}
                          </p>
                        </div>
                      )}

                      {dailyRec.macro_assessment.protein_evaluation && (
                        <div className="bg-[#FAF8F5] border border-[#E5E1D8] p-3 rounded-xs">
                          <span className="font-ui text-[11px] text-[#85837C] uppercase tracking-wider block">
                            Protein
                          </span>
                          <p className="font-ui text-xs text-[#181715] mt-0.5 leading-normal">
                            {dailyRec.macro_assessment.protein_evaluation}
                          </p>
                        </div>
                      )}

                      {dailyRec.macro_assessment.carbs_evaluation && (
                        <div className="bg-[#FAF8F5] border border-[#E5E1D8] p-3 rounded-xs">
                          <span className="font-ui text-[11px] text-[#85837C] uppercase tracking-wider block">
                            Carbohydrates
                          </span>
                          <p className="font-ui text-xs text-[#181715] mt-0.5 leading-normal">
                            {dailyRec.macro_assessment.carbs_evaluation}
                          </p>
                        </div>
                      )}

                      {dailyRec.macro_assessment.fats_evaluation && (
                        <div className="bg-[#FAF8F5] border border-[#E5E1D8] p-3 rounded-xs">
                          <span className="font-ui text-[11px] text-[#85837C] uppercase tracking-wider block">
                            Fats
                          </span>
                          <p className="font-ui text-xs text-[#181715] mt-0.5 leading-normal">
                            {dailyRec.macro_assessment.fats_evaluation}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Health & Dietary Alerts */}
                {dailyRec.health_and_dietary_alerts &&
                  dailyRec.health_and_dietary_alerts.length > 0 && (
                    <div className="space-y-2">
                      <span className="font-code text-[11px] text-[#85837C] uppercase tracking-wider block">
                        Health &amp; Dietary Alerts
                      </span>
                      <div className="space-y-1.5">
                        {dailyRec.health_and_dietary_alerts.map((alert, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 bg-[#FAF8F5] border border-[#E5E1D8] rounded-xs flex items-start gap-2.5 text-xs font-ui"
                          >
                            <span className="text-[#9B2C2C] text-sm leading-none shrink-0">
                              ⚠
                            </span>
                            <div className="space-y-0.5">
                              <span className="font-semibold uppercase tracking-wider text-[#57554F] text-[10px] block">
                                {alert.type?.replace(/_/g, ' ')}
                              </span>
                              <p className="text-[#181715] leading-normal">
                                {alert.message}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Actionable Suggestions */}
                {dailyRec.actionable_suggestions &&
                  dailyRec.actionable_suggestions.length > 0 && (
                    <div className="space-y-2">
                      <span className="font-code text-[11px] text-[#85837C] uppercase tracking-wider block">
                        Actionable Suggestions
                      </span>
                      <ul className="space-y-1.5">
                        {dailyRec.actionable_suggestions.map((suggestion, idx) => (
                          <li
                            key={idx}
                            className="p-2.5 bg-[#FAF8F5] border border-[#E5E1D8] rounded-xs flex items-start gap-2.5 text-xs font-ui text-[#181715]"
                          >
                            <span className="font-code text-[11px] font-semibold text-[#244234] shrink-0">
                              0{idx + 1}.
                            </span>
                            <span>{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                {/* Nepali Food Alternatives */}
                {dailyRec.alternative_foods &&
                  dailyRec.alternative_foods.length > 0 && (
                    <div className="space-y-2">
                      <span className="font-code text-[11px] text-[#85837C] uppercase tracking-wider block">
                        Recommended Nepali Food Alternatives
                      </span>
                      <div className="grid grid-cols-1 gap-2">
                        {dailyRec.alternative_foods.map((alt, idx) => (
                          <div
                            key={idx}
                            className="bg-[#FAF8F5] border border-[#E5E1D8] p-3 rounded-xs space-y-1 text-xs font-ui"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-[#244234]">
                                {alt.recommended_food}
                              </span>
                              {alt.replaces && (
                                <span className="text-[10px] text-[#85837C]">
                                  Replaces: {alt.replaces}
                                </span>
                              )}
                            </div>
                            <p className="text-[#57554F] leading-normal">
                              {alt.reason}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Metadata Footer */}
                <div className="pt-2 border-t border-[#E5E1D8] flex items-center justify-between text-[11px] font-code text-[#85837C]">
                  <span>Model: {dailyRec.model_name || 'LLM Dietitian'}</span>
                  {dailyRec.generated_at && (
                    <span>Generated: {formatRecDate(dailyRec.generated_at)}</span>
                  )}
                </div>
              </div>
            ) : (
              /* STATE 1: Empty / No Recommendation Yet */
              <div className="py-10 px-4 text-center bg-[#FAF8F5] border border-[#E5E1D8] rounded-xs space-y-3">
                <span className="font-editorial text-xl text-[#181715] block">
                  Get Today&apos;s Diet &amp; Fitness Advisory
                </span>
                <p className="font-ui text-xs text-[#57554F] max-w-sm mx-auto leading-relaxed">
                  Evaluate all meals logged today against your personal health profile, fitness goals, and Nepali dietary guidelines.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={dailyRecGenerating || todayAnalyzedMeals.length === 0}
                    onClick={handleGenerateDailyRecommendation}
                    className="inline-flex items-center justify-center font-ui text-xs font-medium bg-[#244234] hover:bg-[#181715] text-[#FAF8F5] px-5 py-2.5 rounded-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {todayAnalyzedMeals.length === 0
                      ? 'Log a meal first to generate'
                      : "Generate Today's Recommendation"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>


        {/* Profile Summary Section */}
        <div className="bg-[#FAF8F5] border border-[#E5E1D8] p-6 sm:p-8 rounded-xs">
          <div className="flex items-center justify-between border-b border-[#E5E1D8] pb-4 mb-6">
            <div>
              <span className="font-code text-xs text-[#85837C] uppercase tracking-wider block mb-0.5">
                Profile Summary
              </span>
              <h2 className="font-editorial text-2xl text-[#181715] font-normal">
                Health &amp; Lifestyle Profile
              </h2>
            </div>
            <Link
              to="/profile"
              className="font-ui text-xs font-medium text-[#181715] hover:text-[#244234] border border-[#E5E1D8] hover:border-[#244234] px-3.5 py-1.5 rounded-xs transition-colors bg-white cursor-pointer"
            >
              Edit Profile
            </Link>
          </div>

          {profileLoading ? (
            <div className="py-8 text-center">
              <span className="font-code text-xs text-[#85837C] uppercase tracking-wider">
                Loading profile summary...
              </span>
            </div>
          ) : profileError ? (
            <div className="py-4 space-y-3">
              <div className="p-3 bg-[#FDF2F2] border border-[#9B2C2C]/20 text-[#9B2C2C] text-xs font-ui rounded-xs">
                {profileError}
              </div>
              <button
                type="button"
                onClick={fetchProfile}
                className="font-ui text-xs font-medium bg-[#181715] text-[#FAF8F5] py-1.5 px-3 rounded-xs cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : profile ? (
            <div className="space-y-6">
              {/* Physical Metrics Group */}
              <div>
                <span className="font-code text-[11px] text-[#85837C] uppercase tracking-wider block mb-3">
                  Physical Metrics
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="bg-white border border-[#E5E1D8] p-3.5 rounded-xs">
                    <span className="font-ui text-[11px] text-[#85837C] uppercase tracking-wider block">
                      Age
                    </span>
                    <span className="font-ui text-base font-medium text-[#181715] mt-1 block">
                      {profile.age} <span className="text-xs text-[#85837C] font-normal">yrs</span>
                    </span>
                  </div>

                  <div className="bg-white border border-[#E5E1D8] p-3.5 rounded-xs">
                    <span className="font-ui text-[11px] text-[#85837C] uppercase tracking-wider block">
                      Gender
                    </span>
                    <span className="font-ui text-base font-medium text-[#181715] mt-1 block">
                      {getChoiceLabel(GENDER_CHOICES, profile.gender)}
                    </span>
                  </div>

                  <div className="bg-white border border-[#E5E1D8] p-3.5 rounded-xs">
                    <span className="font-ui text-[11px] text-[#85837C] uppercase tracking-wider block">
                      Height
                    </span>
                    <span className="font-ui text-base font-medium text-[#181715] mt-1 block">
                      {profile.height_cm} <span className="text-xs text-[#85837C] font-normal">cm</span>
                    </span>
                  </div>

                  <div className="bg-white border border-[#E5E1D8] p-3.5 rounded-xs">
                    <span className="font-ui text-[11px] text-[#85837C] uppercase tracking-wider block">
                      Weight
                    </span>
                    <span className="font-ui text-base font-medium text-[#181715] mt-1 block">
                      {profile.weight_kg} <span className="text-xs text-[#85837C] font-normal">kg</span>
                    </span>
                  </div>

                  <div className="bg-white border border-[#E5E1D8] p-3.5 rounded-xs col-span-2 sm:col-span-1">
                    <span className="font-ui text-[11px] text-[#85837C] uppercase tracking-wider block">
                      Target Weight
                    </span>
                    <span className="font-ui text-base font-medium text-[#181715] mt-1 block">
                      {profile.target_weight_kg ? (
                        <>
                          {profile.target_weight_kg}{' '}
                          <span className="text-xs text-[#85837C] font-normal">kg</span>
                        </>
                      ) : (
                        <span className="text-xs text-[#85837C] font-normal">None set</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Lifestyle & Preferences Group */}
              <div>
                <span className="font-code text-[11px] text-[#85837C] uppercase tracking-wider block mb-3">
                  Lifestyle &amp; Preferences
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-white border border-[#E5E1D8] p-3.5 rounded-xs">
                    <span className="font-ui text-[11px] text-[#85837C] uppercase tracking-wider block">
                      Activity Level
                    </span>
                    <span className="font-ui text-sm font-medium text-[#181715] mt-1 block">
                      {getChoiceLabel(ACTIVITY_LEVEL_CHOICES, profile.activity_level)}
                    </span>
                  </div>

                  <div className="bg-white border border-[#E5E1D8] p-3.5 rounded-xs">
                    <span className="font-ui text-[11px] text-[#85837C] uppercase tracking-wider block">
                      Fitness Goal
                    </span>
                    <span className="font-ui text-sm font-medium text-[#181715] mt-1 block">
                      {getChoiceLabel(FITNESS_GOAL_CHOICES, profile.fitness_goal)}
                    </span>
                  </div>

                  <div className="bg-white border border-[#E5E1D8] p-3.5 rounded-xs">
                    <span className="font-ui text-[11px] text-[#85837C] uppercase tracking-wider block">
                      Dietary Preference
                    </span>
                    <span className="font-ui text-sm font-medium text-[#181715] mt-1 block">
                      {getChoiceLabel(DIETARY_PREFERENCE_CHOICES, profile.dietary_preference)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
