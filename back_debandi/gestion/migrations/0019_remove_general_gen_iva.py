# Generated migration file

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('gestion', '0018_rename_gen_iva_articulo_art_tiva'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='general',
            name='gen_iva',
        ),
    ]
