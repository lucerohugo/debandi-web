"""
Vistas para el sistema de vendedores/supervisores
Permite a los vendedores autenticarse e "impersonar" a sus clientes asignados
"""
import json
import logging
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.hashers import check_password, make_password
from django.conf import settings
from django.db import models
from .models import Vendedor, Clientes
from jwt_auth import JWTAuthManager
from .auth_views import set_auth_cookie, clear_auth_cookie, get_auth_token_from_request

logger = logging.getLogger(__name__)


# ============================================================================
# FUNCIONES AUXILIARES
# ============================================================================

def validate_vendedor_token(request):
    """
    Validar JWT token de vendedor desde el request
    
    Returns:
        dict: {'ven_codi': id, 'ven_usua': username, 'is_vendedor': True} o None
    """
    try:
        token = get_auth_token_from_request(request)
        if not token:
            return None
        
        payload = JWTAuthManager.verificar_token(token, token_type='access')
        
        # Verificar que sea un token de vendedor
        if not payload.get('is_vendedor'):
            return None
            
        return {
            'ven_codi': payload.get('ven_codi'),
            'ven_usua': payload.get('ven_usua'),
            'ven_nomb': payload.get('ven_nomb'),
            'is_vendedor': True
        }
    except Exception:
        return None


def format_vendedor(vendedor):
    """Formatear datos del vendedor para respuesta"""
    return {
        'id': vendedor.ven_codi,
        'ven_codi': vendedor.ven_codi,
        'ven_usua': vendedor.ven_usua,
        'ven_nomb': vendedor.ven_nomb,
        'ven_emai': vendedor.ven_emai,
        'isVendedor': True,
    }


def format_cliente_for_list(cliente):
    """Formatear cliente para la lista de clientes del vendedor"""
    return {
        'cli_codi': cliente.cli_codi,
        'cli_nomb': cliente.cli_nomb,
        'cli_emai': cliente.cli_emai,
        'cli_doc': cliente.cli_doc,
        'cli_cuit': cliente.cli_cuit,
        'cli_tele': cliente.cli_tele,
        'cli_dire': cliente.cli_dire,
        'cli_bar': cliente.cli_bar,
        'localidad': cliente.loc_codi.loc_nomb if cliente.loc_codi else None,
    }


# ============================================================================
# ENDPOINTS DE AUTENTICACIÓN VENDEDOR
# ============================================================================

@csrf_exempt
@require_http_methods(["POST"])
def vendedor_login(request):
    """
    Login de vendedor - Genera JWT tokens
    
    POST /api/vendedor/login/
    {
        "username": "vendedor1",
        "password": "password123"
    }
    
    Respuesta:
    {
        "success": true,
        "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
        "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
        "vendedor": {...}
    }
    """
    try:
        data = json.loads(request.body)
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()
        
        if not username or not password:
            return JsonResponse({'error': 'Usuario y contraseña requeridos'}, status=400)
        
        # Buscar vendedor por usuario
        try:
            vendedor = Vendedor.objects.get(ven_usua=username)
        except Vendedor.DoesNotExist:
            logger.warning(f"Intento de login vendedor fallido - usuario no existe: {username}")
            return JsonResponse({'error': 'Usuario o contraseña incorrectos'}, status=401)
        
        # Verificar que esté activo
        if not vendedor.ven_actv:
            logger.warning(f"Intento de login vendedor inactivo: {username}")
            return JsonResponse({'error': 'Usuario inactivo. Contacte al administrador.'}, status=401)
        
        # Verificar contraseña
        if not vendedor.ven_pass or not check_password(password, vendedor.ven_pass):
            logger.warning(f"Contraseña incorrecta para vendedor: {username}")
            return JsonResponse({'error': 'Usuario o contraseña incorrectos'}, status=401)
        
        # Generar JWT tokens para vendedor
        access_token = JWTAuthManager.generar_token(
            data={
                'ven_codi': vendedor.ven_codi,
                'ven_usua': vendedor.ven_usua,
                'ven_nomb': vendedor.ven_nomb,
                'is_vendedor': True,
            },
            token_type='access'
        )
        
        refresh_token = JWTAuthManager.generar_token(
            data={
                'ven_codi': vendedor.ven_codi,
                'ven_usua': vendedor.ven_usua,
                'is_vendedor': True,
            },
            token_type='refresh'
        )
        
        logger.info(f"Login exitoso de vendedor: {username}")
        
        response = JsonResponse({
            'success': True,
            'access': access_token,
            'refresh': refresh_token,
            'vendedor': format_vendedor(vendedor),
        })
        
        # Guardar token en cookie httpOnly
        set_auth_cookie(response, access_token)
        
        return response
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'JSON inválido'}, status=400)
    except Exception as e:
        logger.error(f"Error en login vendedor: {str(e)}")
        return JsonResponse({'error': 'Error interno del servidor'}, status=500)


@csrf_exempt
@require_http_methods(["GET"])
def vendedor_me(request):
    """
    Obtener datos del vendedor autenticado
    
    GET /api/vendedor/me/
    Headers: Authorization: Bearer <token>
    
    Respuesta:
    {
        "success": true,
        "vendedor": {...}
    }
    """
    try:
        vendedor_data = validate_vendedor_token(request)
        
        if not vendedor_data:
            return JsonResponse({'error': 'No autenticado como vendedor'}, status=401)
        
        vendedor = Vendedor.objects.get(ven_codi=vendedor_data['ven_codi'])
        
        return JsonResponse({
            'success': True,
            'vendedor': format_vendedor(vendedor),
        })
        
    except Vendedor.DoesNotExist:
        return JsonResponse({'error': 'Vendedor no encontrado'}, status=404)
    except Exception as e:
        logger.error(f"Error en vendedor_me: {str(e)}")
        return JsonResponse({'error': 'Error interno del servidor'}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def vendedor_logout(request):
    """
    Cerrar sesión de vendedor
    
    POST /api/vendedor/logout/
    """
    response = JsonResponse({'success': True, 'message': 'Sesión cerrada'})
    clear_auth_cookie(response)
    return response


# ============================================================================
# LISTADO DE CLIENTES DEL VENDEDOR
# ============================================================================

@csrf_exempt
@require_http_methods(["GET"])
def vendedor_clientes(request):
    """
    Listar clientes asignados al vendedor autenticado
    
    GET /api/vendedor/clientes/
    Query params: ?search=texto&page=1&limit=20
    
    Respuesta:
    {
        "success": true,
        "clientes": [...],
        "total": 100,
        "page": 1,
        "limit": 20
    }
    """
    try:
        vendedor_data = validate_vendedor_token(request)
        
        if not vendedor_data:
            return JsonResponse({'error': 'No autenticado como vendedor'}, status=401)
        
        ven_codi = vendedor_data['ven_codi']
        
        # Obtener parámetros de búsqueda y paginación
        search = request.GET.get('search', '').strip()
        page = int(request.GET.get('page', 1))
        limit = int(request.GET.get('limit', 20))
        
        # Filtrar clientes del vendedor (usar ven_codi_id para FK)
        clientes_qs = Clientes.objects.filter(ven_codi_id=ven_codi).select_related('loc_codi')
        
        # Aplicar búsqueda si hay término
        if search:
            clientes_qs = clientes_qs.filter(
                models.Q(cli_nomb__icontains=search) |
                models.Q(cli_doc__icontains=search) |
                models.Q(cli_emai__icontains=search) |
                models.Q(cli_cuit__icontains=search)
            )
        
        # Ordenar por nombre
        clientes_qs = clientes_qs.order_by('cli_nomb')
        
        # Total antes de paginar
        total = clientes_qs.count()
        
        # Paginar
        offset = (page - 1) * limit
        clientes = clientes_qs[offset:offset + limit]
        
        return JsonResponse({
            'success': True,
            'clientes': [format_cliente_for_list(c) for c in clientes],
            'total': total,
            'page': page,
            'limit': limit,
            'vendedor': {
                'ven_codi': vendedor_data['ven_codi'],
                'ven_nomb': vendedor_data.get('ven_nomb'),
            }
        })
        
    except Exception as e:
        logger.error(f"Error en vendedor_clientes: {str(e)}")
        return JsonResponse({'error': 'Error interno del servidor'}, status=500)


# ============================================================================
# IMPERSONACIÓN DE CLIENTE
# ============================================================================

@csrf_exempt
@require_http_methods(["POST"])
def vendedor_impersonate(request):
    """
    Impersonar a un cliente - genera JWT de cliente con flag de supervisión
    
    POST /api/vendedor/impersonate/
    {
        "cli_codi": 123
    }
    
    Respuesta:
    {
        "success": true,
        "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
        "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
        "user": {...},
        "impersonation": {
            "isImpersonating": true,
            "vendedor": {...}
        }
    }
    """
    try:
        vendedor_data = validate_vendedor_token(request)
        
        if not vendedor_data:
            return JsonResponse({'error': 'No autenticado como vendedor'}, status=401)
        
        data = json.loads(request.body)
        cli_codi = data.get('cli_codi')
        
        if not cli_codi:
            return JsonResponse({'error': 'cli_codi requerido'}, status=400)
        
        ven_codi = vendedor_data['ven_codi']
        
        # Verificar que el cliente pertenece al vendedor
        try:
            cliente = Clientes.objects.select_related('loc_codi').get(
                cli_codi=cli_codi,
                ven_codi_id=ven_codi
            )
        except Clientes.DoesNotExist:
            logger.warning(f"Vendedor {ven_codi} intentó impersonar cliente {cli_codi} no asignado")
            return JsonResponse({'error': 'Cliente no encontrado o no asignado a este vendedor'}, status=403)
        
        # Obtener datos del vendedor
        vendedor = Vendedor.objects.get(ven_codi=ven_codi)
        
        # Generar JWT de cliente con datos de impersonación
        # El token contiene cli_codi para que funcione con todos los endpoints existentes
        access_token = JWTAuthManager.generar_token(
            data={
                'cli_codi': cliente.cli_codi,
                'email': cliente.cli_emai,
                # Datos de impersonación
                'is_impersonating': True,
                'impersonator_ven_codi': vendedor.ven_codi,
                'impersonator_ven_nomb': vendedor.ven_nomb,
            },
            token_type='access'
        )
        
        refresh_token = JWTAuthManager.generar_token(
            data={
                'cli_codi': cliente.cli_codi,
                'email': cliente.cli_emai,
                'is_impersonating': True,
                'impersonator_ven_codi': vendedor.ven_codi,
            },
            token_type='refresh'
        )
        
        # Dividir nombre en nombre y apellido
        nombre_partes = cliente.cli_nomb.split() if cliente.cli_nomb else []
        firstName = nombre_partes[0] if nombre_partes else ""
        lastName = " ".join(nombre_partes[1:]) if len(nombre_partes) > 1 else ""
        
        logger.info(f"Vendedor {vendedor.ven_usua} impersonando cliente {cliente.cli_codi} ({cliente.cli_nomb})")
        
        response = JsonResponse({
            'success': True,
            'access': access_token,
            'refresh': refresh_token,
            'user': {
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
            },
            'impersonation': {
                'isImpersonating': True,
                'vendedor': {
                    'ven_codi': vendedor.ven_codi,
                    'ven_nomb': vendedor.ven_nomb,
                    'ven_usua': vendedor.ven_usua,
                }
            }
        })
        
        # Guardar token en cookie
        set_auth_cookie(response, access_token)
        
        return response
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'JSON inválido'}, status=400)
    except Exception as e:
        logger.error(f"Error en vendedor_impersonate: {str(e)}")
        return JsonResponse({'error': 'Error interno del servidor'}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def vendedor_stop_impersonation(request):
    """
    Detener impersonación y volver a la sesión de vendedor
    
    POST /api/vendedor/stop-impersonation/
    
    Respuesta:
    {
        "success": true,
        "access": "...",
        "vendedor": {...}
    }
    """
    try:
        # Obtener el token actual para extraer el vendedor
        token = get_auth_token_from_request(request)
        if not token:
            return JsonResponse({'error': 'No autenticado'}, status=401)
        
        try:
            payload = JWTAuthManager.verificar_token(token, token_type='access')
        except Exception:
            return JsonResponse({'error': 'Token inválido'}, status=401)
        
        # Verificar que era una sesión de impersonación
        if not payload.get('is_impersonating'):
            return JsonResponse({'error': 'No hay impersonación activa'}, status=400)
        
        ven_codi = payload.get('impersonator_ven_codi')
        
        if not ven_codi:
            return JsonResponse({'error': 'Datos de vendedor no encontrados'}, status=400)
        
        # Obtener vendedor
        try:
            vendedor = Vendedor.objects.get(ven_codi=ven_codi)
        except Vendedor.DoesNotExist:
            return JsonResponse({'error': 'Vendedor no encontrado'}, status=404)
        
        # Regenerar token de vendedor
        access_token = JWTAuthManager.generar_token(
            data={
                'ven_codi': vendedor.ven_codi,
                'ven_usua': vendedor.ven_usua,
                'ven_nomb': vendedor.ven_nomb,
                'is_vendedor': True,
            },
            token_type='access'
        )
        
        refresh_token = JWTAuthManager.generar_token(
            data={
                'ven_codi': vendedor.ven_codi,
                'ven_usua': vendedor.ven_usua,
                'is_vendedor': True,
            },
            token_type='refresh'
        )
        
        logger.info(f"Vendedor {vendedor.ven_usua} detuvo impersonación")
        
        response = JsonResponse({
            'success': True,
            'access': access_token,
            'refresh': refresh_token,
            'vendedor': format_vendedor(vendedor),
        })
        
        set_auth_cookie(response, access_token)
        
        return response
        
    except Exception as e:
        logger.error(f"Error en stop_impersonation: {str(e)}")
        return JsonResponse({'error': 'Error interno del servidor'}, status=500)


# ============================================================================
# VERIFICAR ESTADO DE IMPERSONACIÓN
# ============================================================================

@csrf_exempt
@require_http_methods(["GET"])
def check_impersonation(request):
    """
    Verificar si la sesión actual es impersonación
    
    GET /api/vendedor/check-impersonation/
    
    Respuesta:
    {
        "isImpersonating": true/false,
        "vendedor": {...} // solo si está impersonando
    }
    """
    try:
        token = get_auth_token_from_request(request)
        if not token:
            return JsonResponse({'isImpersonating': False})
        
        try:
            payload = JWTAuthManager.verificar_token(token, token_type='access')
        except Exception:
            return JsonResponse({'isImpersonating': False})
        
        is_impersonating = payload.get('is_impersonating', False)
        
        if is_impersonating:
            return JsonResponse({
                'isImpersonating': True,
                'vendedor': {
                    'ven_codi': payload.get('impersonator_ven_codi'),
                    'ven_nomb': payload.get('impersonator_ven_nomb'),
                }
            })
        
        return JsonResponse({'isImpersonating': False})
        
    except Exception as e:
        logger.error(f"Error en check_impersonation: {str(e)}")
        return JsonResponse({'isImpersonating': False})

# ============================================================================
# RESET DE CONTRASEÑA VENDEDOR (TEMPORAL - ELIMINAR EN PRODUCCIÓN)
# ============================================================================

@csrf_exempt
@require_http_methods(["POST"])
def vendedor_reset_password(request):
    """
    Resetear contraseña de vendedor (ENDPOINT TEMPORAL)
    
    POST /api/vendedor/reset-password/
    {
        "username": "vendedor1",
        "new_password": "nuevapass123"
    }
    """
    try:
        data = json.loads(request.body)
        username = data.get('username', '').strip()
        new_password = data.get('new_password', '').strip()
        
        if not username or not new_password:
            return JsonResponse({'error': 'username y new_password requeridos'}, status=400)
        
        try:
            vendedor = Vendedor.objects.get(ven_usua=username)
        except Vendedor.DoesNotExist:
            return JsonResponse({'error': 'Vendedor no encontrado'}, status=404)
        
        # Hashear y guardar nueva contraseña
        vendedor.ven_pass = make_password(new_password)
        vendedor.save()
        
        logger.info(f"Contraseña reseteada para vendedor: {username}")
        
        return JsonResponse({
            'success': True,
            'message': f'Contraseña de {username} actualizada correctamente'
        })
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'JSON inválido'}, status=400)
    except Exception as e:
        logger.error(f"Error en reset_password: {str(e)}")
        return JsonResponse({'error': 'Error interno del servidor'}, status=500)