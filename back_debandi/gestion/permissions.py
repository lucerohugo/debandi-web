"""
Permisos personalizados para API REST - Arquitectura de autenticación híbrida

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

3. LECTURA PÚBLICA (Sin autenticación)
   - GET Catálogo: Productos, Marcas, etc.
   - GET Localidades, Provincias, Zonas
==============================================================================
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
    Permite lectura pública (GET).
    Escritura (POST, PUT, DELETE) requiere autenticación JWT.
    
    Uso: Endpoints de catálogo (articulos, marcas, etc.)
    """
    
    def has_permission(self, request, view):
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True
        return request.user and request.user.is_authenticated


class HasAPIKeyOnly(BasePermission):
    """
    Requiere autenticación por API Key SOLO.
    NO permite JWT de cliente/vendedor.
    
    Uso: POST /api/pedidos-crear-desde-carrito/
    """
    
    def has_permission(self, request, view):
        # Solo permisible si es API Key
        if hasattr(request.user, 'user_type') and request.user.user_type == 'api':
            return True
        return False


class HasAPIKey(BasePermission):
    """
    Valida que la solicitud incluya el API_KEY correcto en el header Authorization.
    
    Endpoints PÚBLICOS (sin API Key):
    - GET /api/articulos/
    - GET /api/rubros/
    - GET /api/marcas/
    - POST /api/cliente-login/
    - POST /api/cliente-register/
    - POST /api/vendedores-login/
    - GET /api/carrito/?cli_codi=X (clientes logueados en frontend)
    - GET /api/favoritos/?cli_codi=X (clientes logueados en frontend)
    - POST /api/carrito-manage/, /api/favoritos-manage/
    
    Endpoints PROTEGIDOS (requieren Api-Key header):
    - POST /api/pedidos-crear-desde-carrito/ (scripts/integraciones)
    - Otros POST/PUT/DELETE en ViewSets (excepto los públicos)
    
    Formato header: Authorization: Api-Key <token>
    """
    
    def has_permission(self, request, view):
        """
        Sistema de permisos de dos capas:
        
        CAPA 1: Rutas públicas (sin autenticación)
        - GET /api/articulos/, /api/marcas/, /api/rubros/ (catálogo)
        - GET /api/carrito/cliente/?cli_codi=X (carrito del cliente)
        - GET /api/favoritos/cliente/?cli_codi=X (favoritos del cliente)
        - GET /api/pedidos/cliente/?cli_codi=X (pedidos del cliente)
        - POST /api/cliente-login/, /api/cliente-register/, /api/vendedores-login/ (auth)
        
        CAPA 2: Rutas protegidas (requieren API Key O JWT)
        - GET/POST en otros endpoints
        - GET /api/pedidos/?ped_exp=false (scripts)
        
        ✅ Frontend: JWT (Authorization: Bearer <token>)
        ✅ Scripts: API Key (Authorization: Api-Key <token>)
        """
        
        # ========== RUTAS PÚBLICAS PARA FRONTEND ==========
        # GET con cli_codi parameter: PERMITIDO sin autenticación
        public_frontend_paths = [
            '/api/carrito/cliente/',
            '/api/favoritos/cliente/',
            '/api/pedidos/cliente/',
        ]
        
        if request.method == 'GET' and any(request.path.startswith(path) for path in public_frontend_paths):
            cli_codi = request.query_params.get('cli_codi')
            if cli_codi:
                return True  # Cliente específico solicitado
        
        # ========== RUTAS PÚBLICAS GENERALES ==========
        # GET en catálogo: PERMITIDO sin autenticación
        public_get_paths = [
            '/api/articulos/',
            '/api/marcas/',
            '/api/rubros/',
        ]
        
        if request.method == 'GET' and any(request.path.startswith(path) for path in public_get_paths):
            return True
        
        # ========== AUTH ENDPOINTS ==========
        # POST en login/registro: PERMITIDO sin autenticación
        public_post_paths = [
            '/api/cliente-login/',
            '/api/cliente-register/',
            '/api/vendedores-login/',
        ]
        
        if request.method == 'POST' and any(request.path.startswith(path) for path in public_post_paths):
            return True
        
        # ========== PROTEGIDAS: REQUERIR API Key O JWT ==========
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")
        
        # ✅ Opción 1: API Key (para scripts)
        if auth_header.startswith("Api-Key "):
            token = auth_header[8:].strip()
            api_key = getattr(settings, 'API_KEY', None)
            if api_key and token == api_key:
                return True
        
        # ✅ Opción 2: JWT (para frontend)
        if auth_header.startswith("Bearer "):
            jwt_token = auth_header[7:].strip()
            if jwt_token:
                return True
        
        # ❌ Sin autenticación válida
        return False

