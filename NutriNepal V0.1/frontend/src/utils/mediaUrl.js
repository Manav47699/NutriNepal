import { API_BASE_URL } from '../api/client';

/**
 * Resolves a media image path returned by Django against the backend base URL.
 * Handles null/undefined, absolute URLs (http/https), data URLs, and relative media paths (/media/...).
 *
 * @param {string|null|undefined} imagePath - Image URL or relative path from Django API
 * @returns {string|null} Full URL to the media asset, or null if no imagePath provided
 */
export const getMediaUrl = (imagePath) => {
  if (!imagePath) return null;
  if (typeof imagePath !== 'string') return null;

  const trimmed = imagePath.trim();
  if (!trimmed) return null;

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  const base = (API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${base}${path}`;
};

export default getMediaUrl;
