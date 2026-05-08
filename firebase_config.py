import firebase_admin
from firebase_admin import credentials

def initialize_firebase():
    """Inicializa o Firebase Admin SDK (apenas Auth, sem Firestore)."""
    if not firebase_admin._apps:
        cred = credentials.Certificate("firebase-key.json")
        firebase_admin.initialize_app(cred)
