"""
Permisos personalizados para API REST - Arquitectura de autenticación híbrida PRIVADA

ARQUITECTURA:
==============================================================================
1. JWT AUTHENTICATION (Frontend Next.js)
   - Token guardado en localStorage del navegador
   - Header: Authorization: Bearer <JWT_TOKEN>
   - Usuarios: Clientes (tabla Clientes, no auth_user de Django)

2. API KEY AUTHENTICATION (Scripts/Integraciones)
   - Token en variable de entorno (.env)
   - Header: Authorization: Api-Key <API_KEY>
   - Uso: Integraciones, Scripts automáticos, Procesos batch

3. ACCESO PÚBLICO: ❌ ELIMINADO
   - TODA la API requiere autenticación obligatoria
   - Sin JWT ni API Key válido → 403 Forbidden
==============================================================================
"""
"""

from rest_framework.permissions import BasePermission, IsAuthenticated, AllowAny
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import PermissionDenied, AuthenticationFailed
from django.conf import settings


class ClienteJWTAuthentication(BaseAuthentication):
    """
    🔐 Autenticación JWT personalizada contra tabla Clientes.
    
    Valida JWT y retorna un objeto Cliente (no usa Django auth_user).
    Permite que endpoints protegidos funcionen sin usuarios de Django.
    
    Header: Authorization: Bearer <token>
    """
    
    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        
        if not auth_header.startswith('Bearer '):
            return None  # Sin JWT, permitir que continúe
        
        try:
            token = auth_header[7:]  # Remover "Bearer "
            
            # Valida JWT usando rest_framework_simplejwt
            from rest_framework_simplejwt.tokens import UntypedToken
            from jwt.exceptions import InvalidTokenError
            
            try:
                decoded = UntypedToken(token).payload
            except InvalidTokenError:
                raise AuthenticationFailed('Token JWT inválido')
            
            user_id = decoded.get('user_id')
            user_type = decoded.get('user_type', 'cliente')
            
            if not user_id:
                raise AuthenticationFailed('Token sin user_id')
            
            # Solo procesar si es token de cliente
            if user_type != 'cliente':
                return None
            
            # Obtener el cliente de la base de datos
            from gestion.models import Clientes
            
            try:
                cliente = Clientes.objects.get(cli_codi=user_id)
            except Clientes.DoesNotExist:
                raise AuthenticationFailed('Cliente no encontrado')
            
            return (cliente, token)
            
        except AuthenticationFailed:
            raise
        except Exception as e:
            raise AuthenticationFailed(f'Error validando JWT: {str(e)}')
    
    def authenticate_header(self, request):
        return 'Bearer'


class VendedorJWTAuthentication(BaseAuthentication):
    """
    🔐 Autenticación JWT personalizada contra tabla Vendedor.
    
    Similar a ClienteJWTAuthentication pero para vendedores.
    Header: Authorization: Bearer <token>
    """
    
    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        
        if not auth_header.startswith('Bearer '):
            return None
        
        try:
            token = auth_header[7:]
            
            from rest_framework_simplejwt.tokens import UntypedToken
            from jwt.exceptions import InvalidTokenError
            
            try:
                decoded = UntypedToken(token).payload
            except InvalidTokenError:
                raise AuthenticationFailed('Token JWT inválido')
            
            user_id = decoded.get('user_id')
            user_type = decoded.get('user_type', 'cliente')
            
            if not user_id:
                raise AuthenticationFailed('Token sin user_id')
            
            if user_type != 'vendedor':
                return None
            
            from gestion.models import Vendedor
            
            try:
                vendedor = Vendedor.objects.get(ven_codi=user_id)
            except Vendedor.DoesNotExist:
                raise AuthenticationFailed('Vendedor no encontrado')
            
            return (vendedor, token)
            
        except AuthenticationFailed:
            raise
        except Exception as e:
            raise AuthenticationFailed(f'Error validando JWT vendedor: {str(e)}')
    
    def authenticate_header(self, request):
        return 'Bearer'


class APIKeyAuthentication(BaseAuthentication):
    """
    🔐 Autenticación con API Key para scripts/integraciones.
    
    Header: Authorization: Api-Key <API_KEY>
    
    IMPORTANTE: El request.user será un objeto especial con is_authenticated=True
    pero sin datos específicos de usuario, solo para que pase validaciones.
    """
    
    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        
        if not auth_header.startswith('Api-Key '):
            return None
        
        try:
            token = auth_header[8:].strip()
            
            if not token:
                raise AuthenticationFailed('API Key vacía')
            
            api_key = getattr(settings, 'API_KEY', None)
            if not api_key:
                raise AuthenticationFailed('API_KEY no configurada en settings')
            
            if token != api_key:
                raise AuthenticationFailed('API Key inválida')
            
            # Crear usuario simulado para API Key
            from django.contrib.auth.models import AnonymousUser
            
            class APIKeyUser(AnonymousUser):
                @property
                def is_authenticated(self):
                    return True
                
                @property
                def id(self):
                    return 0
                
                @property
                def user_type(self):
                    return 'api'
            
            return (APIKeyUser(), token)
            
        except AuthenticationFailed:
            raise
        except Exception as e:
            raise AuthenticationFailed(f'Error validando API Key: {str(e)}')
    
    def authenticate_header(self, request):
        return 'Api-Key'


# ============================================================================
# PERMISOS PERSONALIZADOS
# ============================================================================

class IsPublicOrAuthenticated(BasePermission):
    """
    ❌ CLASE DEPRECADA - Ya no se usa
    
    Anteriormente permitía lectura pública (GET).
    Ahora TODA la API requiere autenticación obligatoria.
    
    Se mantiene por compatibilidad pero siempre retorna False.
    """
    
    def has_permission(self, request, view):
        # ❌ Acceso público eliminado - requiere autenticación
        return False


class IsAuthenticatedWithJWTOrAPIKey(BasePermission):
    """
    🔐 PERMISO OBLIGATORIO - API PRIVADA
    
    TODAS las solicitudes deben incluir autenticación válida:
    
    ✅ PERMITIDO:
    - Header: Authorization: Bearer <JWT_VÁLIDO>
    - Header: Authorization: Api-Key <API_KEY_VÁLIDO>
    
    ❌ DENEGADO:
    - Sin header Authorization
    - Header inválido o token expirado
    - Credenciales incorrectas
    
    NO hay excepciones por ruta ni método HTTP.
    """
    
    def has_permission(self, request, view):
        """
        Verificar que la solicitud tenga autenticación válida.
        NO hay rutas públicas.
        """
        auth_header = request.META.get('HTTP_AUTHORIZATION', '').strip()
        
        # ❌ Sin header Authorization
        if not auth_header:
            return False
        
        # ✅ Opción 1: API Key válido (para scripts/integraciones)
        if auth_header.startswith('Api-Key '):
            token = auth_header[8:].strip()
            if not token:
                return False
            
            api_key = getattr(settings, 'API_KEY', None)
            if api_key and token == api_key:
                return True  # ✅ API Key válido
            return False  # ❌ API Key inválido
        
        # ✅ Opción 2: JWT válido (para frontend/admin)
        if auth_header.startswith('Bearer '):
            token = auth_header[7:].strip()
            if not token:
                return False
            
            try:
                from rest_framework_simplejwt.tokens import UntypedToken
                from jwt.exceptions import InvalidTokenError
                
                try:
                    UntypedToken(token)  # Valida el token
                    return True  # ✅ JWT válido
                except InvalidTokenError:
                    return False  # ❌ JWT inválido o expirado
            except Exception:
                return False  # ❌ Error validando JWT
        
        # ❌ Header con formato desconocido
        return False


# ============================================================================
# RESUMEN: ARQUI​TECTURA DE AUTENTICACIÓN Y PERMISOS
# ============================================================================
"""
🔐 FLUJO DE AUTENTICACIÓN:

1. ClienteJWTAuthentication ← Intenta extraer JWT cliente (Bearer token)
2. VendedorJWTAuthentication ← Intenta extraer JWT vendedor (Bearer token)
3. APIKeyAuthentication ← Intenta extraer API Key (Api-Key token)
4. SessionAuthentication ← Fallback para admin/desarrollo

🔒 FLUJO DE PERMISOS:

1. IsAuthenticatedWithJWTOrAPIKey ← REQUERIDO PARA TODA LA API
   - ✅ Permite si hay JWT válido O API Key válido
   - ❌ Deniega si no hay autenticación
   - ❌ Deniega si JWT está expirado
   - ❌ Deniega si API Key es inválido
   - NO hay excepciones por ruta ni método HTTP
   - NO hay acceso público

⚠️ IMPORTANTE - API COMPLETAMENTE PRIVADA:
- Todas las solicitudes DEBEN incluir Authorization header
- Sin header = 403 Forbidden
- Header inválido = 403 Forbidden  
- JWT expirado = 403 Forbidden
- Solo credenciales válidas = 200 OK

📋 CÓMO USAR:

1. Frontend (Next.js):
   - Login con POST /api/cliente-login/
   - Recibe JWT token
   - Incluye en header: Authorization: Bearer <token>
   - Token se renueva automáticamente

2. Scripts/Integraciones:
   - Incluir API Key en header: Authorization: Api-Key <API_KEY>
   - API Key está en settings.py y .env
   - No expira, es una credencial fija

3. Curl/Postman (Testing):
   - Con JWT: curl -H "Authorization: Bearer <token>" http://api...
   - Con API Key: curl -H "Authorization: Api-Key <key>" http://api...
"""
            
            try:
                from rest_framework_simplejwt.tokens import UntypedToken
                from jwt.exceptions import InvalidTokenError
                
                try:
                    UntypedToken(token)  # Valida el token
                    return True  # ✅ JWT válido
                except InvalidTokenError:
                    return False  # ❌ JWT inválido o expirado
            except Exception:
                return False  # ❌ Error validando JWT
        
        # ❌ Header con formato desconocido
        return False

