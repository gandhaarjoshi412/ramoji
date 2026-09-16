import os
import uuid
import shutil
from abc import ABC, abstractmethod
from typing import Optional, Tuple
from pathlib import Path
from PIL import Image
import io

from app.config import settings

class ImageStorage(ABC):
    @abstractmethod
    def upload(self, file_bytes: bytes, original_filename: str) -> Tuple[str, int, int]:
        """Uploads file and returns (url_or_path, width, height)."""
        pass

    @abstractmethod
    def delete(self, file_path: str) -> bool:
        """Deletes file."""
        pass

    @abstractmethod
    def get_url(self, file_path: str) -> str:
        """Returns accessible URL or path."""
        pass


class LocalImageStorage(ImageStorage):
    def __init__(self, upload_dir: Optional[str] = None):
        target = upload_dir or settings.UPLOAD_DIR
        p = Path(target)
        if not p.is_absolute() and (Path("backend") / p).is_dir():
            p = Path("backend") / p
        self.upload_dir = p.resolve()
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    def upload(self, file_bytes: bytes, original_filename: str) -> Tuple[str, int, int]:
        # Validate and get image dimensions using PIL safely
        try:
            with Image.open(io.BytesIO(file_bytes)) as img:
                width, height = img.size
                format_ext = (img.format or "JPEG").lower()
                if format_ext == "jpeg":
                    format_ext = "jpg"
        except Exception as e:
            raise ValueError(f"Invalid image file: {str(e)}")

        ext = Path(original_filename).suffix.lower() or f".{format_ext}"
        if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
            ext = f".{format_ext}"

        unique_name = f"{uuid.uuid4().hex}{ext}"
        target_path = self.upload_dir / unique_name

        with open(target_path, "wb") as f:
            f.write(file_bytes)

        # Return public URL endpoint
        url = f"/uploads/{unique_name}"
        return url, width, height

    def delete(self, file_path: str) -> bool:
        filename = Path(file_path).name
        target = self.upload_dir / filename
        if target.exists():
            target.unlink()
            return True
        return False

    def get_url(self, file_path: str) -> str:
        if file_path.startswith("http://") or file_path.startswith("https://") or file_path.startswith("/uploads/"):
            return file_path
        filename = Path(file_path).name
        return f"/uploads/{filename}"


class S3ImageStorage(ImageStorage):
    """Placeholder for S3-compatible cloud storage (AWS / MinIO / Cloudflare R2)."""
    def __init__(self):
        # Initialized with settings.S3_BUCKET, settings.S3_ENDPOINT, etc.
        pass

    def upload(self, file_bytes: bytes, original_filename: str) -> Tuple[str, int, int]:
        raise NotImplementedError("S3 storage is configured via environment variables for cloud deployment.")

    def delete(self, file_path: str) -> bool:
        return True

    def get_url(self, file_path: str) -> str:
        return file_path


def get_image_storage() -> ImageStorage:
    if settings.STORAGE_PROVIDER == "s3" and settings.S3_BUCKET:
        return S3ImageStorage()
    return LocalImageStorage()
