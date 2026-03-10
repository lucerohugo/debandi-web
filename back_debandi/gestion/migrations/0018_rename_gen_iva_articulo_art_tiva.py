# Generated migration file

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('gestion', '0017_alter_articulo_gen_iva_alter_general_gen_iva'),
    ]

    operations = [
        migrations.RenameField(
            model_name='articulo',
            old_name='gen_iva',
            new_name='art_tiva',
        ),
    ]
