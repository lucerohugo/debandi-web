from rest_framework import viewsets, filters, status
from rest_framework.decorators import action, api_view, permission_classes, authentication_classes
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from django.db.models import Q, Min, Max
from datetime import datetime
from django.http import FileResponse, JsonResponse
from django.core.mail import send_mail
from django.conf import settings
from .services.excel_service import ExcelService
from .services.pdf_service import PDFService
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
import json
import logging
import threading

logger = logging.getLogger(__name__)

from .models import (
    Provincia, Localidad, Zona, Marca, Rubro, SubRubro, Articulo,
    Clientes, Favoritos, CarritoItem, Pedidos, DetallePedido,
    CuentaBancaria, General, Usuario, Vendedor, Registro, Novedades
)
from .serializers import (
    ProvinciaSerializer, LocalidadSerializer, LocalidadFrontendSerializer, ZonaSerializer,
    MarcaSerializer, RubroSerializer, SubrubroSerializer, ArticuloSerializer, ArticuloFrontendSerializer, NovedadesSerializer,
    ClientesSerializer, VendedorSerializer, FavoritosSerializer, CarritoItemSerializer,
    PedidosSerializer, PedidosCompletoSerializer, PedidosCreateUpdateSerializer, 
    DetallePedidoSerializer, DetallePedidoWriteSerializer,
    CuentaBancariaSerializer, GeneralSerializer, UsuarioSerializer, RegistroSerializer
)
from .filters import ArticuloFilterSet, SubrubroFilterSet


# ================================================================
# PAGINACIÓN
# ================================================================

class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100  # Reducido de 5000 para evitar cargas masivas accidentales


# ================================================================
# BASE VIEWSET
# ================================================================

class BaseViewSet(viewsets.ModelViewSet):
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    pagination_class = StandardPagination


# ================================================================
# 🔥 MIXIN BULK CREATE (FIX FK)
# ================================================================

class BulkCreateMixin:
    lookup_field_name = None

    def create(self, request, *args, **kwargs):
        data = request.data

        if not isinstance(data, list):
            data = [data]

        resultados = []

        for item in data:
            try:
                if not item.get(self.lookup_field_name):
                    resultados.append({
                        "error": f"Falta campo {self.lookup_field_name}",
                        "data": item
                    })
                    continue

                model = self.queryset.model
                data_item = item.copy()

                # 🔥 FIX CLAVE: convertir FK a *_id
                for field in model._meta.fields:
                    if field.is_relation and field.many_to_one:
                        fk_name = field.name  # ej: pci_codi
                        if fk_name in data_item:
                            data_item[f"{fk_name}_id"] = data_item.pop(fk_name)

                obj, created = model.objects.update_or_create(
                    **{self.lookup_field_name: data_item[self.lookup_field_name]},
                    defaults={k: v for k, v in data_item.items() if v is not None}
                )

                resultados.append({
                    "id": getattr(obj, self.lookup_field_name),
                    "created": created
                })

            except Exception as e:
                resultados.append({
                    "error": str(e),
                    "data": item
                })

        return Response(resultados, status=status.HTTP_200_OK)


# ================================================================
# UBICACIONES
# ================================================================

class ProvinciaViewSet(BulkCreateMixin, BaseViewSet):
    queryset = Provincia.objects.all()
    serializer_class = ProvinciaSerializer
    lookup_field_name = "pci_codi"


class LocalidadViewSet(BulkCreateMixin, BaseViewSet):
    queryset = Localidad.objects.all()
    pagination_class = None
    serializer_class = LocalidadSerializer
    lookup_field_name = "loc_codi"

    @action(detail=False, methods=['get'])
    def frontend(self, request):
        """GET /localidades/frontend/ - Retorna con camelCase"""
        serializer = LocalidadFrontendSerializer(self.get_queryset(), many=True)
        return Response(serializer.data)


class ZonaViewSet(BulkCreateMixin, BaseViewSet):
    queryset = Zona.objects.all()
    serializer_class = ZonaSerializer
    lookup_field_name = "zon_codi"


# ================================================================
# CATÁLOGO
# ================================================================

class MarcaViewSet(BulkCreateMixin, BaseViewSet):
    queryset = Marca.objects.all()
    serializer_class = MarcaSerializer
    lookup_field_name = "mar_codi"
    search_fields = ['mar_nomb']
    ordering = ['mar_nomb']
    permission_classes = [AllowAny]  # ✅ Público: marcas visibles sin API Key
    authentication_classes = []
    


class RubroViewSet(BulkCreateMixin, BaseViewSet):
    queryset = Rubro.objects.all()
    serializer_class = RubroSerializer
    lookup_field_name = "rub_codi"
    search_fields = ['rub_nomb']
    ordering = ['rub_nomb']
    permission_classes = [AllowAny]  # ✅ Público: rubros visibles sin API Key
    authentication_classes = []


class SubrubroViewSet(BulkCreateMixin, BaseViewSet):
    queryset = SubRubro.objects.all()
    serializer_class = SubrubroSerializer
    lookup_field_name = "sru_codi"
    filterset_class = SubrubroFilterSet  # ✅ Usar FilterSet personalizado
    search_fields = ['sru_nomb', 'rub_codi__rub_nomb']
    ordering = ['rub_codi', 'sru_nomb']
    authentication_classes = []

    @action(detail=False, methods=['get'])
    def por_rubro(self, request):
        """GET /subrubros/por_rubro/?rub_codi=1 - Retorna subrubros de un rubro"""
        rub_codi = request.query_params.get('rub_codi')
        if not rub_codi:
            return Response([], status=status.HTTP_200_OK)
        
        try:
            rub_codi = int(rub_codi)
        except (ValueError, TypeError):
            return Response([], status=status.HTTP_200_OK)
        
        subrubros = SubRubro.objects.filter(rub_codi_id=rub_codi)
        serializer = self.get_serializer(subrubros, many=True)
        return Response(serializer.data)


class ArticuloViewSet(BulkCreateMixin, BaseViewSet):
    queryset = Articulo.objects.all()
    serializer_class = ArticuloSerializer
    permission_classes = [AllowAny]  # ✅ Público: productos visibles sin API Key
    lookup_field_name = "art_codi"
    filterset_class = ArticuloFilterSet  # ✅ Usar FilterSet personalizado
    search_fields = ['art_nomb', 'art_codi', 'art_palac', 'mar_codi__mar_nomb']
    ordering_fields = ['art_nomb', 'art_pnet', 'art_fchc']
    ordering = ['art_nomb']
    authentication_classes = []

    @action(detail=False, methods=['get'])
    def carrusel(self, request):
        """GET /articulos/carrusel/ - Solo artículos marcados para carrusel (art_carru=True)"""
        queryset = self.get_queryset().filter(art_carru=True)
        serializer = self.get_serializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def frontend(self, request):
        """GET /articulos/frontend/ - Retorna con camelCase"""
        queryset = self.filter_queryset(self.get_queryset())
        serializer = ArticuloFrontendSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def activos(self, request):
        """GET /articulos/activos/ - Solo artículos activos y visibles"""
        queryset = self.get_queryset().filter(art_acti=True, art_visw=True)
        serializer = self.get_serializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def precios(self, request):
        """GET /articulos/precios/ - Retorna min y max de precios globales del catálogo"""
        queryset = self.get_queryset()
        precios = queryset.aggregate(
            min_price=Min('art_pfin'),
            max_price=Max('art_pfin')
        )
        return Response({
            'min_price': float(precios['min_price'] or 0),
            'max_price': float(precios['max_price'] or 0)
        })

    @action(detail=False, methods=['get'], url_path='exportar-excel', permission_classes=[AllowAny])
    def exportar_excel(self, request):
        """GET /articulos/exportar-excel/ - Exporta todos los artículos a Excel"""
        try:
            excel_file = ExcelService.generar_excel()
            
            # Crear respuesta con descarga
            response = FileResponse(
                excel_file,
                as_attachment=True,
                filename=f"articulos_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx",
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            return response
        except Exception as e:
            return Response(
                {'error': f'Error al generar Excel: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='exportar-pdf', permission_classes=[AllowAny])
    def exportar_pdf(self, request):
        """GET /articulos/exportar-pdf/ - Exporta todos los artículos a PDF"""
        try:
            pdf_file = PDFService.generar_pdf()
            
            # Crear respuesta con descarga
            response = FileResponse(
                pdf_file,
                as_attachment=True,
                filename=f"articulos_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf",
                content_type='application/pdf'
            )
            return response
        except Exception as e:
            return Response(
                {'error': f'Error al generar PDF: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ================================================================
# NOVEDADES
# ================================================================

class NovedadesViewSet(BaseViewSet):
    """
    ViewSet para gestionar novedades y secciones especiales.
    - GET /novedades/ - Listar todas las novedades
    - POST /novedades/ - Crear nueva novedad
    - GET /novedades/{id}/ - Obtener una novedad específica
    - PUT /novedades/{id}/ - Actualizar una novedad
    - DELETE /novedades/{id}/ - Eliminar una novedad
    - GET /novedades/publicadas/ - Listar novedades activas (para frontend)
    """
    serializer_class = NovedadesSerializer
    permission_classes = [AllowAny]
    search_fields = ['nov_nomb', 'nov_codi']
    ordering_fields = ['nov_codi', 'nov_nomb', 'nov_fechi']
    filterset_fields = ['nov_bann', 'nov_prodr', 'nov_cate', 'nov_acti']
    
    def get_queryset(self):
        """Override queryset para filtrar por estado"""
        # Obtener todas para admin
        return Novedades.objects.all().order_by('-nov_fechi')
    
    @action(detail=False, methods=['get'], permission_classes=[AllowAny], url_path='publicadas')
    def publicadas(self, request):
        """Retorna solo las novedades ACTIVAS (nov_acti=True, nov_bann=False) sin banners"""
        novedades = Novedades.objects.filter(nov_acti=True, nov_bann=False).order_by('-nov_fechi')
        serializer = self.get_serializer(novedades, many=True)
        return Response(serializer.data)
    
    def create(self, request, *args, **kwargs):
        """Override create para devolver serializer correcto con nov_img_url"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    def update(self, request, *args, **kwargs):
        """Override update para devolver serializer correcto con nov_img_url"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)


# ================================================================
# PERSONAS
# ================================================================

class RegistroViewSet(BulkCreateMixin, BaseViewSet):
    """
    ViewSet para gestionar registros de nuevos clientes.
    - GET /registros/ - Listar todos los registros
    - POST /registros/ - Crear nuevo registro
    - GET /registros/{id}/ - Obtener un registro
    - PATCH /registros/{id}/ - Actualizar registro (incluido cambiar reg_clie)
    - DELETE /registros/{id}/ - Eliminar registro
    
    Nota: Registro y Clientes son tablas separadas sin relación automática.
    """
    queryset = Registro.objects.all()
    serializer_class = RegistroSerializer
    lookup_field_name = "reg_codi"
    filterset_fields = ['reg_clie']
    search_fields = ['reg_nomb', 'reg_doc', 'reg_cuit', 'reg_emai', 'reg_celu']
    ordering = ['reg_codi'] #['-reg_fchc']
    permission_classes = [AllowAny]  # ✅ Público: cualquiera puede registrarse
    authentication_classes = []

    def create(self, request, *args, **kwargs):
        """POST /registros/ - Crear nuevo registro"""
        data = request.data.copy() if hasattr(request, 'data') else request.POST.copy()
        
        # Validar campos requeridos
        required_fields = ['reg_nomb', 'reg_doc', 'reg_civa', 'reg_cuit', 'reg_emai', 'reg_celu', 'reg_clav']
        for field in required_fields:
            if not data.get(field):
                return Response(
                    {'error': f'{field} es requerido'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Verificar email único en Registros
        if Registro.objects.filter(reg_emai=data.get('reg_emai')).exists():
            return Response(
                {'error': 'El email ya está registrado en el sistema'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verificar que el email no exista en Clientes (evitar duplicados)
        if Clientes.objects.filter(cli_emai=data.get('reg_emai')).exists():
            return Response(
                {'error': 'El email ya existe como cliente en el sistema'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        
        # Crear y guardar registro (serializer.create() ya hashea la contraseña)
        registro = serializer.save()
        
        # Re-serializar para obtener los datos exactos guardados
        response_serializer = self.get_serializer(registro)
        
        # ================================================================
        # ENVIAR NOTIFICACIÓN POR EMAIL (en thread separado)
        # ================================================================
        
        def send_registration_email():
            """Enviar email de notificación de registro en background"""
            try:
                # Construir el cuerpo del email
                fecha_registro = registro.reg_fchc.strftime('%d/%m/%Y %H:%M') if registro.reg_fchc else 'N/A'
                
                email_body = f"""
Nuevo registro web pendiente de aprobación

ID Registro: {registro.reg_codi}

Nombre: {registro.reg_nomb}

Documento: {registro.reg_doc}
CUIT: {registro.reg_cuit}
Email: {registro.reg_emai}
Teléfono: {registro.reg_celu}
Fecha de Registro: {fecha_registro}

Este registro está pendiente de aprobación.
Revisa en el sistema para procesar esta solicitud.

Saludos,
Sistema Ferreterería Debandi
                """
                
                # Enviar el correo con fail_silently=True para no lanzar excepciones
                send_mail(
                    subject='Nuevo registro web pendiente de aprobación',
                    message=email_body,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=['soporte@ferreteradebandi.online'],
                    fail_silently=True,  # No lanza excepciones si falla
                )
                
                logger.info(f"✓ Email de notificación enviado para registro {registro.reg_codi}")
            
            except Exception as e:
                # Capturar cualquier error no previsto
                logger.error(
                    f"✗ Error enviando email para registro {registro.reg_codi}: {str(e)}",
                    exc_info=True
                )
        
        # Iniciar thread para enviar email sin bloquear respuesta
        email_thread = threading.Thread(target=send_registration_email, daemon=True)
        email_thread.start()
        
        # Responder inmediatamente con HTTP 201 (registro ya guardado)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        """
        PUT /registros/{id}/ - Actualizar registro completo
        Detecta cuando reg_clie cambia de False a True y crea automáticamente un Cliente
        """
        return self._handle_registro_update(
            request,
            partial=False,
            *args,
            **kwargs
        )

    def partial_update(self, request, *args, **kwargs):
        """
        PATCH /registros/{id}/ - Actualizar registro parcialmente
        Detecta cuando reg_clie cambia de False a True y crea automáticamente un Cliente
        """
        return self._handle_registro_update(
            request,
            partial=True,
            *args,
            **kwargs
        )

    def _handle_registro_update(self, request, partial, *args, **kwargs):
        """
        Lógica compartida para update y partial_update
        Maneja la aprobación de registros y creación automática de Clientes
        """
        # Obtener el registro actual antes de actualizar
        registro_anterior = self.get_object()
        reg_clie_anterior = registro_anterior.reg_clie
        
        # Proceder con la actualización normal
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Refresco desde BD para obtener valores actuales
        instance.refresh_from_db()
        reg_clie_actual = instance.reg_clie
        
        # ================================================================
        # DETECTAR TRANSICIÓN False -> True EN reg_clie
        # ================================================================
        
        # Solo procesar si el cambio es específicamente False -> True
        if reg_clie_anterior is False and reg_clie_actual is True:
            logger.info(f"Registro {instance.reg_codi} aprobado. Procesando creación de Cliente...")
            
            # ================================================================
            # 1. OBTENER LOCALIDAD POR DEFECTO
            # ================================================================
            
            try:
                default_localidad = Localidad.objects.first()
                if not default_localidad:
                    logger.error(
                        f"No hay localidades configuradas. No se puede crear Cliente para registro {instance.reg_codi}"
                    )
                    # No romper la actualización, solo registrar error
                    return Response(serializer.data, status=status.HTTP_200_OK)
            except Exception as e:
                logger.error(
                    f"Error al obtener localidad por defecto para registro {instance.reg_codi}: {str(e)}",
                    exc_info=True
                )
                return Response(serializer.data, status=status.HTTP_200_OK)
            
            # ================================================================
            # 2. VERIFICAR QUE NO EXISTA CLIENTE CON EL MISMO EMAIL
            # ================================================================
            
            if Clientes.objects.filter(cli_emai=instance.reg_emai).exists():
                existing_cliente = Clientes.objects.filter(cli_emai=instance.reg_emai).first()
                logger.warning(
                    f"⚠️ No se puede crear Cliente duplicado: "
                    f"Email {instance.reg_emai} ya existe en Cliente {existing_cliente.cli_codi} ({existing_cliente.cli_nomb}). "
                    f"Registro {instance.reg_codi} aprobado pero sin crear duplicado."
                )
                # No crear duplicado, pero no romper la actualización
                return Response(
                    {
                        **serializer.data, 
                        'warning': f'Email ya existe en Cliente {existing_cliente.cli_codi}. No se creó duplicado.'
                    }, 
                    status=status.HTTP_200_OK
                )
            
            # ================================================================
            # 3. GENERAR cli_codi AUTOMÁTICAMENTE
            # ================================================================
            
            try:
                last_cliente = Clientes.objects.all().order_by('-cli_codi').first()
                next_cli_codi = (last_cliente.cli_codi + 1) if last_cliente else 1
            except Exception as e:
                logger.error(
                    f"Error al generar cli_codi para registro {instance.reg_codi}: {str(e)}",
                    exc_info=True
                )
                return Response(serializer.data, status=status.HTTP_200_OK)
            
            # ================================================================
            # 4. CREAR CLIENTE AUTOMÁTICAMENTE
            # ================================================================
            
            try:
                cliente = Clientes.objects.create(
                    cli_codi=next_cli_codi,
                    cli_nomb=instance.reg_nomb,
                    cli_ndoc=instance.reg_doc,
                    cli_cuit=instance.reg_cuit,
                    cli_emai=instance.reg_emai,
                    cli_celu=instance.reg_celu,
                    cli_clav=instance.reg_clav,  # Copiar hash directamente, NO re-hashear
                    loc_codi=default_localidad,
                    cli_acti=False  # Crear inactivo, se activa cuando admin cambia cli_acti a True
                )
                
                logger.info(
                    f"Cliente {cliente.cli_codi} creado automáticamente para registro {instance.reg_codi}"
                )
                
            except Exception as e:
                logger.error(
                    f"Error al crear Cliente para registro {instance.reg_codi}: {str(e)}",
                    exc_info=True
                )
                # No romper la actualización si falla la creación
                return Response(serializer.data, status=status.HTTP_200_OK)
            
            # ================================================================
            # 5. ENVIAR CORREO DE APROBACIÓN (pendiente activación)
            # ================================================================
            
            try:
                email_body = f"""
Hola {instance.reg_nomb},

Le informamos que su solicitud de registro ha sido aprobada.

Su cuenta será activada pronto por nuestro equipo. Una vez que sea activada, recibirá un correo de confirmación.

Email:
{instance.reg_emai}

Si tiene inconvenientes, comuníquese con nuestro equipo.

Saludos cordiales,
Ferretería Debandi
                """
                
                send_mail(
                    subject='Solicitud de registro aprobada',
                    message=email_body,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[instance.reg_emai],
                    fail_silently=False,
                )
                
                logger.info(
                    f"Correo de aprobación enviado a {instance.reg_emai} (Registro {instance.reg_codi})"
                )
            
            except Exception as e:
                # NO romper si falla el correo
                logger.error(
                    f"Error al enviar correo de bienvenida a {instance.reg_emai} "
                    f"(Registro {instance.reg_codi}): {str(e)}",
                    exc_info=True
                )
            
            # ================================================================
            # 6. ELIMINAR REGISTRO APROBADO
            # ================================================================
            
            try:
                instance.delete()
                logger.info(
                    f"Registro {instance.reg_codi} eliminado (cliente {cliente.cli_codi} creado exitosamente)"
                )
            except Exception as e:
                logger.error(
                    f"Error al eliminar registro {instance.reg_codi} después de aprobar: {str(e)}",
                    exc_info=True
                )
        
        return Response(serializer.data, status=status.HTTP_200_OK)


class ClientesViewSet(BulkCreateMixin, BaseViewSet):
    """Clientes compradores"""
    queryset = Clientes.objects.all()
    serializer_class = ClientesSerializer
    lookup_field_name = "cli_codi"
    filterset_fields = ['loc_codi', 'ven_codi']
    search_fields = ['cli_nomb', 'cli_ndoc', 'cli_emai']
    ordering = ['cli_nomb']
    permission_classes = [AllowAny]
    authentication_classes = []

    def get_queryset(self):
        """
        Filtrar clientes por vendedor si es un vendedor logueado
        """
        queryset = super().get_queryset()
        
        # Si hay un parámetro ven_codi (vendedor), filtrar por ese vendedor
        ven_codi = self.request.query_params.get('ven_codi')
        if ven_codi:
            try:
                queryset = queryset.filter(ven_codi_id=int(ven_codi))
            except (ValueError, TypeError):
                pass
        
        return queryset

    # El envío del correo de activación (transición cli_acti False -> True)
    # se maneja centralizado en signals.py, disparado por Model.save() sin
    # importar el origen (API, admin de Django, shell, scripts).


class VendedorViewSet(BulkCreateMixin, BaseViewSet):
    queryset = Vendedor.objects.all()
    serializer_class = VendedorSerializer
    lookup_field_name = "ven_codi"
    filterset_fields = ['ven_actv', 'loc_codi']
    search_fields = ['ven_nomb', 'ven_doc', 'ven_emai']
    ordering = ['ven_nomb']


# ================================================================
# FAVORITOS Y CARRITO
# ================================================================

class FavoritosViewSet(BaseViewSet):
    queryset = Favoritos.objects.all()
    serializer_class = FavoritosSerializer
    filterset_fields = ['cli_codi']
    ordering = ['-fav_fecha']
    permission_classes = [AllowAny]  # ✅ permissions.py maneja la autenticación
    authentication_classes = []

    def get_queryset(self):
        """
        Filtrar favoritos por cliente
        Si se proporciona cli_codi en query params, usarlo
        Si no, retornar todos (para admin)
        """
        queryset = Favoritos.objects.all()
        cli_codi = self.request.query_params.get('cli_codi')
        
        if cli_codi:
            try:
                cli_codi = int(cli_codi)
                queryset = queryset.filter(cli_codi_id=cli_codi)
            except (ValueError, TypeError):
                pass
        
        return queryset.order_by('-fav_fecha')

    def create(self, request, *args, **kwargs):
        """
        POST /favoritos/ - Crear favorito para un cliente específico
        Requiere art_codi y cli_codi en el request
        """
        data = request.data.copy() if hasattr(request, 'data') else request.POST.copy()
        
        # Validar que se proporcione art_codi
        if 'art_codi' not in data or not data.get('art_codi'):
            return Response(
                {'error': 'art_codi es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Si no hay cli_codi, usar el primer cliente disponible (solo para compatibilidad)
        if 'cli_codi' not in data or not data.get('cli_codi'):
            cliente = Clientes.objects.first()
            if not cliente:
                return Response(
                    {'error': 'No hay clientes disponibles. Debe proporcionar cli_codi'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            data['cli_codi'] = cliente.cli_codi
        
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=False, methods=['get'])
    def cliente(self, request):
        """GET /favoritos/cliente/?cli_codi=1 - Favoritos de un cliente específico"""
        cli_codi = request.query_params.get('cli_codi')
        if not cli_codi:
            return Response([], status=status.HTTP_200_OK)
        
        try:
            cli_codi = int(cli_codi)
            favoritos = Favoritos.objects.filter(cli_codi_id=cli_codi).order_by('-fav_fecha')
            serializer = self.get_serializer(favoritos, many=True, context={'request': request})
            return Response(serializer.data)
        except (ValueError, TypeError):
            return Response([], status=status.HTTP_200_OK)


class CarritoItemViewSet(BaseViewSet):
    queryset = CarritoItem.objects.all()
    serializer_class = CarritoItemSerializer
    filterset_fields = ['cli_codi']
    ordering = ['-carr_fmod']
    permission_classes = [AllowAny]  # ✅ permissions.py maneja la autenticación
    authentication_classes = []

    @action(detail=False, methods=['get'])
    def cliente(self, request):
        """GET /carrito/cliente/?cli_codi=1 - Carrito de un cliente"""
        cli_codi = request.query_params.get('cli_codi')
        if not cli_codi:
            return Response([], status=status.HTTP_200_OK)
        
        try:
            cli_codi = int(cli_codi)
        except (ValueError, TypeError):
            return Response([], status=status.HTTP_200_OK)
        
        carrito = CarritoItem.objects.filter(cli_codi_id=cli_codi)
        serializer = self.get_serializer(carrito, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def total(self, request):
        """GET /carrito/total/?cli_codi=1 - Calcular total exacto del carrito"""
        from decimal import Decimal
        
        cli_codi = request.query_params.get('cli_codi')
        if not cli_codi:
            return Response({'total': '0.00'}, status=status.HTTP_200_OK)
        
        try:
            cli_codi = int(cli_codi)
            carrito = CarritoItem.objects.filter(cli_codi_id=cli_codi)
            
            # ✅ Usar Decimal para precisión (como en el backend)
            total = Decimal('0.00')
            for item in carrito:
                cantidad = Decimal(str(item.carr_cant))
                precio = Decimal(str(item.carr_pfin)) if item.carr_pfin else Decimal('0.00')
                total += cantidad * precio
            
            return Response({'total': str(total)}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=400)


# ================================================================
# PEDIDOS
# ================================================================

class DetallePedidoViewSet(BaseViewSet):
    queryset = DetallePedido.objects.all()
    serializer_class = DetallePedidoSerializer
    filterset_fields = ['ped_codi']
    ordering = ['ped_codi', 'dpe_codi']


class PedidosViewSet(BaseViewSet):
    queryset = Pedidos.objects.all()
    serializer_class = PedidosSerializer
    filterset_fields = ['ped_exp', 'ped_fpag']
    ordering_fields = ['ped_codi', 'ped_fech']
    ordering = ['-ped_codi']
    permission_classes = [AllowAny]  # ✅ permissions.py maneja la autenticación
    authentication_classes = []

    def get_queryset(self):
        """
        Filtrar pedidos por cliente y optimizar queries con select_related y prefetch_related
        """
        queryset = super().get_queryset().select_related(
            'cli_codi'
        ).prefetch_related(
            'detalles__art_codi'
        )
        cli_codi = self.request.query_params.get('cli_codi')
        
        # Si se proporciona cli_codi, filtrar por ese cliente
        if cli_codi:
            try:
                cli_codi = int(cli_codi)
                queryset = queryset.filter(cli_codi_id=cli_codi)
            except (ValueError, TypeError):
                pass
        
        return queryset

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return PedidosCreateUpdateSerializer
        # list y retrieve retornan serializer con detalles
        if self.action in ['list', 'retrieve']:
            return PedidosCompletoSerializer
        return PedidosSerializer

    def update(self, request, *args, **kwargs):
        """
        Permitir edición solo si el pedido está pendiente (ped_exp = False)
        """
        pedido = self.get_object()
        if not pedido.puede_modificarse():
            return Response(
                {'detail': 'No se puede editar un pedido que ya ha sido procesado.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        """
        Permitir edición parcial solo si el pedido está pendiente (ped_exp = False)
        """
        pedido = self.get_object()
        if not pedido.puede_modificarse():
            return Response(
                {'detail': 'No se puede editar un pedido que ya ha sido procesado.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().partial_update(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def cliente(self, request):
        """GET /pedidos/cliente/?cli_codi=1 - Pedidos de un cliente"""
        cli_codi = request.query_params.get('cli_codi')
        if not cli_codi:
            return Response([], status=status.HTTP_200_OK)
        
        try:
            cli_codi = int(cli_codi)
            pedidos = Pedidos.objects.filter(cli_codi_id=cli_codi)
            serializer = self.get_serializer(pedidos, many=True, context={'request': request})
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=400)

    @action(detail=False, methods=['post'])
    def marcar_exportados(self, request):
        """
        POST /pedidos/marcar_exportados/
        Body: {"ped_codis": [1, 2, 3]}
        """
        from django.utils import timezone
        
        ped_codis = request.data.get('ped_codis', [])
        
        if not ped_codis or not isinstance(ped_codis, list):
            return Response(
                {'error': 'Se requiere lista de ped_codis'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            ped_codis = [int(x) for x in ped_codis]
        except (ValueError, TypeError):
            return Response(
                {'error': 'ped_codis debe contener solo enteros'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        pedidos_a_procesar = Pedidos.objects.filter(ped_codi__in=ped_codis, ped_exp=False)
        updated_count = 0
        for pedido in pedidos_a_procesar:
            pedido.marcar_como_procesado()
            updated_count += 1

        return Response({
            'success': True,
            'message': f'{updated_count} pedidos marcados como exportados',
            'updated_count': updated_count,
            'timestamp': timezone.now().isoformat()
        }, status=status.HTTP_200_OK)


# ================================================================
# PEDIDOS - VISTA SEPARADA PARA CREAR DESDE CARRITO
# ================================================================

@csrf_exempt
@api_view(['POST'])
@authentication_classes([])  # ✅ Desactiva autenticación global (SimpleJWT, APIKey, Session)
@permission_classes([AllowAny])  # ✅ Permite acceso público sin restricción
def crear_pedido_desde_carrito(request):
    """
    POST /api/pedidos-crear-desde-carrito/
    Crea un pedido con los items del carrito del cliente
    Body: {
        "cli_codi": 1,
        "ped_fpag": "CDO"  (opcional, default es "CDO")
    }
    """
    from django.utils import timezone
    from decimal import Decimal
    
    try:
        cli_codi = request.data.get('cli_codi')
        ped_fpag = request.data.get('ped_fpag', 'CDO')
        
        if not cli_codi:
            return Response(
                {'success': False, 'detail': 'cli_codi es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verificar que existe el cliente
        try:
            cliente = Clientes.objects.get(cli_codi=cli_codi)
        except Clientes.DoesNotExist:
            return Response(
                {'success': False, 'detail': 'Cliente no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # ✅ IMPORTANTE: Obtener items DIRECTAMENTE del carrito del cliente
        # Así aseguramos que usamos las cantidades correctas de la BD
        carrito_items = CarritoItem.objects.filter(cli_codi_id=cli_codi)
        
        if not carrito_items.exists():
            return Response(
                {'success': False, 'detail': 'El carrito está vacío'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Calcular total del pedido usando los datos del carrito
        ped_tota = Decimal('0')
        for carrito_item in carrito_items:
            cant = carrito_item.carr_cant  # ← Cantidad del carrito
            pfin = Decimal(str(carrito_item.carr_pfin)) if carrito_item.carr_pfin else Decimal(str(carrito_item.art_codi.art_pfin))
            ped_tota += Decimal(str(cant)) * pfin
        
        # Crear el pedido
        pedido = Pedidos.objects.create(
            cli_codi=cliente,
            ped_tota=ped_tota,
            ped_fech=timezone.now().date(),  # ✅ .date() para DateField (no datetime)
            ped_hora=timezone.now().time(),  # ✅ .time() para TimeField (solo hora)
            ped_fpag=ped_fpag
        )
        
        # Crear detalles del pedido desde los items del carrito
        for carrito_item in carrito_items:
            DetallePedido.objects.create(
                ped_codi=pedido,
                art_codi=carrito_item.art_codi,
                dpe_cant=carrito_item.carr_cant  # ← Cantidad correcta del carrito
            )
        
        # Limpiar el carrito
        CarritoItem.objects.filter(cli_codi_id=cli_codi).delete()
        
        # Retornar el pedido creado
        serializer = PedidosSerializer(pedido, context={'request': request})
        return Response({
            'success': True,
            'ped_codi': pedido.ped_codi,
            'pedido': serializer.data
        }, status=status.HTTP_201_CREATED)
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response(
            {'success': False, 'detail': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )


# ================================================================
# CONFIGURACIÓN
# ================================================================

class CuentaBancariaViewSet(BulkCreateMixin, BaseViewSet):
    queryset = CuentaBancaria.objects.all()
    serializer_class = CuentaBancariaSerializer
    lookup_field_name = "bco_codi"
    filterset_fields = ['bco_acti']
    search_fields = ['bco_nomb', 'bco_ali']
    ordering = ['-bco_acti', 'bco_nomb']


class GeneralViewSet(BaseViewSet):
    queryset = General.objects.all()
    serializer_class = GeneralSerializer
    pagination_class = None

    def get_serializer_context(self):
        """Pasar request al contexto del serializer"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context


class UsuarioViewSet(BaseViewSet):
    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer
    search_fields = ['usu_nomb']
    ordering = ['usu_nomb']


# ================================================================
# VENDEDOR LOGIN (SIN CSRF)
# ================================================================

@csrf_exempt
@require_http_methods(["POST", "OPTIONS"])
def vendedor_login(request):
    """
    POST /api/vendedores-login/
    
    Login para vendedores - Genera JWT del CLIENTE asignado (Modo Supervisor).
    
    Body:
    {
        "username": "vendedor1",
        "password": "password123"
    }
    
    Response (200):
    {
        "success": true,
        "access": "eyJhbGc...",
        "refresh": "eyJhbGc...",
        "message": "Vendedor ... autenticado como cliente ...",
        "vendedor": { ... },
        "cliente_activo": { ... }
    }
    
    IMPORTANTE:
    - El JWT generado usa cli_codi (del cliente), no ven_codi
    - Esto permite que el vendedor vea datos del cliente automáticamente
    """
    if request.method == 'OPTIONS':
        return JsonResponse({'status': 'ok'})
    
    try:
        try:
            data = json.loads(request.body)
        except:
            return JsonResponse({'success': False, 'detail': 'JSON inválido'}, status=400)
        
        username = data.get('username')
        password = data.get('password')

        if not username or not password:
            return JsonResponse(
                {'success': False, 'detail': 'Usuario y contraseña requeridos'}, 
                status=400
            )

        # Buscar vendedor por username
        try:
            vendedor = Vendedor.objects.get(ven_usua=username, ven_actv=1)
        except Vendedor.DoesNotExist:
            return JsonResponse(
                {'success': False, 'detail': 'Usuario o contraseña incorrectos'}, 
                status=401
            )

        # Verificar que tenga contraseña configurada
        if not vendedor.ven_clav:
            return JsonResponse(
                {'success': False, 'detail': 'Vendedor sin contraseña configurada'}, 
                status=401
            )

        # Verificar contraseña
        if not vendedor.check_password(password):
            return JsonResponse(
                {'success': False, 'detail': 'Usuario o contraseña incorrectos'}, 
                status=401
            )

        #  MODO SUPERVISOR: Obtener cliente asignado
        # Buscar primer cliente asignado a este vendedor
        clientes_asignados = Clientes.objects.filter(ven_codi=vendedor)
        
        if not clientes_asignados.exists():
            return JsonResponse(
                {'success': False, 'detail': 'Vendedor sin clientes asignados'}, 
                status=403
            )
        
        cliente = clientes_asignados.first()
        
        #  Generar JWT CON EL CLI_CODI (no con ven_codi)
        refresh = RefreshToken()
        refresh['user_id'] = cliente.cli_codi  # ← CLI_CODI, no VEN_CODI
        refresh['user_type'] = 'cliente'  # ← Como cliente, no vendedor
        refresh['vendedor_suplantante'] = vendedor.ven_codi  # Marcar suplantación
        
        # Retornar datos del vendedor + cliente + JWT tokens
        return JsonResponse({
            "success": True,
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "message": f"Vendedor {vendedor.ven_nomb} autenticado como cliente {cliente.cli_nomb}",
            "vendedor": {
                "ven_codi": vendedor.ven_codi,
                "ven_nomb": vendedor.ven_nomb,
                "ven_usua": vendedor.ven_usua,
                "ven_emai": vendedor.ven_emai,
                "ven_tele": vendedor.ven_tele,
                "ven_dom": vendedor.ven_dom,
                "ven_cuit": vendedor.ven_cuit,
                "ven_actv": vendedor.ven_actv,
                "loc_codi": vendedor.loc_codi_id,
            },
            "cliente_activo": {
                "cli_codi": cliente.cli_codi,
                "cli_nomb": cliente.cli_nomb,
                "cli_emai": cliente.cli_emai,
                "cli_ndoc": cliente.cli_ndoc,
                "cli_celu": cliente.cli_celu,
                "cli_tele": cliente.cli_tele,
                "cli_dire": cliente.cli_dire,
                "loc_codi": cliente.loc_codi_id,
            }
        }, status=200)
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'success': False,
            'detail': str(e)
        }, status=500)


# ================================================================
# VENDEDOR IMPERSONATION (Suplantación de clientes)
# ================================================================

@require_http_methods(['POST', 'OPTIONS'])
def vendedor_impersonate(request):
    """
    POST /vendedor/impersonate/
    Permite que un vendedor suplante a uno de sus clientes
    Body: { "cli_codi": <cliente_id> }
    """
    if request.method == 'OPTIONS':
        return JsonResponse({'status': 'ok'})
    
    try:
        try:
            data = json.loads(request.body)
        except:
            return JsonResponse({'success': False, 'error': 'JSON inválido'}, status=400)
        
        cli_codi = data.get('cli_codi')
        
        if not cli_codi:
            return JsonResponse(
                {'success': False, 'error': 'cli_codi requerido'}, 
                status=400
            )

        # Obtener cliente
        try:
            cliente = Clientes.objects.get(cli_codi=cli_codi)
        except Clientes.DoesNotExist:
            return JsonResponse(
                {'success': False, 'error': 'Cliente no encontrado'}, 
                status=404
            )

        # Guardar ven_codi actual en sesión (para poder restaurarlo después)
        # La impersonación se maneja totalmente en el frontend con eventos
        
        # Serializar cliente para enviar al frontend
        cliente_data = ClientesSerializer(cliente).data
        
        return JsonResponse({
            "success": True,
            "cliente": cliente_data,
            "impersonation": {
                "isImpersonating": True,
                "vendedor": {
                    "ven_codi": cliente.ven_codi_id,
                    "ven_nomb": cliente.ven_codi.ven_nomb if cliente.ven_codi else None
                }
            }
        }, status=200)
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@require_http_methods(['POST', 'OPTIONS'])
def vendedor_stop_impersonation(request):
    """
    POST /vendedor/stop-impersonation/
    Detiene la suplantación de un cliente y restaura la sesión del vendedor
    """
    if request.method == 'OPTIONS':
        return JsonResponse({'status': 'ok'})
    
    try:
        # Por ahora, esta función simplemente confirma que se detuvo la impersonación
        # La restauración de la sesión se maneja desde el frontend/localStorage
        
        return JsonResponse({
            "success": True,
            "message": "Impersonation stopped",
            "vendedor": None  # El frontend restaurará la sesión del vendedor desde localStorage
        }, status=200)
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@require_http_methods(['GET', 'OPTIONS'])
def vendedor_check_impersonation(request):
    """
    GET /vendedor/check-impersonation/
    Verifica si hay una impersonación activa
    """
    if request.method == 'OPTIONS':
        return JsonResponse({'status': 'ok'})
    
    try:
        # Por ahora, devolvemos que no hay impersonación
        # La impersonación se maneja completamente desde el frontend/localStorage
        
        return JsonResponse({
            "isImpersonating": False,
            "vendedor": None
        }, status=200)
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


# ================================================================
# HEALTH CHECK & CSRF
# ================================================================

@api_view(['GET', 'OPTIONS'])
def health_check(request):
    """Simple health check endpoint para verificar CORS"""
    return Response({
        "status": "ok",
        "message": "API is running",
        "origin": request.META.get('HTTP_ORIGIN', 'N/A'),
        "method": request.method
    })

@api_view(['GET', 'POST', 'OPTIONS'])
def get_csrf_token(request):
    """
    GET /csrf/ - Obtener token CSRF
    Debe ser llamado antes de hacer POST a login/registro
    """
    from django.middleware.csrf import get_token
    
    if request.method == 'OPTIONS':
        return Response({'status': 'ok'})
    
    token = get_token(request)
    return Response({
        "csrfToken": token,
        "message": "CSRF token obtenido exitosamente"
    })


# ================================================================
# AUTENTICACIÓN - CLIENTES Y VENDEDORES
# ================================================================

@csrf_exempt
@require_http_methods(["POST", "OPTIONS"])
def cliente_login(request):
    """
    POST /api/cliente-login/
    
    Login para clientes.
    
    Body:
    {
        "email": "cliente@example.com",
        "password": "password123"
    }
    
    Response (200):
    {
        "success": true,
        "access": "eyJhbGc...",
        "refresh": "eyJhbGc...",
        "cliente": {
            "cli_codi": 1,
            "cli_nomb": "Juan Pérez",
            "cli_emai": "juan@example.com"
        }
    }
    """
    if request.method == 'OPTIONS':
        return JsonResponse({'status': 'ok'})
    
    try:
        try:
            data = json.loads(request.body)
        except:
            return JsonResponse({'success': False, 'detail': 'JSON inválido'}, status=400)
        
        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            return JsonResponse(
                {'success': False, 'detail': 'Email y contraseña requeridos'}, 
                status=400
            )

        # Buscar en Clientes primero
        try:
            cliente = Clientes.objects.get(cli_emai=email)
        except Clientes.MultipleObjectsReturned:
            cantidad = Clientes.objects.filter(cli_emai=email).count()
            return JsonResponse(
                {
                    'success': False,
                    'detail': f'Hay {cantidad} cuentas registradas con este email. '
                               f'Por favor contactate con soporte para resolverlo.'
                },
                status=409
            )
        except Clientes.DoesNotExist:
            # Si no existe en Clientes, buscar en Registro
            try:
                registro = Registro.objects.get(reg_emai=email)
                return JsonResponse(
                    {'success': False, 'detail': 'Tu cuenta está pendiente de aprobación. Por favor, espera a que sea aprobada.'}, 
                    status=401
                )
            except Registro.DoesNotExist:
                return JsonResponse(
                    {'success': False, 'detail': 'Email o contraseña incorrectos'}, 
                    status=401
                )
        
        # Verificar que cliente esté activo
        if not cliente.cli_acti:
            return JsonResponse(
                {'success': False, 'detail': 'Tu cuenta está pendiente de activación. Por favor, espera a que sea activada.'}, 
                status=401
            )

        # Verificar contraseña
        if not cliente.check_password(password):
            return JsonResponse(
                {'success': False, 'detail': 'Email o contraseña incorrectos'}, 
                status=401
            )

        # Generar JWT tokens
        refresh = RefreshToken()
        refresh['user_id'] = cliente.cli_codi
        refresh['user_type'] = 'cliente'  # ← IMPORTANTE: Marca como cliente
        
        # Retornar datos del cliente + JWT tokens
        return JsonResponse({
            "success": True,
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "cliente": {
                "cli_codi": cliente.cli_codi,
                "cli_nomb": cliente.cli_nomb,
                "cli_emai": cliente.cli_emai,
                "cli_ndoc": cliente.cli_ndoc,
                "cli_celu": cliente.cli_celu,
                "cli_tele": cliente.cli_tele,
                "cli_dire": cliente.cli_dire,
                "cli_fchc": cliente.cli_fchc.isoformat() if cliente.cli_fchc else None,
                "cli_desc": float(cliente.cli_desc) if cliente.cli_desc else 0,
                "cli_precs1": float(cliente.cli_precs1) if cliente.cli_precs1 else 0,
                "cli_precs2": float(cliente.cli_precs2) if cliente.cli_precs2 else 0,
                "loc_codi": cliente.loc_codi_id,
                "loc_nomb": cliente.loc_codi.loc_nomb if cliente.loc_codi else None,
                "ven_codi": cliente.ven_codi_id if cliente.ven_codi else None,
            }
        }, status=200)
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'success': False,
            'detail': str(e)
        }, status=500)


@csrf_exempt
@require_http_methods(["POST", "OPTIONS"])
def cliente_register(request):
    """
    POST /cliente-register/
    Registro de clientes
    """
    if request.method == 'OPTIONS':
        return JsonResponse({'status': 'ok'})
    
    try:
        data = json.loads(request.body)
    except:
        return JsonResponse({'success': False, 'detail': 'JSON inválido'}, status=400)
    
    email = data.get('email') or data.get('cli_emai')
    password = data.get('password') or data.get('cli_clav')
    name = data.get('name') or data.get('cli_nomb')
    document = data.get('document') or data.get('cli_ndoc')
    
    if not all([email, password, name, document]):
        return JsonResponse(
            {'success': False, 'detail': 'Email, contraseña, nombre y documento son requeridos'}, 
            status=400
        )
    
    # Verificar si el email ya existe
    if Clientes.objects.filter(cli_emai=email).exists():
        return JsonResponse(
            {'success': False, 'detail': 'El email ya está registrado'}, 
            status=400
        )
    
    try:
        # Generar cli_codi automáticamente (próximo ID)
        last_cliente = Clientes.objects.all().order_by('-cli_codi').first()
        next_cli_codi = (last_cliente.cli_codi + 1) if last_cliente else 1
        
        # Obtener localidad por defecto (primer registro o la más común)
        default_localidad = Localidad.objects.first()
        if not default_localidad:
            return JsonResponse(
                {'success': False, 'detail': 'No hay localidades configuradas'}, 
                status=500
            )
        
        # Crear cliente SIN guardar contraseña en texto plano
        cliente = Clientes(
            cli_codi=next_cli_codi,
            cli_emai=email,
            cli_nomb=name,
            cli_ndoc=document,
            loc_codi=default_localidad
        )
        
        # Usar set_password() para hashear explícitamente
        cliente.set_password(password)
        
        # Guardar con contraseña hasheada
        cliente.save()
        
        return JsonResponse({
            "success": True,
            "message": "Cliente registrado exitosamente",
            "cliente": {
                "cli_codi": cliente.cli_codi,
                "cli_nomb": cliente.cli_nomb,
                "cli_emai": cliente.cli_emai,
                "cli_ndoc": cliente.cli_ndoc,
                "loc_codi": cliente.loc_codi_id,
            }
        }, status=201)
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse(
            {'success': False, 'detail': str(e)},
            status=500
        )


@csrf_exempt
@require_http_methods(["POST", "OPTIONS"])
def contacto_enviar(request):
    """
    POST /contacto-enviar/
    Recibe la consulta del formulario de contacto y la envía por email a soporte.
    Body: {"nombre": "...", "email": "...", "telefono": "...", "mensaje": "..."}
    """
    if request.method == 'OPTIONS':
        return JsonResponse({'status': 'ok'})

    try:
        data = json.loads(request.body)
    except:
        return JsonResponse({'success': False, 'detail': 'JSON inválido'}, status=400)

    nombre = (data.get('nombre') or '').strip()
    email = (data.get('email') or '').strip()
    telefono = (data.get('telefono') or '').strip()
    mensaje = (data.get('mensaje') or '').strip()

    if not all([nombre, email, mensaje]):
        return JsonResponse(
            {'success': False, 'detail': 'Nombre, email y mensaje son requeridos'},
            status=400
        )

    def send_contacto_email():
        try:
            email_body = f"""
Nueva consulta desde el formulario de contacto del sitio web

Nombre: {nombre}
Email: {email}
Teléfono: {telefono or 'No informado'}

Mensaje:
{mensaje}


            """

            send_mail(
                subject=f'Consulta web de - {nombre}',
                message=email_body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=['soporte@ferreteradebandi.online'],
                fail_silently=True,
            )

            logger.info(f"✓ Email de consulta de contacto enviado (de {email})")

        except Exception as e:
            logger.error(
                f"✗ Error enviando email de consulta de contacto (de {email}): {str(e)}",
                exc_info=True
            )

    email_thread = threading.Thread(target=send_contacto_email, daemon=True)
    email_thread.start()

    return JsonResponse({
        'success': True,
        'message': 'Tu mensaje ha sido enviado correctamente'
    }, status=200)


@csrf_exempt
@require_http_methods(["POST", "OPTIONS"])
def cliente_update_password(request):
    """
    POST /cliente-update-password/
    Actualiza/establece la contraseña de un cliente (para testing o reseteo)
    Body: {"email": "...", "password": "..."}
    """
    if request.method == 'OPTIONS':
        return JsonResponse({'status': 'ok'})
    
    try:
        data = json.loads(request.body)
    except:
        return JsonResponse({'success': False, 'detail': 'JSON inválido'}, status=400)
    
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return JsonResponse(
            {'success': False, 'detail': 'Email y contraseña requeridos'}, 
            status=400
        )
    
    try:
        cliente = Clientes.objects.get(cli_emai=email)
        cliente.set_password(password)
        cliente.save()

        return JsonResponse({
            "success": True,
            "message": f"Contraseña actualizada para {email}",
            "cli_codi": cliente.cli_codi
        }, status=200)

    except Clientes.MultipleObjectsReturned:
        cantidad = Clientes.objects.filter(cli_emai=email).count()
        return JsonResponse(
            {
                'success': False,
                'detail': f'Hay {cantidad} cuentas registradas con este email. '
                           f'Por favor contactate con soporte para resolverlo.'
            },
            status=409
        )
    except Clientes.DoesNotExist:
        return JsonResponse(
            {'success': False, 'detail': 'Cliente no encontrado'},
            status=404
        )
    except Exception as e:
        return JsonResponse(
            {'success': False, 'detail': str(e)}, 
            status=500
        )


@csrf_exempt
@require_http_methods(["POST", "PUT", "OPTIONS"])
def cliente_update_parametros(request):
    """
    POST/PUT /api/cliente-update-parametros/
    Actualiza los parámetros del cliente (márgenes, preferencias)
    
    Requiere JWT token en header Authorization: Bearer <token>
    
    Body:
    {
        "cli_precs1": 60,
        "cli_precs2": 70,
        "cli_desc": 10
    }
    
    Response (200):
    {
        "success": true,
        "cliente": {
            "cli_codi": 1,
            "cli_precs1": 60,
            "cli_precs2": 70,
            "cli_desc": 10,
            "cli_nomb": "Juan"
        }
    }
    """
    if request.method == 'OPTIONS':
        return JsonResponse({'status': 'ok'})
    
    try:
        # Obtener token del header
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return JsonResponse(
                {'success': False, 'detail': 'Token requerido'}, 
                status=401
            )
        
        token = auth_header.replace('Bearer ', '')
        
        # Decodificar JWT
        from rest_framework_simplejwt.tokens import AccessToken
        user_id = None
        try:
            access_token = AccessToken(token)
            user_id = access_token.get('user_id')
            user_type = access_token.get('user_type', '')
            
            if user_type != 'cliente':
                return JsonResponse(
                    {'success': False, 'detail': 'Usuario no es cliente'}, 
                    status=403
                )
        except Exception as e:
            # Si el token falla, intenta obtener el user_id del request body
            import traceback
            traceback.print_exc()
            try:
                data = json.loads(request.body)
                user_id = data.get('cli_codi')
            except:
                pass
            
            if not user_id:
                return JsonResponse(
                    {'success': False, 'detail': 'Token inválido o expirado. Intenta iniciar sesión de nuevo.'}, 
                    status=401
                )
        
        # Obtener datos del request
        try:
            data = json.loads(request.body)
        except:
            return JsonResponse({'success': False, 'detail': 'JSON inválido'}, status=400)
        
        # Usar el user_id del token o del body
        if not user_id and 'cli_codi' in data:
            user_id = data['cli_codi']
        
        if not user_id:
            return JsonResponse(
                {'success': False, 'detail': 'No se pudo obtener el ID del cliente'}, 
                status=400
            )
        
        # Buscar cliente
        try:
            cliente = Clientes.objects.get(cli_codi=user_id)
        except Clientes.DoesNotExist:
            return JsonResponse(
                {'success': False, 'detail': 'Cliente no encontrado'}, 
                status=404
            )
        
        # Actualizar campos si se proporcionan
        if 'cli_precs1' in data:
            valor = data['cli_precs1']
            if valor is not None:
                try:
                    cliente.cli_precs1 = float(valor)
                except (ValueError, TypeError):
                    return JsonResponse(
                        {'success': False, 'detail': 'cli_precs1 debe ser un número'}, 
                        status=400
                    )
        
        if 'cli_precs2' in data:
            valor = data['cli_precs2']
            if valor is not None:
                try:
                    cliente.cli_precs2 = float(valor)
                except (ValueError, TypeError):
                    return JsonResponse(
                        {'success': False, 'detail': 'cli_precs2 debe ser un número'}, 
                        status=400
                    )
        
        if 'cli_desc' in data:
            valor = data['cli_desc']
            if valor is not None:
                try:
                    cliente.cli_desc = float(valor)
                except (ValueError, TypeError):
                    return JsonResponse(
                        {'success': False, 'detail': 'cli_desc debe ser un número'}, 
                        status=400
                    )
        
        # Guardar cliente
        cliente.save()
        
        return JsonResponse({
            "success": True,
            "message": "Parámetros actualizados",
            "cliente": {
                "cli_codi": cliente.cli_codi,
                "cli_nomb": cliente.cli_nomb,
                "cli_emai": cliente.cli_emai,
                "cli_precs1": float(cliente.cli_precs1) if cliente.cli_precs1 else 0,
                "cli_precs2": float(cliente.cli_precs2) if cliente.cli_precs2 else 0,
                "cli_desc": float(cliente.cli_desc) if cliente.cli_desc else 0,
            }
        }, status=200)
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse(
            {'success': False, 'detail': str(e)}, 
            status=500
        )


# ================================================================
# FAVORITOS (SIN CSRF)
# ================================================================

@require_http_methods(["POST", "DELETE", "OPTIONS"])
def favoritos_manage(request):
    """
    POST /favoritos-manage/
    Agregar o eliminar favoritos
    
    Body: {"cli_codi": 1, "art_codi": 5}
    """
    if request.method == 'OPTIONS':
        return JsonResponse({'status': 'ok'})
    
    try:
        data = json.loads(request.body)
    except:
        return JsonResponse({'success': False, 'detail': 'JSON inválido'}, status=400)
    
    cli_codi = data.get('cli_codi')
    art_codi = data.get('art_codi')
    
    if not cli_codi or not art_codi:
        return JsonResponse(
            {'success': False, 'detail': 'cli_codi y art_codi son requeridos'},
            status=400
        )
    
    try:
        # Verificar que existen el cliente y el artículo
        cliente = Clientes.objects.get(cli_codi=cli_codi)
        articulo = Articulo.objects.get(art_codi=art_codi)
    except Clientes.DoesNotExist:
        return JsonResponse(
            {'success': False, 'detail': 'Cliente no encontrado'},
            status=404
        )
    except Articulo.DoesNotExist:
        return JsonResponse(
            {'success': False, 'detail': 'Artículo no encontrado'},
            status=404
        )
    
    if request.method == 'POST':
        # Agregar favorito
        favorito, created = Favoritos.objects.get_or_create(
            cli_codi=cliente,
            art_codi=articulo
        )
        
        return JsonResponse({
            'success': True,
            'message': 'Favorito agregado' if created else 'Ya está en favoritos',
            'fav_codi': favorito.fav_codi,
            'cli_codi': favorito.cli_codi_id,
            'art_codi': favorito.art_codi_id,
        }, status=201 if created else 200)
    
    elif request.method == 'DELETE':
        # Eliminar favorito
        favorito = Favoritos.objects.filter(
            cli_codi=cliente,
            art_codi=articulo
        ).first()
        
        if not favorito:
            return JsonResponse(
                {'success': False, 'detail': 'Favorito no encontrado'},
                status=404
            )
        
        fav_codi = favorito.fav_codi
        favorito.delete()
        
        return JsonResponse({
            'success': True,
            'message': 'Favorito eliminado',
            'fav_codi': fav_codi
        }, status=200)


# ================================================================
# BULK IMPORT ENDPOINT (CON PASSWORD HASHING)
# ================================================================

# ================================================================
# CARRITO (SIN CSRF)
# ================================================================

@require_http_methods(["POST", "PUT", "DELETE", "OPTIONS"])
def carrito_manage(request):
    """
    POST /carrito-manage/  - Agregar item al carrito
    PUT /carrito-manage/   - Actualizar cantidad
    DELETE /carrito-manage/ - Eliminar item del carrito
    
    Body: {"cli_codi": 1, "art_codi": 5, "carr_cant": 2, "carr_pnet": 100, "carr_pfin": 121}
    """
    if request.method == 'OPTIONS':
        return JsonResponse({'status': 'ok'})
    
    try:
        data = json.loads(request.body)
    except:
        return JsonResponse({'success': False, 'detail': 'JSON inválido'}, status=400)
    
    cli_codi = data.get('cli_codi')
    art_codi = data.get('art_codi')
    
    if not cli_codi or not art_codi:
        return JsonResponse(
            {'success': False, 'detail': 'cli_codi y art_codi son requeridos'},
            status=400
        )
    
    try:
        # Verificar que existen el cliente y el artículo
        cliente = Clientes.objects.get(cli_codi=cli_codi)
        articulo = Articulo.objects.get(art_codi=art_codi)
    except Clientes.DoesNotExist:
        return JsonResponse(
            {'success': False, 'detail': 'Cliente no encontrado'},
            status=404
        )
    except Articulo.DoesNotExist:
        return JsonResponse(
            {'success': False, 'detail': 'Artículo no encontrado'},
            status=404
        )
    
    if request.method == 'POST':
        # Agregar item al carrito
        carr_cant = data.get('carr_cant', 1)
        carr_pnet = data.get('carr_pnet') or articulo.art_pnet
        carr_pfin = data.get('carr_pfin') or articulo.art_pfin
        
        try:
            carr_cant = int(carr_cant)
            if carr_cant < 1:
                return JsonResponse(
                    {'success': False, 'detail': 'Cantidad debe ser >= 1'},
                    status=400
                )
        except (ValueError, TypeError):
            return JsonResponse(
                {'success': False, 'detail': 'carr_cant debe ser un número'},
                status=400
            )
        
        # Crear o actualizar item en carrito
        item, created = CarritoItem.objects.get_or_create(
            cli_codi=cliente,
            art_codi=articulo,
            defaults={
                'carr_cant': carr_cant,
                'carr_pnet': carr_pnet,
                'carr_pfin': carr_pfin
            }
        )
        
        # Si ya existía, incrementar cantidad
        if not created:
            item.carr_cant += carr_cant
            item.carr_pnet = carr_pnet
            item.carr_pfin = carr_pfin
            item.save()
        
        return JsonResponse({
            'success': True,
            'message': 'Item agregado al carrito',
            'carr_codi': item.carr_codi,
            'cli_codi': item.cli_codi_id,
            'art_codi': item.art_codi_id,
            'carr_cant': item.carr_cant,
            'carr_pnet': float(item.carr_pnet or 0),
            'carr_pfin': float(item.carr_pfin or 0),
        }, status=201 if created else 200)
    
    elif request.method == 'PUT':
        # Actualizar cantidad
        carr_cant = data.get('carr_cant')
        
        if carr_cant is None:
            return JsonResponse(
                {'success': False, 'detail': 'carr_cant es requerido para actualizar'},
                status=400
            )
        
        try:
            carr_cant = int(carr_cant)
            if carr_cant < 0:
                return JsonResponse(
                    {'success': False, 'detail': 'Cantidad no puede ser negativa'},
                    status=400
                )
        except (ValueError, TypeError):
            return JsonResponse(
                {'success': False, 'detail': 'carr_cant debe ser un número'},
                status=400
            )
        
        # Obtener item del carrito
        item = CarritoItem.objects.filter(
            cli_codi=cliente,
            art_codi=articulo
        ).first()
        
        if not item:
            return JsonResponse(
                {'success': False, 'detail': 'Item no está en el carrito'},
                status=404
            )
        
        if carr_cant == 0:
            # Si cantidad es 0, eliminar
            item.delete()
            return JsonResponse({
                'success': True,
                'message': 'Item eliminado del carrito'
            }, status=200)
        
        item.carr_cant = carr_cant
        item.save()
        
        return JsonResponse({
            'success': True,
            'message': 'Cantidad actualizada',
            'carr_codi': item.carr_codi,
            'carr_cant': item.carr_cant,
        }, status=200)
    
    elif request.method == 'DELETE':
        # Eliminar item del carrito
        item = CarritoItem.objects.filter(
            cli_codi=cliente,
            art_codi=articulo
        ).first()
        
        if not item:
            return JsonResponse(
                {'success': False, 'detail': 'Item no está en el carrito'},
                status=404
            )
        
        item.delete()
        
        return JsonResponse({
            'success': True,
            'message': 'Item eliminado del carrito'
        }, status=200)




# ================================================================
# IMPORTACIÓN BULK DE DATOS
# ================================================================

@csrf_exempt
@require_http_methods(["POST", "OPTIONS"])
def importar_datos(request):
    """
    POST /importar_datos/
    Importa datos en bulk desde JSON
    """

    if request.method == 'OPTIONS':
        return JsonResponse({'status': 'ok'})

    try:

        data = json.loads(request.body)

    except Exception as e:

        return JsonResponse({

            'success': False,
            'detail': f'JSON inválido: {str(e)}'

        }, status=400)

    MODELOS = {

        "clientes": (Clientes, "cli_codi"),
        "articulos": (Articulo, "art_codi"),

        "rubros": (Rubro, "rub_codi"),
        "subrubros": (SubRubro, "sru_codi"),
        "marcas": (Marca, "mar_codi"),
        "localidades": (Localidad, "loc_codi"),
        "vendedores": (Vendedor, "ven_codi"),
        "zonas": (Zona, "zon_codi"),
    }

    resultados = {}

    try:

        # =====================================================
        # TABLA POR TABLA
        # =====================================================

        for key, (model, lookup) in MODELOS.items():

            print("===================================")
            print("IMPORTANDO:", key)

            items = data.get(key, [])

            resultados[key] = {

                "total": len(items),
                "ok": 0,
                "error": 0,
                "detalle": []

            }

            # =====================================================
            # REGISTRO POR REGISTRO
            # =====================================================

            for item in items:

                try:

                    # ============================================
                    # TRANSACCION POR REGISTRO
                    # ============================================

                    with transaction.atomic():

                        data_item = (
                            item.copy()
                            if isinstance(item, dict)
                            else dict(item)
                        )

                        # ============================================
                        # LIMPIAR STRINGS / VACIOS -> NULL
                        # ============================================

                        for k, v in list(data_item.items()):

                            if isinstance(v, str):

                                v = v.strip()

                                if v == "":
                                    v = None

                            data_item[k] = v

                        # ============================================
                        # FK -> *_id
                        # ============================================

                        for field in model._meta.fields:

                            if field.is_relation and field.many_to_one:

                                fk_name = field.name

                                if fk_name in data_item:

                                    data_item[f"{fk_name}_id"] = (
                                        data_item.pop(fk_name)
                                    )

                        # =====================================================
                        # CLIENTES
                        # =====================================================

                        if key == "clientes":

                            lookup_value = data_item.get("cli_codi")

                            if lookup_value is None:

                                resultados[key]["error"] += 1

                                resultados[key]["detalle"].append({

                                    "error": "Falta cli_codi",
                                    "data": item

                                })

                                continue

                            # ============================================
                            # LIMPIAR UNIQUE
                            # ============================================

                            if not data_item.get("cli_emai"):
                                data_item["cli_emai"] = None

                            if not data_item.get("cli_cuit"):
                                data_item["cli_cuit"] = None

                            # ============================================
                            # LIMPIAR PASSWORD
                            # ============================================

                            clave = data_item.pop(
                                "cli_clav",
                                None
                            )

                            # ============================================
                            # SACAR PK DE DEFAULTS
                            # ============================================

                            data_item.pop("cli_codi", None)

                            # ============================================
                            # UPDATE OR CREATE
                            # ============================================

                            obj, created = model.objects.update_or_create(

                                cli_codi=lookup_value,

                                defaults=data_item
                            )

                            # ============================================
                            # PASSWORD
                            # ============================================

                            if clave:

                                obj.set_password(clave)

                                obj.save()

                            resultados[key]["ok"] += 1

                            continue

                        # =====================================================
                        # VENDEDORES
                        # =====================================================

                        if key == "vendedores":

                            lookup_value = data_item.get("ven_codi")

                            if lookup_value is None:

                                resultados[key]["error"] += 1

                                resultados[key]["detalle"].append({

                                    "error": "Falta ven_codi",
                                    "data": item

                                })

                                continue

                            clave = data_item.pop(
                                "ven_clav",
                                None
                            )

                            data_item.pop("ven_codi", None)

                            obj, created = model.objects.update_or_create(

                                ven_codi=lookup_value,

                                defaults=data_item
                            )

                            if clave:

                                obj.set_password(clave)

                                obj.save()

                            resultados[key]["ok"] += 1

                            continue

                        # =====================================================
                        # ARTICULOS
                        # =====================================================

                        if key == "articulos":

                            lookup_value = (
                                data_item.get("art_codi")
                                or
                                data_item.get("art_codi_id")
                            )

                            if lookup_value is None:

                                resultados[key]["error"] += 1

                                resultados[key]["detalle"].append({

                                    "error": "Falta art_codi",
                                    "data": item

                                })

                                continue

                            data_item.pop("art_codi", None)
                            data_item.pop("art_codi_id", None)

                            obj, created = model.objects.update_or_create(

                                art_codi=lookup_value,

                                defaults=data_item
                            )

                            resultados[key]["ok"] += 1

                            continue

                        # =====================================================
                        # RESTO
                        # =====================================================

                        lookup_value = (
                            data_item.get(lookup)
                            or
                            data_item.get(f"{lookup}_id")
                        )

                        if lookup_value is None:

                            resultados[key]["error"] += 1

                            resultados[key]["detalle"].append({

                                "error": f"Falta campo {lookup}",
                                "data": item

                            })

                            continue

                        lookup_field = (
                            f"{lookup}_id"
                            if any(
                                f.name == lookup and f.is_relation
                                for f in model._meta.fields
                            )
                            else lookup
                        )

                        data_item.pop(lookup, None)
                        data_item.pop(f"{lookup}_id", None)

                        obj, created = model.objects.update_or_create(

                            **{
                                lookup_field: lookup_value
                            },

                            defaults=data_item
                        )

                        resultados[key]["ok"] += 1

                except Exception as e:

                    import traceback

                    print("===================================")
                    print("ERROR IMPORTANDO")
                    print("TABLA:", key)
                    print("ERROR:", str(e))
                    print(traceback.format_exc())

                    resultados[key]["error"] += 1

                    resultados[key]["detalle"].append({

                        "error": str(e),
                        "data": item

                    })

            print(
                f"OK: {resultados[key]['ok']} | "
                f"ERROR: {resultados[key]['error']}"
            )

        return JsonResponse({

            "success": True,
            "resultados": resultados

        }, status=200)

    except Exception as e:

        import traceback

        print(traceback.format_exc())

        return JsonResponse({

            "success": False,
            "error": str(e)

        }, status=500)

