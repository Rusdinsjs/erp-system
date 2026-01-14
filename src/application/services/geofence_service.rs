//! Geofence Service
//!
//! Provides geofence validation using Haversine formula for attendance check-in/out.

use std::f64::consts::PI;

/// Earth's radius in meters
const EARTH_RADIUS_METERS: f64 = 6_371_000.0;

/// Geofence service for location validation
pub struct GeofenceService;

impl GeofenceService {
    /// Calculate distance between two points using Haversine formula
    /// Returns distance in meters
    pub fn haversine_distance(lat1: f64, lon1: f64, lat2: f64, lon2: f64) -> f64 {
        let lat1_rad = lat1 * PI / 180.0;
        let lat2_rad = lat2 * PI / 180.0;
        let delta_lat = (lat2 - lat1) * PI / 180.0;
        let delta_lon = (lon2 - lon1) * PI / 180.0;

        let a = (delta_lat / 2.0).sin().powi(2)
            + lat1_rad.cos() * lat2_rad.cos() * (delta_lon / 2.0).sin().powi(2);
        let c = 2.0 * a.sqrt().atan2((1.0 - a).sqrt());

        EARTH_RADIUS_METERS * c
    }

    /// Check if a point is within a given radius of a center point
    ///
    /// # Arguments
    /// * `lat` - Latitude of the point to check
    /// * `lon` - Longitude of the point to check
    /// * `center_lat` - Latitude of the center (office location)
    /// * `center_lon` - Longitude of the center (office location)
    /// * `radius_meters` - Allowed radius in meters
    ///
    /// # Returns
    /// (is_within, distance_meters)
    pub fn is_within_radius(
        lat: f64,
        lon: f64,
        center_lat: f64,
        center_lon: f64,
        radius_meters: f64,
    ) -> (bool, f64) {
        let distance = Self::haversine_distance(lat, lon, center_lat, center_lon);
        (distance <= radius_meters, distance)
    }

    /// Validate check-in location against office location
    /// Returns Ok(distance) if within radius, Err(distance) if outside
    pub fn validate_checkin_location(
        lat: f64,
        lon: f64,
        office_lat: f64,
        office_lon: f64,
        allowed_radius: i32,
    ) -> Result<f64, f64> {
        let (is_within, distance) =
            Self::is_within_radius(lat, lon, office_lat, office_lon, allowed_radius as f64);

        if is_within {
            Ok(distance)
        } else {
            Err(distance)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_haversine_zero_distance() {
        let distance = GeofenceService::haversine_distance(0.0, 0.0, 0.0, 0.0);
        assert!(distance < 0.01);
    }

    #[test]
    fn test_haversine_known_distance() {
        // Jakarta to Bandung ~140km
        let distance = GeofenceService::haversine_distance(
            -6.2088,  // Jakarta lat
            106.8456, // Jakarta lon
            -6.9175,  // Bandung lat
            107.6191, // Bandung lon
        );
        // Should be approximately 120-150km
        assert!(distance > 100_000.0 && distance < 200_000.0);
    }

    #[test]
    fn test_within_radius() {
        // Point exactly at center
        let (is_within, _) =
            GeofenceService::is_within_radius(-6.2088, 106.8456, -6.2088, 106.8456, 50.0);
        assert!(is_within);
    }

    #[test]
    fn test_outside_radius() {
        // Jakarta to Bandung - definitely outside 50m radius
        let (is_within, _) =
            GeofenceService::is_within_radius(-6.2088, 106.8456, -6.9175, 107.6191, 50.0);
        assert!(!is_within);
    }
}
