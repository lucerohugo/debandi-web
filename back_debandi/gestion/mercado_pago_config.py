"""
Configuración de Mercado Pago
Reemplazar las credenciales DEMO por las reales desde:
https://www.mercadopago.com.ar/developers/panel/app
"""

import os
from django.conf import settings

# Credenciales DEMO de Mercado Pago
# REEMPLAZAR CON CREDENCIALES REALES
MERCADO_PAGO_ACCESS_TOKEN = os.getenv(
    'MERCADO_PAGO_ACCESS_TOKEN',
    'APP_USR-4297053539569356-061313-67b10d52e2ad8f8945305c9e78bb5e1b__3A_SAC'  # TOKEN DEMO
)

MERCADO_PAGO_PUBLIC_KEY = os.getenv(
    'MERCADO_PAGO_PUBLIC_KEY',
    'APP_USR-6ef1f5c5-9eed-4caa-8d07-26d1b03eb7ea'  # PUBLIC KEY DEMO
)

# URLs de redirección
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')
MERCADO_PAGO_SUCCESS_URL = f"{FRONTEND_URL}/checkout/success"
MERCADO_PAGO_FAILURE_URL = f"{FRONTEND_URL}/checkout/failure"
MERCADO_PAGO_PENDING_URL = f"{FRONTEND_URL}/checkout/pending"

# Notificación webhook
MERCADO_PAGO_WEBHOOK_URL = os.getenv(
    'MERCADO_PAGO_WEBHOOK_URL',
    'http://localhost:8000/api/mercado-pago/webhook/'
)

# Configuración de la preferencia
MERCADO_PAGO_INSTALLMENTS = 12  # Máximo de cuotas sin interés
MERCADO_PAGO_CURRENCY = "ARS"  # Peso Argentino
