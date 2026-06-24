import { supabase } from '../lib/supabase';
import { City, PickupLocation } from '../types/database';

/**
 * Fetch all active cities
 */
export async function getCities(): Promise<City[]> {
  const { data, error } = await supabase
    .from('cities')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching cities:', error);
    throw error;
  }

  return data || [];
}

/**
 * Fetch a single city by ID
 */
export async function getCityById(cityId: string): Promise<City | null> {
  const { data, error } = await supabase
    .from('cities')
    .select('*')
    .eq('id', cityId)
    .single();

  if (error) {
    console.error('Error fetching city:', error);
    throw error;
  }

  return data;
}

/**
 * Fetch all active pickup locations
 */
export async function getPickupLocations(): Promise<PickupLocation[]> {
  const { data, error } = await supabase
    .from('pickup_locations')
    .select('*, city:cities(*)')
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching pickup locations:', error);
    throw error;
  }

  return data || [];
}

/**
 * Fetch pickup locations by city
 */
export async function getPickupLocationsByCity(cityId: string): Promise<PickupLocation[]> {
  const { data, error } = await supabase
    .from('pickup_locations')
    .select('*, city:cities(*)')
    .eq('city_id', cityId)
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching pickup locations by city:', error);
    throw error;
  }

  return data || [];
}

/**
 * Fetch a single pickup location by ID
 */
export async function getPickupLocationById(locationId: string): Promise<PickupLocation | null> {
  const { data, error } = await supabase
    .from('pickup_locations')
    .select('*, city:cities(*)')
    .eq('id', locationId)
    .single();

  if (error) {
    console.error('Error fetching pickup location:', error);
    throw error;
  }

  return data;
}

/**
 * Search pickup locations by name or address
 */
export async function searchPickupLocations(query: string): Promise<PickupLocation[]> {
  const { data, error } = await supabase
    .from('pickup_locations')
    .select('*, city:cities(*)')
    .or(`name.ilike.%${query}%,address.ilike.%${query}%,name_ar.ilike.%${query}%,address_ar.ilike.%${query}%`)
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Error searching pickup locations:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get pickup locations near a coordinate (within a certain distance)
 * Note: This is a simple implementation. For production, consider using PostGIS extensions
 */
export async function getNearbyPickupLocations(
  latitude: number,
  longitude: number,
  radiusKm: number = 10
): Promise<PickupLocation[]> {
  // Simple bounding box calculation (approximate)
  const latDelta = radiusKm / 111; // 1 degree latitude ≈ 111 km
  const lngDelta = radiusKm / (111 * Math.cos((latitude * Math.PI) / 180));

  const { data, error } = await supabase
    .from('pickup_locations')
    .select('*, city:cities(*)')
    .gte('latitude', latitude - latDelta)
    .lte('latitude', latitude + latDelta)
    .gte('longitude', longitude - lngDelta)
    .lte('longitude', longitude + lngDelta)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching nearby pickup locations:', error);
    throw error;
  }

  // Calculate actual distances and sort
  const locationsWithDistance = (data || []).map(location => {
    const distance = calculateDistance(
      latitude,
      longitude,
      location.latitude,
      location.longitude
    );
    return { ...location, distance };
  }).filter(location => location.distance <= radiusKm);

  return locationsWithDistance.sort((a, b) => a.distance - b.distance);
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
}

