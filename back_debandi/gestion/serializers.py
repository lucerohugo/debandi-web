from rest_framework import serializers
from .models import (
    Provincia, Localidad, Zona, Marca, Rubro, SubRubro, Articulo,
    Clientes, Favoritos, CarritoItem, Pedidos, DetallePedido,
    CuentaBancaria, General, Usuario, Vendedor, Registro, Novedades
)


def build_media_url(request, image_field):
    """Retorna la URL absoluta de un ImageField, o None si está vacío"""
    if not image_field:
        return None
    if request:
        return request.build_absolute_uri(image_field.url)
    return f"/media/{image_field.name}"


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

    class Meta:
        model = Localidad
        fields = ['loc_codi', 'loc_nomb', 'loc_cpos', 'pci_codi', 'pci_nomb']


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
    mar_nomb = serializers.CharField(source='mar_codi.mar_nomb', read_only=True, allow_null=True)
    sru_nomb = serializers.CharField(source='sru_codi.sru_nomb', read_only=True, allow_null=True)
    rub_nomb = serializers.CharField(source='sru_codi.rub_codi.rub_nomb', read_only=True, allow_null=True)
    art_img1_url = serializers.SerializerMethodField()
    art_img2_url = serializers.SerializerMethodField()
    art_img3_url = serializers.SerializerMethodField()

    class Meta:
        model = Articulo
        fields = [
            'art_codi', 'art_nomb', 'art_desc', 'art_palac', 'art_cn',
            'art_pnet', 'art_pfin', 'art_cost', 'art_cdol', 'art_uti1',
            'art_stk', 'art_descu',
            'art_xbul', 'art_ubul',
            'mar_codi', 'mar_nomb', 'sru_codi', 'sru_nomb', 'rub_nomb',
            'art_tiva', 'art_depo', 'art_mext',
            'art_acti', 'art_visw', 'art_carru', 'art_prodr',
            'art_img1', 'art_img2', 'art_img3',
            'art_img1_url', 'art_img2_url', 'art_img3_url',
            'art_fchc', 'art_fmod'
        ]
        read_only_fields = ['art_codi', 'art_fchc', 'art_fmod', 'art_pfin']

    def get_art_img1_url(self, obj):
        return build_media_url(self.context.get('request'), obj.art_img1)

    def get_art_img2_url(self, obj):
        return build_media_url(self.context.get('request'), obj.art_img2)

    def get_art_img3_url(self, obj):
        return build_media_url(self.context.get('request'), obj.art_img3)


class ArticuloFrontendSerializer(serializers.ModelSerializer):
    """Serializer para frontend con camelCase"""
    codigoArticulo = serializers.IntegerField(source='art_codi')
    descripcion = serializers.CharField(source='art_nomb')
    palabrasClaves = serializers.CharField(source='art_palac', allow_null=True)
    marca = serializers.CharField(source='mar_codi.mar_nomb')
    precioNeto = serializers.DecimalField(source='art_pnet', max_digits=12, decimal_places=2)
    precioFinal = serializers.DecimalField(source='art_pfin', max_digits=12, decimal_places=2)
    imagen = serializers.SerializerMethodField()
    imagenes = serializers.SerializerMethodField()

    class Meta:
        model = Articulo
        fields = [
            'codigoArticulo', 'descripcion', 'palabrasClaves', 'marca',
            'precioNeto', 'precioFinal', 'imagen', 'imagenes'
        ]

    def get_imagen(self, obj):
        """Imagen principal (compatibilidad hacia atrás)"""
        return build_media_url(self.context.get('request'), obj.art_img1)

    def get_imagenes(self, obj):
        """Lista de todas las imágenes del artículo (sin las vacías)"""
        request = self.context.get('request')
        urls = [
            build_media_url(request, obj.art_img1),
            build_media_url(request, obj.art_img2),
            build_media_url(request, obj.art_img3),
        ]
        return [url for url in urls if url]


# ================================================================
# NOVEDADES
# ================================================================

class NovedadesSerializer(serializers.ModelSerializer):
    """Serializer para Novedades"""
    articulo = ArticuloFrontendSerializer(source='art_carru', read_only=True)
    nov_img_url = serializers.SerializerMethodField()

    class Meta:
        model = Novedades
        fields = [
            'nov_codi', 'nov_nomb', 'nov_titl', 'nov_desc', 'nov_img', 'nov_img_url',
            'nov_cate', 'nov_acti', 'art_carru', 'articulo', 'nov_bann', 'nov_prodr', 
            'nov_fechi', 'nov_fechf'
        ]
        read_only_fields = ['nov_codi', 'nov_img_url', 'articulo']
        extra_kwargs = {
            'nov_img': {'write_only': True}  # Solo para recibir, no devolver
        }
    
    def get_nov_img_url(self, obj):
        """Retorna URL completa de la imagen del banner"""
        if obj.nov_img:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.nov_img.url)
            return f"/media/{obj.nov_img.name}"
        return None


# ================================================================
# PERSONAS
# ================================================================

class ClientesSerializer(serializers.ModelSerializer):
    loc_nomb = serializers.CharField(source='loc_codi.loc_nomb', read_only=True)
    zon_nomb = serializers.CharField(source='zon_codi.zon_nomb', read_only=True)

    class Meta:
        model = Clientes
        fields = [
            'cli_codi', 'cli_nomb', 'cli_fnac', 'cli_tdoc', 'cli_ndoc', 'cli_cuit',
            'cli_emai', 'cli_celu', 'cli_tele', 'cli_dire', 'cli_bar',
            'cli_estc', 'cli_ocup', 'cli_desc', 'cli_precs1', 'cli_precs2',
            'loc_codi', 'loc_nomb', 'zon_codi', 'zon_nomb', 'ven_codi', 'cli_acti',
            'cli_clav', 'cli_fchc', 'cli_fmod'
        ]
        read_only_fields = ['cli_codi', 'cli_fchc', 'cli_fmod', 'cli_clav']


class RegistroSerializer(serializers.ModelSerializer):
    """Serializer para registro de nuevos clientes"""
    
    class Meta:
        model = Registro
        fields = [
            'reg_codi', 'reg_nomb', 'reg_doc', 'reg_cuit', 'reg_emai', 'reg_celu', 'reg_clav',
            'reg_civa', 'reg_clie', 'reg_fchc', 'reg_fmod'
        ]
        read_only_fields = ['reg_codi', 'reg_fchc', 'reg_fmod']
        extra_kwargs = {
            'reg_clav': {'write_only': True}  # No retornar contraseña
        }

    def create(self, validated_data):
        """Crear registro con contraseña hasheada"""
        password = validated_data.pop('reg_clav', None)
        registro = Registro(**validated_data)
        if password:
            registro.set_password(password)
        registro.save()
        return registro

    def to_representation(self, instance):
        """reg_clav es write_only (nunca se expone el hash); en su lugar devolvemos
        la contraseña tal cual la mandó el front, para el export a GeneXus."""
        ret = super().to_representation(instance)
        ret['reg_clav'] = instance.reg_clavf or ''
        ret['reg_clie'] = 'S' if instance.reg_clie else 'N'
        return ret


class VendedorSerializer(serializers.ModelSerializer):
    loc_nomb = serializers.CharField(source='loc_codi.loc_nomb', read_only=True, allow_null=True)

    class Meta:
        model = Vendedor
        fields = [
            'ven_codi', 'ven_nomb', 'ven_doc', 'ven_fnac', 'ven_emai',
            'ven_tele', 'ven_dom', 'ven_bar', 'ven_cuit',
            'ven_usua', 'ven_clav', 'ven_actv', 'ven_gere', 'loc_codi', 'loc_nomb',
            'ven_fchc', 'ven_fmod'
        ]
        read_only_fields = ['ven_codi', 'ven_fchc', 'ven_fmod', 'ven_clav']


# ================================================================
# FAVORITOS Y CARRITO
# ================================================================

class FavoritosSerializer(serializers.ModelSerializer):
    art_nomb = serializers.CharField(source='art_codi.art_nomb', read_only=True)
    art_desc = serializers.CharField(source='art_codi.art_desc', read_only=True)
    art_pnet = serializers.DecimalField(source='art_codi.art_pnet', max_digits=12, decimal_places=2, read_only=True)
    art_pfin = serializers.DecimalField(source='art_codi.art_pfin', max_digits=12, decimal_places=2, read_only=True)
    art_stk = serializers.IntegerField(source='art_codi.art_stk', read_only=True)
    art_img_url = serializers.SerializerMethodField()
    mar_nomb = serializers.CharField(source='art_codi.mar_codi.mar_nomb', read_only=True)
    sru_nomb = serializers.CharField(source='art_codi.sru_codi.sru_nomb', read_only=True)
    rub_nomb = serializers.CharField(source='art_codi.rub_codi.rub_nomb', read_only=True)
    art_acti = serializers.BooleanField(source='art_codi.art_acti', read_only=True)

    class Meta:
        model = Favoritos
        fields = [
            'fav_codi', 'cli_codi', 'art_codi', 'art_nomb', 'art_desc', 'art_pnet',
            'art_pfin', 'art_stk', 'art_img_url', 'art_acti', 'mar_nomb', 'sru_nomb',
            'rub_nomb', 'fav_fecha'
        ]
        read_only_fields = ['fav_codi', 'fav_fecha']

    def get_art_img_url(self, obj):
        return build_media_url(self.context.get('request'), obj.art_codi.art_img1)


class CarritoItemSerializer(serializers.ModelSerializer):
    art_nomb = serializers.CharField(source='art_codi.art_nomb', read_only=True)
    art_desc = serializers.CharField(source='art_codi.art_desc', read_only=True)
    art_pnet = serializers.DecimalField(source='art_codi.art_pnet', max_digits=12, decimal_places=2, read_only=True)
    art_pfin = serializers.DecimalField(source='art_codi.art_pfin', max_digits=12, decimal_places=2, read_only=True)
    art_tiva = serializers.DecimalField(source='art_codi.art_tiva', max_digits=5, decimal_places=2, read_only=True)
    art_stk = serializers.IntegerField(source='art_codi.art_stk', read_only=True)
    art_img = serializers.SerializerMethodField()
    mar_nomb = serializers.CharField(source='art_codi.mar_codi.mar_nomb', read_only=True)
    rub_nomb = serializers.CharField(source='art_codi.sru_codi.rub_codi.rub_nomb', read_only=True, allow_null=True)
    sru_nomb = serializers.CharField(source='art_codi.sru_codi.sru_nomb', read_only=True, allow_null=True)
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = CarritoItem
        fields = [
            'carr_codi', 'cli_codi', 'art_codi', 'art_nomb', 'art_desc',
            'art_pnet', 'art_pfin', 'art_tiva', 'art_stk', 'art_img',
            'mar_nomb', 'rub_nomb', 'sru_nomb',
            'carr_cant', 'carr_pnet', 'carr_pfin',
            'subtotal', 'carr_fech', 'carr_fmod'
        ]
        read_only_fields = ['carr_codi', 'carr_fech', 'carr_fmod']

    def get_art_img(self, obj):
        return build_media_url(self.context.get('request'), obj.art_codi.art_img1)

    def get_subtotal(self, obj):
        # Usar carr_pfin si está disponible, sino usar art_pfin del artículo
        price = obj.carr_pfin or obj.art_codi.art_pfin
        if price:
            return price * obj.carr_cant
        return 0


# ================================================================
# PEDIDOS Y DETALLES
# ================================================================

class DetallePedidoSerializer(serializers.ModelSerializer):
    """Serializer para líneas de pedido con datos del artículo"""
    art_nomb = serializers.CharField(source='art_codi.art_nomb', read_only=True)
    art_pnet = serializers.DecimalField(
        source='art_codi.art_pnet',
        max_digits=12,
        decimal_places=2,
        read_only=True
    )
    art_pfin = serializers.SerializerMethodField()
    art_descu = serializers.DecimalField(
        source='art_codi.art_descu',
        max_digits=12,
        decimal_places=2,
        read_only=True
    )
    art_stk = serializers.IntegerField(
        source='art_codi.art_stk',
        read_only=True
    )
    art_img1_url = serializers.SerializerMethodField()

    class Meta:
        model = DetallePedido
        fields = [
            'dpe_codi', 'ped_codi', 'art_codi', 'art_nomb', 'dpe_cant',
            'art_pnet', 'art_pfin', 'art_descu', 'art_stk', 'art_img1_url'
        ]
        read_only_fields = ['dpe_codi', 'ped_codi', 'art_nomb', 'art_pnet', 'art_pfin', 'art_descu', 'art_stk', 'art_img1_url']

    def get_art_pfin(self, obj):
        return obj.precio_final

    def get_art_img1_url(self, obj):
        return build_media_url(self.context.get('request'), obj.art_codi.art_img1)


class DetallePedidoWriteSerializer(serializers.ModelSerializer):
    """Serializer para crear/actualizar detalles de pedido - requiere art_codi y dpe_cant"""
    class Meta:
        model = DetallePedido
        fields = ['art_codi', 'dpe_cant']


class PedidosSerializer(serializers.ModelSerializer):
    """Serializer para pedidos con detalles anidados - SOLO LECTURA de detalles"""
    cli_nomb = serializers.CharField(source='cli_codi.cli_nomb', read_only=True)
    cli_ndoc = serializers.CharField(source='cli_codi.cli_ndoc', read_only=True, allow_null=True)
    cli_emai = serializers.CharField(source='cli_codi.cli_emai', read_only=True, allow_null=True)
    cli_tele = serializers.CharField(source='cli_codi.cli_tele', read_only=True, allow_null=True)
    cli_dire = serializers.CharField(source='cli_codi.cli_dire', read_only=True, allow_null=True)
    detalles = DetallePedidoSerializer(many=True, read_only=True)
    ped_fechCr = serializers.DateTimeField(format='%d/%m/%Y %H:%M:%S', read_only=True)
    ped_fechEd = serializers.DateTimeField(format='%d/%m/%Y %H:%M:%S', read_only=True)

    class Meta:
        model = Pedidos
        fields = [
            'ped_codi', 'ped_fech', 'ped_hora', 'cli_codi', 'cli_nomb', 'cli_ndoc', 'cli_emai', 'cli_tele', 'cli_dire',
            'ped_tota', 'ped_fpag',
            'ped_exp', 'ped_fexp',
            'ped_crea', 'ped_fechCr', 'ped_edit', 'ped_fechEd',
            'detalles'
        ]
        read_only_fields = [
            'ped_codi', 'ped_tota', 'ped_fexp', 'cli_nomb', 'cli_ndoc', 'cli_emai', 'cli_tele', 'cli_dire',
            'ped_crea', 'ped_fechCr', 'ped_edit', 'ped_fechEd',
        ]

    def validate_cli_codi(self, value):
        """Validar que el cliente exista"""
        if not value:
            raise serializers.ValidationError("El cliente es requerido")
        return value

    def validate_ped_fpag(self, value):
        """Validar que la forma de pago sea válida"""
        valid_choices = [choice[0] for choice in Pedidos.FORMA_PAGO_CHOICES]
        if value not in valid_choices:
            raise serializers.ValidationError(f"Forma de pago inválida. Válidas: {valid_choices}")
        return value


class PedidosCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer para crear/actualizar pedidos CON DETALLES ANIDADOS"""
    detalles = DetallePedidoWriteSerializer(many=True, required=True)
    cli_nomb = serializers.CharField(source='cli_codi.cli_nomb', read_only=True)
    ped_fechCr = serializers.DateTimeField(format='%d/%m/%Y %H:%M:%S', read_only=True)
    ped_fechEd = serializers.DateTimeField(format='%d/%m/%Y %H:%M:%S', read_only=True)

    class Meta:
        model = Pedidos
        fields = [
            'ped_codi', 'ped_fech', 'cli_codi', 'cli_nomb', 'ped_tota', 'ped_fpag', 'ped_exp', 'ped_fexp',
            'ped_crea', 'ped_fechCr', 'ped_edit', 'ped_fechEd',
            'detalles',
        ]
        read_only_fields = [
            'ped_codi', 'ped_tota', 'ped_fexp', 'cli_nomb',
            'ped_crea', 'ped_fechCr', 'ped_edit', 'ped_fechEd',
        ]

    def validate_detalles(self, value):
        """Validar que haya al menos un detalle"""
        if not value:
            raise serializers.ValidationError("El pedido debe tener al menos un detalle")
        return value

    def validate(self, data):
        """Validar datos globales"""
        if not data.get('cli_codi'):
            raise serializers.ValidationError({"cli_codi": "El cliente es requerido"})
        if not data.get('ped_fpag'):
            raise serializers.ValidationError({"ped_fpag": "La forma de pago es requerida"})
        return data

    def create(self, validated_data):
        """Crear pedido con sus detalles anidados"""
        detalles_data = validated_data.pop('detalles')
        
        # Crear el pedido
        pedido = Pedidos.objects.create(**validated_data)
        
        # Crear los detalles
        for detalle_data in detalles_data:
            try:
                DetallePedido.objects.create(ped_codi=pedido, **detalle_data)
            except Exception as e:
                # Si hay error al crear detalle, eliminar el pedido y sus detalles
                pedido.delete()
                raise serializers.ValidationError(f"Error al crear detalle: {str(e)}")
        
        return pedido

    def update(self, instance, validated_data):
        """Actualizar pedido: cabecera + eliminar detalles viejos + crear nuevos"""
        # Validar que el pedido pueda modificarse (ped_exp = False)
        if not instance.puede_modificarse():
            raise serializers.ValidationError("No se puede modificar un pedido que ya ha sido procesado")
        
        detalles_data = validated_data.pop('detalles', None)
        
        # Actualizar campos de la cabecera (excepto cli_codi y ped_fpag que no se editan)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Si vienen detalles, actualizar completamente
        if detalles_data is not None:
            try:
                # Eliminar detalles viejos (el modelo se encarga de devolver stock)
                instance.detalles.all().delete()
                
                # Crear nuevos detalles
                for detalle_data in detalles_data:
                    DetallePedido.objects.create(ped_codi=instance, **detalle_data)
                
                # Actualizar total
                instance.actualizar_total()
            except Exception as e:
                raise serializers.ValidationError(f"Error al actualizar detalles: {str(e)}")
        
        return instance


class PedidosCompletoSerializer(PedidosSerializer):
    """Serializer completo para lectura - hereda de PedidosSerializer"""
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
            'gen_loc', 'gen_dire', 'gen_tele', 'gen_emai', 'gen_dola'
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


