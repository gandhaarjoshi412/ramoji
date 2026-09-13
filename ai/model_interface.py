from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class Detection(BaseModel):
    food_name: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    bounding_box: List[float] = Field(..., description="[x1, y1, x2, y2] normalized (0.0 to 1.0) or pixel coordinates")
    mask: Optional[Any] = Field(None, description="Encoded or polygon segmentation mask coordinates")

class VisionAnalysisResult(BaseModel):
    detections: List[Detection]
    image_width: int
    image_height: int
    model_name: str
    model_version: str
    is_mock: bool = False

class FoodVisionModel(ABC):
    """
    Abstract AI Model Interface for Food Detection & Segmentation.
    Enables zero-coupling replacement between Mock, Local YOLO26-seg,
    and Serverless GPU inference microservices.
    """
    @abstractmethod
    def analyze(
        self,
        image_bytes: bytes,
        filename: str,
        menu_hints: Optional[List[str]] = None
    ) -> VisionAnalysisResult:
        """Executes computer vision inference on image bytes."""
        pass
