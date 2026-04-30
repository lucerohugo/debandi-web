from rest_framework import serializers
from .models import (
    Provincia, Localidad, Zona, Marca, Rubro, SubRubro, Articulo,
    Clientes, Favoritos, CarritoItem, Pedidos, DetallePedido,
    CuentaBancaria, General, Usuario, Vendedor
)


# ================================================================
# UBICACIONES GEOGRÁFICAS
# ================================================================

class ProvinciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Provincia
        fields = ['pci_codi', 'pci_nomb']


class ZonaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Zona
        fields = ['zon_codi', 'zon_nomb']


class LocalidadSerializer(serializers.ModelSerializer):
    pci_nomb = serializers.CharField(source='pci_codi.pci_nomb', read_only=True)
    zon_nomb = serializers.CharField(source='zon_codi.zon_nomb', read_only=True)

    class Meta:
        model = Localidad
        fields = ['loc_codi', 'loc_nomb', 'loc_cpos', 'pci_codi', 'pci_nomb', 'zon_codi', 'zon_nomb']


class LocalidadFrontendSerializer(serializers.ModelSerializer):
    """Serializer para frontend con nombres camelCase"""
    codigoPostal = serializers.CharField(source='loc_cpos', read_only=True)
    codigo = serializers.IntegerField(source='loc_codi')
    nombre = serializers.CharField(source='loc_nomb')
    provinciaId = serializers.IntegerField(source='pci_codi.pci_codi')
    provincia = serializers.CharField(source='pci_codi.pci_nomb')

    class Meta:
        model = Localidad
        fields = ['codigo', 'nombre', 'codigoPostal', 'provinciaId', 'provincia']


# ================================================================
# CATÁLOGO
# ================================================================

class MarcaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Marca
        fields = ['mar_codi', 'mar_nomb']


class RubroSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rubro
        fields = ['rub_codi', 'rub_nomb']


class SubrubroSerializer(serializers.ModelSerializer):
    rub_nomb = serializers.CharField(source='rub_codi.rub_nomb', read_only=True)

    class Meta:
        model = SubRubro
        fields = ['sru_codi', 'sru_nomb', 'rub_codi', 'rub_nomb']


class ArticuloSerializer(serializers.ModelSerializer):
    mar_nomb = serializers.CharField(source='mar_codi.mar_nomb', read_only=True)
    sru_nomb = serializers.CharField(source='sru_codi.sru_nomb', read_only=True, allow_null=True)
    rub_nomb = serializers.CharField(source='sru_codi.rub_codi.rub_nomb', read_only=True, allow_null=True)
    art_img_url = serializers.SerializerMethodField()

    class Meta:
        model = Articulo
        fields = [
            'art_codi', 'art_nomb', 'art_desc',
            'art_pnet', 'art_pfin', 'art_cost',
            'art_stkp', 'art_stkmin', 'art_stkmax',
            'art_xbul', 'art_ubul',
            'mar_codi', 'mar_nomb', 'sru_codi', 'sru_nomb', 'rub_nomb',
            'art_tiva', 'art_depo', 'art_mext',
            'art_acti', 'art_visw', 'art_img', 'art_img_url',
            'art_fchc', 'art_fmod'
        ]
        read_only_fields = ['art_codi', 'art_fchc', 'art_fmod', 'art_pfin']

    def get_art_img_url(self, obj):
        """Retorna URL completa de la imagen del artículo"""
        if obj.art_img:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.art_img.url)
            return f"/media/{obj.art_img.name}"
        return None


class ArticuloFrontendSerializer(serializers.ModelSerializer):
    """Serializer para frontend con camelCase"""
    codigoArticulo = serializers.IntegerField(source='art_codi')
    descripcion = serializers.CharField(source='art_nomb')
    marca = serializers.CharField(source='mar_codi.mar_nomb')
    precioNeto = serializers.DecimalField(source='art_pnet', max_digits=12, decimal_places=2)
    precioFinal = serializers.DecimalField(source='art_pfin', max_digits=12, decimal_places=2)
    imagen = serializers.SerializerMethodField()

    class Meta:
        model = Articulo
        fields = [
            'codigoArticulo', 'descripcion', 'marca',
            'precioNeto', 'precioFinal', 'imagen'
        ]

    def get_imagen(self, obj):
        if obj.art_img:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.art_img.url)
            return f"/media/{obj.art_img.name}"
        return None


# ================================================================
# PERSONAS
# ================================================================

class ClientesSerializer(serializers.ModelSerializer):
    loc_nomb = serializers.CharField(source='loc_codi.loc_nomb', read_only=True)

    class Meta:
        model = Clientes
        fields = [
            'cli_codi', 'cli_nomb', 'cli_fnac', 'cli_tdoc', 'cli_ndoc', 'cli_cuit',
            'cli_emai', 'cli_celu', 'cli_tele', 'cli_dire', 'cli_bar',
            'cli_estc', 'cli_ocup', 'loc_codi', 'loc_nomb', 'ven_codi',
            'cli_clav', 'cli_fchc', 'cli_fmod'
        ]
        read_only_fields = ['cli_codi', 'cli_fchc', 'cli_fmod', 'cli_clav']


class VendedorSerializer(serializers.ModelSerializer):
    loc_nomb = serializers.CharField(source='loc_codi.loc_nomb', read_only=True, allow_null=True)

    class Meta:
        model = Vendedor
        fields = [
            'ven_codi', 'ven_nomb', 'ven_doc', 'ven_fnac', 'ven_emai',
            'ven_tele', 'ven_dom', 'ven_bar', 'ven_cuit',
            'ven_usua', 'ven_clav', 'ven_actv', 'loc_codi', 'loc_nomb',
            'ven_fchc', 'ven_fmod'
        ]
        read_only_fields = ['ven_codi', 'ven_fchc', 'ven_fmod', 'ven_clav']


# ================================================================
# FAVORITOS Y CARRITO
# ================================================================

class FavoritosSerializer(serializers.ModelSerializer):
    art_nomb = serializers.CharField(source='art_codi.art_nomb', read_only=True)
    art_pfin = serializers.DecimalField(source='art_codi.art_pfin', max_digits=12, decimal_places=2, read_only=True)
    art_img_url = serializers.SerializerMethodField()

    class Meta:
        model = Favoritos
        fields = ['fav_codi', 'cli_codi', 'art_codi', 'art_nomb', 'art_pfin', 'art_img_url', 'fav_fecha']
        read_only_fields = ['fav_codi', 'fav_fecha']

    def get_art_img_url(self, obj):
        if obj.art_codi.art_img:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.art_codi.art_img.url)
            return f"/media/{obj.art_codi.art_img.name}"
        return None


class CarritoItemSerializer(serializers.ModelSerializer):
    art_nomb = serializers.CharField(source='art_codi.art_nomb', read_only=True)
    art_desc = serializers.CharField(source='art_codi.art_desc', read_only=True)
    art_pnet = serializers.DecimalField(source='art_codi.art_pnet', max_digits=12, decimal_places=2, read_only=True)
    art_pfin = serializers.DecimalField(source='art_codi.art_pfin', max_digits=12, decimal_places=2, read_only=True)
    art_stkp = serializers.IntegerField(source='art_codi.art_stkp', read_only=True)
    art_img = serializers.SerializerMethodField()
    mar_nomb = serializers.CharField(source='art_codi.mar_codi.mar_nomb', read_only=True)
    rub_nomb = serializers.CharField(source='art_codi.sru_codi.rub_codi.rub_nomb', read_only=True, allow_null=True)
    sru_nomb = serializers.CharField(source='art_codi.sru_codi.sru_nomb', read_only=True, allow_null=True)
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = CarritoItem
        fields = [
            'carr_codi', 'cli_codi', 'art_codi', 'art_nomb', 'art_desc',
            'art_pnet', 'art_pfin', 'art_stkp', 'art_img',
            'mar_nomb', 'rub_nomb', 'sru_nomb',
            'carr_cant', 'carr_pnet', 'carr_pfin',
            'subtotal', 'carr_fech', 'carr_fmod'
        ]
        read_only_fields = ['carr_codi', 'carr_fech', 'carr_fmod']

    def get_art_img(self, obj):
        if obj.art_codi.art_img:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.art_codi.art_img.url)
            return f"/media/{obj.art_codi.art_img.name}"
        return None

    def get_subtotal(self, obj):
        # Usar carr_pfin si está disponible, sino usar art_pfin del artículo
        price = obj.carr_pfin or obj.art_codi.art_pfin
        if price:
            return price * obj.carr_cant
        return 0


# ================================================================
# PEDIDOS
# ================================================================

class DetallePedidoSerializer(serializers.ModelSerializer):
    art_nomb = serializers.CharField(source='art_codi.art_nomb', read_only=True)
    art_img_url = serializers.SerializerMethodField()

    class Meta:
        model = DetallePedido
        fields = [
            'dpe_codi', 'dpe_ped', 'art_codi', 'art_nomb',
            'dpe_cant', 'dpe_prec', 'dpe_des', 'dpe_subt',
            'art_img_url'
        ]
        read_only_fields = ['dpe_codi', 'dpe_subt']

    def get_art_img_url(self, obj):
        if obj.art_codi.art_img:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.art_codi.art_img.url)
            return f"/media/{obj.art_codi.art_img.name}"
        return None


class PedidosSerializer(serializers.ModelSerializer):
    cli_nomb = serializers.CharField(source='cli_codi.cli_nomb', read_only=True, allow_null=True)
    detalles = DetallePedidoSerializer(many=True, read_only=True)

    class Meta:
        model = Pedidos
        fields = [
            'ped_codi', 'cli_codi', 'cli_nomb',
            'ped_esta', 'ped_tota', 'ped_fech', 'ped_fpag',
            'bco_codi', 'ped_exp', 'ped_fexp',
            'detalles'
        ]
        read_only_fields = ['ped_codi', 'ped_fexp']

    def create(self, validated_data):
        """Crear pedido y sincronizar cliente si es necesario"""
        pedido = super().create(validated_data)
        if pedido.cli_codi:
            self._sincronizar_cliente(pedido)
        return pedido

    def update(self, instance, validated_data):
        """Actualizar pedido y sincronizar cliente"""
        pedido = super().update(instance, validated_data)
        if pedido.cli_codi:
            self._sincronizar_cliente(pedido)
        return pedido

    def _sincronizar_cliente(self, pedido):
        """Sincronizar datos del cliente en la tabla Clientes"""
        if not pedido.cli_codi:
            return
        cliente = pedido.cli_codi
        cliente.cli_tele = pedido.cli_codi.cli_tele or cliente.cli_tele
        cliente.cli_celu = pedido.cli_codi.cli_celu or cliente.cli_celu
        cliente.cli_emai = pedido.cli_codi.cli_emai or cliente.cli_emai
        cliente.save()


class PedidosCompletoSerializer(PedidosSerializer):
    """Serializer completo - hereda de PedidosSerializer"""
    class Meta(PedidosSerializer.Meta):
        pass


# ================================================================
# CONFIGURACIÓN
# ================================================================

class CuentaBancariaSerializer(serializers.ModelSerializer):
    class Meta:
        model = CuentaBancaria
        fields = [
            'bco_codi', 'bco_nomb', 'bco_titu', 'bco_cuit',
            'bco_tip', 'bco_num', 'bco_cbu', 'bco_ali',
            'bco_acti', 'bco_fchc', 'bco_fmod'
        ]
        read_only_fields = ['bco_codi', 'bco_fchc', 'bco_fmod']


class GeneralSerializer(serializers.ModelSerializer):
    gen_logo_url = serializers.SerializerMethodField()
    gen_loge_url = serializers.SerializerMethodField()

    class Meta:
        model = General
        fields = [
            'gen_codi', 'gen_nomb', 'gen_raz', 'gen_logo', 'gen_logo_url',
            'gen_loge', 'gen_loge_url', 'gen_cuit', 'gen_colo',
            'gen_loc', 'gen_dire', 'gen_tele', 'gen_emai'
        ]
        read_only_fields = ['gen_codi', 'gen_logo_url', 'gen_loge_url']

    def get_gen_logo_url(self, obj):
        """Retorna URL completa del logo de Debandi"""
        if obj.gen_logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.gen_logo.url)
            return f"/media/{obj.gen_logo.name}"
        return None

    def get_gen_loge_url(self, obj):
        """Retorna URL completa del logo de BrixSoft"""
        if obj.gen_loge:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.gen_loge.url)
            return f"/media/{obj.gen_loge.name}"
        return None


class UsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = ['id', 'usu_nomb', 'usu_rol', 'usu_perf', 'usu_fcre']
        read_only_fields = ['usu_fcre']


