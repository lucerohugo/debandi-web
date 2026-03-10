from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Q
from django.conf import settings
import json
from .models import Articulo, Marca, SubRubro, Rubro, General, CuentaBancaria

# ============================================================================
# VISTAS PARA ARTICULOS (Retornan JSON)
# ============================================================================

def get_image_url(image_field, request):
    """Helper para generar URL completa de imagen"""
    if not image_field:
        return None
    image_url = image_field.url
    # Si la URL no comienza con http, agregarle el host
    if not image_url.startswith('http'):
        image_url = request.build_absolute_uri(image_url)
    return image_url


def serialize_articulo(articulo, request):
    """Helper para serializar un artículo a JSON"""
    return {
        'art_codi': articulo.art_codi,
        'art_nomb': articulo.art_nomb,
        'art_desc': articulo.art_desc,
        'art_img': get_image_url(articulo.art_img, request),
        'art_pnet': float(articulo.art_pnet),
        'art_pfin': float(articulo.art_pfin),
        'art_cost': float(articulo.art_cost) if articulo.art_cost else None,
        'art_stkp': articulo.art_stkp,
        'art_stkmin': articulo.art_stkmin,
        'art_xbul': articulo.art_xbul,
        'art_ubul': articulo.art_ubul,
        'art_tiva': articulo.art_tiva,
        'mar_codi': articulo.mar_codi.mar_codi if articulo.mar_codi else None,
        'mar_nomb': articulo.mar_codi.mar_nomb if articulo.mar_codi else 'Sin marca',
        'sub_codi': articulo.sru_codi.sru_codi if articulo.sru_codi else None,
        'sru_nomb': articulo.sru_codi.sru_nomb if articulo.sru_codi else 'Sin subrubro',
        'rub_nomb': articulo.sru_codi.rub_codi.rub_nomb if articulo.sru_codi and articulo.sru_codi.rub_codi else 'Sin rubro',
        'art_acti': articulo.art_acti,
    }

@require_http_methods(["GET"])
def articulos_list(request):
    """Obtener artículos con filtrado por marca, rubro, precio, búsqueda y stock"""
    try:
        page = int(request.GET.get('page', 1))
        limit = int(request.GET.get('limit', 30))
        search_query = request.GET.get('q', '').strip()
        
        # Parámetros de filtro
        marcas = request.GET.getlist('marcas')  # ?marcas=Bosch&marcas=DeWalt
        rubros = request.GET.getlist('rubros')  # ?rubros=Taladros&rubros=Sierras
        precio_min = request.GET.get('precio_min', None)
        precio_max = request.GET.get('precio_max', None)
        solo_stock = request.GET.get('solo_stock', 'false').lower() == 'true'
        
        # Base: solo artículos activos y visibles en web
        articulos = Articulo.objects.select_related('mar_codi', 'sru_codi', 'sru_codi__rub_codi').filter(art_acti=True, art_visw=True)
        
        # Filtro por búsqueda
        if search_query:
            articulos = articulos.filter(
                Q(art_nomb__icontains=search_query) |
                Q(art_desc__icontains=search_query) |
                Q(mar_codi__mar_nomb__icontains=search_query)
            )
        
        # Filtro por marcas
        if marcas:
            articulos = articulos.filter(mar_codi__mar_nomb__in=marcas)
        
        # Filtro por rubros (por nombre del rubro, no por subrubro)
        if rubros:
            articulos = articulos.filter(sru_codi__rub_codi__rub_nomb__in=rubros)
        
        # Filtro por rango de precio (art_pfin - precio final con IVA)
        if precio_min:
            try:
                articulos = articulos.filter(art_pfin__gte=float(precio_min))
            except ValueError:
                pass
        
        if precio_max:
            try:
                articulos = articulos.filter(art_pfin__lte=float(precio_max))
            except ValueError:
                pass
        
        # Filtro por stock
        if solo_stock:
            articulos = articulos.filter(art_stkp__gt=0)
        
        total = articulos.count()
        
        # Paginación
        start = (page - 1) * limit
        articulos_paginados = articulos[start:start + limit]
        
        products = [serialize_articulo(art, request) for art in articulos_paginados]
        
        return JsonResponse({
            'products': products,
            'total': total,
            'pages': (total + limit - 1) // limit,
            'currentPage': page,
            'count': total,
            'results': products,
        }, status=200)
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@require_http_methods(["GET"])
def articulo_detail(request, pk):
    """Obtener un artículo por ID"""
    try:
        articulo = Articulo.objects.select_related('mar_codi', 'sru_codi').get(art_codi=pk)
        product = serialize_articulo(articulo, request)
        return JsonResponse(product, status=200)
        
    except Articulo.DoesNotExist:
        return JsonResponse({'error': 'Producto no encontrado'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@require_http_methods(["GET"])
def articulos_search(request):
    """Buscar artículos por nombre, descripción o marca"""
    try:
        query = request.GET.get('q', '').strip()
        category = request.GET.get('category', '')
        page = int(request.GET.get('page', 1))
        limit = int(request.GET.get('limit', 30))
        
        # Filtrar solo artículos activos y visibles en web
        articulos = Articulo.objects.select_related('mar_codi', 'sru_codi').filter(art_acti=True, art_visw=True)
        
        # Búsqueda por texto
        if query:
            articulos = articulos.filter(
                Q(art_nomb__icontains=query) |
                Q(art_desc__icontains=query) |
                Q(mar_codi__mar_nomb__icontains=query)
            )
        
        # Filtrar por categoría/subrubro
        if category and category != 'all':
            articulos = articulos.filter(sru_codi__sru_nomb__icontains=category)
        
        total = articulos.count()
        start = (page - 1) * limit
        articulos = articulos[start:start + limit]
        
        products = [serialize_articulo(art, request) for art in articulos]
        
        return JsonResponse({
            'products': products,
            'total': total,
            'pages': (total + limit - 1) // limit,
            'currentPage': page,
            'count': total,
            'results': products,
        }, status=200)
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@require_http_methods(["GET"])
def articulos_activos(request):
    """Obtener solo artículos activos, visibles en web y con stock"""
    try:
        articulos = Articulo.objects.select_related('mar_codi', 'sru_codi').filter(
            art_acti=True,
            art_visw=True,
            art_stkp__gt=0
        )
        
        products = [serialize_articulo(art, request) for art in articulos]
        return JsonResponse({'products': products}, status=200)
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@require_http_methods(["GET"])
def articulos_tabla(request):
    """Obtener artículos en formato tabla con los campos específicos solicitados"""
    try:
        # Mismo filtro que articulos_list (solo activos y visibles en web)
        articulos = Articulo.objects.select_related('mar_codi', 'sru_codi').filter(art_acti=True, art_visw=True)
        products = [serialize_articulo(art, request) for art in articulos]
        
        return JsonResponse({'data': products}, status=200)
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@require_http_methods(["GET"])


# ============================================================================
# VISTAS PARA CONFIGURACIÓN GENERAL
# ============================================================================

@require_http_methods(["GET"])
def general_config(request):
    """Obtener configuración general de la empresa"""
    try:
        # Obtener el primer (y único) registro de General
        general = General.objects.first()
        
        if not general:
            return JsonResponse({'error': 'Configuración general no encontrada'}, status=404)
        
        config = {
            'gen_codi': general.gen_codi,
            'gen_nomb': general.gen_nomb,
            'gen_raz': general.gen_raz,
            'gen_logo': get_image_url(general.gen_logo, request),
            'gen_cuit': general.gen_cuit,
            'gen_ingb': '',
            'gen_razon': '',
            'gen_dire': general.gen_dire,
            'gen_tele': general.gen_tele,
            'gen_emai': general.gen_emai,
            'gen_colo': general.gen_colo,
        }
        
        return JsonResponse(config, status=200)
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


# ============================================================================
# VISTAS PARA CONFIGURACION DEL SISTEMA
# ============================================================================

@require_http_methods(["GET"])
def app_config(request):
    """
    Obtener configuración centralizada de la aplicación.
    Incluye paginación, validaciones, rate limiting y exportación.
    """
    config = {
        "pagination": {
            "default_limit": 30,
            "max_limit": 500,
            "items_per_page": 12,
            "max_items_per_page": 50
        },
        "password_policy": {
            "min_length": 8,
            "require_uppercase": True,
            "require_lowercase": True,
            "require_numbers": True,
            "require_special": False,
            "messages": {
                "min_length": "La contraseña debe tener al menos 8 caracteres",
                "require_uppercase": "Debe contener al menos una mayúscula",
                "require_lowercase": "Debe contener al menos una minúscula",
                "require_numbers": "Debe contener al menos un número",
                "require_special": "Debe contener al menos un carácter especial"
            }
        },
        "export_config": {
            "pdf": {
                "columns": ["N°", "Producto", "Marca", "Categoría", "Stock", "Precio Original", "Precio Final"],
                "column_widths": [8, 55, 25, 30, 15, 25, 25],
                "orientation": "landscape",
                "format": "a4",
                "margin": 15
            },
            "excel": {
                "columns": ["Código", "Producto", "Descripción", "Marca", "Categoría", "Stock", "Precio Neto", "Precio Final"],
                "column_widths": [10, 30, 40, 15, 15, 10, 15, 15]
            }
        },
        "rate_limits": {
            "login": {
                "max_attempts": 5,
                "window_ms": 900000,
                "message": "5 intentos en 15 minutos"
            },
            "register": {
                "max_attempts": 3,
                "window_ms": 3600000,
                "message": "3 intentos en 1 hora"
            },
            "api": {
                "requests": 100,
                "window_ms": 60000,
                "message": "100 requests por minuto"
            }
        },
        "validation_rules": {
            "email": {
                "required": True,
                "pattern": "email",
                "message": "Email inválido"
            },
            "search_min_length": 2,
            "max_search_results": 100
        }
    }
    return JsonResponse(config)


@require_http_methods(["POST"])
@csrf_exempt
def export_pdf_config(request):
    """
    Obtener configuración para exportación PDF personalizada.
    El cliente envía los productos y esta vista retorna la configuración formateada.
    """
    try:
        data = json.loads(request.body)
        products = data.get('products', [])
        
        # Obtener configuración base
        config = {
            "columns": ["N°", "Producto", "Marca", "Categoría", "Stock", "Precio Original", "Precio Final"],
            "column_widths": [8, 55, 25, 30, 15, 25, 25],
            "orientation": "landscape",
            "format": "a4",
            "margin": 15,
            "filename": f"listado-productos-{timezone.now().strftime('%Y%m%d-%H%M%S')}.pdf",
            "title": "DEBANDI - Listado de Productos",
            "products_count": len(products)
        }
        
        return JsonResponse(config)
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'JSON inválido'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# ============================================================================
# CONFIGURACIÓN DE EXPORTACIÓN DE PDFs
# ============================================================================

@require_http_methods(["GET"])
def export_config(request):
    """
    Retorna la configuración de exportación PDF según el tipo.
    Parámetros GET:
    - type: 'carrito', 'listado', 'pedido-{order_number}'
    """
    try:
        export_type = request.GET.get('type', 'listado')
        
        # Configuración por defecto para listado (todas las columnas)
        if export_type == 'listado':
            config = {
                'title': 'DEBANDI - Listado de Productos',
                'columns': ['Código', 'Producto', 'Marca', 'Rubro', 'Precio Neto', 'IVA', 'Precio Final'],
                'columnWidths': [14, 50, 18, 25, 20, 15, 20],
                'orientation': 'landscape',
                'format': 'a4',
                'margin': 10
            }
        # Configuración para carrito (con rubro y cantidad, sin stock)
        elif export_type == 'carrito':
            config = {
                'title': 'DEBANDI - Carrito',
                'columns': ['Código', 'Producto', 'Marca', 'Rubro', 'Precio Neto', 'IVA', 'Precio Final', 'Cantidad'],
                'columnWidths': [12, 40, 16, 22, 18, 12, 18, 12],
                'orientation': 'landscape',
                'format': 'a4',
                'margin': 10
            }
        # Configuración para pedidos (con rubro y cantidad)
        elif export_type.startswith('pedido-'):
            order_number = export_type.replace('pedido-', '')
            config = {
                'title': f'DEBANDI - Pedido {order_number}',
                'columns': ['Código', 'Producto', 'Marca', 'Rubro', 'Precio Neto', 'IVA', 'Precio Final', 'Cantidad'],
                'columnWidths': [12, 40, 16, 22, 18, 12, 18, 12],
                'orientation': 'landscape',
                'format': 'a4',
                'margin': 10
            }
        else:
            # Por defecto listado
            config = {
                'title': 'DEBANDI - Listado de Productos',
                'columns': ['Código', 'Producto', 'Marca', 'Rubro', 'Precio Neto', 'IVA', 'Precio Final'],
                'columnWidths': [14, 50, 18, 25, 20, 15, 20],
                'orientation': 'landscape',
                'format': 'a4',
                'margin': 10
            }
        
        return JsonResponse(config)
    
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# ============================================================================
# VISTAS PARA OBTENER FILTROS (MARCAS Y RUBROS)
# ============================================================================

@require_http_methods(["GET"])
def marcas_list(request):
    """Obtener todas las marcas que tienen artículos activos"""
    try:
        # Obtener todas las marcas que tienen al menos un artículo activo
        marcas = Marca.objects.filter(
            articulo__art_acti=True
        ).distinct().values('mar_codi', 'mar_nomb').order_by('mar_nomb')
        
        marcas_list = [
            {'id': marca['mar_codi'], 'name': marca['mar_nomb']}
            for marca in marcas
        ]
        
        return JsonResponse({
            'marcas': marcas_list,
            'count': len(marcas_list)
        }, status=200)
    
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@require_http_methods(["GET"])
def rubros_list(request):
    """Obtener todos los rubros que tienen artículos activos"""
    try:
        # Obtener todos los rubros que tienen al menos un artículo activo
        rubros = Rubro.objects.filter(
            subrubro__articulo__art_acti=True
        ).distinct().values('rub_codi', 'rub_nomb').order_by('rub_nomb')
        
        rubros_list = [
            {'id': rubro['rub_codi'], 'name': rubro['rub_nomb']}
            for rubro in rubros
        ]
        
        return JsonResponse({
            'rubros': rubros_list,
            'count': len(rubros_list)
        }, status=200)
    
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@require_http_methods(["GET"])
def cuentas_bancarias_list(request):
    """Obtener la primera cuenta bancaria activa para transferencias"""
    try:
        # Obtener la primera cuenta bancaria activa
        cuenta = CuentaBancaria.objects.filter(bco_acti=True).order_by('bco_codi').first()
        
        if not cuenta:
            return JsonResponse({'error': 'No hay cuentas bancarias disponibles'}, status=404)
        
        # Retornar en el formato que espera el frontend
        return JsonResponse({
            'banco': cuenta.bco_nomb,
            'titular': cuenta.bco_titu,
            'cbu': cuenta.bco_cbu,
            'cuit': cuenta.bco_cuit,
            'cuenta': cuenta.bco_num,
            'alias': cuenta.bco_ali if cuenta.bco_ali else ''
        }, status=200)
    
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)