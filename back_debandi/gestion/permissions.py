# """
# Permisos personalizados para API REST
# Validación de API Key (token fijo desde .env)
# """

# from rest_framework.permissions import BasePermission
# from django.conf import settings


# class HasAPIKey(BasePermission):
#     """
#     Valida que la solicitud incluya el API_KEY correcto en el header Authorization.
#     El token debe venir como: Authorization: Api-Key <token>
    
#     Rutas públicas (sin autenticación):
#     - /api/public/*
#     - /api/auth/login/
#     - /api/auth/register/
#     """
    
#     def has_permission(self, request, view):
#         # Rutas públicas - acceso sin autenticación
#         if request.path.startswith('/api/public/') or \
#            request.path == '/api/auth/login/' or \
#            request.path == '/api/auth/register/' or \
#            request.path == '/admin/':
#             return True
        
#         # Obtener token del header Authorization
#         auth_header = request.headers.get("Authorization", "")
        
#         # Formato esperado: "Api-Key <token>"
#         if not auth_header.startswith("Api-Key "):
#             return False
        
#         token = auth_header[8:].strip()  # Extraer token después de "Api-Key "
        
#         # Validar token contra el configurado en settings
#         api_key = getattr(settings, 'API_KEY', None)
        
#         return token == api_key
