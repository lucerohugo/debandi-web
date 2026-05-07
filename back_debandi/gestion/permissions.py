"""
Permisos personalizados para API REST
Autenticación con API Key fija (token desde .env)

ENDPOINTS PÚBLICOS (sin API Key):
- Login: /api/cliente-login/, /api/vendedores-login/
- Registro: /api/cliente-register/
- Lectura pública: /api/articulos/, /api/rubros/, /api/marcas/
- Clientes logueados: /api/carrito/, /api/favoritos/, /api/pedidos/

ENDPOINTS PROTEGIDOS (requieren API Key):
- Integraciones/Scripts: POST /api/pedidos-crear-desde-carrito/, etc.
"""

from rest_framework.permissions import BasePermission
from django.conf import settings


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
