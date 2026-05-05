# Convertir art_depo de CharField a IntegerField

from django.db import migrations, models

def convert_depo_to_int(apps, schema_editor):
    """Convertir valores string de depósito a integers"""
    Articulo = apps.get_model('gestion', 'Articulo')
    
    # Mapeo de valores string a integers
    depo_map = {
        'DEPOSITO_PRINCIPAL': 1,
        'DEPOSITO_ABAJO': 2,
        'DEPOSITO_ARRIBA': 3,
        'DEPOSITO_SECUNDARIO': 4,
    }
    
    for articulo in Articulo.objects.all():
        if hasattr(articulo, 'art_depo') and isinstance(articulo.art_depo, str):
            # Intentar convertir si está en el mapa
            if articulo.art_depo in depo_map:
                articulo.art_depo = depo_map[articulo.art_depo]
            else:
                # Si no está en el mapa, intentar convertir directamente a int
                try:
                    articulo.art_depo = int(articulo.art_depo)
                except (ValueError, TypeError):
                    # Si no es convertible, poner 0 como default
                    articulo.art_depo = 0
            articulo.save()

def reverse_convert(apps, schema_editor):
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('gestion', '0079_remove_detallepedido_fields'),
    ]

    operations = [
        migrations.RunPython(convert_depo_to_int, reverse_convert),
    ]
