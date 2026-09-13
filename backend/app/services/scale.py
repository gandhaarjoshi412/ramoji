from abc import ABC, abstractmethod
from typing import Optional, Dict, Any

class ScaleReading:
    def __init__(self, weight_kg: float, stable: bool = True, source: str = "Manual", unit: str = "kg"):
        self.weight_kg = weight_kg
        self.stable = stable
        self.source = source
        self.unit = unit

    def to_dict(self) -> Dict[str, Any]:
        return {
            "weight_kg": self.weight_kg,
            "stable": self.stable,
            "source": self.source,
            "unit": self.unit
        }

class ScaleProvider(ABC):
    """
    Abstract base class for scale integration.
    Allows seamlessly adding Bluetooth, USB, or RS232 Serial scales
    in future iterations without altering business logic.
    """
    @abstractmethod
    def connect(self, device_id: Optional[str] = None) -> bool:
        """Establishes connection to the weighing scale hardware."""
        pass

    @abstractmethod
    def get_weight(self) -> ScaleReading:
        """Reads current weight from the scale."""
        pass

    @abstractmethod
    def disconnect(self) -> None:
        """Safely disconnects from the hardware device."""
        pass


class ManualScaleProvider(ScaleProvider):
    """
    Default MVP Scale Provider.
    Accepts manually entered weight values from digital electronic weighing scales
    as transcribed by hotel banquet kitchen staff.
    """
    def __init__(self, manual_weight: float = 0.0):
        self.manual_weight = manual_weight
        self.connected = True

    def connect(self, device_id: Optional[str] = None) -> bool:
        self.connected = True
        return True

    def get_weight(self) -> ScaleReading:
        return ScaleReading(weight_kg=self.manual_weight, stable=True, source="Manual")

    def disconnect(self) -> None:
        self.connected = False


class BluetoothScaleProvider(ScaleProvider):
    """Placeholder for future BLE scale communication."""
    def connect(self, device_id: Optional[str] = None) -> bool:
        raise NotImplementedError("Bluetooth scale integration planned for Phase 2.")

    def get_weight(self) -> ScaleReading:
        raise NotImplementedError("Bluetooth scale integration planned for Phase 2.")

    def disconnect(self) -> None:
        pass


class SerialScaleProvider(ScaleProvider):
    """Placeholder for future RS-232 / COM port electronic scale communication."""
    def connect(self, device_id: Optional[str] = None) -> bool:
        raise NotImplementedError("Serial/RS232 scale integration planned for Phase 2.")

    def get_weight(self) -> ScaleReading:
        raise NotImplementedError("Serial/RS232 scale integration planned for Phase 2.")

    def disconnect(self) -> None:
        pass


class USBScaleProvider(ScaleProvider):
    """Placeholder for future USB HID scale communication."""
    def connect(self, device_id: Optional[str] = None) -> bool:
        raise NotImplementedError("USB scale integration planned for Phase 2.")

    def get_weight(self) -> ScaleReading:
        raise NotImplementedError("USB scale integration planned for Phase 2.")

    def disconnect(self) -> None:
        pass
