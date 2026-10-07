import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState(null);

  const [meals, setMeals] = useState([]);
  const [mealsLoading, setMealsLoading] = useState(true);
  const [mealsError, setMealsError] = useState(null);
  
  const [dailyReport, setDailyReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState(null);

  const generateDailyReport = async () => {
    setReportLoading(true);
    setReportError(null);
    try {
      const response = await apiClient.post('/api/meals/daily-report/');
      if (response.data?.status) {
        setDailyReport(response.data.data);
      } else {
        setReportError(response.data?.message || 'Failed to generate report.');
      }
    } catch (err) {
      console.error('Report error:', err);
      setReportError('Failed to generate daily report. Make sure AI service is running.');
    } finally {
      setReportLoading(false);
    }
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

  useEffect(() => {
    fetchProfile();
    fetchMeals();
  }, []);

  const greetingName = user?.first_name
    ? user.first_name
    : user?.username || 'there';

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
      label: verdict,
      classes: 'bg-[#E5E1D8]/50 text-[#57554F] border-[#E5E1D8]',
    };
  };

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
    return 'Your Meal';
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

  // Compute today's totals strictly from persisted values returned by Django
  const todayMeals = meals.filter((m) => isToday(m.created_at));
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
          
          {/* Daily Report UI */}
          <div className="mt-8 border-t border-[#E5E1D8] pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-editorial text-xl text-[#181715] font-normal">Daily AI Advisory</h3>
                <p className="font-ui text-xs text-[#57554F] mt-1 max-w-lg">
                  Generate a comprehensive nutritional analysis and customized recommendations based on all meals logged today.
                </p>
              </div>
              <button
                onClick={generateDailyReport}
                disabled={reportLoading || todayMeals.length === 0}
                className="bg-[#244234] text-[#FAF8F5] px-6 py-2.5 rounded-full font-ui text-sm hover:bg-[#1A3125] transition-colors disabled:opacity-50 flex-shrink-0"
              >
                {reportLoading ? 'Generating...' : 'Generate Report'}
              </button>
            </div>
            
            {reportError && (
              <div className="mt-4 p-4 bg-red-50 text-red-600 font-ui text-sm border border-red-100 rounded-xs">
                {reportError}
              </div>
            )}
            
            {dailyReport && (
              <div className="mt-6 space-y-6">
                {/* Overall Verdict & Summary */}
                <div className="bg-[#FAF8F5] border border-[#E5E1D8] p-5 rounded-xs space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="font-ui text-xs text-[#85837C] uppercase tracking-wider">
                      Verdict:
                    </span>
                    <span
                      className={`font-ui text-xs font-semibold px-2.5 py-1 rounded-xs border ${getVerdictBadge(dailyReport.overall_verdict).classes
                        }`}
                    >
                      {getVerdictBadge(dailyReport.overall_verdict).label}
                    </span>
                  </div>

                  <p className="font-ui text-sm text-[#181715] leading-relaxed">
                    {dailyReport.summary}
                  </p>
                </div>

                {/* Macro Assessment Grid */}
                {dailyReport.macro_assessment && (
                  <div>
                    <span className="font-code text-[11px] text-[#85837C] uppercase tracking-wider block mb-3">
                      Macronutrient Assessment
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {dailyReport.macro_assessment.calories_evaluation && (
                        <div className="bg-[#FAF8F5] border border-[#E5E1D8] p-3.5 rounded-xs">
                          <span className="font-ui text-[11px] text-[#85837C] uppercase tracking-wider block">
                            Calories
                          </span>
                          <p className="font-ui text-xs text-[#181715] mt-1 leading-normal">
                            {dailyReport.macro_assessment.calories_evaluation}
                          </p>
                        </div>
                      )}

                      {dailyReport.macro_assessment.protein_evaluation && (
                        <div className="bg-[#FAF8F5] border border-[#E5E1D8] p-3.5 rounded-xs">
                          <span className="font-ui text-[11px] text-[#85837C] uppercase tracking-wider block">
                            Protein
                          </span>
                          <p className="font-ui text-xs text-[#181715] mt-1 leading-normal">
                            {dailyReport.macro_assessment.protein_evaluation}
                          </p>
                        </div>
                      )}

                      {dailyReport.macro_assessment.carbs_evaluation && (
                        <div className="bg-[#FAF8F5] border border-[#E5E1D8] p-3.5 rounded-xs">
                          <span className="font-ui text-[11px] text-[#85837C] uppercase tracking-wider block">
                            Carbohydrates
                          </span>
                          <p className="font-ui text-xs text-[#181715] mt-1 leading-normal">
                            {dailyReport.macro_assessment.carbs_evaluation}
                          </p>
                        </div>
                      )}

                      {dailyReport.macro_assessment.fats_evaluation && (
                        <div className="bg-[#FAF8F5] border border-[#E5E1D8] p-3.5 rounded-xs">
                          <span className="font-ui text-[11px] text-[#85837C] uppercase tracking-wider block">
                            Fats
                          </span>
                          <p className="font-ui text-xs text-[#181715] mt-1 leading-normal">
                            {dailyReport.macro_assessment.fats_evaluation}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Health & Dietary Alerts */}
                {dailyReport.health_and_dietary_alerts && dailyReport.health_and_dietary_alerts.length > 0 && (
                  <div>
                    <span className="font-code text-[11px] text-[#85837C] uppercase tracking-wider block mb-3">
                      Health & Dietary Alerts
                    </span>
                    <div className="space-y-2">
                      {dailyReport.health_and_dietary_alerts.map((alert, idx) => {
                        const isWarning = alert.severity === 'WARNING' || alert.severity === 'CRITICAL';
                        return (
                          <div
                            key={idx}
                            className={`p-3.5 rounded-xs border ${isWarning
                                ? 'bg-[#FDF2F2] border-[#9B2C2C]/20'
                                : 'bg-[#F0F5F2] border-[#244234]/20'
                              }`}
                          >
                            <div className="flex gap-3">
                              <span
                                className={`text-sm mt-0.5 ${isWarning ? 'text-[#9B2C2C]' : 'text-[#244234]'
                                  }`}
                              >
                                {isWarning ? '⚠' : 'ℹ'}
                              </span>
                              <div>
                                <span
                                  className={`font-ui text-[11px] uppercase tracking-wider block mb-0.5 ${isWarning ? 'text-[#9B2C2C]' : 'text-[#244234]'
                                    }`}
                                >
                                  {alert.type.replace(/_/g, ' ')}
                                </span>
                                <p className="font-ui text-xs text-[#181715] leading-normal">
                                  {alert.message}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Actionable Suggestions */}
                {dailyReport.actionable_suggestions && dailyReport.actionable_suggestions.length > 0 && (
                  <div>
                    <span className="font-code text-[11px] text-[#85837C] uppercase tracking-wider block mb-3">
                      Actionable Suggestions
                    </span>
                    <div className="space-y-2">
                      {dailyReport.actionable_suggestions.map((suggestion, idx) => (
                        <div
                          key={idx}
                          className="bg-[#FAF8F5] border border-[#E5E1D8] p-3.5 rounded-xs flex gap-3"
                        >
                          <span className="font-code text-[10px] text-[#85837C] mt-0.5 min-w-[20px]">
                            {String(idx + 1).padStart(2, '0')}.
                          </span>
                          <p className="font-ui text-xs text-[#181715] leading-normal">
                            {suggestion}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Alternative Foods */}
                {dailyReport.alternative_foods && dailyReport.alternative_foods.length > 0 && (
                  <div>
                    <span className="font-code text-[11px] text-[#85837C] uppercase tracking-wider block mb-3">
                      Recommended Nepali Food Alternatives
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {dailyReport.alternative_foods.map((alt, idx) => (
                        <div
                          key={idx}
                          className="bg-[#FAF8F5] border border-[#E5E1D8] p-3.5 rounded-xs"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className="font-editorial text-sm text-[#181715]">
                              {alt.recommended_food}
                            </span>
                            {alt.replaces && (
                              <span className="font-ui text-[10px] text-[#85837C] uppercase bg-white border border-[#E5E1D8] px-1.5 py-0.5 rounded-sm shrink-0">
                                Replaces: {alt.replaces}
                              </span>
                            )}
                          </div>
                          <p className="font-ui text-xs text-[#57554F] leading-normal">
                            {alt.reason}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between pt-4 border-t border-[#E5E1D8] mt-6">
                  <span className="font-code text-[10px] text-[#85837C]">
                    Model: {dailyReport.model_name || 'qwen2.5:3b'}
                  </span>
                  <span className="font-code text-[10px] text-[#85837C]">
                    Generated: {dailyReport.generated_at ? new Date(dailyReport.generated_at).toLocaleString() : new Date().toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Meals Section */}
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
