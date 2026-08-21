from django.contrib import admin
from .models import (
    Provincia, Localidad, Zona, Marca, Rubro, SubRubro, Articulo,
    Clientes, Favoritos, CarritoItem, Pedidos, DetallePedido,
    CuentaBancaria, General, Usuario, Vendedor, Registro, Novedades
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


@admin.register(Articulo)
class ArticuloAdmin(admin.ModelAdmin):
    list_display = ['art_codi','art_cn', 'art_nomb', 'art_pnet', 'art_pfin', 'art_cost', 'mar_codi', 'art_acti']
    list_filter = ['mar_codi', 'sru_codi', 'art_acti', 'art_visw', 'art_carru']
    search_fields = ['art_nomb', 'art_codi', 'art_palac', 'art_cn']
    readonly_fields = ['art_fchc', 'art_fmod']
    fieldsets = (
        ('Identificación', {
            'fields': ('art_codi','art_cn', 'art_nomb', 'art_desc', 'art_palac')
        }),
        ('Precios', {
            'fields': ('art_pnet', 'art_pfin', 'art_cost', 'art_tiva', 'art_mext')
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
    list_display = ['reg_codi', 'reg_nomb', 'reg_emai', 'reg_celu', 'reg_clie', 'reg_fchc', 'reg_exp']
    list_filter = ['reg_clie', 'reg_fchc']
    search_fields = ['reg_codi', 'reg_nomb', 'reg_doc', 'reg_cuit', 'reg_emai', 'reg_celu']
    readonly_fields = ['reg_codi', 'reg_fchc', 'reg_fmod', 'reg_clav']
    fieldsets = (
        ('Datos Personales', {
            'fields': ('reg_codi', 'reg_nomb', 'reg_doc', 'reg_cuit')
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


@admin.register(Clientes)
class ClientesAdmin(admin.ModelAdmin):
    list_display = ['cli_codi', 'cli_nomb', 'cli_ndoc', 'cli_emai', 'loc_codi', 'zon_codi', 'ven_codi', 'cli_acti']
    list_filter = ['loc_codi', 'zon_codi', 'ven_codi', 'cli_acti']
    search_fields = ['cli_codi', 'cli_nomb', 'cli_ndoc', 'cli_emai', 'cli_cuit']
    readonly_fields = ['cli_fchc', 'cli_fmod']
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
    list_display = ['ven_codi', 'ven_nomb', 'ven_actv', 'loc_codi']
    list_filter = ['ven_actv', 'loc_codi']
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
            'fields': ('ven_usua', 'ven_clav', 'ven_actv')
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
    list_display = ['ped_codi', 'ped_fech', 'ped_hora', 'cliente_info', 'ped_tota', 'ped_exp']
    list_filter = ['ped_fech', 'ped_exp', 'ped_fpag']
    search_fields = ['ped_codi', 'cli_codi__cli_nomb', 'cli_codi__cli_ndoc']
    readonly_fields = ['ped_codi', 'ped_tota', 'ped_fexp']
    
    fieldsets = (
        ('Información del Pedido', {
            'fields': ('ped_codi', 'ped_fech', 'ped_hora', 'ped_tota')
        }),
        ('Cliente', {
            'fields': ('cli_codi',)
        }),
        ('Forma de Pago', {
            'fields': ('ped_fpag',)
        }),
        ('Exportación', {
            'fields': ('ped_exp', 'ped_fexp'),
            'classes': ('collapse',),
            'description': 'Control de exportación a GeneXus'
        }),
    )
    
    ordering = ['-ped_codi']
    
    def cliente_info(self, obj):
        """Mostrar nombre y documento del cliente"""
        if obj.cli_codi:
            return f"{obj.cli_codi.cli_nomb} ({obj.cli_codi.cli_ndoc})"
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
    list_display = ['gen_codi', 'gen_nomb', 'gen_cuit']
    fieldsets = (
        ('Empresa', {
            'fields': ('gen_codi', 'gen_nomb', 'gen_raz', 'gen_cuit')
        }),
        ('Branding', {
            'fields': ('gen_logo', 'gen_loge', 'gen_colo')
        }),
        ('Ubicación', {
            'fields': ('gen_loc', 'gen_dire')
        }),
        ('Contacto', {
            'fields': ('gen_tele', 'gen_emai')
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
    list_display = ['nov_codi', 'nov_nomb', 'nov_cate', 'nov_fechi', 'nov_acti', 'colored_status']
    list_filter = ['nov_cate', 'nov_acti', 'nov_fechi']
    search_fields = ['nov_codi', 'nov_nomb', 'nov_titl']
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
