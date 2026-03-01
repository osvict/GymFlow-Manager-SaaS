import RPi.GPIO as GPIO
import time
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RelayController:
    def __init__(self, pin: int = 18, active_high: bool = True):
        """
        Initialize the GPIO Relay Controller.
        
        Args:
            pin (int): BCM GPIO pin number connected to the relay activation circuit.
            active_high (bool): If True, setting pin to HIGH turns relay ON. 
                                If False (common for Arduino relays), LOW turns it ON.
        """
        self.pin = pin
        self.active_high = active_high
        self.on_state = GPIO.HIGH if active_high else GPIO.LOW
        self.off_state = GPIO.LOW if active_high else GPIO.HIGH
        
        try:
            GPIO.setmode(GPIO.BCM)
            GPIO.setup(self.pin, GPIO.OUT)
            GPIO.output(self.pin, self.off_state)
            logger.info(f"Relay controller initialized on BCM pin {self.pin}")
        except Exception as e:
            logger.error(f"Failed to initialize GPIO. Are you running on a Raspberry Pi? Error: {e}")
            self.simulated = True # Fallback mode for development on Mac/Windows

    def trigger_open(self, duration_seconds: float = 3.0):
        """
        Triggers the relay to open the door/turnstile for a specific duration.
        """
        logger.info(f"Opening Turnstile/Door for {duration_seconds} seconds...")
        
        if getattr(self, 'simulated', False):
            logger.info("[SIMULATION] Relay triggered ON")
            time.sleep(duration_seconds)
            logger.info("[SIMULATION] Relay triggered OFF")
            return

        try:
            GPIO.output(self.pin, self.on_state)
            time.sleep(duration_seconds)
        finally:
            GPIO.output(self.pin, self.off_state)
            logger.info("Door locked.")

    def cleanup(self):
        """Cleanup GPIO resources on exit."""
        if not getattr(self, 'simulated', False):
            GPIO.cleanup()
            logger.info("GPIO cleanup completed.")

if __name__ == "__main__":
    # Smoke test module
    relay = RelayController(pin=18)
    relay.trigger_open(2.0)
    relay.cleanup()
