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
  { value: 'BUILD_MUSCLE', label: 'Build Muscle' },
];

export const DIETARY_PREFERENCE_CHOICES = [
  { value: 'VEGETARIAN', label: 'Vegetarian' },
  { value: 'NON_VEGETARIAN', label: 'Non-Vegetarian' },
  { value: 'EGGITARIAN', label: 'Eggitarian / Egg only' },
];

export const HEALTH_RESTRICTIONS_CONFIG = [
  { key: 'diabetes', label: 'Diabetes', description: 'Restricts high-glycemic foods & sugars' },
  { key: 'uric_acid', label: 'Uric Acid', description: 'Restricts purine-rich foods & meats' },
  { key: 'hypertension', label: 'Hypertension (High BP)', description: 'Restricts high-sodium foods' },
  { key: 'kidney_disease', label: 'Kidney Disease', description: 'Restricts high potassium & phosphorus foods' },
];

export const SOCIAL_RESTRICTIONS_CONFIG = [
  { key: 'shrawan', label: 'Shrawan Month', description: 'Restricts non-veg items during Shrawan' },
  { key: 'chaturmas', label: 'Chaturmas', description: 'Restricts non-veg/specified items during Chaturmas' },
  { key: 'mourning', label: 'Mourning / Kiriya (Barkhi)', description: 'Observes strict traditional mourning dietary rules' },
  { key: 'no_onion_garlic', label: 'No Onion & Garlic', description: 'Strictly excludes alliums (onion, garlic)' },
];

export const getChoiceLabel = (choices, value) => {
  const match = choices.find((c) => c.value === value);
  return match ? match.label : value || '—';
};

