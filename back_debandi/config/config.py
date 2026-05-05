"""
Configuración centralizada de URLs y variables de entorno
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Cargar archivo .env desde la raíz de back_debandi
BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BASE_DIR / '.env'
if ENV_FILE.exists():
    load_dotenv(ENV_FILE)
else:
    import warnings
    warnings.warn(f"Archivo .env no encontrado en: {ENV_FILE}")

# URL base del API
API_BASE_URL = os.getenv('API_BASE_URL', 'http://localhost:8000')

# Frontend URL (para CORS)
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')

# Configuración de desarrollo/producción
DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'

# Hosts permitidos
def get_allowed_hosts():
    """Obtener lista de hosts permitidos desde variable de entorno"""
    hosts_str = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1')  # SIN '*' por defecto
    return [h.strip() for h in hosts_str.split(',') if h.strip()]

# CORS Origins permitidos
def get_cors_origins():
    """Obtener lista de orígenes CORS permitidos"""
    cors_str = os.getenv('CORS_ORIGINS', 'http://localhost:3000,http://localhost:8000,http://127.0.0.1:3000,http://127.0.0.1:8000')
    return [o.strip() for o in cors_str.split(',') if o.strip()]
