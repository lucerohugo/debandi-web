import re
from datetime import date, timedelta
from decimal import Decimal

from django.contrib import admin
from django.db.models import Q, Exists, OuterRef
from .models import (
    Provincia, Localidad, Zona, Marca, Rubro, SubRubro, Articulo,
    Clientes, Favoritos, CarritoItem, Pedidos, DetallePedido,
    CuentaBancaria, General, Usuario, Vendedor, Registro, Novedades,
    TipoComprobantes, Comprobante, DetalleComprobante
)


# ================================================================
# UBICACIONES GEOGRÁFICAS
# ================================================================

@admin.register(Provincia)
class ProvinciaAdmin(admin.ModelAdmin):
    list_display = ['pci_codi', 'pci_nomb']
    search_fields = ['pci_codi', 'pci_nomb']
    ordering = ['pci_nomb']


@admin.register(Zona)
class ZonaAdmin(admin.ModelAdmin):
    list_display = ['zon_codi', 'zon_nomb']
    search_fields = ['zon_codi', 'zon_nomb']
    ordering = ['zon_nomb']


@admin.register(Localidad)
class LocalidadAdmin(admin.ModelAdmin):
    list_display = ['loc_codi', 'loc_nomb', 'loc_cpos', 'pci_codi']
    list_filter = ['pci_codi']
    search_fields = ['loc_codi', 'loc_nomb', 'pci_codi__pci_nomb']
    fieldsets = (
        ('Identificación', {
            'fields': ('loc_codi', 'loc_nomb')
        }),
        ('Ubicación', {
            'fields': ('pci_codi', 'loc_cpos')
        }),
    )
    ordering = ['pci_codi', 'loc_nomb']


# ================================================================
# CATÁLOGO DE PRODUCTOS
# ================================================================

@admin.register(Marca)
class MarcaAdmin(admin.ModelAdmin):
    list_display = ['mar_codi', 'mar_nomb']
    search_fields = ['mar_codi', 'mar_nomb']
    ordering = ['mar_nomb']


@admin.register(Rubro)
class RubroAdmin(admin.ModelAdmin):
    list_display = ['rub_codi', 'rub_nomb']
    search_fields = ['rub_codi', 'rub_nomb']
    ordering = ['rub_nomb']


@admin.register(SubRubro)
class SubrubroAdmin(admin.ModelAdmin):
    list_display = ['sru_codi', 'sru_nomb', 'rub_codi']
    list_filter = ['rub_codi']
    search_fields = ['sru_codi', 'sru_nomb']
    ordering = ['rub_codi', 'sru_nomb']


@admin.action(description='[PRUEBA] Poner art_cost en 0 (solo ese campo)')
def poner_costo_cero(modeladmin, request, queryset):
    """Para probar SubInfoART.py/actualizar-precios: deja
    art_cost en 0 en los artículos seleccionados, sin tocar ningún otro
    campo (usa .update(), así que tampoco dispara Articulo.save() """
    queryset.update(art_cost=0)


@admin.register(Articulo)
class ArticuloAdmin(admin.ModelAdmin):
    list_display = ['art_codi','art_cn', 'art_nomb', 'art_pnet', 'art_pfin', 'art_cost','art_uti1' ,'art_cdol', 'mar_codi', 'art_visw', 'art_tiva']
    list_filter = ['mar_codi', 'sru_codi', 'art_acti', 'art_visw', 'art_carru']
    search_fields = ['art_nomb', 'art_codi', 'art_palac', 'art_cn']
    readonly_fields = ['art_fchc', 'art_fmod']
    actions = [poner_costo_cero]
    fieldsets = (
        ('Identificación', {
            'fields': ('art_codi','art_cn', 'art_nomb', 'art_desc', 'art_palac')
        }),
        ('Precios', {
            'fields': ('art_pnet', 'art_pfin', 'art_cost', 'art_cdol', 'art_uti1',  'art_tiva', 'art_descu','art_mext')
        }),
        ('Stock', {
            'fields': ('art_stk', 'art_xbul', 'art_ubul')
        }),
        ('Clasificación', {
            'fields': ('mar_codi', 'sru_codi')
        }),
        ('Imágenes', {
            'fields': ('art_img1', 'art_img2', 'art_img3')
        }),
        ('Configuración', {
            'fields': ('art_depo', 'art_acti', 'art_visw', 'art_carru')
        }),
        ('Control', {
            'fields': ('art_fchc', 'art_fmod', 'art_org', 'art_exp', 'art_fexp')
        }),
    )
    ordering = ['art_nomb']


# ================================================================
# PERSONAS
# ================================================================

@admin.register(Registro)
class RegistroAdmin(admin.ModelAdmin):
    list_display = ['reg_codi', 'reg_nomb', 'reg_emai', 'reg_celu','reg_fchc' ,'reg_clie']
    list_filter = ['reg_clie', 'reg_fchc']
    search_fields = ['reg_codi', 'reg_nomb', 'reg_doc', 'reg_direE', 'reg_cuit', 'reg_emai', 'reg_celu']
    readonly_fields = ['reg_codi', 'reg_fchc', 'reg_fmod', 'reg_clav']
    fieldsets = (
        ('Datos Personales', {
            'fields': ('reg_codi', 'reg_nomb', 'reg_doc', 'reg_direE', 'reg_cuit', 'reg_civa')
        }),
        ('Contacto', {
            'fields': ('reg_emai', 'reg_celu')
        }),
        ('Autenticación', {
            'fields': ('reg_clav',),
            'classes': ('collapse',)
        }),
        ('Estado', {
            'fields': ('reg_clie','reg_exp',)
            
        }),
        ('Fechas', {
            'fields': ('reg_fchc', 'reg_fmod'),
            'classes': ('collapse',)
        }),
    )
    ordering = ['-reg_fchc']


@admin.action(description='Activar clientes seleccionados')
def activar_clientes(modeladmin, request, queryset):
    queryset.update(cli_acti=True)


@admin.action(description='Desactivar clientes seleccionados')
def desactivar_clientes(modeladmin, request, queryset):
    queryset.update(cli_acti=False)


@admin.register(Clientes)
class ClientesAdmin(admin.ModelAdmin):
    list_display = ['cli_codi', 'cli_nomb', 'cli_emai','cli_cuit' ,'loc_codi', 'zon_codi', 'ven_codi', 'cli_acti']
    list_filter = ['loc_codi', 'zon_codi', 'ven_codi', 'cli_acti']
    search_fields = ['cli_codi', 'cli_nomb', 'cli_ndoc', 'cli_emai', 'cli_cuit', 'ven_codi__ven_nomb']
    readonly_fields = ['cli_fchc', 'cli_fmod']
    actions = [activar_clientes, desactivar_clientes]
    fieldsets = (
        ('Datos Personales', {
            'fields': ('cli_codi', 'cli_nomb', 'cli_fnac', 'cli_tdoc', 'cli_ndoc', 'cli_cuit', 'cli_acti')
        }),
        ('Contacto', {
            'fields': ('cli_emai', 'cli_celu', 'cli_tele', 'cli_dire', 'cli_bar', 'loc_codi', 'zon_codi')
        }),
        ('Vendedor', {
            'fields': ('ven_codi',)
        }),
        ('Información', {
            'fields': ('cli_estc', 'cli_ocup', 'cli_desc', 'cli_precs1', 'cli_precs2'),
            'classes': ('collapse',)
        }),
        ('Autenticación', {
            'fields': ('cli_clav', 'cli_rtok', 'cli_rexp'),
            'classes': ('collapse',)
        }),
        ('Control', {
            'fields': ('cli_fchc', 'cli_fmod', 'cli_org', 'cli_exp', 'cli_fexp'),
            'classes': ('collapse',)
        }),
    )
    ordering = ['cli_nomb']


@admin.register(Vendedor)
class VendedorAdmin(admin.ModelAdmin):
    list_display = ['ven_codi', 'ven_nomb', 'ven_actv', 'ven_gere', 'loc_codi']
    list_filter = ['ven_actv', 'ven_gere', 'loc_codi']
    search_fields = ['ven_codi', 'ven_nomb', 'ven_doc', 'ven_emai']
    readonly_fields = ['ven_fchc', 'ven_fmod']
    fieldsets = (
        ('Identificación', {
            'fields': ('ven_codi', 'ven_nomb', 'ven_doc')
        }),
        ('Contacto', {
            'fields': ('ven_emai', 'ven_tele', 'ven_dom', 'ven_bar', 'ven_cuit')
        }),
        ('Ubicación', {
            'fields': ('loc_codi',)
        }),
        ('Autenticación', {
            'fields': ('ven_usua', 'ven_clav', 'ven_actv', 'ven_gere')
        }),
        ('Control', {
            'fields': ('ven_fchc', 'ven_fmod')
        }),
    )
    ordering = ['ven_nomb']
# ================================================================
# FAVORITOS Y CARRITO
# ================================================================

@admin.register(Favoritos)
class FavoritosAdmin(admin.ModelAdmin):
    list_display = ['fav_codi', 'cli_codi', 'art_codi', 'fav_fecha']
    list_filter = ['fav_fecha', 'cli_codi']
    search_fields = ['cli_codi__cli_nomb', 'art_codi__art_nomb']
    readonly_fields = ['fav_fecha']
    ordering = ['-fav_fecha']


@admin.register(CarritoItem)
class CarritoItemAdmin(admin.ModelAdmin):
    list_display = ['carr_codi', 'cli_codi', 'art_codi', 'carr_cant', 'carr_fmod']
    list_filter = ['carr_fmod', 'cli_codi']
    search_fields = ['cli_codi__cli_nomb', 'art_codi__art_nomb']
    readonly_fields = ['carr_fech', 'carr_fmod']
    ordering = ['-carr_fmod']


# ================================================================
# PEDIDOS
# ================================================================

class DetallePedidoInline(admin.TabularInline):
    """Inline para editar detalles de pedidos directamente desde el pedido"""
    model = DetallePedido
    extra = 1
    fields = ['dpe_codi', 'art_codi', 'dpe_cant']
    
    def get_queryset(self, request):
        """Optimizar queries con select_related"""
        qs = super().get_queryset(request)
        return qs.select_related('art_codi')
    
    def get_formset(self, request, obj=None, **kwargs):
        """Retorna el formset personalizado"""
        formset_class = super().get_formset(request, obj, **kwargs)
        
        # Sobrescribir clean para evitar validación de unique_together
        original_clean = formset_class.clean
        def custom_clean(self):
            pass
        formset_class.clean = custom_clean
        
        return formset_class


@admin.register(Pedidos)
class PedidosAdmin(admin.ModelAdmin):
    """Admin para Pedidos con detalles anidados"""
    inlines = [DetallePedidoInline]
    list_display = ['ped_codi', 'ped_fech', 'ped_crea','ped_edit' ,'ped_fechCr','ped_fechEd','cliente_info', 'ped_tota', 'ped_exp']
    list_filter = ['ped_fech', 'ped_exp', 'ped_fpag']
    search_fields = ['ped_codi', 'cli_codi__cli_nomb', 'cli_codi__cli_ndoc']
    readonly_fields = ['ped_codi', 'ped_tota', 'ped_fexp', 'ped_crea', 'ped_fechCr', 'ped_edit', 'ped_fechEd']

    fieldsets = (
        ('Información del Pedido', {
            'fields': ('ped_codi', 'ped_fech', 'ped_hora', 'ped_tota', 'ped_obse')
        }),
        ('Cliente', {
            'fields': ('cli_codi',)
        }),
        ('Forma de Pago', {
            'fields': ('ped_fpag',)
        }),
        ('Movimiento pedido', {
            'fields': ('ped_crea', 'ped_fechCr', 'ped_edit', 'ped_fechEd'),
            'description': 'Historial de quien creo o edito el pedido'
        }),
        ('Exportacion', {
            'fields': ('ped_exp', 'ped_fexp'),
            'classes': ('collapse',),
            'description': 'Control de exportación a GeneXus'
        }),
    )
    
    ordering = ['-ped_codi']
    
    def cliente_info(self, obj):
        """Mostrar nombre y documento del cliente"""
        if obj.cli_codi:
            return f"{obj.cli_codi.cli_nomb} ({obj.cli_codi.cli_codi})" #que me muestre en pedidos el nomb cliente y codigo cliente
        return "-"
    cliente_info.short_description = "Cliente"
    
    def get_queryset(self, request):
        """Optimizar queries con select_related"""
        qs = super().get_queryset(request)
        return qs.select_related('cli_codi').prefetch_related('detalles')



# ================================================================
# CONFIGURACIÓN
# ================================================================

@admin.register(CuentaBancaria)
class CuentaBancariaAdmin(admin.ModelAdmin):
    list_display = ['bco_codi', 'bco_nomb', 'bco_ali', 'bco_acti']
    list_filter = ['bco_acti', 'bco_tip']
    search_fields = ['bco_nomb', 'bco_ali', 'bco_cbu']
    readonly_fields = ['bco_fchc', 'bco_fmod']
    fieldsets = (
        ('Banco', {
            'fields': ('bco_codi', 'bco_nomb', 'bco_tip')
        }),
        ('Titular', {
            'fields': ('bco_titu', 'bco_cuit')
        }),
        ('Datos Bancarios', {
            'fields': ('bco_num', 'bco_cbu', 'bco_ali')
        }),
        ('Configuración', {
            'fields': ('bco_acti', 'bco_obs')
        }),
        ('Control', {
            'fields': ('bco_fchc', 'bco_fmod'),
            'classes': ('collapse',)
        }),
    )
    ordering = ['-bco_acti', 'bco_nomb']


@admin.register(General)
class GeneralAdmin(admin.ModelAdmin):
    list_display = ['gen_codi', 'gen_nomb', 'gen_cuit', 'gen_dola']
    fieldsets = (
        ('Empresa', {
            'fields': ('gen_codi', 'gen_nomb', 'gen_raz', 'gen_cuit')
        }),
        ('Branding', {
            'fields': ('gen_logo', 'gen_loge', 'gen_colo')
        }),
        ('Ubicación', {
            'fields': ('loc_codi', 'gen_dire')
        }),
        ('Contacto', {
            'fields': ('gen_tele', 'gen_emai')
        }),
        ('Cotización', {
            'fields': ('gen_dola',)
        }),
        ('Facturación', {
            'fields': ('gen_civa', 'gen_ingB', 'gen_inia', 'gen_leye', 'gen_leye2', 'gen_leye3'),
            'description': 'Datos que se imprimen en facturas y extracto de cuenta corriente'
        }),
    )


@admin.register(Usuario)
class UsuarioAdmin(admin.ModelAdmin):
    list_display = ['usu_nomb', 'usu_rol', 'usu_fcre']
    list_filter = ['usu_rol']
    search_fields = ['usu_nomb']
    readonly_fields = ['usu_fcre']
    ordering = ['usu_nomb']


# ================================================================
# NOVEDADES Y SECCIONES
# ================================================================

@admin.register(Novedades)
class NovedadesAdmin(admin.ModelAdmin):
    list_display = ['nov_codi', 'nov_nomb', 'nov_cate', 'nov_fechi', 'nov_acti', 'colored_status', 'articulos_pedir']
    list_filter = ['nov_cate', 'nov_acti', 'nov_fechi']
    search_fields = ['nov_codi', 'nov_nomb', 'nov_titl']
    autocomplete_fields = ['nov_arts']
    fieldsets = (
        ('Identificación', {
            'fields': ('nov_codi', 'nov_nomb'),
            'description': 'Código único y nombre de la novedad'
        }),
        (' Tarjeta de Novedad - Contenido Visual', {
            'fields': ('nov_titl', 'nov_desc', 'nov_img', 'nov_cate'),
            'description': 'Configuración de la tarjeta que aparecerá en la página de Novedades'
        }),
        (' Fecha de Publicación', {
            'fields': ('nov_fechi',),
            'description': 'Fecha en que se publicó la novedad'
        }),
        (' Estado', {
            'fields': ('nov_acti',),
            'description': 'Activar/desactivar la visualización de esta novedad'
        }),
        (' Botón Pedir', {
            'fields': ('nov_arts',),
            'description': 'Artículos que se agregan al carrito con el botón Pedir de la tarjeta'
        }),
        (' Configuración Avanzada (Opcional)', {
            'fields': ('nov_fechf', 'art_carru', 'nov_bann', 'nov_prodr'),
            'description': 'Campos adicionales para banners y artículos destacados',
            'classes': ('collapse',)
        }),
    )
    ordering = ['-nov_fechi']
    
    def colored_status(self, obj):
        """Muestra estado con color"""
        if obj.nov_acti:
            return ' Activa'
        else:
            return ' Inactiva'
    colored_status.short_description = 'Estado'

    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related('nov_arts')

    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        # En nov_arts solo se eligen artículos existentes: sin el "+" de crear artículo nuevo
        if 'nov_arts' in form.base_fields:
            form.base_fields['nov_arts'].widget.can_add_related = False
        return form

    def articulos_pedir(self, obj):
        """Códigos DD de los artículos del botón Pedir"""
        return ', '.join(a.art_cn or str(a.art_codi) for a in obj.nov_arts.all()) or '-'
    articulos_pedir.short_description = 'Artículos (Pedir)'


# ================================================================
# CUENTA CORRIENTE
# ================================================================
# Los comprobantes los carga el importador desde GeneXus; el admin es
# para consultas.

@admin.register(TipoComprobantes)
class TipoComprobantesAdmin(admin.ModelAdmin):
    list_display = ['com_codi', 'com_nomb', 'com_letr', 'com_deha', 'com_afip', 'com_fele']
    list_filter = ['com_deha', 'com_letr']
    search_fields = ['com_codi', 'com_nomb']
    ordering = ['com_codi']


class DetalleComprobanteInline(admin.TabularInline):
    """Renglones del comprobante (artículos en ventas, conceptos cancelados en cobros)"""
    model = DetalleComprobante
    extra = 0
    fields = ['dcp_fech', 'art_codi', 'dcp_nomb', 'dcp_cant', 'dcp_precU', 'dcp_tiva', 'dcp_boni', 'dcp_tota', 'dcp_band']


# ---------- filtros personalizados del listado de comprobantes ----------

class LetraComprobanteFilter(admin.SimpleListFilter):
    """Letra del comprobante (A, B, C, X...) según el tipo"""
    title = 'letra'
    parameter_name = 'letra'

    def lookups(self, request, model_admin):
        letras = (TipoComprobantes.objects.exclude(com_letr__isnull=True).exclude(com_letr='')
                  .values_list('com_letr', flat=True).distinct().order_by('com_letr'))
        return [(l, l) for l in letras]

    def queryset(self, request, queryset):
        if self.value():
            codigos = TipoComprobantes.objects.filter(com_letr=self.value()).values_list('com_codi', flat=True)
            return queryset.filter(com_codi_id__in=list(codigos))
        return queryset


class DebeHaberFilter(admin.SimpleListFilter):
    """Débito (suma al saldo) o Crédito (resta) según el tipo de comprobante"""
    title = 'débito / crédito'
    parameter_name = 'deha'

    def lookups(self, request, model_admin):
        return [('1', 'Débito'), ('-1', 'Crédito')]

    def queryset(self, request, queryset):
        if self.value():
            codigos = TipoComprobantes.objects.filter(com_deha=int(self.value())).values_list('com_codi', flat=True)
            return queryset.filter(com_codi_id__in=list(codigos))
        return queryset


class PrefijoFilter(admin.SimpleListFilter):
    """Punto de venta (cpb_pref)"""
    title = 'punto de venta'
    parameter_name = 'pref'

    def lookups(self, request, model_admin):
        prefijos = (Comprobante.objects.exclude(cpb_pref__isnull=True).exclude(cpb_pref='')
                    .values_list('cpb_pref', flat=True).distinct().order_by('cpb_pref'))
        return [(p, p) for p in prefijos] + [('__vacio__', 'Sin prefijo')]

    def queryset(self, request, queryset):
        if self.value() == '__vacio__':
            return queryset.filter(Q(cpb_pref__isnull=True) | Q(cpb_pref=''))
        if self.value():
            return queryset.filter(cpb_pref=self.value())
        return queryset


class VendedorFilter(admin.SimpleListFilter):
    """Vendedor de la venta (vtas_pers, texto libre)"""
    title = 'vendedor'
    parameter_name = 'vend'

    def lookups(self, request, model_admin):
        vendedores = (Comprobante.objects.exclude(vtas_pers__isnull=True).exclude(vtas_pers='')
                      .values_list('vtas_pers', flat=True).distinct().order_by('vtas_pers'))
        return [(v, v) for v in vendedores]

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(vtas_pers=self.value())
        return queryset


class ImporteFilter(admin.SimpleListFilter):
    """Rangos de importe total"""
    title = 'importe total'
    parameter_name = 'importe'

    RANGOS = {
        'r1': (Decimal('0.01'), Decimal('10000')),
        'r2': (Decimal('10000'), Decimal('100000')),
        'r3': (Decimal('100000'), Decimal('1000000')),
        'r4': (Decimal('1000000'), None),
    }

    def lookups(self, request, model_admin):
        return [
            ('cero', 'En cero'),
            ('neg', 'Negativo'),
            ('r1', 'Hasta $10.000'),
            ('r2', '$10.000 a $100.000'),
            ('r3', '$100.000 a $1.000.000'),
            ('r4', 'Más de $1.000.000'),
        ]

    def queryset(self, request, queryset):
        v = self.value()
        if v == 'cero':
            return queryset.filter(cpb_tota=0)
        if v == 'neg':
            return queryset.filter(cpb_tota__lt=0)
        if v in self.RANGOS:
            desde, hasta = self.RANGOS[v]
            queryset = queryset.filter(cpb_tota__gte=desde)
            return queryset.filter(cpb_tota__lt=hasta) if hasta is not None else queryset
        return queryset


class VencimientoFilter(admin.SimpleListFilter):
    """Estado de vencimiento de las ventas (vtas_fven)"""
    title = 'vencimiento'
    parameter_name = 'venc'

    def lookups(self, request, model_admin):
        return [
            ('vencido', 'Vencidos'),
            ('semana', 'Vencen en 7 días'),
            ('vigente', 'No vencidos'),
            ('sin', 'Sin vencimiento'),
        ]

    def queryset(self, request, queryset):
        hoy = date.today()
        v = self.value()
        if v == 'vencido':
            return queryset.filter(vtas_fven__lt=hoy)
        if v == 'semana':
            return queryset.filter(vtas_fven__gte=hoy, vtas_fven__lte=hoy + timedelta(days=7))
        if v == 'vigente':
            return queryset.filter(vtas_fven__gte=hoy)
        if v == 'sin':
            return queryset.filter(vtas_fven__isnull=True)
        return queryset


class ElectronicoFilter(admin.SimpleListFilter):
    """Comprobantes con CAE (factura electrónica) o sin CAE"""
    title = 'CAE (electrónico)'
    parameter_name = 'cae'

    def lookups(self, request, model_admin):
        return [('si', 'Con CAE'), ('no', 'Sin CAE')]

    def queryset(self, request, queryset):
        sin_cae = Q(vtas_ncae__isnull=True) | Q(vtas_ncae='')
        if self.value() == 'si':
            return queryset.exclude(sin_cae)
        if self.value() == 'no':
            return queryset.filter(sin_cae)
        return queryset


class PedidoWebFilter(admin.SimpleListFilter):
    """Ventas que vienen de un pedido (vtas_nped cargado)"""
    title = 'pedido asociado'
    parameter_name = 'ped'

    def lookups(self, request, model_admin):
        return [('si', 'Con pedido'), ('no', 'Sin pedido')]

    def queryset(self, request, queryset):
        sin_ped = Q(vtas_nped__isnull=True) | Q(vtas_nped=0)
        if self.value() == 'si':
            return queryset.exclude(sin_ped)
        if self.value() == 'no':
            return queryset.filter(sin_ped)
        return queryset


class DetalleFilter(admin.SimpleListFilter):
    """Comprobantes con o sin renglones de detalle"""
    title = 'detalle'
    parameter_name = 'det'

    def lookups(self, request, model_admin):
        return [('si', 'Con renglones'), ('no', 'Sin renglones')]

    def queryset(self, request, queryset):
        hay = Exists(DetalleComprobante.objects.filter(cpb_codi_id=OuterRef('pk')))
        if self.value() == 'si':
            return queryset.filter(hay)
        if self.value() == 'no':
            return queryset.filter(~hay)
        return queryset


class ClienteExisteFilter(admin.SimpleListFilter):
    """cli_codi sin db_constraint: detecta comprobantes cuyo cliente no existe en Clientes"""
    title = 'cliente cargado'
    parameter_name = 'cli_ok'

    def lookups(self, request, model_admin):
        return [('si', 'Cliente existente'), ('no', 'Cliente inexistente')]

    def queryset(self, request, queryset):
        existe = Exists(Clientes.objects.filter(cli_codi=OuterRef('cli_codi_id')))
        if self.value() == 'si':
            return queryset.filter(existe)
        if self.value() == 'no':
            return queryset.filter(~existe)
        return queryset


@admin.register(Comprobante)
class ComprobanteAdmin(admin.ModelAdmin):
    inlines = [DetalleComprobanteInline]
    list_display = ['cpb_codi', 'cpb_fech', 'tipo', 'numero', 'cliente_info', 'cpb_cvta', 'cpb_tota', 'vtas_pers', 'cpb_band']
    list_filter = [
        'cpb_tipo',
        ('cpb_fech', admin.DateFieldListFilter),
        'cpb_cvta',
        'cpb_band',
        'com_codi',
        LetraComprobanteFilter,
        DebeHaberFilter,
        PrefijoFilter,
        VendedorFilter,
        ImporteFilter,
        VencimientoFilter,
        ElectronicoFilter,
        PedidoWebFilter,
        DetalleFilter,
        ClienteExisteFilter,
        'vtas_band',
        'cob_band',
    ]
    search_fields = [
        'cpb_nume', 'cpb_pref', 'cpb_conc', 'com_codi__com_codi',
        'cli_codi__cli_nomb', 'cli_codi__cli_codi',
        'vtas_pers', 'vtas_ncae', 'vtas_nped',
    ]
    search_help_text = 'Cliente (nombre o código), número, "0001-00000442", concepto, vendedor, CAE o nro. de pedido'
    raw_id_fields = ['cli_codi']  # evita cargar todos los clientes en un desplegable
    date_hierarchy = 'cpb_fech'
    ordering = ['-cpb_fech', '-cpb_codi']
    list_per_page = 50

    def get_search_results(self, request, queryset, search_term):
        """Además de la búsqueda normal, acepta el número tal como se imprime: 0001-00000442 (o 1-442)"""
        resultados, may_have_duplicates = super().get_search_results(request, queryset, search_term)
        m = re.match(r'^\s*(\d{1,4})\s*-\s*(\d{1,8})\s*$', search_term or '')
        if m:
            pref, nume = m.group(1).zfill(4), int(m.group(2))
            resultados = resultados | queryset.filter(cpb_pref=pref, cpb_nume=nume)
        return resultados, may_have_duplicates

    fieldsets = (
        ('Comprobante', {
            'fields': ('cpb_tipo', 'com_codi', 'cpb_pref', 'cpb_nume', 'cpb_fech', 'cpb_conc', 'cpb_cvta', 'cpb_tota', 'cpb_band')
        }),
        ('Cliente', {
            'fields': ('cli_codi', 'cpb_civN')
        }),
        ('Ventas', {
            'fields': (
                'vtas_fven', 'vtas_nped', 'vtas_pers', 'vtas_ncae', 'vtas_CVto',
                'vtas_igra', 'vtas_iexe', 'vtas_iiva', 'vtas_iv105', 'vtas_iv21',
                'vtas_iRNI', 'vtas_iiin', 'vtas_ibts', 'vtas_band'
            ),
            'classes': ('collapse',),
            'description': 'Solo comprobantes de venta (V)'
        }),
        ('Cobros', {
            'fields': ('cob_ifac', 'cob_iint', 'cob_iade', 'cob_icade', 'cob_band'),
            'classes': ('collapse',),
            'description': 'Solo cobros (C)'
        }),
    )

    # com_codi / cli_codi sin db_constraint: no se usa select_related (INNER JOIN)
    # porque ocultaría los comprobantes cuyo tipo o cliente todavía no llegó

    def tipo(self, obj):
        return obj.com_codi_id
    tipo.short_description = "Tipo"

    def numero(self, obj):
        """Prefijo-número como se imprime (0001-00001520); sin prefijo (recibos) solo el número"""
        numero = str(obj.cpb_nume).zfill(8)
        return f"{obj.cpb_pref}-{numero}" if obj.cpb_pref else numero
    numero.short_description = "Número"

    def cliente_info(self, obj):
        """Nombre y código del cliente (cli_codi sin db_constraint: puede no existir)"""
        cliente = Clientes.objects.filter(cli_codi=obj.cli_codi_id).only('cli_nomb').first()
        return f"{cliente.cli_nomb} ({obj.cli_codi_id})" if cliente else f"({obj.cli_codi_id})"
    cliente_info.short_description = "Cliente"
