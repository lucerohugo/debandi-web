"""
JWT Authentication Utilities - Producción-ready
Reemplaza ACTIVE_TOKENS con JWT seguro y escalable
"""

# Importar PyJWT
import jwt

from datetime import datetime, timedelta
from django.conf import settings
from django.core.cache import cache
import logging

logger = logging.getLogger(__name__)


class JWTAuthManager:
    """
    Gestor profesional de JWT para autenticación en producción
    - Tokens seguros y autofirmados
    - No requiere almacenamiento en servidor (escalable)
    - httpOnly cookies para protección contra XSS
    - Refresh tokens para renovación
    """
    
    ACCESS_TOKEN_LIFETIME = timedelta(hours=1)
    REFRESH_TOKEN_LIFETIME = timedelta(days=7)
    ALGORITHM = "HS256"
    
    @classmethod
    def generar_tokens(cls, cliente):
        """
        Generar access y refresh tokens JWT para un cliente
        
        Args:
            cliente: Objeto Clientes del modelo
            
        Returns:
            dict: {'access': access_token, 'refresh': refresh_token}
        """
        try:
            secret_key = settings.SECRET_KEY
            ahora = datetime.utcnow()
            
            # Access Token (corta duración - 1 hora)
            access_payload = {
                'cli_codi': cliente.cli_codi,
                'email': cliente.cli_emai,
                'nombre': cliente.cli_nomb,
                'exp': ahora + cls.ACCESS_TOKEN_LIFETIME,
                'iat': ahora,
                'jti': cls._generar_jti(),
                'type': 'access'
            }
            
            access_token = jwt.encode(
                access_payload,
                secret_key,
                algorithm=cls.ALGORITHM
            )
            
            # Refresh Token (larga duración - 7 días)
            refresh_payload = {
                'cli_codi': cliente.cli_codi,
                'email': cliente.cli_emai,
                'exp': ahora + cls.REFRESH_TOKEN_LIFETIME,
                'iat': ahora,
                'jti': cls._generar_jti(),
                'type': 'refresh'
            }
            
            refresh_token = jwt.encode(
                refresh_payload,
                secret_key,
                algorithm=cls.ALGORITHM
            )
            
            return {
                'access': access_token,
                'refresh': refresh_token
            }
            
        except Exception as e:
            logger.error(f"Error generando JWT tokens: {str(e)}", exc_info=True)
            raise Exception("Error generando tokens de autenticación")
    
    @classmethod
    def generar_token(cls, data, token_type='access'):
        """
        Generar un token JWT con datos arbitrarios (para vendedores, impersonación, etc.)
        
        Args:
            data: dict con datos a incluir en el payload
            token_type: 'access' o 'refresh'
            
        Returns:
            str: Token JWT
        """
        try:
            secret_key = settings.SECRET_KEY
            ahora = datetime.utcnow()
            
            # Determinar lifetime según tipo
            lifetime = cls.ACCESS_TOKEN_LIFETIME if token_type == 'access' else cls.REFRESH_TOKEN_LIFETIME
            
            # Construir payload
            payload = {
                **data,
                'exp': ahora + lifetime,
                'iat': ahora,
                'jti': cls._generar_jti(),
                'type': token_type
            }
            
            token = jwt.encode(
                payload,
                secret_key,
                algorithm=cls.ALGORITHM
            )
            
            return token
            
        except Exception as e:
            logger.error(f"Error generando JWT token: {str(e)}", exc_info=True)
            raise Exception("Error generando token de autenticación")

    @classmethod
    def verificar_token(cls, token, token_type='access'):
        """
        Verificar y decodificar un JWT token
        
        Args:
            token: Token JWT a verificar
            token_type: 'access' o 'refresh'
            
        Returns:
            dict: Payload del token decodificado
            
        Raises:
            Exception: Si el token es inválido o expirado
        """
        try:
            secret_key = settings.SECRET_KEY
            
            payload = jwt.decode(
                token,
                secret_key,
                algorithms=[cls.ALGORITHM]
            )
            
            # Validar tipo de token
            if payload.get('type') != token_type:
                raise Exception(f"Tipo de token inválido. Esperado: {token_type}")
            
            # Verificar si el token está en blacklist (revocado)
            if cls._esta_en_blacklist(payload.get('jti')):
                raise Exception("Token revocado")
            
            return payload
            
        except jwt.ExpiredSignatureError:
            raise Exception("Token expirado")
        except jwt.InvalidTokenError as e:
            raise Exception("Token inválido")
        except Exception as e:
            logger.error(f"Error verificando JWT: {str(e)}")
            raise
    
    @classmethod
    def renovar_token(cls, refresh_token):
        """
        Renovar access token usando refresh token
        
        Args:
            refresh_token: Refresh token válido
            
        Returns:
            dict: Nuevo access token
        """
        try:
            # Verificar refresh token
            payload = cls.verificar_token(refresh_token, token_type='refresh')
            
            # Obtener cliente
            from gestion.models import Clientes
            cliente = Clientes.objects.get(cli_codi=payload['cli_codi'])
            
            # Generar nuevo access token
            nuevo_tokens = cls.generar_tokens(cliente)
            
            return {'access': nuevo_tokens['access']}
            
        except Exception as e:
            logger.error(f"Error renovando token: {str(e)}")
            raise Exception("No se pudo renovar el token")
    
    @classmethod
    def revocar_token(cls, token):
        """
        Revocar un token (agregarlo a blacklist)
        Usado en logout
        
        Args:
            token: Token a revocar
        """
        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[cls.ALGORITHM]
            )
            jti = payload.get('jti')
            exp = payload.get('exp')
            
            if jti and exp:
                # Guardar en caché como revocado
                # TTL = tiempo hasta expiración
                ttl = exp - datetime.utcnow().timestamp()
                if ttl > 0:
                    cache.set(f"jwt_blacklist:{jti}", True, int(ttl))
                    logger.info(f"Token revocado: {jti}")
            
        except Exception as e:
            logger.error(f"Error revocando token: {str(e)}")
    
    @classmethod
    def obtener_cliente_desde_token(cls, token):
        """
        Obtener datos del cliente desde el token
        
        Args:
            token: Token JWT
            
        Returns:
            dict: {'cli_codi', 'email', 'nombre'}
        """
        try:
            payload = cls.verificar_token(token, token_type='access')
            return {
                'cli_codi': payload['cli_codi'],
                'email': payload['email'],
                'nombre': payload['nombre']
            }
        except Exception as e:
            return None
    
    @classmethod
    def _generar_jti(cls):
        """Generar unique JWT ID"""
        import secrets
        return secrets.token_urlsafe(16)
    
    @classmethod
    def _esta_en_blacklist(cls, jti):
        """Verificar si un token está en blacklist (revocado)"""
        if not jti:
            return False
        return cache.get(f"jwt_blacklist:{jti}", False)
