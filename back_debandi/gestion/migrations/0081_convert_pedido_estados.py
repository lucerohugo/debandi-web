# Generated migration to convert pedido states

from django.db import migrations


def convert_estados(apps, schema_editor):
    """
    Convertir estados antiguos a los nuevos:
    - 'P' se mantiene como 'P' (Pendiente)
    - 'PA', 'F', 'C' se convierten a 'PR' (Procesado)
    """
    Pedidos = apps.get_model('gestion', 'Pedidos')
    
    # Convertir PA -> PR
    Pedidos.objects.filter(ped_esta='PA').update(ped_esta='PR')
    
    # Convertir F -> PR
    Pedidos.objects.filter(ped_esta='F').update(ped_esta='PR')
    
    # Convertir C -> PR
    Pedidos.objects.filter(ped_esta='C').update(ped_esta='PR')


def reverse_convert_estados(apps, schema_editor):
    """Reversión: convertir back (aunque perderemos el estado original)"""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('gestion', '0080_convert_art_depo_to_int'),
    ]

    operations = [
        migrations.RunPython(convert_estados, reverse_convert_estados),
    ]
