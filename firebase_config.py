import os
import json
import firebase_admin
from firebase_admin import credentials

def initialize_firebase():
    if not firebase_admin._apps:
        firebase_config = json.loads(os.environ["FIREBASE_CREDENTIALS"])

        cred = credentials.Certificate(firebase_config)
        firebase_admin.initialize_app(cred)
