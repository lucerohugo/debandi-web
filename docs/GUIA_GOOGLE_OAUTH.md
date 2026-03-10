# Configuración de Google OAuth para Login Seguro

## Obtener Credenciales de Google

### 1. Crear Proyecto en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Crea un nuevo proyecto (si no tienes uno)
3. Nombra el proyecto: `Debandi E-Commerce`

### 2. Habilitar Google+ API

1. En el panel izquierdo: **APIs y servicios** → **Biblioteca**
2. Busca `Google+ API`
3. Haz clic en el resultado y presiona **Habilitar**

### 3. Crear Credenciales OAuth 2.0

1. Ve a **APIs y servicios** → **Credenciales**
2. Haz clic en **Crear credenciales** → **ID de cliente OAuth 2.0**
3. Selecciona **Aplicación web**
4. En **Orígenes autorizados de JavaScript**, agrega:
   - `http://localhost:8000`
   - `http://127.0.0.1:8000`
   - (En producción: tu dominio real)

5. En **URIs de redirección autorizados**, agrega:
   - `http://localhost:8000/api/auth/google/callback/`
   - (En producción: `https://tu-dominio.com/api/auth/google/callback/`)

6. Haz clic en **Crear**
7. Copia **ID de cliente** y **Contraseña de cliente**

## Configurar el Proyecto

### 1. Crear archivo `.env` en `back_debandi/`

```bash
cp back_debandi/.env.example back_debandi/.env
```

### 2. Llenar las variables de Google OAuth en `.env`

```
GOOGLE_CLIENT_ID=tu_id_aqui.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu_contraseña_aqui
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback/
```

### 3. Instalar dependencia (si no existe)

```bash
pip install python-dotenv
```

En `back_debandi/config/settings.py` ya está configurado para leer `.env`

## Arquitectura de Seguridad

### Backend (Django)

- ✅ **Cookies httpOnly**: Los tokens se guardan en cookies que NO pueden ser accedidas por JavaScript
- ✅ **Cookies SameSite**: Protección contra CSRF
- ✅ **Sin Secure en desarrollo**: Usa `Lax` en desarrollo, cambiar a `Secure` en HTTPS producción
- ✅ **OAuth2 Server-Side**: El backend maneja el intercambio de códigos, nunca el cliente ve el secret

### Frontend (Next.js)

- ✅ **Sin localStorage**: No hay tokens guardados en localStorage
- ✅ **Credentials Include**: Las cookies se envían automáticamente en cada request
- ✅ **Sin headers Authorization**: Todo es manejado por cookies

## Flujo de Autenticación OAuth

1. **Usuario hace click en "Login con Google"** → Botón `GoogleLoginButton.tsx`
2. **Frontend obtiene URL de Google** → `/api/auth/google/login/`
3. **Backend retorna URL de Google OAuth** con parámetros
4. **Usuario se redirige a Google** → Ingresa credenciales
5. **Google redirige a callback** → `/api/auth/google/callback/?code=...`
6. **Backend intercambia code por token** → Genera token interno
7. **Backend crea cookie httpOnly** → Guarda token en cookie
8. **Backend redirige a frontend** → Usuario está logueado
9. **Todos los requests tienen cookie automáticamente**

## Testing

### 1. Iniciar servidor Django

```bash
cd back_debandi
python manage.py runserver 8000
```

### 2. Iniciar servidor Next.js

```bash
cd Proyecto_Debandi
npm run dev
```

### 3. Probar Login

- Abre `http://localhost:3000`
- Haz clic en "Iniciar sesión con Google"
- Verifica que se cree la cookie `auth-token` (DevTools → Application → Cookies)

### 4. Verificar Seguridad

```javascript
// En consola del navegador:
document.cookie  // No deberías ver "auth-token" aquí (httpOnly)
```

## Producción - CAMBIOS IMPORTANTES

### En `back_debandi/.env`:

```
DEBUG=False
ALLOWED_HOSTS=tu-dominio.com,www.tu-dominio.com
FRONTEND_URL=https://tu-dominio.com
GOOGLE_REDIRECT_URI=https://tu-dominio.com/api/auth/google/callback/
AUTH_COOKIE_SECURE=True
AUTH_COOKIE_SAMESITE=Strict
```

### Certificado SSL/HTTPS

- Usar Let's Encrypt con Certbot
- Configurar Django para solo permitir HTTPS
- Cloudflare puede ayudar con SSL gratis

## Solución de Problemas

### "Invalid redirect_uri"

- Verifica que coincida exactamente en Google Console y `.env`
- Incluye la barra final `/`

### "Google OAuth no configurado"

- Revisa que las variables estén en `.env`
- Reinicia el servidor Django

### Cookie no aparece

- Verifica `AUTH_COOKIE_SECURE=False` en desarrollo
- Abre DevTools → Network → verifica header `Set-Cookie`

## Librerías Usadas

- `django-cors-headers` - CORS
- `requests` - Para llamadas a Google OAuth
- `python-dotenv` - Variables de entorno
- Next.js `credentials: 'include'` - Envío de cookies
