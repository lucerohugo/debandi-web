from django.contrib import admin
from django.forms import CharField
from django.forms.widgets import TextInput
from .models import (
    Provincia, Zona, Localidad, Clientes,
    Marca, Rubro, SubRubro, Articulo, Favoritos,
    Usuario, Pedidos, DetallePedido, General, CarritoItem, CuentaBancaria, Vendedor
)


# Color picker widget con input de texto
class ColorPickerWidget(TextInput):
    template_name = 'widgets/color_picker.html'
    input_type = 'text'
    
    class Media:
        css = {
            'all': ('css/color_picker.css',)
        }
        js = ('js/color_picker.js',)
    
    def __init__(self, attrs=None):
        default_attrs = {
            'class': 'form-control',
            'placeholder': '#000000',
            'pattern': '^#[0-9A-Fa-f]{6}$',
            'title': 'Ingresa un código HEX válido (ej: #8cced9)'
        }
        if attrs:
            default_attrs.update(attrs)
        super().__init__(attrs=default_attrs)
    
    def render(self, name, value, attrs=None, renderer=None):
        if value is None:
            value = '#8cced9'
        
        html = f'''
        <div style="display: flex; gap: 10px; align-items: center;">
            <input type="color" name="{name}_picker" value="{value}" 
                   style="width: 60px; height: 40px; cursor: pointer; border: 2px solid #ccc; border-radius: 4px;"
                   onchange="document.getElementById('{name}_input').value = this.value;">
            <input type="text" id="{name}_input" name="{name}" value="{value}" 
                   pattern="^#[0-9A-Fa-f]{{6}}$" 
                   placeholder="#000000"
                   title="Código HEX válido (ej: #8cced9)"
                   style="width: 120px; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-family: monospace;"
                   onchange="document.querySelector('input[name=\\\"{name}_picker\\\"]').value = this.value;">
        </div>
        '''
        return html


# =======================
# GENERAL
# =======================

@admin.register(General)
class GeneralAdmin(admin.ModelAdmin):
    list_display = ('gen_codi', 'gen_nomb', 'gen_cuit', 'gen_colo')
    search_fields = ('gen_nomb',)
    search_help_text = "Buscar por nombre de configuración."
    
    fieldsets = (
        ('Identificación', {
            'fields': ('gen_nomb', 'gen_raz', 'gen_logo')
        }),
        ('Configuración Fiscal', {
            'fields': ('gen_cuit',),
            'description': 'Configuración fiscal de la empresa'
        }),
        ('Personalización', {
            'fields': ('gen_colo',),
            'description': 'Personalización del color principal de la aplicación'
        }),
        ('Ubicación y Contacto', {
            'fields': ('gen_loc', 'gen_dire', 'gen_tele', 'gen_emai')
        }),
    )
    
    def formfield_for_dbfield(self, db_field, **kwargs):
        if db_field.name == 'gen_colo':
            kwargs['widget'] = ColorPickerWidget()
        return super().formfield_for_dbfield(db_field, **kwargs)



# =======================
# Provincia
# =======================
@admin.register(Provincia)
class ProvinciaAdmin(admin.ModelAdmin):
    list_display = ('pci_codi', 'pci_nomb')
    search_fields = ('pci_nomb',)
    search_help_text = "Buscar por nombre de provincia."


# =======================
# Zona
# =======================
@admin.register(Zona)
class ZonaAdmin(admin.ModelAdmin):
    list_display = ('zon_codi', 'zon_nomb')
    search_fields = ('zon_nomb',)
    search_help_text = "Buscar por nombre de zona."


# =======================
# Localidad
# =======================
@admin.register(Localidad)
class LocalidadAdmin(admin.ModelAdmin):
    list_display = ('loc_codi', 'loc_nomb', 'pci_codi', 'zon_codi')
    list_filter = ('pci_codi', 'zon_codi')
    search_fields = (
        'loc_nomb',
        'pci_codi__pci_nomb',
        'zon_codi__zon_nomb',
    )
    autocomplete_fields = ('pci_codi', 'zon_codi')


# =======================
# Clientes
# =======================
@admin.register(Clientes)
class ClientesAdmin(admin.ModelAdmin):
    list_display = (
        'cli_codi',
        'cli_nomb',
        'cli_doc',
        'cli_emai',
        'ven_codi',
        'loc_codi',
        'cli_fchc',
        'cli_exp',
        'cli_fexp',
    )

    list_filter = (
        'cli_exp',
        'cli_org',
        'loc_codi',
    )

    search_fields = (
        'cli_nomb',
        'cli_doc',
        'cli_emai',
    )

    autocomplete_fields = ('ven_codi',)

    readonly_fields = (
        'cli_org',
        'cli_fchc',
        'cli_fmod',
        'cli_exp',
        'cli_fexp',
    )

    fieldsets = (
        ('Datos del Cliente', {
            'fields': (
                'cli_nomb',
                'cli_doc',
                'cli_emai',
                'cli_cuit',
                'cli_tele',
                'cli_dire',
                'cli_bar',
                'loc_codi',
                'ven_codi',
            )
        }),
        ('Auditoría y GeneXus', {
            'fields': (
                'cli_org',
                'cli_exp',
                'cli_fexp',
                'cli_fchc',
                'cli_fmod',
            )
        }),
    )

    list_per_page = 25


# =======================
# Marca
# =======================
@admin.register(Marca)
class MarcaAdmin(admin.ModelAdmin):
    list_display = ('mar_codi', 'mar_nomb')
    search_fields = ('mar_nomb',)
    search_help_text = "Buscar por nombre de marca."


# =======================
# Rubro
# =======================
@admin.register(Rubro)
class RubroAdmin(admin.ModelAdmin):
    list_display = ('rub_codi', 'rub_nomb')
    search_fields = ('rub_nomb',)
    search_help_text = "Buscar por nombre de rubro."


# =======================
# SubRubro
# =======================
@admin.register(SubRubro)
class SubRubroAdmin(admin.ModelAdmin):
    list_display = ('sru_codi', 'sru_nomb', 'rub_codi')
    list_filter = ('rub_codi',)
    search_fields = ('sru_nomb', 'rub_codi__rub_nomb')
    search_help_text = "Buscar por nombre de subrubro o rubro."
    autocomplete_fields = ('rub_codi',)


# =======================
# Articulo
# =======================
@admin.register(Articulo)
class ArticuloAdmin(admin.ModelAdmin):
    list_display = (
        'art_codi',
        'art_nomb',
        'art_cint',
        'mar_codi',
        'art_rub_nomb',
        'art_sru_nomb',
        'art_cost',
        'art_pnet',
        'art_tiva',
        'art_mext',
        'art_pfin',
        'art_stkp',
        'art_visw',
        'art_fchc',
        'art_exp',
        'art_fexp',
    )

    list_editable = (
        'art_stkp',
        'art_pnet',
        'art_mext',
        'art_visw',
    )

    list_filter = (
        'art_acti',
        'art_visw',
        'art_xbul',
        'art_mext',
        'mar_codi',
        'sru_codi__rub_codi',
        #'art_org',
    )

    search_fields = (
        'art_codi',
        'art_nomb',
        'art_cint',
        'art_sku',
        'mar_codi__mar_nomb',
        'sru_codi__sru_nomb',
    )
    search_help_text = "Buscar por código, nombre, código interno, SKU, marca o subrubro."

    autocomplete_fields = ('mar_codi', 'sru_codi')
    
    list_select_related = ('mar_codi', 'sru_codi', 'sru_codi__rub_codi')

    readonly_fields = ('art_codi', 'art_pfin', 'art_fchc', 'art_fmod', 'art_exp', 'art_fexp')

    def art_sru_nomb(self, obj):
        return obj.art_sru_nomb
    art_sru_nomb.short_description = 'Subrubro'

    def art_rub_nomb(self, obj):
        return obj.art_rub_nomb
    art_rub_nomb.short_description = 'Rubro'

    fieldsets = (
        ('Datos del Artículo', {
            'fields': (
                'art_codi',
                'art_cint',
                'art_sku',
                'art_nomb',
                'art_desc',
                'art_img',
                'mar_codi',
                'sru_codi',
                'art_acti',
                'art_visw',
                'art_fchc',
                'art_fmod',
            )
        }),
        ('Precios e IVA', {
            'fields': (
                'art_cost',
                'art_pnet',
                'art_tiva',
                'art_mext',
                'art_pfin',
            ),
        }),
        ('Stock y Almacén', {
            'fields': (
                'art_stkp',
                'art_stkmin',
                'art_stkmax',
                'art_depo',
                'art_xbul',
                'art_ubul',
            )
        }),
        ('Exportación', {
            'fields': (
                'art_exp',
                'art_fexp',
            )
        }),
    )

    list_per_page = 25


# =======================
# Favoritos
# =======================
@admin.register(Favoritos)
class FavoritosAdmin(admin.ModelAdmin):
    list_display = ('fav_codi', 'cli_codi', 'art_codi', 'fav_fecha')
    list_filter = ('fav_fecha',)
    search_fields = (
        'cli_codi__cli_nomb',
        'cli_codi__cli_doc',
        'art_codi__art_nomb',
    )
    search_help_text = "Buscar por cliente o artículo."
    autocomplete_fields = ('cli_codi', 'art_codi')
    date_hierarchy = 'fav_fecha'
    list_select_related = ('cli_codi', 'art_codi')
    readonly_fields = ('fav_fecha',)


# =======================
# Usuario
# =======================
@admin.register(Usuario)
class UsuarioAdmin(admin.ModelAdmin):
    list_display = (
        'usu_nomb',
        'usu_rol',
        'usu_perf',
        'usu_fcre',
    )
    list_filter = ('usu_rol',)
    search_fields = (
        'usu_nomb',
        'usu_perf__username',
        'usu_perf__email',
    )
    autocomplete_fields = ('usu_perf',)


# =======================
# INLINE DETALLE PEDIDO
# =======================
class DetallePedidoInline(admin.TabularInline):
    model = DetallePedido
    extra = 1
    autocomplete_fields = ('art_codi',)
    readonly_fields = ('dpe_prec', 'dpe_subt')


# =======================
# Carrito
# =======================
@admin.register(CarritoItem)
class CarritoItemAdmin(admin.ModelAdmin):
    list_display = ('cli_codi', 'art_codi', 'cantidad', 'art_pfin', 'fecha_agregado')
    list_filter = ('fecha_agregado', 'fecha_actualizado', 'cli_codi')
    search_fields = (
        'cli_codi__cli_nomb',
        'cli_codi__cli_doc',
        'art_codi__art_nomb',
    )
    search_help_text = "Buscar por cliente o artículo."
    autocomplete_fields = ('cli_codi', 'art_codi')
    date_hierarchy = 'fecha_agregado'
    list_select_related = ('cli_codi', 'art_codi')
    readonly_fields = ('fecha_agregado', 'fecha_actualizado')
    
    fieldsets = (
        ('Cliente', {
            'fields': ('cli_codi',)
        }),
        ('Artículo', {
            'fields': ('art_codi', 'cantidad')
        }),
        ('Precios guardados', {
            'fields': ('art_pnet', 'art_pfin'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('fecha_agregado', 'fecha_actualizado'),
            'classes': ('collapse',)
        }),
    )


# =======================
# Pedidos
# =======================
@admin.register(Pedidos)
class PedidosAdmin(admin.ModelAdmin):
    list_display = (
        'ped_codi',
        'cli_codi',
        'ped_esta',
        'ped_tota',
        'ped_fech',
        'ped_fpag',
        'ped_exp',
        'ped_fech_exp',
    )

    list_filter = (
        'ped_esta',
        'ped_fpag',
        'ped_fech',
        'ped_exp',
    )
    
    search_fields = ('ped_codi', 'cli_codi__cli_nomb', 'cli_codi__cli_doc')
    search_help_text = "Buscar por código de pedido, nombre o documento del cliente."

    autocomplete_fields = ('cli_codi',)
    date_hierarchy = 'ped_fech'
    list_select_related = ('cli_codi',)

    readonly_fields = ('ped_tota', 'ped_fech', 'ped_exp', 'ped_fech_exp')
    

    inlines = [DetallePedidoInline]

    def get_readonly_fields(self, request, obj=None):
        if obj and obj.ped_esta in ('F', 'C'):
            return [field.name for field in self.model._meta.fields]
        return self.readonly_fields


# =======================
# Cuentas Bancarias
# =======================
@admin.register(CuentaBancaria)
class CuentaBancariaAdmin(admin.ModelAdmin):
    list_display = (
        'bco_nomb',
        'bco_ali',
        'bco_titu',
        'bco_tip',
        'bco_acti',
        'bco_fchc',
    )

    list_filter = (
        'bco_acti',
        'bco_tip',
        'bco_fchc',
    )

    search_fields = (
        'bco_nomb',
        'bco_ali',
        'bco_titu',
        'bco_cuit',
        'bco_cbu'
    )
    search_help_text = "Buscar por nombre banco, alias, titular, CUIT o CBU."

    readonly_fields = ('bco_fchc', 'bco_fmod')

    fieldsets = (
        ('Información Banco', {
            'fields': ('bco_nomb', 'bco_tip')
        }),
        ('Información Cuenta', {
            'fields': ('bco_num', 'bco_cbu', 'bco_ali')
        }),
        ('Información Titular', {
            'fields': ('bco_titu', 'bco_cuit')
        }),
        ('Configuración', {
            'fields': ('bco_acti', 'bco_obs'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('bco_fchc', 'bco_fmod'),
            'classes': ('collapse',)
        }),
    )

    date_hierarchy = 'bco_fchc'
    list_editable = ('bco_acti',)
    list_per_page = 20


# =======================
# Vendedor
# =======================
@admin.register(Vendedor)
class VendedorAdmin(admin.ModelAdmin):
    list_display = (
        'ven_codi',
        'ven_nomb',
        'ven_doc',
        'ven_usua',
        'ven_actv',
        'ven_emai',
        'loc_codi',
    )

    list_filter = (
        'ven_actv',
        'loc_codi',
        'ven_fchc',
    )

    search_fields = (
        'ven_nomb',
        'ven_doc',
        'ven_usua',
        'ven_emai',
    )
    search_help_text = "Buscar por nombre, documento, usuario o email."

    readonly_fields = ('ven_codi', 'ven_fchc', 'ven_fmod')

    fieldsets = (
        ('Información Personal', {
            'fields': ('ven_codi', 'ven_nomb', 'ven_doc', 'ven_fnac', 'ven_cuit')
        }),
        ('Contacto', {
            'fields': ('ven_emai', 'ven_tele', 'loc_codi', 'ven_dom', 'ven_bar')
        }),
        ('Acceso al Sistema', {
            'fields': ('ven_usua', 'ven_pass', 'ven_actv'),
            'description': 'Configure el acceso del vendedor al panel de supervisión'
        }),
        ('Timestamps', {
            'fields': ('ven_fchc', 'ven_fmod'),
            'classes': ('collapse',)
        }),
    )

    date_hierarchy = 'ven_fchc'
    list_per_page = 25

    def save_model(self, request, obj, form, change):
        """Hashear contraseña automáticamente si se ingresa una nueva"""
        from django.contrib.auth.hashers import make_password
        
        if obj.ven_pass:
            # Solo hashear si no está ya hasheada
            if not obj.ven_pass.startswith('pbkdf2_sha256$'):
                if change:
                    # Si es update, verificar si cambió
                    try:
                        original = Vendedor.objects.get(pk=obj.pk)
                        if obj.ven_pass != original.ven_pass:
                            obj.ven_pass = make_password(obj.ven_pass)
                    except Vendedor.DoesNotExist:
                        obj.ven_pass = make_password(obj.ven_pass)
                else:
                    # Si es nuevo, hashear
                    obj.ven_pass = make_password(obj.ven_pass)
        
        super().save_model(request, obj, form, change)