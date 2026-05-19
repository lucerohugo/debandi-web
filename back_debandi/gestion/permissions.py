"""
Permisos personalizados para API REST - Arquitectura PRIVADA

TODAS las requests requieren:
- JWT (Bearer token) o
- API Key (Api-Key header)

No hay acceso público.
"""

from rest_framework.permissions import BasePermission
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication as SimpleJWTBase
from django.contrib.auth.models import AnonymousUser
from django.conf import settings


# =========================================================
# API KEY USER OBJECT
# =========================================================
class APIKeyUser(AnonymousUser):
    """
    Usuario falso para API Key.
    Permite usar request.user.is_authenticated en permisos.
    """
    def __init__(self):
        super().__init__()
        self.username = "api"
        self.id = 0
        self.user_type = "api"

    @property
    def is_authenticated(self):
        return True


# =========================================================
# JWT AUTHENTICATION (USA LIBRERÍA OFICIAL)
# =========================================================
class SimpleJWTAuthentication(SimpleJWTBase):
    """
    Extiende JWTAuthentication oficial de rest_framework_simplejwt.
    
    ✔ Valida firma correctamente
    ✔ Respeta expiración de tokens
    ✔ Respeta blacklist
    ✔ Compatible con todo DRF
    ✔ Returns (user_object, token) correcto
    """
    def authenticate(self, request):
        result = super().authenticate(request)
        
        if result is None:
            return None
        
        user, token = result
        return (user, token)


# =========================================================
# API KEY AUTHENTICATION
# =========================================================
class APIKeyAuthentication(BaseAuthentication):
    """
    Autenticación por API Key en header Authorization.
    Formato: Authorization: Api-Key <token>
    
    ✔ Valida API Key
    ✔ Returns APIKeyUser (no string)
    ✔ Compatible con request.user.is_authenticated
    """
    def authenticate(self, request):
        auth = request.META.get('HTTP_AUTHORIZATION', '')

        if not auth.startswith('Api-Key '):
            return None

        token = auth[8:].strip()

        if token != getattr(settings, 'API_KEY', None):
            raise AuthenticationFailed("API Key inválida")

        return (APIKeyUser(), token)


# =========================================================
# PERMISO GLOBAL (API PRIVADA) - SIMPLE Y CORRECTO
# =========================================================
class IsAuthenticatedWithJWTOrAPIKey(BasePermission):
    """
    API privada con toggle DEBUG.
    
    Si API_DEBUG_MODE=True → permite todo (localhost/staging/testing)
    Si API_DEBUG_MODE=False → requiere JWT/API Key (producción)
    
    ✔ Sin redundancia
    ✔ DRF maneja autenticación
    ✔ Limpio y eficiente
    ✔ Toggle seguro via variable de entorno
    """
    def has_permission(self, request, view):
        # 🔓 MODO DEBUG: permite todo sin auth
        if getattr(settings, 'API_DEBUG_MODE', False):
            return True
        
        # 🔒 MODO PRODUCCIÓN: requiere autenticación
        return request.user and request.user.is_authenticated


class IsPublicOrAuthenticated(BasePermission):
    """Deprecated"""
    def has_permission(self, request, view):
        return False

