"""
Corta CUALQUIER request a la API hecha con el JWT de un vendedor dado de
baja (ven_actv != 1) o de un cliente dado de baja (cli_acti=False) que
inició sesión directo (sin vendedor de por medio).

El JWT sigue siendo válido hasta que vence (no hay forma de invalidarlo
del lado del server con SimpleJWT sin blacklist), así que sin este
middleware alguien desactivado podía seguir navegando cualquier sección
(listado de productos, favoritos, inicio, etc.) sin que nadie lo frenara:
antes solo se chequeaba puntualmente en un par de endpoints de escritura
(agregar al carrito, crear pedido). Corriendo esto antes de cualquier
vista, se corta apenas hace la primera request a la que sea, vaya donde
vaya, sin esperar a que "toque" alguna de esas acciones puntuales.

Nota: cuando el JWT trae 'vendedor_suplantante' (login de vendedor, ver
vendedor_login), el 'user_id'/cli_codi que codifica es solo un cliente
placeholder para poder listar clientes -no necesariamente el que está
impersonando en un momento dado-, así que acá NO se chequea cli_acti con
ese valor; eso lo siguen resolviendo los endpoints que reciben el
cli_codi real por parámetro (carrito, pedido). Acá solo se valida que el
vendedor de la sesión siga activo.
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

        from .models import Vendedor, Clientes

        ven_codi = token.get('vendedor_suplantante')
        if ven_codi:
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

        if token.get('user_type') == 'cliente':
            cli_codi = token.get('user_id')
            cliente = Clientes.objects.filter(cli_codi=cli_codi).first()
            if cliente is None or not cliente.cli_acti:
                return JsonResponse(
                    {
                        'success': False,
                        'detail': 'Sesión inválida.',
                        'code': 'CLIENTE_INACTIVO',
                    },
                    status=403,
                )

        return None
