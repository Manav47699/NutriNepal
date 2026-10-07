export const GENDER_CHOICES = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
];

export const ACTIVITY_LEVEL_CHOICES = [
  { value: 'SEDENTARY', label: 'Sedentary (little to no exercise)' },
  { value: 'LIGHT', label: 'Lightly Active (light exercise 1-3 days/week)' },
  { value: 'MODERATE', label: 'Moderately Active (moderate exercise 3-5 days/week)' },
  { value: 'VERY_ACTIVE', label: 'Very Active (hard exercise 6-7 days/week)' },
  { value: 'ATHLETE', label: 'Athlete (intense daily training)' },
];

export const FITNESS_GOAL_CHOICES = [
  { value: 'LOSE_WEIGHT', label: 'Lose Weight' },
  { value: 'MAINTAIN_WEIGHT', label: 'Maintain Weight' },
  { value: 'GAIN_WEIGHT', label: 'Gain Weight' },
  { value: 'BUILD_MUSCLE', label: 'Build Muscle' },
];

export const DIETARY_PREFERENCE_CHOICES = [
  { value: 'VEGETARIAN', label: 'Vegetarian' },
  { value: 'NON_VEGETARIAN', label: 'Non-Vegetarian' },
];

export const getChoiceLabel = (choices, value) => {
  const match = choices.find((c) => c.value === value);
  return match ? match.label : value || '—';
};
