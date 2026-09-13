import math
from typing import Dict, Any, Optional
from ai.model_interface import Detection

class QuantityEstimationResult:
    def __init__(
        self,
        estimated_weight_grams: float,
        estimation_method: str = "camera_estimate",
        estimation_confidence: float = 0.75,
        estimated_volume_cm3: float = 0.0,
        surface_area_cm2: float = 0.0
    ):
        self.estimated_weight_grams = round(estimated_weight_grams, 1)
        self.estimation_method = estimation_method
        self.estimation_confidence = round(estimation_confidence, 2)
        self.estimated_volume_cm3 = round(estimated_volume_cm3, 1)
        self.surface_area_cm2 = round(surface_area_cm2, 1)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "estimated_weight_grams": self.estimated_weight_grams,
            "estimation_method": self.estimation_method,
            "estimation_confidence": self.estimation_confidence,
            "estimated_volume_cm3": self.estimated_volume_cm3,
            "surface_area_cm2": self.surface_area_cm2,
        }

class QuantityEstimator:
    """
    Centralized camera-based quantity estimation service.
    Translates 2D segmentation areas and bounding geometries into
    approximated 3D volumes and grams using food physical density parameters.
    """
    # Standard hotel chafing dish / buffet serving vessel reference diameter (cm)
    DEFAULT_REFERENCE_VESSEL_CM = 28.0

    @classmethod
    def estimate(
        cls,
        detection: Detection,
        image_width: int,
        image_height: int,
        density_g_per_cm3: float = 0.85,
        default_depth_cm: float = 4.0,
        portion_scaling_factor: float = 1.0,
        calibration_factor: float = 1.0,
        min_weight_g: float = 20.0,
        max_weight_g: float = 25000.0,
    ) -> QuantityEstimationResult:
        # Calculate pixel area of bounding box
        x1, y1, x2, y2 = detection.bounding_box
        box_w = max(1.0, abs(x2 - x1))
        box_h = max(1.0, abs(y2 - y1))
        
        # If mask polygon exists, calculate polygon area using Shoelace formula
        if detection.mask and isinstance(detection.mask, list) and len(detection.mask) >= 3:
            pts = detection.mask
            shoelace = 0.0
            n = len(pts)
            for i in range(n):
                j = (i + 1) % n
                shoelace += pts[i][0] * pts[j][1]
                shoelace -= pts[j][0] * pts[i][1]
            pixel_area = abs(shoelace) / 2.0
        else:
            # Elliptical / rectangular approximation
            pixel_area = (math.pi / 4.0) * box_w * box_h

        total_image_pixels = max(1.0, image_width * image_height)
        area_fraction = min(1.0, pixel_area / total_image_pixels)

        # Scale pixel area to physical surface area (cm^2) using reference vessel sizing
        # Assuming camera frames a standard banquet buffet counter (~60cm wide frame)
        frame_width_cm = 60.0
        pixel_to_cm = frame_width_cm / max(1.0, float(image_width))
        surface_area_cm2 = pixel_area * (pixel_to_cm ** 2)

        # Calculate estimated volume = area * depth * fill factor
        effective_depth_cm = max(1.0, default_depth_cm)
        estimated_volume_cm3 = surface_area_cm2 * effective_depth_cm

        # Calculate estimated mass = volume * density * calibration
        raw_mass_g = (
            estimated_volume_cm3
            * density_g_per_cm3
            * portion_scaling_factor
            * calibration_factor
        )

        # Clamp between configurable boundaries
        clamped_mass_g = max(min_weight_g, min(max_weight_g, raw_mass_g))

        # Confidence based on detection confidence and bounding geometry
        estimation_conf = min(0.92, max(0.55, detection.confidence * 0.85))

        return QuantityEstimationResult(
            estimated_weight_grams=clamped_mass_g,
            estimation_method="camera_estimate",
            estimation_confidence=estimation_conf,
            estimated_volume_cm3=estimated_volume_cm3,
            surface_area_cm2=surface_area_cm2
        )
