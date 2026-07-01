from django.core.management.base import BaseCommand
from gestion.models import Articulo


class Command(BaseCommand):
    help = 'Genera automáticamente los códigos numéricos (art_cn) para todos los artículos'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Regenera art_cn aunque ya tenga valor',
        )

    def handle(self, *args, **options):
        force = options.get('force', False)
        updated_count = 0
        skipped_count = 0

        for articulo in Articulo.objects.all():
            new_art_cn = f"DD{str(articulo.art_codi).zfill(5)}"
            
            if force or not articulo.art_cn or articulo.art_cn == '':
                articulo.art_cn = new_art_cn
                articulo.save()
                updated_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'✓ {articulo.art_codi} -> {new_art_cn}')
                )
            else:
                skipped_count += 1

        self.stdout.write(
            self.style.SUCCESS(f'\nResumen:')
        )
        self.stdout.write(
            self.style.SUCCESS(f'  Actualizados: {updated_count} artículos')
        )
        self.stdout.write(
            self.style.WARNING(f'  Saltados (ya tienen código): {skipped_count} artículos')
        )
        self.stdout.write(
            self.style.SUCCESS(f'  Total: {updated_count + skipped_count} artículos procesados')
        )
