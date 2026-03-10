# 💳 Integración Mercado Pago - Guía de Configuración

## 📌 Estado Actual

La integración de **Mercado Pago** está completamente implementada en el proyecto. Actualmente usa **credenciales DEMO** que no funcionan con la API real.

**Para que funcione, necesitas configurar credenciales reales.**

---

## 🎯 Quick Start - Configurar Credenciales Reales

### 1️⃣ Obtener Credenciales de Mercado Pago

**Opción A: Si tienes cuenta de Mercado Pago**

1. Ve a: https://www.mercadopago.com.ar/developers/panel/app
2. Inicia sesión
3. Ve a **"Mis aplicaciones"**
4. Selecciona tu app (o crea una nueva)
5. Busca **"Credenciales"** > **"Producción"**
6. Copia:
   - **Access Token**
   - **Public Key**

**Opción B: Si no tienes cuenta**

1. Crea una cuenta en https://www.mercadopago.com.ar
2. Ve a https://www.mercadopago.com.ar/developers/panel/app
3. Sigue los pasos de Opción A

### 2️⃣ Reemplazar Credenciales en el Backend

Edita: `back_debandi/gestion/mercado_pago_config.py`

**Busca esto:**
```python
MERCADO_PAGO_ACCESS_TOKEN = os.getenv(
    'MERCADO_PAGO_ACCESS_TOKEN',
    'APP_USR-4297053539569356-061313-67b10d52e2ad8f8945305c9e78bb5e1b__3A_SAC'  # ← ESTO
)

MERCADO_PAGO_PUBLIC_KEY = os.getenv(
    'MERCADO_PAGO_PUBLIC_KEY',
    'APP_USR-6ef1f5c5-9eed-4caa-8d07-26d1b03eb7ea'  # ← Y ESTO
)
```

**Y reemplaza con tus credenciales:**
```python
MERCADO_PAGO_ACCESS_TOKEN = os.getenv(
    'MERCADO_PAGO_ACCESS_TOKEN',
    'APP_USR-XXXX-XXXX-XXXX-XXXXXXXXXXXX'  # Tu Access Token aquí
)

MERCADO_PAGO_PUBLIC_KEY = os.getenv(
    'MERCADO_PAGO_PUBLIC_KEY',
    'APP_USR-YYYY-YYYY-YYYY-YYYYYYYYYYYY'  # Tu Public Key aquí
)
```

### 3️⃣ Reiniciar el Servidor

```bash
python manage.py runserver
```

### 4️⃣ Probar la Integración

1. Ve al checkout: `http://localhost:3000/checkout`
2. Agrega items al carrito
3. Selecciona **"Mercado Pago"** como método de pago
4. Click en **"Pagar con Mercado Pago"**
5. Deberías ser redirigido a Mercado Pago

---

## 🔐 Alternativa: Usar Variables de Entorno (Recomendado para Producción)

En lugar de hardcodear las credenciales, usa variables de entorno:

### En Linux/Mac:
```bash
export MERCADO_PAGO_ACCESS_TOKEN="tu_token_aqui"
export MERCADO_PAGO_PUBLIC_KEY="tu_public_key_aqui"
```

### En Windows (PowerShell):
```powershell
$env:MERCADO_PAGO_ACCESS_TOKEN = "tu_token_aqui"
$env:MERCADO_PAGO_PUBLIC_KEY = "tu_public_key_aqui"
```

### En archivo `.env`:
```
MERCADO_PAGO_ACCESS_TOKEN=tu_token_aqui
MERCADO_PAGO_PUBLIC_KEY=tu_public_key_aqui
FRONTEND_URL=http://localhost:3000
MERCADO_PAGO_WEBHOOK_URL=http://localhost:8000/api/mercado-pago/webhook/
```

Luego cargar en Django:
```python
from django.conf import settings
import os

MERCADO_PAGO_ACCESS_TOKEN = os.getenv('MERCADO_PAGO_ACCESS_TOKEN')
MERCADO_PAGO_PUBLIC_KEY = os.getenv('MERCADO_PAGO_PUBLIC_KEY')
```

---

## 📚 Estructura de la Integración

### Backend Endpoints

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/mercado-pago/create-preference/` | POST | Crear preferencia de pago |
| `/api/mercado-pago/webhook/` | POST | Webhook de notificaciones |
| `/api/mercado-pago/payment-status/` | GET | Obtener estado del pago |

### Frontend Pages

| Ruta | Descripción |
|------|-------------|
| `/checkout` | Checkout con selector de pago |
| `/checkout/success` | Pago aprobado ✅ |
| `/checkout/failure` | Pago rechazado ❌ |
| `/checkout/pending` | Pago pendiente ⏳ |

### Archivos Clave

```
back_debandi/
├── gestion/
│   ├── mercado_pago_config.py       ← Credenciales aquí
│   ├── auth_views.py                ← Endpoints de MP
│   └── urls.py                      ← Rutas de MP

Proyecto_Debandi/
├── services/
│   └── mercado-pago.service.ts      ← Cliente de MP
├── app/checkout/
│   ├── page.tsx                     ← Selector de pago
│   ├── success/page.tsx             ← Página de éxito
│   ├── failure/page.tsx             ← Página de error
│   └── pending/page.tsx             ← Página pendiente
```

---

## 🧪 Testing - Tarjetas de Prueba

Una vez tengas credenciales reales, puedes usar tarjetas de prueba en **ambiente sandbox**:

### Pago Aprobado ✅
```
Número:     5031 7557 3453 0604
Expiración: 11/25
CVV:        123
```

### Pago Rechazado ❌
```
Número:     4111 1111 1111 1111
Expiración: 11/25
CVV:        123
```

---

## 🔍 Troubleshooting

### Error: "At least one policy returned UNAUTHORIZED"
**Causa:** Credenciales DEMO o inválidas
**Solución:** Reemplaza con credenciales reales

### Error: "preference_id not found"
**Causa:** Mercado Pago respondió con error
**Solución:** Revisa que el token sea válido en el dashboard de MP

### Pago no se procesa
**Causa:** URLs de redirección no configuradas
**Solución:** Verifica en `mercado_pago_config.py` que `FRONTEND_URL` sea correcta

### Webhook no funciona
**Causa:** URL no es pública
**Solución:** En producción, configura URL pública en MP dashboard

---

## 📦 Flujo de Pago

```
Usuario selecciona "Mercado Pago"
         ↓
Frontend → POST /api/mercado-pago/create-preference/
         ↓
Backend → Crea preferencia en API de Mercado Pago
         ↓
Backend ← Recibe preference_id + init_point
         ↓
Frontend → Redirige a Mercado Pago (init_point)
         ↓
Usuario → Completa pago en Mercado Pago
         ↓
Mercado Pago → Redirige a /checkout/success
         ↓
Frontend → Muestra confirmación
         ↓
(Opcional) Mercado Pago → POST /api/mercado-pago/webhook/
```

---

## ✅ Checklist de Configuración

- [ ] Tengo cuenta en Mercado Pago
- [ ] Obtuve Access Token
- [ ] Obtuve Public Key
- [ ] Reemplacé credenciales en `mercado_pago_config.py`
- [ ] Reinicié el servidor Django
- [ ] Probé el checkout
- [ ] Logré completar un pago de prueba

---

## 🎓 Documentación Oficial

- **Mercado Pago Developers:** https://www.mercadopago.com.ar/developers
- **API Reference:** https://www.mercadopago.com.ar/developers/es/reference
- **Testing & Sandbox:** https://www.mercadopago.com.ar/developers/es/tools/testing
- **SDK Python:** https://github.com/mercadopago/sdk-python

---

## 📧 Soporte

Si tienes problemas:

1. Verifica que las credenciales sean correctas
2. Revisa la consola del servidor para ver errores
3. Consulta el dashboard de Mercado Pago
4. Lee la documentación oficial de MP

---

**Última actualización:** 3 de febrero de 2026  
**Estado:** ✅ Implementado - Esperando credenciales reales
