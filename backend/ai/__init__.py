from ai.model_interface import FoodVisionModel, Detection, VisionAnalysisResult
from ai.mock_model import MockFoodVisionModel
from ai.quantity_estimator import QuantityEstimator, QuantityEstimationResult

_MODEL_CACHE = {}

def get_vision_model(mode: str = "mock", model_path: str = "best.pt") -> FoodVisionModel:
    cache_key = (mode.lower(), model_path)
    if cache_key in _MODEL_CACHE:
        return _MODEL_CACHE[cache_key]
    if mode.lower() in ("yolo", "onnx"):
        from ai.yolo_model import YoloFoodVisionModel
        model = YoloFoodVisionModel(model_path=model_path)
        _MODEL_CACHE[cache_key] = model
        return model
    model = MockFoodVisionModel()
    _MODEL_CACHE[cache_key] = model
    return model

__all__ = [
    "FoodVisionModel",
    "Detection",
    "VisionAnalysisResult",
    "MockFoodVisionModel",
    "QuantityEstimator",
    "QuantityEstimationResult",
    "get_vision_model",
]
