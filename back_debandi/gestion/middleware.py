"""
Corta CUALQUIER request a la API hecha con el JWT de un vendedor dado de
baja (ven_actv != 1) mientras navega el panel vendedor/clientes o está
suplantando a un cliente.

Solo toca el caso vendedor a propósito: el lado cliente (cli_acti) ya
funciona bien tal cual está -se corta al agregar al carrito o hacer un
pedido, ver carrito_manage/crear_pedido_desde_carrito- y no se tocó acá.

El JWT sigue siendo válido hasta que vence (no hay forma de invalidarlo
del lado del server con SimpleJWT sin blacklist), así que sin este
middleware un vendedor desactivado podía seguir navegando cualquier
sección (listado de productos, favoritos, inicio, etc.) sin que nadie lo
frenara: antes solo se chequeaba puntualmente en un par de endpoints de
escritura (agregar al carrito, crear pedido) vía
_vendedor_suplantante_bloqueado. Corriendo esto antes de cualquier vista,
se corta apenas hace la primera request a la que sea, vaya donde vaya.

Reutiliza el mismo mecanismo que ya existía para cliente (JWT + código
VENDEDOR_INACTIVO + SESION_BLOQUEADA_CODES del lado del frontend en
api.service.ts), solo que ahora corre en cada request en vez de en dos
endpoints nada más.
"""
from django.http import JsonResponse
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError


class SesionBloqueadaMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        bloqueo = self._verificar_sesion(request)
        if bloqueo is not None:
            return bloqueo
        return self.get_response(request)

    def _verificar_sesion(self, request):
        if not request.path.startswith('/api/'):
            return None

        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth_header.startswith('Bearer '):
            return None

        try:
            token = AccessToken(auth_header[7:].strip())
        except TokenError:
            # Token ausente/corrupto/vencido: el frontend debería renovarlo
            # con el refresh token (ver ApiService) antes de repetir la
            # request. No es responsabilidad de este middleware.
            return None

        ven_codi = token.get('vendedor_suplantante')
        if not ven_codi:
            return None

        from .models import Vendedor

        vendedor = Vendedor.objects.filter(ven_codi=ven_codi).first()
        if vendedor is None or vendedor.ven_actv != 1:
            return JsonResponse(
                {
                    'success': False,
                    'detail': 'Sesión inválida.',
                    'code': 'VENDEDOR_INACTIVO',
                },
                status=403,
            )

        return None
