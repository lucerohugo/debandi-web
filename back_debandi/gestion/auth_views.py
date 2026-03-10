import json
import secrets
import logging
from datetime import datetime, timedelta
from urllib.parse import urlencode
from django.http import JsonResponse, HttpResponseRedirect
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Q
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth.hashers import make_password, check_password
from .models import Clientes, Localidad, Favoritos, Articulo, Pedidos, CarritoItem, CuentaBancaria
from django.db import transaction
import requests
from .mercado_pago_config import (
    MERCADO_PAGO_ACCESS_TOKEN,
    MERCADO_PAGO_PUBLIC_KEY,
    MERCADO_PAGO_SUCCESS_URL,
    MERCADO_PAGO_FAILURE_URL,
    MERCADO_PAGO_PENDING_URL,
    MERCADO_PAGO_WEBHOOK_URL,
    MERCADO_PAGO_CURRENCY,
)
from config.config import FRONTEND_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
from jwt_auth import JWTAuthManager

# Configurar logging
logger = logging.getLogger(__name__)

# ============================================================================
# FUNCIONES AUXILIARES
# ============================================================================

def get_auth_token_from_request(request):
    """Obtener token desde header Authorization o cookie httpOnly"""
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        return auth_header[7:]
    return request.COOKIES.get(settings.AUTH_COOKIE_NAME)

def set_auth_cookie(response, token):
    """Guardar token en cookie httpOnly"""
    response.set_cookie(
        settings.AUTH_COOKIE_NAME,
        token,
        max_age=settings.AUTH_COOKIE_MAX_AGE,
        httponly=True,
        samesite=settings.AUTH_COOKIE_SAMESITE,
        secure=settings.AUTH_COOKIE_SECURE,
    )
    return response

def clear_auth_cookie(response):
    """Eliminar cookie de autenticación"""
    response.delete_cookie(settings.AUTH_COOKIE_NAME)
    return response

def validate_jwt_token_from_request(request):
    """
    Validar JWT token desde el request y retornar datos del cliente
    
    Returns:
        dict: {'cli_codi': id, 'email': email} o None si es inválido
    """
    try:
        token = get_auth_token_from_request(request)
        if not token:
            return None
        
        # Verificar y decodificar JWT
        payload = JWTAuthManager.verificar_token(token, token_type='access')
        return {
            'cli_codi': payload.get('cli_codi'),
            'email': payload.get('email')
        }
    except Exception:
        return None
def hash_password(password):
    """Hash de contraseña usando Django's make_password (PBKDF2 seguro)"""
    return make_password(password)

def verify_password(password, hash_pass):
    """Verificar contraseña hasheada usando Django's check_password"""
    return check_password(password, hash_pass)

def generate_token():
    """Generar un token seguro"""
    return secrets.token_urlsafe(32)

def format_cliente(cliente):
    """Formatear datos del cliente para respuesta"""
    # Dividir nombre en nombre y apellido
    nombre_partes = cliente.cli_nomb.split()
    firstName = nombre_partes[0] if nombre_partes else ""
    lastName = " ".join(nombre_partes[1:]) if len(nombre_partes) > 1 else ""
    
    return {
        'id': cliente.cli_codi,
        'email': cliente.cli_emai,
        'firstName': firstName,
        'lastName': lastName,
        'isAdmin': False,
        'cli_codi': cliente.cli_codi,
        'cli_nomb': cliente.cli_nomb,
        'cli_doc': cliente.cli_doc,
        'cli_cuit': cliente.cli_cuit,
        'cli_tele': cliente.cli_tele,
        'cli_dire': cliente.cli_dire,
    }

@csrf_exempt
@require_http_methods(["POST"])
def login(request):
    """Iniciar sesión - Genera JWT tokens seguros
    
    POST /api/auth/login/
    {
        "email": "usuario@example.com",
        "password": "password123"
    }
    
    Respuesta:
    {
        "success": true,
        "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
        "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
        "user": {...}
    }
    """
    try:
        data = json.loads(request.body)
        email = data.get('email', '').strip().lower()
        password = data.get('password', '').strip()
        
        if not email or not password:
            return JsonResponse({'error': 'Email y contraseña requeridos'}, status=400)
        
        # Buscar cliente por email
        try:
            cliente = Clientes.objects.get(cli_emai=email)
        except Clientes.DoesNotExist:
            return JsonResponse({'error': 'Email o contraseña incorrectos'}, status=401)
        
        # Verificar contraseña
        if not cliente.cli_pswd or not verify_password(password, cliente.cli_pswd):
            logger.warning(f"Intento de login fallido para email: {email}")
            return JsonResponse({'error': 'Email o contraseña incorrectos'}, status=401)
        
        # Generar JWT tokens
        try:
            tokens = JWTAuthManager.generar_tokens(cliente)
            logger.info(f"Usuario logueado exitosamente: {cliente.cli_nomb} (ID: {cliente.cli_codi})")
            
            response = JsonResponse({
                'success': True,
                'access': tokens['access'],
                'refresh': tokens['refresh'],
                'user': format_cliente(cliente)
            }, status=200)
            
            # Guardar access token en httpOnly cookie
            set_auth_cookie(response, tokens['access'])
            
            return response
        except Exception as e:
            logger.error(f"Error generando JWT tokens: {str(e)}", exc_info=True)
            return JsonResponse({'error': 'Error generando tokens de sesión'}, status=500)
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'JSON inválido'}, status=400)
    except Exception as e:
        logger.error(f"Error en login", exc_info=True)
        return JsonResponse({'error': 'Error interno del servidor'}, status=500)


@csrf_exempt
@csrf_exempt
@require_http_methods(["POST"])
def register(request):
    """Registrar nuevo cliente"""
    try:
        data = json.loads(request.body)
        email = data.get('email', '').strip().lower()
        password = data.get('password', '').strip()
        firstName = data.get('firstName', '').strip()
        lastName = data.get('lastName', '').strip()
        document = data.get('document', '').strip()
        
        # Validación básica
        if not all([email, password, firstName]):
            return JsonResponse({'error': 'Email, contraseña y nombre son requeridos'}, status=400)
        
        if document and len(document) > 8:
            return JsonResponse({'error': 'El documento debe tener máximo 8 caracteres'}, status=400)
        
        if len(password) < 6:
            return JsonResponse({'error': 'La contraseña debe tener al menos 6 caracteres'}, status=400)
        
        # Verificar si el email ya existe
        if Clientes.objects.filter(cli_emai=email).exists():
            return JsonResponse({'error': 'El email ya está registrado'}, status=400)
        
        # Obtener localidad
        try:
            localidad = Localidad.objects.first()
            if not localidad:
                return JsonResponse({'error': 'Error: localidad no disponible'}, status=500)
        except Exception as e:
            return JsonResponse({'error': f'Error al obtener localidad: {str(e)}'}, status=500)
        
        nombre_completo = f"{firstName} {lastName}".strip()
        
        # Hash de la contraseña
        password_hash = hash_password(password)
        
        try:
            cliente = Clientes.objects.create(
                cli_nomb=nombre_completo,
                cli_emai=email,
                cli_doc=document if document else None,
                cli_tele='',
                cli_dire='',
                cli_pswd=password_hash,
                loc_codi=localidad,
            )
        except Exception as e:
            return JsonResponse({'error': f'Error al crear cliente: {str(e)}'}, status=500)
        
        # Generar JWT tokens para auto-login después del registro
        try:
            tokens = JWTAuthManager.generar_tokens(cliente)
            response = JsonResponse({
                'success': True,
                'access': tokens['access'],
                'refresh': tokens['refresh'],
                'user': format_cliente(cliente)
            }, status=201)
            set_auth_cookie(response, tokens['access'])
            return response
        except Exception as e:
            logger.error(f"Error generando JWT tokens en register: {str(e)}", exc_info=True)
            return JsonResponse({
                'success': True,
                'user': format_cliente(cliente),
                'message': 'Usuario creado. Por favor inicia sesión.'
            }, status=201)
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'JSON inválido'}, status=400)
    except Exception as e:
        return JsonResponse({'error': f'Error: {str(e)}'}, status=500)


@require_http_methods(["GET"])
def me(request):
    """Obtener datos del usuario actual"""
    try:
        token_data = validate_jwt_token_from_request(request)
        if not token_data:
            return JsonResponse({'error': 'No autenticado'}, status=401)
        
        try:
            cliente = Clientes.objects.get(cli_codi=token_data['cli_codi'])
        except Clientes.DoesNotExist:
            return JsonResponse({'error': 'Usuario no encontrado'}, status=404)
        
        return JsonResponse({
            'user': format_cliente(cliente)
        }, status=200)
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def refresh_token(request):
    """Renovar access token usando refresh token
    
    POST /api/auth/refresh/
    {
        "refresh": "refresh_token_aqui"
    }
    
    Respuesta:
    {
        "access": "nuevo_access_token"
    }
    """
    try:
        data = json.loads(request.body)
        refresh = data.get('refresh')
        
        if not refresh:
            return JsonResponse({'error': 'Refresh token requerido'}, status=400)
        
        # Renovar token
        new_tokens = JWTAuthManager.renovar_token(refresh)
        
        response = JsonResponse({
            'access': new_tokens['access']
        }, status=200)
        
        # Actualizar cookie con nuevo access token
        set_auth_cookie(response, new_tokens['access'])
        
        return response
        
    except Exception as e:
        logger.warning(f"Error renovando token: {str(e)}")
        return JsonResponse({'error': 'No se pudo renovar el token'}, status=401)


@csrf_exempt
@require_http_methods(["POST"])
def logout(request):
    """Cerrar sesión - Revoca token JWT
    
    POST /api/auth/logout/
    Headers:
        Authorization: Bearer <token>
    """
    try:
        # Obtener token del header o cookie
        token = get_auth_token_from_request(request)
        
        if token:
            # Revocar token (agregarlo a blacklist)
            JWTAuthManager.revocar_token(token)
        
        response = JsonResponse({
            'success': True,
            'message': 'Sesión cerrada'
        }, status=200)
        
        # Limpiar cookie de autenticación
        clear_auth_cookie(response)
        
        return response
        
    except Exception as e:
        logger.error(f"Error en logout", exc_info=True)
        # Aún así devolver success para no confundir al cliente
        response = JsonResponse({
            'success': True,
            'message': 'Sesión cerrada'
        }, status=200)
        clear_auth_cookie(response)
        return response


@require_http_methods(["GET"])
def google_login(request):
    """Generar URL de login con Google OAuth"""
    if not GOOGLE_CLIENT_ID or not GOOGLE_REDIRECT_URI:
        return JsonResponse({'error': 'Google OAuth no configurado'}, status=500)

    params = {
        'client_id': GOOGLE_CLIENT_ID,
        'redirect_uri': GOOGLE_REDIRECT_URI,
        'response_type': 'code',
        'scope': 'openid email profile',
        'access_type': 'offline',
        'prompt': 'consent',
    }
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    return JsonResponse({'url': auth_url}, status=200)


@require_http_methods(["GET"])
def google_callback(request):
    """Callback de Google OAuth: intercambia code por token y crea sesión"""
    code = request.GET.get('code')
    if not code:
        return JsonResponse({'error': 'Code requerido'}, status=400)

    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET or not GOOGLE_REDIRECT_URI:
        return JsonResponse({'error': 'Google OAuth no configurado'}, status=500)

    token_response = requests.post(
        'https://oauth2.googleapis.com/token',
        data={
            'code': code,
            'client_id': GOOGLE_CLIENT_ID,
            'client_secret': GOOGLE_CLIENT_SECRET,
            'redirect_uri': GOOGLE_REDIRECT_URI,
            'grant_type': 'authorization_code',
        },
        timeout=10
    )

    if token_response.status_code != 200:
        return JsonResponse({'error': 'Error al obtener token de Google'}, status=500)

    token_data = token_response.json()
    access_token = token_data.get('access_token')
    if not access_token:
        return JsonResponse({'error': 'Token de Google inválido'}, status=500)

    userinfo_response = requests.get(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        headers={'Authorization': f'Bearer {access_token}'},
        timeout=10
    )

    if userinfo_response.status_code != 200:
        return JsonResponse({'error': 'Error al obtener datos de Google'}, status=500)

    userinfo = userinfo_response.json()
    email = (userinfo.get('email') or '').strip().lower()
    first_name = (userinfo.get('given_name') or '').strip()
    last_name = (userinfo.get('family_name') or '').strip()

    if not email:
        return JsonResponse({'error': 'Google no devolvió email'}, status=500)

    # Crear o recuperar cliente
    try:
        cliente = Clientes.objects.get(cli_emai=email)
    except Clientes.DoesNotExist:
        localidad = Localidad.objects.first()
        if not localidad:
            return JsonResponse({'error': 'Localidad no disponible'}, status=500)

        nombre_completo = f"{first_name} {last_name}".strip() or email
        cliente = Clientes.objects.create(
            cli_nomb=nombre_completo,
            cli_emai=email,
            cli_doc=None,
            cli_tele='',
            cli_dire='',
            cli_pswd='',
            loc_codi=localidad,
        )

    # Generar JWT tokens
    try:
        tokens = JWTAuthManager.generar_tokens(cliente)
        response = HttpResponseRedirect(FRONTEND_URL)
        set_auth_cookie(response, tokens['access'])
        return response
    except Exception as e:
        logger.error(f"Error generando JWT en Google login: {str(e)}", exc_info=True)
        return JsonResponse({'error': 'Error generando token de sesión'}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def reset_password(request):
    """Resetear contraseña con token"""
    try:
        data = json.loads(request.body)
        token = data.get('token', '').strip()
        new_password = data.get('password', '').strip()
        
        if not token or not new_password:
            return JsonResponse({'error': 'Token y contraseña requeridos'}, status=400)
        
        if len(new_password) < 6:
            return JsonResponse({'error': 'La contraseña debe tener al menos 6 caracteres'}, status=400)
        
        try:
            cliente = Clientes.objects.get(cli_rtok=token)
        except Clientes.DoesNotExist:
            return JsonResponse({'error': 'Token inválido'}, status=401)
        
        # Verificar que el token no haya expirado
        if cliente.cli_rexp < timezone.now():
            return JsonResponse({'error': 'Token expirado'}, status=401)
        
        # Actualizar contraseña
        cliente.cli_pswd = hash_password(new_password)
        cliente.cli_rtok = ''
        cliente.cli_rexp = None
        cliente.save()
        
        return JsonResponse({
            'success': True,
            'message': 'Contraseña actualizada correctamente'
        }, status=200)
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'JSON inválido'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# ============================================================================
# RECUPERACIÓN DE CONTRASEÑA
# ============================================================================

@csrf_exempt
@require_http_methods(["POST"])
def request_password_reset(request):
    """Solicitar recuperación de contraseña - ENVÍA EMAIL AL ADMIN, NO AL CLIENTE"""
    try:
        data = json.loads(request.body)
        email = data.get('email', '').strip().lower()
        
        if not email:
            return JsonResponse({'error': 'Email requerido'}, status=400)
        
        # Buscar cliente
        try:
            cliente = Clientes.objects.get(cli_emai=email)
        except Clientes.DoesNotExist:
            # Por seguridad, NO decir si el email existe o no
            return JsonResponse({
                'success': True,
                'message': 'Si el email está registrado, nos pondremos en contacto contigo'
            }, status=200)
        
        # Generar token de recuperación
        reset_token = secrets.token_urlsafe(32)
        cliente.cli_rtok = reset_token
        cliente.cli_rexp = timezone.now() + timedelta(hours=24)
        cliente.save()
        
        # URL para que el ADMIN resetee la contraseña
        reset_link = f"{settings.FRONTEND_PASSWORD_RESET_URL}?token={reset_token}&email={email}"
        
        # Enviar email AL ADMIN (noreply@debandi.com / tu email en mailtrap)
        try:
            send_mail(
                subject=f'[DEBANDI] Solicitud de recuperación: {cliente.cli_nomb}',
                message=f'''Solicitud de recuperación de contraseña

DATOS DEL CLIENTE:
- Nombre: {cliente.cli_nomb}
- Email: {cliente.cli_emai}
- Teléfono: {cliente.cli_celu if hasattr(cliente, 'cli_celu') else 'N/A'}

LINK PARA RESETEAR:
{reset_link}

Este enlace expira en 24 horas.

INSTRUCCIONES:
1. Verifica la identidad del cliente
2. Accede al link y establece una nueva contraseña
3. Comunícasela al cliente por el medio que prefieras (email, WhatsApp, etc.)
                ''',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[settings.DEFAULT_FROM_EMAIL],  # ENVIA AL ADMIN
                fail_silently=False,
            )
        except Exception as e:
            logger.error(f"Error enviando email al admin: {str(e)}", exc_info=True)
            return JsonResponse({'error': 'Error procesando solicitud'}, status=500)
        
        return JsonResponse({
            'success': True,
            'message': 'Solicitud recibida. Nos pondremos en contacto contigo en breve'
        }, status=200)
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'JSON inválido'}, status=400)
    except Exception as e:
        logger.error(f"Error en request_password_reset: {str(e)}", exc_info=True)
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def validate_password_reset_token(request):
    """Validar token de recuperación de contraseña"""
    try:
        data = json.loads(request.body)
        token = data.get('token', '').strip()
        email = data.get('email', '').strip().lower()
        
        if not token or not email:
            return JsonResponse({'error': 'Token y email requeridos'}, status=400)
        
        # Buscar cliente
        try:
            cliente = Clientes.objects.get(cli_emai=email)
        except Clientes.DoesNotExist:
            return JsonResponse({'error': 'Usuario no encontrado'}, status=404)
        
        # Validar token
        if cliente.cli_rtok != token:
            return JsonResponse({'error': 'Token inválido'}, status=401)
        
        # Validar expiración
        if not cliente.cli_rexp or cliente.cli_rexp < timezone.now():
            return JsonResponse({'error': 'Token expirado'}, status=401)
        
        return JsonResponse({
            'success': True,
            'message': 'Token válido',
            'email': email
        }, status=200)
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'JSON inválido'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def reset_password(request):
    """Resetear contraseña con token válido"""
    try:
        data = json.loads(request.body)
        token = data.get('token', '').strip()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '').strip()
        confirmPassword = data.get('confirmPassword', '').strip()
        
        if not all([token, email, password, confirmPassword]):
            return JsonResponse({'error': 'Todos los campos son requeridos'}, status=400)
        
        if password != confirmPassword:
            return JsonResponse({'error': 'Las contraseñas no coinciden'}, status=400)
        
        if len(password) < 6:
            return JsonResponse({'error': 'La contraseña debe tener al menos 6 caracteres'}, status=400)
        
        # Buscar cliente
        try:
            cliente = Clientes.objects.get(cli_emai=email)
        except Clientes.DoesNotExist:
            return JsonResponse({'error': 'Usuario no encontrado'}, status=404)
        
        # Validar token
        if cliente.cli_rtok != token:
            return JsonResponse({'error': 'Token inválido'}, status=401)
        
        # Validar expiración
        if not cliente.cli_rexp or cliente.cli_rexp < timezone.now():
            return JsonResponse({'error': 'Token expirado'}, status=401)
        
        # Actualizar contraseña
        cliente.cli_pswd = hash_password(password)
        cliente.cli_rtok = None  # Limpiar token
        cliente.cli_rexp = None
        cliente.save()
        
        
        return JsonResponse({
            'success': True,
            'message': 'Contraseña actualizada correctamente'
        }, status=200)
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'JSON inválido'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def change_password(request):
    """Cambiar contraseña (usuario logueado)"""
    try:
        cliente = get_auth_user(request)
        if not cliente:
            return JsonResponse({'error': 'No autenticado'}, status=401)
        
        data = json.loads(request.body)
        current_password = data.get('current_password', '').strip()
        new_password = data.get('new_password', '').strip()
        
        if not current_password or not new_password:
            return JsonResponse({'error': 'Todos los campos son requeridos'}, status=400)
        
        if len(new_password) < 6:
            return JsonResponse({'error': 'La nueva contraseña debe tener al menos 6 caracteres'}, status=400)
        
        # Verificar contraseña actual
        if not cliente.cli_pswd or not verify_password(current_password, cliente.cli_pswd):
            return JsonResponse({'error': 'Contraseña actual incorrecta'}, status=401)
        
        # Actualizar contraseña
        cliente.cli_pswd = hash_password(new_password)
        cliente.save()
        
        
        return JsonResponse({
            'success': True,
            'message': 'Contraseña actualizada correctamente'
        }, status=200)
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'JSON inválido'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)



# ============================================================================
# VISTAS PARA FAVORITOS
# ============================================================================

def get_auth_user(request):
    """Obtener usuario desde token Bearer"""
    token_data = validate_jwt_token_from_request(request)
    if not token_data:
        return None
    
    try:
        cliente = Clientes.objects.get(cli_codi=token_data['cli_codi'])
        return cliente
    except Clientes.DoesNotExist:
        return None


@require_http_methods(["GET"])
def favoritos_list(request):
    """Obtener lista de favoritos del usuario"""
    try:
        cliente = get_auth_user(request)
        if not cliente:
            return JsonResponse({'error': 'No autenticado'}, status=401)
        
        favoritos = Favoritos.objects.filter(cli_codi=cliente).select_related('art_codi')
        
        data = [{
            'fav_codi': fav.fav_codi,
            'art_codi': fav.art_codi.art_codi,
            'art_nomb': fav.art_codi.art_nomb,
            'art_desc': fav.art_codi.art_desc,
            'art_precio_final': float(fav.art_codi.art_precio_final),
            'art_stkp': fav.art_codi.art_stkp,
        } for fav in favoritos]
        
        return JsonResponse({'favoritos': data}, status=200)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@require_http_methods(["POST"])
@csrf_exempt
def favoritos_add(request):
    """Agregar artículo a favoritos"""
    try:
        cliente = get_auth_user(request)
        if not cliente:
            return JsonResponse({'error': 'No autenticado'}, status=401)
        
        data = json.loads(request.body)
        art_codi = data.get('art_codi')
        
        if not art_codi:
            return JsonResponse({'error': 'art_codi requerido'}, status=400)
        
        try:
            articulo = Articulo.objects.get(art_codi=art_codi)
        except Articulo.DoesNotExist:
            return JsonResponse({'error': 'Artículo no encontrado'}, status=404)
        
        # Crear o recuperar favorito
        favorito, created = Favoritos.objects.get_or_create(
            cli_codi=cliente,
            art_codi=articulo
        )
        
        return JsonResponse({
            'success': True,
            'message': 'Agregado a favoritos' if created else 'Ya está en favoritos',
            'fav_codi': favorito.fav_codi
        }, status=201 if created else 200)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@require_http_methods(["DELETE"])
@csrf_exempt
def favoritos_remove(request, fav_codi):
    """Remover artículo de favoritos"""
    try:
        cliente = get_auth_user(request)
        if not cliente:
            return JsonResponse({'error': 'No autenticado'}, status=401)
        
        try:
            favorito = Favoritos.objects.get(fav_codi=fav_codi, cli_codi=cliente)
            favorito.delete()
        except Favoritos.DoesNotExist:
            return JsonResponse({'error': 'Favorito no encontrado'}, status=404)
        
        return JsonResponse({'success': True, 'message': 'Removido de favoritos'}, status=200)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# ============================================================================
# VISTAS PARA PEDIDOS
# ============================================================================

@require_http_methods(["GET"])
def pedidos_list(request):
    """Obtener lista de pedidos del usuario autenticado"""
    try:
        cliente = get_auth_user(request)
        if not cliente:
            return JsonResponse({'error': 'No autenticado'}, status=401)
        
        # Filtrar pedidos solo del usuario autenticado
        pedidos = Pedidos.objects.filter(cli_codi=cliente).prefetch_related('detalles__art_codi').order_by('-ped_fech')
        
        data = []
        for ped in pedidos:
            detalles = [{
                'dpe_codi': det.dpe_codi,
                'art_codi': det.art_codi.art_codi,
                'art_nomb': det.art_codi.art_nomb,
                'art_pnet': float(det.art_codi.art_pnet),
                'art_pfin': float(det.art_codi.art_pfin),
                'art_stkp': det.art_codi.art_stkp,
                'dpe_cant': det.dpe_cant,
                'dpe_prec': float(det.dpe_prec),
                'dpe_subt': float(det.dpe_subt),
            } for det in ped.detalles.all()]
            
            data.append({
                'ped_codi': ped.ped_codi,
                'cli_codi': ped.cli_codi.cli_codi,
                'cli_nomb': ped.cli_codi.cli_nomb,
                'ped_fech': ped.ped_fech.isoformat(),
                'ped_tota': float(ped.ped_tota),
                'ped_esta': ped.ped_esta,
                'ped_fpag': ped.ped_fpag,
                'ped_exp': ped.ped_exp,  # Si ya fue exportado a Genexus no se puede editar
                'detalles': detalles
            })
        
        return JsonResponse({'pedidos': data}, status=200)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def crear_pedido(request):
    """Crear un nuevo pedido (requiere autenticación o cli_codi)"""
    try:
        data = json.loads(request.body)
        
        # Obtener cliente - preferentemente del token, sino del body
        cliente = get_auth_user(request)
        
        if not cliente:
            # Si no está autenticado, debe pasar cli_codi en el body
            cli_codi = data.get('cli_codi')
            if not cli_codi:
                return JsonResponse({'error': 'Se requiere autenticación o cli_codi'}, status=401)
            
            try:
                cliente = Clientes.objects.get(cli_codi=cli_codi)
            except Clientes.DoesNotExist:
                return JsonResponse({'error': 'Cliente no encontrado'}, status=404)
        
        from decimal import Decimal
        total = Decimal(str(data.get('total', 0)))  # Convertir a Decimal
        forma_pago = data.get('forma_pago', 'CDO')
        bco_codi = data.get('bco_codi', None)  # Banco asociado (solo para transferencias)
        items = data.get('items', [])
        
        
        if not items:
            return JsonResponse({'error': 'El pedido debe tener al menos un item'}, status=400)
        
        # Crear el pedido
        try:
            from .models import DetallePedido
            
            pedido = Pedidos.objects.create(
                cli_codi=cliente,
                ped_tota=total,
                ped_fpag=forma_pago,
                ped_esta='P',  # Pendiente
                bco_codi_id=bco_codi  # Asignar banco si se proporciona
            )
            
            # Crear detalles del pedido
            detalles_count = 0
            for item in items:
                try:
                    from decimal import Decimal
                    
                    art_codi = item.get('art_codi')
                    cantidad = int(item.get('cantidad', 1))
                    precio = Decimal(str(item.get('precio', 0)))  # Convertir a Decimal
                    
                    
                    articulo = Articulo.objects.get(art_codi=art_codi)
                    det = DetallePedido.objects.create(
                        dpe_deta=pedido,
                        art_codi=articulo,
                        dpe_cant=cantidad,
                        dpe_prec=precio
                    )
                    detalles_count += 1
                except Articulo.DoesNotExist:
                    continue
                except Exception as e:
                    continue
            
            
            # LIMPIAR CARRITO DESPUÉS DE CREAR EL PEDIDO
            try:
                CarritoItem.objects.filter(cli_codi=cliente).delete()
            except Exception as e:
                pass
            
            response_data = {
                'success': True,
                'ped_codi': pedido.ped_codi,
                'message': 'Pedido creado exitosamente',
                'detalles': detalles_count
            }
            return JsonResponse(response_data, status=201)
            
        except Exception as e:
            logger.error(f"Error al crear pedido", exc_info=True)
            return JsonResponse({'error': 'Error al crear pedido'}, status=500)
            
    except json.JSONDecodeError as e:
        return JsonResponse({'error': 'JSON inválido'}, status=400)
    except Exception as e:
        logger.error(f"Error general en crear_pedido", exc_info=True)
        return JsonResponse({'error': 'Error interno del servidor'}, status=500)


@require_http_methods(["POST"])
def marcar_pedido_pagado(request):
    """Marcar un pedido como Pagado cuando se confirma transferencia bancaria"""
    try:
        data = json.loads(request.body)
        ped_codi = data.get('ped_codi')
        
        if not ped_codi:
            return JsonResponse({'error': 'ped_codi es requerido'}, status=400)
        
        # Obtener el pedido
        try:
            pedido = Pedidos.objects.get(ped_codi=ped_codi)
        except Pedidos.DoesNotExist:
            return JsonResponse({'error': 'Pedido no encontrado'}, status=404)
        
        # Verificar que el cliente autenticado sea el propietario del pedido
        cliente = get_auth_user(request)
        if cliente and pedido.cli_codi.cli_codi != cliente.cli_codi:
            return JsonResponse({'error': 'No tienes permiso para actualizar este pedido'}, status=403)
        
        # Cambiar estado a 'F' (Facturado/Pagado)
        pedido.ped_esta = 'F'
        pedido.save()
        
        return JsonResponse({
            'success': True,
            'message': 'Pedido marcado como pagado',
            'ped_codi': pedido.ped_codi,
            'ped_esta': pedido.ped_esta
        }, status=200)
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'JSON inválido'}, status=400)
    except Exception as e:
        logger.error(f"Error en marcar_pedido_pagado", exc_info=True)
        return JsonResponse({'error': 'Error interno del servidor'}, status=500)


@csrf_exempt
@require_http_methods(["GET"])
def obtener_pedido(request, ped_codi):
    """Obtener un pedido específico para edición"""
    try:
        cliente = get_auth_user(request)
        if not cliente:
            return JsonResponse({'error': 'No autenticado'}, status=401)
        
        try:
            pedido = Pedidos.objects.prefetch_related('detalles__art_codi').get(ped_codi=ped_codi)
        except Pedidos.DoesNotExist:
            return JsonResponse({'error': 'Pedido no encontrado'}, status=404)
        
        # Verificar que el pedido pertenece al cliente
        if pedido.cli_codi.cli_codi != cliente.cli_codi:
            return JsonResponse({'error': 'No tienes permiso para ver este pedido'}, status=403)
        
        # Verificar si se puede editar
        if pedido.ped_exp:
            return JsonResponse({'error': 'Este pedido ya fue exportado y no puede editarse'}, status=400)
        
        detalles = [{
            'dpe_codi': det.dpe_codi,
            'art_codi': det.art_codi.art_codi,
            'art_nomb': det.art_codi.art_nomb,
            'art_pnet': float(det.art_codi.art_pnet),
            'art_pfin': float(det.art_codi.art_pfin),
            'art_stkp': det.art_codi.art_stkp,
            'art_cint': det.art_codi.art_cint or '',
            'dpe_cant': det.dpe_cant,
            'dpe_prec': float(det.dpe_prec),
            'dpe_subt': float(det.dpe_subt),
        } for det in pedido.detalles.all()]
        
        return JsonResponse({
            'ped_codi': pedido.ped_codi,
            'cli_codi': pedido.cli_codi.cli_codi,
            'cli_nomb': pedido.cli_codi.cli_nomb,
            'ped_fech': pedido.ped_fech.isoformat(),
            'ped_tota': float(pedido.ped_tota),
            'ped_esta': pedido.ped_esta,
            'ped_fpag': pedido.ped_fpag,
            'ped_exp': pedido.ped_exp,
            'detalles': detalles
        }, status=200)
        
    except Exception as e:
        logger.error(f"Error en obtener_pedido", exc_info=True)
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["PUT", "PATCH"])
def editar_pedido(request, ped_codi):
    """Editar un pedido existente (solo si no ha sido exportado a Genexus)"""
    try:
        cliente = get_auth_user(request)
        if not cliente:
            return JsonResponse({'error': 'No autenticado'}, status=401)
        
        try:
            pedido = Pedidos.objects.prefetch_related('detalles').get(ped_codi=ped_codi)
        except Pedidos.DoesNotExist:
            return JsonResponse({'error': 'Pedido no encontrado'}, status=404)
        
        # Verificar que el pedido pertenece al cliente
        if pedido.cli_codi.cli_codi != cliente.cli_codi:
            return JsonResponse({'error': 'No tienes permiso para editar este pedido'}, status=403)
        
        # VERIFICACIÓN CRÍTICA: No permitir edición si ya fue exportado a Genexus
        if pedido.ped_exp:
            return JsonResponse({
                'error': 'Este pedido ya fue exportado a Genexus y no puede modificarse'
            }, status=400)
        
        data = json.loads(request.body)
        items = data.get('items', [])
        forma_pago = data.get('forma_pago')
        
        if not items:
            return JsonResponse({'error': 'El pedido debe tener al menos un item'}, status=400)
        
        from decimal import Decimal
        from .models import DetallePedido
        
        # Restaurar stock de items anteriores
        for det in pedido.detalles.all():
            det.art_codi.art_stkp += det.dpe_cant
            det.art_codi.save()
        
        # Eliminar detalles anteriores
        pedido.detalles.all().delete()
        
        # Crear nuevos detalles
        total = Decimal('0')
        for item in items:
            try:
                art_codi = item.get('art_codi')
                cantidad = int(item.get('cantidad', 1))
                precio = Decimal(str(item.get('precio', 0)))
                
                articulo = Articulo.objects.get(art_codi=art_codi)
                
                # Verificar stock
                if articulo.art_stkp < cantidad:
                    return JsonResponse({
                        'error': f'Stock insuficiente para {articulo.art_nomb}'
                    }, status=400)
                
                # Descontar stock
                articulo.art_stkp -= cantidad
                articulo.save()
                
                subtotal = precio * cantidad
                DetallePedido.objects.create(
                    dpe_deta=pedido,
                    art_codi=articulo,
                    dpe_cant=cantidad,
                    dpe_prec=precio,
                    dpe_subt=subtotal
                )
                total += subtotal
                
            except Articulo.DoesNotExist:
                return JsonResponse({'error': f'Artículo {art_codi} no encontrado'}, status=404)
        
        # Actualizar total y forma de pago
        pedido.ped_tota = total
        if forma_pago:
            pedido.ped_fpag = forma_pago
        pedido.save()
        
        return JsonResponse({
            'success': True,
            'message': 'Pedido actualizado correctamente',
            'ped_codi': pedido.ped_codi,
            'ped_tota': float(pedido.ped_tota)
        }, status=200)
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'JSON inválido'}, status=400)
    except Exception as e:
        logger.error(f"Error en editar_pedido", exc_info=True)
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["DELETE"])
def eliminar_pedido(request, ped_codi):
    """Eliminar un pedido (solo si no ha sido exportado a Genexus)"""
    try:
        cliente = get_auth_user(request)
        if not cliente:
            return JsonResponse({'error': 'No autenticado'}, status=401)
        
        try:
            pedido = Pedidos.objects.prefetch_related('detalles').get(ped_codi=ped_codi)
        except Pedidos.DoesNotExist:
            return JsonResponse({'error': 'Pedido no encontrado'}, status=404)
        
        # Verificar que el pedido pertenece al cliente
        if pedido.cli_codi.cli_codi != cliente.cli_codi:
            return JsonResponse({'error': 'No tienes permiso para eliminar este pedido'}, status=403)
        
        # VERIFICACIÓN CRÍTICA: No permitir eliminación si ya fue exportado a Genexus
        if pedido.ped_exp:
            return JsonResponse({
                'error': 'Este pedido ya fue exportado a Genexus y no puede eliminarse'
            }, status=400)
        
        # Restaurar stock de items
        for det in pedido.detalles.all():
            det.art_codi.art_stkp += det.dpe_cant
            det.art_codi.save()
        
        # Eliminar pedido (los detalles se eliminan en cascada)
        pedido.delete()
        
        return JsonResponse({
            'success': True,
            'message': 'Pedido eliminado correctamente'
        }, status=200)
        
    except Exception as e:
        logger.error(f"Error en eliminar_pedido", exc_info=True)
        return JsonResponse({'error': str(e)}, status=500)


# ============================================================================
# VISTAS PARA EXPORTACIÓN DE ÓRDENES (API)
# ============================================================================

@require_http_methods(["GET"])
def pedidos_export(request):
    """
    Exportar órdenes con filtros opcionales
    
    Filtros disponibles (query parameters):
    - filter_fecha_desde: Fecha inicio (YYYY-MM-DD)
    - filter_fecha_hasta: Fecha fin (YYYY-MM-DD)
    - filter_estado: Estado (P, F, C)
    - filter_cliente_id: ID del cliente
    - filter_forma_pago: Forma de pago (EF, TC, TD, TR)
    
    Ejemplo:
    /api/pedidos/export/?filter_estado=P&filter_fecha_desde=2024-01-01
    """
    try:
        # Obtener parámetros de filtro
        fecha_desde = request.GET.get('filter_fecha_desde')
        fecha_hasta = request.GET.get('filter_fecha_hasta')
        estado = request.GET.get('filter_estado')
        cliente_id = request.GET.get('filter_cliente_id')
        forma_pago = request.GET.get('filter_forma_pago')

        # Iniciar queryse de órdenes
        pedidos_qs = Pedidos.objects.select_related(
            'cli_codi'
        ).prefetch_related(
            'detalles__art_codi'
        ).all()

        # Aplicar filtros
        if fecha_desde:
            try:
                fecha_obj = datetime.strptime(fecha_desde, '%Y-%m-%d')
                pedidos_qs = pedidos_qs.filter(ped_fech__gte=fecha_obj)
            except ValueError:
                return JsonResponse({
                    'error': f'Formato de fecha inválido: {fecha_desde}. Use YYYY-MM-DD'
                }, status=400)

        if fecha_hasta:
            try:
                fecha_obj = datetime.strptime(fecha_hasta, '%Y-%m-%d')
                # Agregar un día para incluir todo el día
                from datetime import timedelta
                fecha_obj = fecha_obj + timedelta(days=1)
                pedidos_qs = pedidos_qs.filter(ped_fech__lt=fecha_obj)
            except ValueError:
                return JsonResponse({
                    'error': f'Formato de fecha inválido: {fecha_hasta}. Use YYYY-MM-DD'
                }, status=400)

        if estado and estado in ['P', 'F', 'C']:
            pedidos_qs = pedidos_qs.filter(ped_esta=estado)

        if cliente_id:
            try:
                cliente_id = int(cliente_id)
                pedidos_qs = pedidos_qs.filter(cli_codi__cli_codi=cliente_id)
            except (ValueError, TypeError):
                return JsonResponse({
                    'error': 'cliente_id debe ser un número entero'
                }, status=400)

        if forma_pago and forma_pago in ['EF', 'TC', 'TD', 'TR']:
            pedidos_qs = pedidos_qs.filter(ped_fpag=forma_pago)

        # Construir respuesta
        pedidos_data = []
        for pedido in pedidos_qs.order_by('-ped_fech'):
            detalles = []
            for detalle in pedido.detalles.all():
                detalles.append({
                    'dpe_codi': detalle.dpe_codi,
                    'art_codi': detalle.art_codi.art_codi,
                    'art_nomb': detalle.art_codi.art_nomb,
                    'dpe_cant': detalle.dpe_cant,
                    'dpe_prec': float(detalle.dpe_prec),
                    'dpe_des': float(detalle.dpe_des),
                    'dpe_subt': float(detalle.dpe_subt),
                })

            pedidos_data.append({
                'ped_codi': pedido.ped_codi,
                'cli_codi': pedido.cli_codi.cli_codi,
                'cli_nomb': pedido.cli_codi.cli_nomb,
                'cli_emai': pedido.cli_codi.cli_emai,
                'cli_doc': pedido.cli_codi.cli_doc,
                'cli_tele': pedido.cli_codi.cli_tele,
                'cli_dire': pedido.cli_codi.cli_dire,
                'ped_fech': pedido.ped_fech.isoformat(),
                'ped_tota': float(pedido.ped_tota),
                'ped_esta': pedido.ped_esta,
                'ped_esta_desc': dict(Pedidos.ESTADO_CHOICES).get(pedido.ped_esta, 'Desconocido'),
                'ped_fpag': pedido.ped_fpag,
                'ped_fpag_desc': dict(Pedidos.FORMA_PAGO_CHOICES).get(pedido.ped_fpag, 'Desconocido'),
                'detalles': detalles,
                'cantidad_items': len(detalles),
            })

        # Respuesta
        response_data = {
            'pedidos': pedidos_data,
            'total_pedidos': len(pedidos_data),
            'filtros_aplicados': {
                'fecha_desde': fecha_desde,
                'fecha_hasta': fecha_hasta,
                'estado': estado,
                'cliente_id': cliente_id,
                'forma_pago': forma_pago,
            },
            'fecha_exportacion': datetime.now().isoformat(),
        }

        return JsonResponse(response_data, status=200, safe=True)

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@require_http_methods(["GET"])
def pedidos_estadisticas(request):
    """
    Obtener estadísticas de órdenes
    """
    try:
        pedidos = Pedidos.objects.filter(ped_exp=False)


        # Contar por estado
        estado_counts = {
            'pendiente': pedidos.filter(ped_esta='P').count(),
            'facturado': pedidos.filter(ped_esta='F').count(),
            'cancelado': pedidos.filter(ped_esta='C').count(),
            'total': pedidos.count(),
        }

        # Contar por forma de pago
        forma_pago_counts = {
            'efectivo': pedidos.filter(ped_fpag='EF').count(),
            'tarjeta_credito': pedidos.filter(ped_fpag='TC').count(),
            'tarjeta_debito': pedidos.filter(ped_fpag='TD').count(),
            'transferencia': pedidos.filter(ped_fpag='TR').count(),
        }

        # Total acumulado
        total_monto = sum(float(o.ped_tota) for o in pedidos)
        promedio_orden = total_monto / pedidos.count() if pedidos.count() > 0 else 0

        return JsonResponse({
            'estado_counts': estado_counts,
            'forma_pago_counts': forma_pago_counts,
            'total_monto': round(total_monto, 2),
            'promedio_orden': round(promedio_orden, 2),
        }, status=200)

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@require_http_methods(["GET"])
def pedidos_export_dbf(request): #esto es solo para la bdf
    """
    Exportación SIMPLE para Genexus / DBF
    SOLO pedidos pendientes y NO exportados
    """
    pedidos = Pedidos.objects.filter(
        ped_exp=False,
        ped_esta='P'
    ).order_by('ped_codi')

    pedidos_data = []

    for p in pedidos:
        pedidos_data.append({
            "ped_codi": p.ped_codi,
            "ped_fech": p.ped_fech.isoformat(),
            "ped_fpag": p.ped_fpag,
            "ped_tota": float(p.ped_tota),
        })

    return JsonResponse({
        "cantidad": len(pedidos_data),
        "pedidos": pedidos_data,
        "fecha_exportacion": timezone.now().isoformat()
    })


@csrf_exempt
@require_http_methods(["POST"])
def confirmar_export_dbf(request):
    """
    Marca pedidos como exportados DESPUÉS de que fueron
    importados correctamente en la DBF (Genexus).

    Espera un JSON así:
    {
        "pedidos": [18, 27, 28, 29]
    }
    """

    try:
        data = json.loads(request.body)
        pedidos_ids = data.get("pedidos", [])

        if not pedidos_ids:
            return JsonResponse(
                {"error": "No se recibieron pedidos para confirmar"},
                status=400
            )

        # Transacción: todo o nada
        with transaction.atomic():

            pedidos = Pedidos.objects.filter(
                ped_codi__in=pedidos_ids,
                ped_exp=False
            )

            actualizados = pedidos.update(
                ped_exp=True,
                ped_fech_exp=timezone.now()
            )

        return JsonResponse({
            "mensaje": "Exportación confirmada correctamente",
            "pedidos_confirmados": actualizados
        })

    except Exception as e:
        return JsonResponse(
            {"error": str(e)},
            status=500
        )


# ============================================================================
# CARRITO DE COMPRAS
# ============================================================================

@require_http_methods(["GET"])
def carrito_list(request):
    """Obtener todos los items del carrito del usuario autenticado"""
    token_data = validate_jwt_token_from_request(request)
    if not token_data:
        return JsonResponse({"error": "No autorizado"}, status=401)
    
    try:
        cliente = Clientes.objects.get(cli_codi=token_data['cli_codi'])
    except Clientes.DoesNotExist:
        return JsonResponse({"error": "Usuario no encontrado"}, status=404)
    
    from .models import CarritoItem
    items = CarritoItem.objects.filter(cli_codi=cliente).select_related('art_codi')
    
    carrito_data = []
    for item in items:
        articulo = item.art_codi
        carrito_data.append({
            'art_codi': articulo.art_codi,
            'art_nomb': articulo.art_nomb,
            'art_pnet': float(item.art_pnet) if item.art_pnet else float(articulo.art_pnet),
            'art_pfin': float(item.art_pfin) if item.art_pfin else float(articulo.art_pfin),
            'art_stkp': articulo.art_stkp,
            'art_img': articulo.art_img.url if articulo.art_img else None,
            'mar_nomb': articulo.mar_codi.mar_nomb if articulo.mar_codi else None,
            'sru_nomb': articulo.sru_codi.sru_nomb if articulo.sru_codi else None,
            'rub_nomb': articulo.sru_codi.rub_codi.rub_nomb if articulo.sru_codi and articulo.sru_codi.rub_codi else 'Sin rubro',
            'art_tiva': articulo.art_tiva,
            'quantity': item.cantidad
        })
    
    return JsonResponse({"carrito": carrito_data}, status=200)


@csrf_exempt
@require_http_methods(["POST"])
def carrito_add(request):
    """Agregar un producto al carrito"""
    token_data = validate_jwt_token_from_request(request)
    if not token_data:
        return JsonResponse({"error": "No autorizado"}, status=401)
    
    try:
        cliente = Clientes.objects.get(cli_codi=token_data['cli_codi'])
    except Clientes.DoesNotExist:
        return JsonResponse({"error": "Usuario no encontrado"}, status=404)
    
    try:
        data = json.loads(request.body)
        art_codi = data.get('art_codi')
        cantidad = data.get('cantidad', 1)
        
        if not art_codi:
            return JsonResponse({"error": "art_codi es requerido"}, status=400)
        
        articulo = Articulo.objects.get(art_codi=art_codi)
        
        # Verificar stock disponible
        if cantidad > articulo.art_stkp:
            return JsonResponse({"error": f"Stock insuficiente. Disponible: {articulo.art_stkp}"}, status=400)
        
        from .models import CarritoItem
        
        item, created = CarritoItem.objects.get_or_create(
            cli_codi=cliente,
            art_codi=articulo,
            defaults={
                'cantidad': cantidad,
                'art_pnet': articulo.art_pnet,
                'art_pfin': articulo.art_pfin
            }
        )
        
        if not created:
            # Si el item ya existe, incrementar la cantidad
            item.cantidad += cantidad
            if item.cantidad > articulo.art_stkp:
                return JsonResponse({"error": f"Stock insuficiente. Disponible: {articulo.art_stkp}"}, status=400)
            item.save()
        
        # Debug: verificar que se guardó
        
        return JsonResponse({
            "mensaje": "Producto agregado al carrito",
            "cantidad": item.cantidad
        }, status=201)
    
    except Articulo.DoesNotExist:
        return JsonResponse({"error": "Artículo no encontrado"}, status=404)
    except json.JSONDecodeError:
        return JsonResponse({"error": "JSON inválido"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def carrito_update(request):
    """Actualizar la cantidad de un producto en el carrito"""
    token_data = validate_jwt_token_from_request(request)
    if not token_data:
        return JsonResponse({"error": "No autorizado"}, status=401)
    
    try:
        cliente = Clientes.objects.get(cli_codi=token_data['cli_codi'])
    except Clientes.DoesNotExist:
        return JsonResponse({"error": "Usuario no encontrado"}, status=404)
    
    try:
        data = json.loads(request.body)
        art_codi = data.get('art_codi')
        cantidad = data.get('cantidad')
        
        if not art_codi or cantidad is None:
            return JsonResponse({"error": "art_codi y cantidad son requeridos"}, status=400)
        
        if cantidad < 1:
            return JsonResponse({"error": "La cantidad debe ser mayor a 0"}, status=400)
        
        articulo = Articulo.objects.get(art_codi=art_codi)
        
        # Verificar stock disponible
        if cantidad > articulo.art_stkp:
            return JsonResponse({"error": f"Stock insuficiente. Disponible: {articulo.art_stkp}"}, status=400)
        
        from .models import CarritoItem
        
        item = CarritoItem.objects.get(cli_codi=cliente, art_codi=articulo)
        item.cantidad = cantidad
        item.save()
        
        return JsonResponse({
            "mensaje": "Carrito actualizado",
            "cantidad": item.cantidad
        }, status=200)
    
    except Articulo.DoesNotExist:
        return JsonResponse({"error": "Artículo no encontrado"}, status=404)
    except CarritoItem.DoesNotExist:
        return JsonResponse({"error": "Item no encontrado en el carrito"}, status=404)
    except json.JSONDecodeError:
        return JsonResponse({"error": "JSON inválido"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def carrito_remove(request):
    """Eliminar un producto del carrito"""
    token_data = validate_jwt_token_from_request(request)
    if not token_data:
        return JsonResponse({"error": "No autorizado"}, status=401)
    
    try:
        cliente = Clientes.objects.get(cli_codi=token_data['cli_codi'])
    except Clientes.DoesNotExist:
        return JsonResponse({"error": "Usuario no encontrado"}, status=404)
    
    try:
        data = json.loads(request.body)
        art_codi = data.get('art_codi')
        
        if not art_codi:
            return JsonResponse({"error": "art_codi es requerido"}, status=400)
        
        articulo = Articulo.objects.get(art_codi=art_codi)
        
        from .models import CarritoItem
        
        item = CarritoItem.objects.get(cli_codi=cliente, art_codi=articulo)
        item.delete()
        
        return JsonResponse({"mensaje": "Producto eliminado del carrito"}, status=200)
    
    except Articulo.DoesNotExist:
        return JsonResponse({"error": "Artículo no encontrado"}, status=404)
    except CarritoItem.DoesNotExist:
        return JsonResponse({"error": "Item no encontrado en el carrito"}, status=404)
    except json.JSONDecodeError:
        return JsonResponse({"error": "JSON inválido"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def carrito_clear(request):
    """Limpiar completamente el carrito del usuario"""
    token_data = validate_jwt_token_from_request(request)
    if not token_data:
        return JsonResponse({"error": "No autorizado"}, status=401)
    
    try:
        cliente = Clientes.objects.get(cli_codi=token_data['cli_codi'])
    except Clientes.DoesNotExist:
        return JsonResponse({"error": "Usuario no encontrado"}, status=404)
    
    try:
        from .models import CarritoItem
        
        cantidad_eliminada, _ = CarritoItem.objects.filter(cli_codi=cliente.cli_codi).delete()
        
        return JsonResponse({
            "mensaje": "Carrito vaciado",
            "items_eliminados": cantidad_eliminada
        }, status=200)
    
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


# ============================================================================
# VISTAS PARA MERCADO PAGO
# ============================================================================

@require_http_methods(["POST"])
@csrf_exempt
def mercado_pago_create_preference(request):
    """
    Crear preferencia de pago en Mercado Pago
    Recibe: total, items (array con art_codi, cantidad, precio)
    """
    try:
        cliente = get_auth_user(request)
        if not cliente:
            return JsonResponse({'error': 'No autenticado'}, status=401)
        
        data = json.loads(request.body)
        total = data.get('total')
        items = data.get('items', [])
        
        if not total or total <= 0:
            return JsonResponse({'error': 'Total inválido'}, status=400)
        
        if not items:
            return JsonResponse({'error': 'Sin items'}, status=400)
        
        # Inicializar cliente de Mercado Pago
        # Usar API REST directamente con requests
        
        # Construir items para Mercado Pago
        mp_items = []
        for item in items:
            art_codi = item.get('art_codi')
            cantidad = item.get('cantidad', 1)
            precio = item.get('precio', 0)
            
            # Obtener información del artículo
            try:
                articulo = Articulo.objects.get(art_codi=art_codi)
                mp_items.append({
                    "id": str(articulo.art_codi),
                    "title": articulo.art_nomb,
                    "description": articulo.art_desc or "",
                    "picture_url": request.build_absolute_uri(articulo.art_img.url) if articulo.art_img else "",
                    "category_id": str(articulo.sru_codi.sru_codi) if articulo.sru_codi else "general",
                    "quantity": int(cantidad),
                    "unit_price": float(precio),
                    "currency_id": MERCADO_PAGO_CURRENCY
                })
            except Articulo.DoesNotExist:
                continue
        
        if not mp_items:
            return JsonResponse({'error': 'No hay artículos válidos'}, status=400)
        
        # Crear preferencia
        preference_data = {
            "items": mp_items,
            "payer": {
                "name": cliente.cli_nomb,
                "email": cliente.cli_emai,
                "phone": {
                    "number": cliente.cli_tele or "1112345678"
                },
                "address": {
                    "street_name": cliente.cli_dire or "Sin dirección",
                    "zip_code": "0000"
                }
            },
            "back_urls": {
                "success": MERCADO_PAGO_SUCCESS_URL,
                "failure": MERCADO_PAGO_FAILURE_URL,
                "pending": MERCADO_PAGO_PENDING_URL
            },
            "auto_return": "approved",
            "notification_url": MERCADO_PAGO_WEBHOOK_URL,
            "external_reference": f"ORD-{cliente.cli_codi}-{int(datetime.now().timestamp())}",
            "statement_descriptor": "DEBANDI",
            "expires": False,
        }
        
        # Hacer request a API de Mercado Pago
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {MERCADO_PAGO_ACCESS_TOKEN}'
        }
        
        mp_response = requests.post(
            'https://api.mercadopago.com/checkout/preferences',
            headers=headers,
            json=preference_data
        )
        
        if mp_response.status_code != 201:
            error_msg = mp_response.text
            return JsonResponse({'error': f'Mercado Pago: {error_msg}'}, status=400)
        
        preference = mp_response.json()
        
        return JsonResponse({
            'preference_id': preference['id'],
            'init_point': preference['init_point'],
            'sandbox_init_point': preference.get('sandbox_init_point', preference['init_point']),
            'public_key': MERCADO_PAGO_PUBLIC_KEY,
            'total': float(total),
            'items_count': len(mp_items)
        }, status=201)
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'JSON inválido'}, status=400)
    except Exception as e:
        return JsonResponse({'error': f'Error: {str(e)}'}, status=500)


@require_http_methods(["POST"])
@csrf_exempt
def mercado_pago_webhook(request):
    """
    Webhook para recibir notificaciones de Mercado Pago
    """
    try:
        data = request.GET if request.method == 'GET' else json.loads(request.body)
        
        
        # Mercado Pago envía notificaciones con estos parámetros
        tipo_notificacion = data.get('type')
        
        if tipo_notificacion == 'payment':
            payment_id = data.get('data', {}).get('id')
            
            # Aquí puedes actualizar el estado del pedido en tu BD
            # por ahora solo log
        
        return JsonResponse({'status': 'ok'}, status=200)
        
    except Exception as e:
        return JsonResponse({'status': 'ok'}, status=200)  # Responder ok para que MP no reintente


@require_http_methods(["GET"])
def mercado_pago_payment_status(request):
    """
    Obtener estado del pago desde Mercado Pago
    """
    try:
        payment_id = request.GET.get('payment_id')
        
        if not payment_id:
            return JsonResponse({'error': 'payment_id requerido'}, status=400)
        
        headers = {
            'Authorization': f'Bearer {MERCADO_PAGO_ACCESS_TOKEN}'
        }
        
        mp_response = requests.get(
            f'https://api.mercadopago.com/v1/payments/{payment_id}',
            headers=headers
        )
        
        if mp_response.status_code != 200:
            return JsonResponse({'error': 'Pago no encontrado'}, status=404)
        
        payment = mp_response.json()
        
        return JsonResponse({
            'payment_id': payment['id'],
            'status': payment['status'],  # "approved", "pending", "rejected", etc
            'status_detail': payment['status_detail'],
            'amount': payment['transaction_amount'],
            'payer_email': payment['payer']['email'],
            'installments': payment.get('installments', 1),
        }, status=200)
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)







#bdf articulos
@require_http_methods(["GET"])
def articulos_export_dbf(request):
    """
    Exporta artículos NO exportados a DBF
    """
    articulos = Articulo.objects.filter(
        art_acti=True,
        art_exp=False
    )

    data = []
    for art in articulos:
        data.append({
            "art_codi": art.art_codi,
            "art_nomb": art.art_nomb,
            "art_pnet": str(art.art_pnet),
            "art_pfin": str(art.art_pfin),
            "art_tiva": art.art_tiva,
        })

    return JsonResponse({"articulos": data})


@csrf_exempt
@require_http_methods(["POST"])
def confirmar_articulos_export_dbf(request):
    """
    Confirma exportación de artículos y marca flags
    """
    try:
        body = json.loads(request.body.decode("utf-8"))
        articulos_ids = body.get("articulos", [])

        if not articulos_ids:
            return JsonResponse({
                "ok": True,
                "articulos_confirmados": []
            })

        confirmados = []

        for art in Articulo.objects.filter(art_codi__in=articulos_ids):
            art.art_exp = True
            art.art_fexp = timezone.now()
            art.save()
            confirmados.append(art.art_codi)

        return JsonResponse({
            "ok": True,
            "articulos_confirmados": confirmados
        })

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)

#bdf

# bdf clientes
@require_http_methods(["GET"])
def clientes_export_dbf(request):
    """
    Exporta clientes NO exportados a DBF
    """
    clientes = Clientes.objects.filter(
        cli_exp=False
    )

    data = []
    for cli in clientes:
        data.append({
            "cliw_codi": cli.cli_codi,
            "cliw_nomb": cli.cli_nomb,
            "cliw_doc": cli.cli_doc,
            "cliw_loca": cli.loc_codi_id,
            "cliw_freg": cli.cli_fchc.strftime("%Y%m%d"),
            "cliw_emai": cli.cli_emai,
        })

    return JsonResponse({"clientes": data})


@csrf_exempt
@require_http_methods(["POST"])
def confirmar_clientes_export_dbf(request):
    """
    Confirma exportación de clientes y marca flags
    """
    try:
        body = json.loads(request.body.decode("utf-8"))
        clientes_ids = body.get("clientes", [])

        if not clientes_ids:
            return JsonResponse({
                "ok": True,
                "clientes_confirmados": []
            })

        confirmados = []

        for cli in Clientes.objects.filter(cli_codi__in=clientes_ids):
            cli.cli_exp = True
            cli.cli_fexp = timezone.now()
            cli.save(update_fields=["cli_exp", "cli_fexp"])
            confirmados.append(cli.cli_codi)

        return JsonResponse({
            "ok": True,
            "clientes_confirmados": confirmados
        })

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["GET"])
def get_bank_data_endpoint(request):
    """
    Retorna los datos de la primera cuenta bancaria activa
    para mostrar en el formulario de transferencias
    """
    try:
        # Obtener la primera cuenta bancaria activa
        cuenta = CuentaBancaria.objects.filter(bco_acti=True).first()
        
        if not cuenta:
            return JsonResponse({
                "error": "No hay cuentas bancarias disponibles"
            }, status=404)
        
        # Retornar los datos con los nombres de campo esperados por el frontend
        return JsonResponse({
            "banco": cuenta.bco_nomb,
            "titular": cuenta.bco_titu,
            "cbu": cuenta.bco_cbu,
            "cuit": cuenta.bco_cuit,
            "cuenta": cuenta.bco_num,
            "alias": cuenta.bco_ali
        })
    
    except Exception as e:
        logger.error(f"Error en get_bank_data_endpoint: {str(e)}", exc_info=True)
        return JsonResponse({
            "error": "Error al obtener datos bancarios"
        }, status=500)


@require_http_methods(["POST"])
def marcar_pedido_pagado(request):
    """
    Marcar un pedido como pagado después de la transferencia bancaria.
    Requiere autenticación.
    """
    try:
        cliente = get_auth_user(request)
        if not cliente:
            return JsonResponse({'error': 'Se requiere autenticación'}, status=401)
        
        data = json.loads(request.body)
        ped_codi = data.get('ped_codi')
        
        if not ped_codi:
            return JsonResponse({'error': 'Se requiere ped_codi'}, status=400)
        
        try:
            pedido = Pedidos.objects.get(ped_codi=ped_codi, cli_codi=cliente)
        except Pedidos.DoesNotExist:
            return JsonResponse({'error': 'Pedido no encontrado o no pertenece al usuario'}, status=404)
        
        # Marcar como pagado
        pedido.ped_esta = 'PA'  # Pagado
        pedido.save()
        
        return JsonResponse({
            'success': True,
            'message': 'Pedido marcado como pagado',
            'ped_codi': pedido.ped_codi,
            'ped_esta': pedido.get_ped_esta_display()
        }, status=200)
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'JSON inválido'}, status=400)
    except Exception as e:
        logger.error(f"Error en marcar_pedido_pagado: {str(e)}", exc_info=True)
        return JsonResponse({'error': 'Error al marcar pedido como pagado'}, status=500)

