# JWT Authentication Implementation - Production Ready

## Resumen de Cambios

Se ha implementado un sistema de autenticación basado en JWT (JSON Web Tokens) para reemplazar el anterior sistema de tokens en memoria (`ACTIVE_TOKENS`), proporcionando seguridad y escalabilidad a nivel producción.

## ¿Qué es JWT?

JWT es un estándar de industria (RFC 7519) para crear tokens de autenticación seguros y autofirmados. A diferencia de los tokens aleatorios que requieren almacenamiento en servidor:

- ✅ **Autocontenido**: El token contiene toda la información del usuario codificada
- ✅ **Seguro**: Está firmado criptográficamente con SECRET_KEY de Django
- ✅ **Escalable**: No requiere sincronización entre servidores
- ✅ **Estándar**: Compatible con cualquier cliente (web, mobile, terceros)
- ✅ **Expiración**: Tokens de corta duración (1 hora) + refresh tokens (7 días)

## Archivo Nuevo: jwt_auth.py

**Ubicación**: `back_debandi/jwt_auth.py`

Contiene la clase `JWTAuthManager` con métodos para:

```python
# Generar tokens (access + refresh)
tokens = JWTAuthManager.generar_tokens(cliente)
# Devuelve: {'access': token, 'refresh': token}

# Verificar token
payload = JWTAuthManager.verificar_token(token, token_type='access')
# Devuelve: {'cli_codi': id, 'email': email, ...}

# Renovar access token usando refresh token
new_tokens = JWTAuthManager.renovar_token(refresh_token)
# Devuelve: {'access': nuevo_token}

# Revocar token (logout)
JWTAuthManager.revocar_token(token)

# Obtener datos del cliente desde token
data = JWTAuthManager.obtener_cliente_desde_token(token)
# Devuelve: {'cli_codi': id, 'email': email, 'nombre': name}
```

## Cambios en auth_views.py

### 1. Funciones Auxiliares Nuevas

```python
def validate_jwt_token_from_request(request):
    """Valida JWT y retorna datos del cliente"""
    # Extrae token de header Authorization o cookie
    # Verifica que sea válido y no esté revocado
    # Retorna {'cli_codi': id, 'email': email} o None
```

### 2. Endpoint: POST /api/auth/login/

**Antes**:
```json
{
  "success": true,
  "token": "abc123xyz...",
  "user": {...}
}
```

**Ahora**:
```json
{
  "success": true,
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",  // Access token JWT (1 hora)
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...", // Refresh token JWT (7 días)
  "user": {...}
}
```

**Cookies Set-Cookie**:
- `auth-token`: Access token (httpOnly, Secure, SameSite=Lax)

### 3. Endpoint Nuevo: POST /api/auth/refresh/

Renovar access token cuando expire (después de 1 hora).

**Request**:
```json
{
  "refresh": "refresh_token_aqui"
}
```

**Response**:
```json
{
  "access": "nuevo_access_token_jwt"
}
```

**Uso desde Frontend**:
```typescript
// Cuando reciba error 401 Unauthorized
const refreshResponse = await fetch('/api/auth/refresh/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refresh: storedRefreshToken }),
  credentials: 'include'
})
const { access } = await refreshResponse.json()
localStorage.setItem('accessToken', access)
```

### 4. Endpoint: POST /api/auth/logout/

**Cambios**:
- Revoca el token (lo agrega a blacklist)
- Limpia la cookie httpOnly
- Ahora es seguro revocar tokens incluso en caso de acceso no autorizado

### 5. Endpoint: POST /api/auth/register/

**Cambios**:
- Ahora retorna JWT tokens (access + refresh)
- Auto-login después del registro
- Establece cookie httpOnly automáticamente

### 6. Endpoint: POST /api/auth/google/login/

**Cambios**:
- Retorna JWT tokens en lugar de token aleatorio
- Crea usuario automáticamente si no existe (OAuth)

### 7. Endpoints de Carrito y Favoritos

Todos los endpoints (`carrito_list`, `carrito_add`, `carrito_update`, `carrito_remove`, `carrito_clear`, etc.) ahora usan:

```python
# ANTES:
token = get_auth_token_from_request(request)
if not token or token not in ACTIVE_TOKENS:
    return error
token_data = ACTIVE_TOKENS[token]

# AHORA:
token_data = validate_jwt_token_from_request(request)
if not token_data:
    return error
```

## Estructura de JWT Tokens

### Access Token (1 hora)
```json
{
  "cli_codi": 123,
  "email": "user@example.com",
  "nombre": "Juan Pérez",
  "exp": 1234567890,  // Expiración (Unix timestamp)
  "iat": 1234567801,  // Emisión
  "jti": "unique_id_123",  // JWT ID para revocación
  "type": "access"
}
```

### Refresh Token (7 días)
```json
{
  "cli_codi": 123,
  "email": "user@example.com",
  "exp": 1234567890,
  "iat": 1234567801,
  "jti": "unique_id_456",
  "type": "refresh"
}
```

## Configuración Django (settings.py)

Ya viene preconfigurado:

```python
AUTH_COOKIE_NAME = 'auth-token'
AUTH_COOKIE_SECURE = True  # HTTPS only en producción
AUTH_COOKIE_SAMESITE = 'Lax'
AUTH_COOKIE_MAX_AGE = 3600  # 1 hora

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'ALGORITHM': 'HS256',
    # Usa SECRET_KEY de Django para firmar
}
```

## Flujo de Autenticación

### 1. Login
```
Usuario -> POST /api/auth/login/ -> Backend valida credenciales
Backend -> Genera JWT access + refresh tokens
Backend -> Set-Cookie: auth-token=<access_jwt>
Backend -> Response JSON con access + refresh + user
```

### 2. Petición Autenticada
```
Cliente -> GET /api/favoritos/ + Cookie: auth-token=<access_jwt>
Backend -> Valida JWT signature
Backend -> Extrae cli_codi del JWT payload
Backend -> Obtiene datos del usuario
Backend -> Procesa petición
```

### 3. Token Expirado (Error 401)
```
Cliente detecta 401 Unauthorized
Cliente -> POST /api/auth/refresh/ + { "refresh": <refresh_jwt> }
Backend -> Valida refresh token
Backend -> Genera nuevo access token
Backend -> Set-Cookie: auth-token=<new_access_jwt>
Cliente -> Reintentar petición original
```

### 4. Logout
```
Usuario -> POST /api/auth/logout/
Backend -> Extrae token de cookie/header
Backend -> Agrega JTI a blacklist (revocación)
Backend -> Delete-Cookie: auth-token
Backend -> Response: success
```

## Migración desde Anterior Sistema

### El Problema
- `ACTIVE_TOKENS` era un diccionario Python en memoria
- Se perdía en reinicio de servidor
- No funcionaba con múltiples servidores (sin compartir estado)
- Usuarios actuales no pueden migrar automáticamente (hashes incompatibles)

### La Solución
- Nuevos usuarios/logins usan JWT
- Usuarios existentes deben hacer reset de password (compatible con nuevo sistema)
- JWT es stateless y escalable

### Script de Recuperación (Opcional)
Si necesitas ver usuarios con contraseñas incompatibles, se ejecutó previamente:
```bash
python back_debandi/rehash_passwords.py
```

## Seguridad

### ✅ Implementado
- Tokens firmados criptográficamente (HS256)
- Access tokens corta duración (1 hora)
- Refresh tokens separados (7 días) para renovación
- httpOnly cookies (previene XSS)
- Secure flag en cookies (HTTPS only en producción)
- SameSite=Lax (previene CSRF)
- Token blacklist en logout (Django cache)
- SECRET_KEY único por instancia

### ⚠️ Consideraciones
- **Cache de Blacklist**: Usa Django cache (por defecto en memoria)
  - Para producción con múltiples servidores, usa Redis:
    ```python
    CACHES = {
        'default': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': 'redis://127.0.0.1:6379/1',
        }
    }
    ```
- **HTTPS**: El flag `Secure` en cookies requiere HTTPS en producción
- **SECRET_KEY**: Cambiar en producción (definir en `.env`)

## Testing

### Test Manual Login
```bash
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

**Response**:
```json
{
  "success": true,
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {...}
}
```

### Test Refresh Token
```bash
curl -X POST http://localhost:8000/api/auth/refresh/ \
  -H "Content-Type: application/json" \
  -d '{
    "refresh": "<refresh_token_aqui>"
  }'
```

### Test Protegido Endpoint
```bash
curl -X GET http://localhost:8000/api/favoritos/ \
  -H "Authorization: Bearer <access_token>" \
  -H "Cookie: auth-token=<access_token>" \
  --cookie-jar cookies.txt
```

## Frontend Integration

El `auth-context.tsx` ya está optimizado:

```typescript
// Automáticamente:
// 1. Envía credentials: 'include' (cookies)
// 2. Lee tokens de response JSON
// 3. Usa cookies httpOnly para peticiones posteriores
// 4. Maneja 401 Unauthorized

const response = await ApiService.post('/auth/login/', { email, password })
// Cookies se manejan automáticamente después
```

## URLs Disponibles

Todas las rutas en `back_debandi/gestion/urls.py`:

```
POST   /api/auth/login/              - Login con credenciales
POST   /api/auth/register/           - Registro nuevo usuario  
GET    /api/auth/me/                 - Datos usuario actual
POST   /api/auth/logout/             - Logout (revoca token)
POST   /api/auth/refresh/            - Renovar access token
POST   /api/auth/google/login/       - Google OAuth
...y más
```

## Troubleshooting

### Error: "Token inválido"
- JWT expiró (access: 1 hora, refresh: 7 días)
- SECRET_KEY cambió
- Token fue revocado (logout)

### Error: "No autenticado"
- Cookie no se envía (falta `credentials: 'include'`)
- Token no está en header `Authorization: Bearer <token>`

### Cookie no persiste
- `AUTH_COOKIE_SECURE=True` requiere HTTPS
- En desarrollo, desactivar: `AUTH_COOKIE_SECURE=False` en `.env`

## Rollback (Si es necesario)

Revertir a ACTIVE_TOKENS:
1. Cambiar `login()`, `register()` en auth_views.py para volver a usar `generate_token()` + `ACTIVE_TOKENS`
2. No remover `jwt_auth.py` (solo dejarlo sin usar)
3. Cambiar nuevamente `validate_jwt_token_from_request()` por checks de `ACTIVE_TOKENS`

Pero **NO RECOMENDADO** - JWT es más seguro y profesional.

---

**Última actualización**: 2024
**Versión**: 1.0 (Production Ready)
**Mantenedor**: Sistema Automático
