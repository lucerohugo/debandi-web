import shutil

from django.conf import settings
from django.core.management.base import BaseCommand

from gestion.models import Articulo

ORIGEN = settings.BASE_DIR / 'cargar_imagenes'
DESTINO = settings.MEDIA_ROOT / 'imagenes_articulos'

# (campo del modelo, subcarpeta en disco, número de imagen)
CAMPOS_IMAGEN = [
    ('art_img1', 'UrlImagen1', 1),
    ('art_img2', 'UrlImagen2', 2),
    ('art_img3', 'UrlImagen3', 3),
]


class Command(BaseCommand):
    help = (
        'Vincula las imágenes de media/imagenes_articulos con los artículos cuyo '
        'art_cn coincide con el nombre de carpeta (DD00001, DD00002, ...). '
        'No copia ni duplica archivos: solo hace que art_img1/2/3 apunten al '
        'archivo que ya está en el disco.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Sobrescribe imágenes que el artículo ya tenga cargadas (por defecto se saltean)',
        )

    def handle(self, *args, **options):
        force = options.get('force', False)

        self._mover_carpeta_si_hace_falta()

        if not DESTINO.exists():
            self.stdout.write(self.style.ERROR(
                f'No se encontró la carpeta de imágenes en {DESTINO}'
            ))
            return

        actualizados = 0
        sin_cambios = 0
        lista_no_encontrados = []
        lista_sin_imagenes = []

        carpetas = sorted(p.name for p in DESTINO.iterdir() if p.is_dir())

        for art_cn in carpetas:
            try:
                articulo = Articulo.objects.get(art_cn=art_cn)
            except Articulo.DoesNotExist:
                lista_no_encontrados.append(art_cn)
                self.stdout.write(self.style.WARNING(f'No existe el artículo {art_cn}'))
                continue

            hubo_cambios = False
            encontro_alguna_imagen = False

            for campo, subcarpeta, numero in CAMPOS_IMAGEN:
                archivo = DESTINO / art_cn / subcarpeta / f'{art_cn}_{numero}.jpg'
                if not archivo.exists():
                    continue

                encontro_alguna_imagen = True
                campo_actual = getattr(articulo, campo)

                if campo_actual and not force:
                    # Ya tiene una imagen cargada (manual o de una corrida anterior)
                    continue

                ruta_relativa = f'imagenes_articulos/{art_cn}/{subcarpeta}/{art_cn}_{numero}.jpg'
                campo_actual.name = ruta_relativa
                hubo_cambios = True

            if not encontro_alguna_imagen:
                lista_sin_imagenes.append(art_cn)

            if hubo_cambios:
                articulo.save(update_fields=['art_img1', 'art_img2', 'art_img3'])
                actualizados += 1
            else:
                sin_cambios += 1

        self.stdout.write(self.style.SUCCESS('\nResumen:'))
        self.stdout.write(self.style.SUCCESS(f'  Actualizados: {actualizados}'))
        self.stdout.write(self.style.WARNING(f'  Sin cambios: {sin_cambios}'))
        self.stdout.write(self.style.WARNING(f'  Artículos no encontrados (art_cn no coincide): {len(lista_no_encontrados)}'))
        self.stdout.write(self.style.WARNING(f'  Carpetas sin imágenes: {len(lista_sin_imagenes)}'))
        self.stdout.write(self.style.SUCCESS(f'  Total de carpetas procesadas: {len(carpetas)}'))

        reporte = settings.BASE_DIR / 'reporte_carga_imagenes.txt'
        with open(reporte, 'w', encoding='utf-8') as f:
            f.write(f'Artículos no encontrados ({len(lista_no_encontrados)}):\n')
            f.write('\n'.join(lista_no_encontrados) or '(ninguno)')
            f.write(f'\n\nCarpetas sin imágenes ({len(lista_sin_imagenes)}):\n')
            f.write('\n'.join(lista_sin_imagenes) or '(ninguna)')
        self.stdout.write(self.style.SUCCESS(f'\nDetalle completo guardado en: {reporte}'))

    def _mover_carpeta_si_hace_falta(self):
        """Mueve cargar_imagenes/ a media/imagenes_articulos/ una única vez (sin copiar bytes)"""
        if DESTINO.exists():
            return
        if not ORIGEN.exists():
            return
        DESTINO.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(ORIGEN), str(DESTINO))
        self.stdout.write(self.style.SUCCESS(f'Carpeta movida: {ORIGEN} -> {DESTINO}'))
