import os
import json
import numpy as np
import logging
from supabase import create_client, Client
from dotenv import load_dotenv
import asyncio
import websockets

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
GYM_ID = os.environ.get("GYM_ID")

LOCAL_DB_FILE = "local_embeddings.json"

class OfflineVectorDB:
    def __init__(self):
        self.users = []
        self.embeddings = [] # Nx512 matrix
        self._load_from_disk()

    def _load_from_disk(self):
        if os.path.exists(LOCAL_DB_FILE):
            with open(LOCAL_DB_FILE, 'r') as f:
                data = json.load(f)
                self.users = data.get('users', [])
                self.embeddings = np.array(data.get('embeddings', []), dtype=np.float32)
            logger.info(f"Loaded {len(self.users)} embeddings from local disk")
        else:
            logger.info("Local DB empty. Waiting for sync.")

    def save_to_disk(self, users, embeddings_list):
        self.users = users
        self.embeddings = np.array(embeddings_list, dtype=np.float32)
        with open(LOCAL_DB_FILE, 'w') as f:
            json.dump({
                "users": users,
                "embeddings": embeddings_list
            }, f)
        logger.info(f"Saved {len(users)} embeddings to local disk")

    def search(self, query_embedding, threshold=0.85):
        if len(self.users) == 0 or len(self.embeddings) == 0:
            return None, 0.0

        query_emb = np.array(query_embedding, dtype=np.float32)
        similarities = np.dot(self.embeddings, query_emb)
        
        best_match_idx = np.argmax(similarities)
        best_score = similarities[best_match_idx]

        if best_score >= threshold:
            return self.users[best_match_idx], float(best_score)
        
        return None, float(best_score)

class CloudSync:
    def __init__(self, local_db: OfflineVectorDB):
        self.local_db = local_db
        if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
            logger.error("Missing Supabase credentials in .env")
            self.supabase = None
        else:
            self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        self.tenant_id = None
        
    def perform_initial_pull(self):
        if not self.supabase: return
        logger.info("Performing initial pull from Cloud...")
        
        # 1. Obtenemos el tenant_id
        gym_res = self.supabase.table("gyms").select("tenant_id").eq("id", GYM_ID).execute()
        if not gym_res.data:
            logger.error(f"Gym ID {GYM_ID} not found in cloud.")
            return
            
        self.tenant_id = gym_res.data[0]['tenant_id']
        logger.info(f"Resolved Tenant ID: {self.tenant_id}")
        
        # 2. Obtenemos embeddings
        embeddings_res = self.supabase.table("facial_embeddings") \
            .select("user_id, embedding") \
            .eq("tenant_id", self.tenant_id) \
            .eq("is_active", True) \
            .execute()
            
        users = []
        vectors = []
        for row in embeddings_res.data:
            parsed_emb = json.loads(row['embedding'])
            users.append(row['user_id'])
            vectors.append(parsed_emb)
            
        self.local_db.save_to_disk(users, vectors)
        logger.info("Initial pull complete.")

    async def _realtime_listener(self):
        """Websocket connection using Supabase Realtime to listen for live embedding inserts/updates."""
        if not SUPABASE_URL: return
        
        # Parse WS URL from HTTP URL (e.g. https://xyz.supabase.co -> wss://xyz.supabase.co/realtime/v1/websocket...)
        ws_url = SUPABASE_URL.replace("http", "ws") + f"/realtime/v1/websocket?apikey={SUPABASE_SERVICE_ROLE_KEY}&vsn=1.0.0"
        
        # We subscribe to changes in the "facial_embeddings" table
        payload = {
            "topic": "realtime:public:facial_embeddings",
            "event": "phx_join",
            "payload": {
                "config": {
                    "postgres_changes": [
                        {
                            "event": "*", 
                            "schema": "public", 
                            "table": "facial_embeddings",
                            "filter": f"tenant_id=eq.{self.tenant_id}"
                        }
                    ]
                }
            },
            "ref": "1"
        }

        while True:
            try:
                logger.info(f"Connecting to Supabase Realtime Websocket...")
                async with websockets.connect(ws_url, ssl=True) as ws:
                    await ws.send(json.dumps(payload))
                    join_res = await ws.recv()
                    logger.info("Joined Supabase Realtime channel successfully.")
                    
                    # Heartbeat Loop
                    async def heartbeat():
                        ref = 2
                        while True:
                            await asyncio.sleep(30)
                            await ws.send(json.dumps({"topic": "phoenix", "event": "heartbeat", "payload": {}, "ref": str(ref)}))
                            ref += 1

                    asyncio.create_task(heartbeat())
                    
                    # Listen for DB changes
                    async for message in ws:
                        msg = json.loads(message)
                        if msg.get("event") == "postgres_changes":
                            data = msg.get("payload", {})
                            logger.info(f"Live Update Received: {data.get('type')} on embedding")
                            # Si hay un update, lo mas seguro es forzar un pull rapido 
                            # o inyectarlo directamente
                            self.perform_initial_pull() # Reload from disk sync

            except Exception as e:
                logger.error(f"WebSocket error: {e}. Reconnecting in 5s...")
                await asyncio.sleep(5)

    def start_realtime_sync(self):
        """Starts the websocket listener in the background."""
        if not self.tenant_id:
            logger.warning("Cannot start realtime sync. Missing Tenant ID.")
            return
        asyncio.create_task(self._realtime_listener())

    async def log_access_async(self, user_id, status, confidence):
        if not self.supabase: return
        try:
            self.supabase.table("access_logs").insert({
                "gym_id": GYM_ID,
                "tenant_id": self.tenant_id,
                "user_id": user_id,
                "status": status,
                "confidence_score": confidence
            }).execute()
            logger.info(f"Cloud Logged -> {status}")
        except Exception as e:
            logger.error(f"Failed to log access asynchronously: {e}")
