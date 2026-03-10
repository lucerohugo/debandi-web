# Backend - Django Settings
SECRET_KEY=tu_clave_secreta_muy_segura_aqui_minimo_50_caracteres
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0

# Frontend URL (para CORS y OAuth)
FRONTEND_URL=http://localhost:3000

# API Base URL
API_BASE_URL=http://localhost:8000

# CORS Origins
CORS_ORIGINS=http://localhost:3000,http://localhost:8000,http://127.0.0.1:3000,http://127.0.0.1:8000

# Auth Cookie Configuration
AUTH_COOKIE_NAME=auth-token
AUTH_COOKIE_SECURE=False
AUTH_COOKIE_SAMESITE=Lax
AUTH_COOKIE_MAX_AGE=1209600

# Google OAuth (Obtener desde Google Cloud Console)
GOOGLE_CLIENT_ID=tu_google_client_id_aqui.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu_google_client_secret_aqui
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback/

# Email Configuration (para password reset)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=tu_email@gmail.com
EMAIL_HOST_PASSWORD=tu_app_password_aqui
EMAIL_USE_TLS=True

# Base de Datos
DATABASE_URL=sqlite:///db.sqlite3

# Mercado Pago
MERCADO_PAGO_ACCESS_TOKEN=tu_access_token_mercado_pago
MERCADO_PAGO_PUBLIC_KEY=tu_public_key_mercado_pago
