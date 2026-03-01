import cv2
import numpy as np
import logging
from facenet_pytorch import MTCNN, InceptionResnetV1
import torch
from sync import OfflineVectorDB, CloudSync
from relay import RelayController
import asyncio
import threading
import queue
import time
import os
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Configuraciones de Entorno
SHOW_UI = os.environ.get("HEADLESS_MODE", "false").lower() != "true"
MATCH_THRESHOLD = float(os.environ.get("MATCH_THRESHOLD", "0.80"))
RELAY_DURATION = float(os.environ.get("RELAY_DURATION_SEC", "3.0"))

class CameraProducer(threading.Thread):
    """
    Lee asíncronamente desde el sensor RTSP o USB para que el buffer de OpenCV 
    siempre tenga el frame más reciente, evitando lag visuales e inferencias viejas.
    """
    def __init__(self, camera_id=0, frame_queue=None):
        super().__init__()
        self.camera_id = camera_id
        self.frame_queue = frame_queue
        self.running = True
        self.cap = cv2.VideoCapture(self.camera_id)
        # Opcional: bajar la resolucion para que MTCNN sea mas rapido
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        
    def run(self):
        logger.info("Camera Producer started.")
        while self.running and self.cap.isOpened():
            ret, frame = self.cap.read()
            if not ret: continue
            
            # Limpiamos hilos viejos para procesar solo el fotograma mas actual
            if not self.frame_queue.empty():
                try:
                    self.frame_queue.get_nowait()
                except queue.Empty:
                    pass
            
            self.frame_queue.put(frame)
            time.sleep(0.01) # Ligero respiro a la CPU (100 fps max)

    def stop(self):
        self.running = False
        self.cap.release()

class AsyncFaceRecognizer:
    def __init__(self):
        device = torch.device('cuda:0' if torch.cuda.is_available() else 'cpu')
        logger.info(f"Engine running on: {device}")
        
        # Modelos
        self.mtcnn = MTCNN(keep_all=True, device=device, min_face_size=60)
        self.resnet = InceptionResnetV1(pretrained='vggface2').eval().to(device)
        
        # Servicios
        self.local_db = OfflineVectorDB()
        self.cloud_sync = CloudSync(self.local_db)
        self.relay = RelayController(pin=18)
        
        # Pipes y Estado
        self.frame_queue = queue.Queue(maxsize=2)
        self.camera_thread = CameraProducer(camera_id=0, frame_queue=self.frame_queue)
        self.is_running = True
        
        # Cooldown para no disparar el relé 20 veces al mismo sujeto
        self.last_granted_time = 0
        self.relay_cooldown = RELAY_DURATION + 1.0

    def _normalize(self, embedding):
        norm = np.linalg.norm(embedding)
        return embedding if norm == 0 else embedding / norm

    async def _inference_loop(self):
        """Bucle principal (Consumer) para el procesamiento de redes neuronales."""
        while self.is_running:
            if self.frame_queue.empty():
                await asyncio.sleep(0.05)
                continue

            frame = self.frame_queue.get()
            display_frame = frame.copy() if SHOW_UI else None
            
            img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # Detectamos cajas, probabilidades y rostros recortados
            boxes, probs = self.mtcnn.detect(img_rgb)
            faces = self.mtcnn(img_rgb)
            
            if faces is not None and boxes is not None:
                # Agarramos solo el rostro de mayor probabilidad / tamaño
                best_face_idx = np.argmax(probs)
                if probs[best_face_idx] > 0.90:
                    best_face = faces[best_face_idx]
                    best_box = boxes[best_face_idx]
                    
                    with torch.no_grad():
                        emb_tensor = self.resnet(best_face.unsqueeze(0)) 
                        emb_numpy = emb_tensor.cpu().numpy()[0]
                    
                    normalized_emb = self._normalize(emb_numpy)
                    user_id, confidence = self.local_db.search(normalized_emb.tolist(), threshold=MATCH_THRESHOLD)
                    
                    # Decisión y Trigger Hardware
                    status_text = "UNKNOWN"
                    color = (0, 0, 255) # Rojo en BGR
                    
                    if user_id:
                        status_text = f"GRANTED ({confidence:.2f})"
                        color = (0, 255, 0) # Verde
                        
                        now = time.time()
                        if now - self.last_granted_time > self.relay_cooldown:
                            logger.info(f"+++ ACCESS MATCH - USER: {user_id} +++")
                            # Trigger asíncrono para no trabar el UI hilo principal
                            asyncio.get_event_loop().run_in_executor(None, self.relay.trigger_open, RELAY_DURATION)
                            self.last_granted_time = now
                            
                            # Report Logging asynchronously
                            asyncio.create_task(self.cloud_sync.log_access_async(user_id, 'GRANTED', confidence))
                    else:
                        # Report Unknown Accesses sporadically
                        # asyncio.create_task(self.cloud_sync.log_access_async(None, 'DENIED', confidence))
                        pass

                    # GUI Opcional Local
                    if SHOW_UI:
                        x1, y1, x2, y2 = [int(p) for p in best_box]
                        cv2.rectangle(display_frame, (x1, y1), (x2, y2), color, 2)
                        cv2.putText(display_frame, status_text, (x1, y1 - 10), 
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)

            if SHOW_UI and display_frame is not None:
                cv2.imshow('GymFlow Edge Manager', display_frame)
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    self.is_running = False

            # Ceder control al event loop (importante para WebSockets)
            await asyncio.sleep(0.01)

    async def run(self):
        logger.info("Initializing GymFlow Edge Agent...")
        # 1. Start Cloud Sync (HTTP + WebSockets)
        self.cloud_sync.perform_initial_pull()
        self.cloud_sync.start_realtime_sync()
        
        # 2. Start Video Capture Thread
        self.camera_thread.start()
        
        # 3. Start Heavy Inference Loop
        try:
            await self._inference_loop()
        finally:
            self.camera_thread.stop()
            self.camera_thread.join()
            if SHOW_UI:
                cv2.destroyAllWindows()
            self.relay.cleanup()

if __name__ == "__main__":
    agent = AsyncFaceRecognizer()
    try:
        asyncio.run(agent.run())
    except KeyboardInterrupt:
        logger.info("Shutdown requested.")
