from ai.model_interface import FoodVisionModel, Detection, VisionAnalysisResult
from ai.mock_model import MockFoodVisionModel
from ai.quantity_estimator import QuantityEstimator, QuantityEstimationResult

def get_vision_model(mode: str = "mock", model_path: str = "ai/weights/yolo26-seg.pt") -> FoodVisionModel:
    if mode.lower() == "yolo":
        from ai.yolo_model import YoloFoodVisionModel
        return YoloFoodVisionModel(model_path=model_path)
    return MockFoodVisionModel()

__all__ = [
    "FoodVisionModel",
    "Detection",
    "VisionAnalysisResult",
    "MockFoodVisionModel",
    "QuantityEstimator",
    "QuantityEstimationResult",
    "get_vision_model",
]
