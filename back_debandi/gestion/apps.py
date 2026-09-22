from django.apps import AppConfig
from django.db.backends.signals import connection_created


def _configurar_sqlite(sender, connection, **kwargs):
    """
    WAL + busy_timeout para SQLite.

    En el modo de journal por defecto ("delete"), cualquier escritura
    (por ejemplo /api/actualizar-precios/ o /api/importar_datos/) toma
    un lock que también bloquea a los lectores durante toda la
    transacción: por eso una importación grande podía "trabar" el
    resto del sitio. En modo WAL los lectores nunca esperan a un
    escritor. busy_timeout hace que, si igual chocan dos escritores,
    Django reintente unos segundos en vez de tirar "database is
    locked" al primer choque.
    """
    if connection.vendor != 'sqlite':
        return
    with connection.cursor() as cursor:
        cursor.execute('PRAGMA journal_mode=WAL;')
        cursor.execute('PRAGMA busy_timeout=5000;')


class GestionConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'gestion'

    def ready(self):
        from . import signals  # noqa: F401
        connection_created.connect(_configurar_sqlite)
