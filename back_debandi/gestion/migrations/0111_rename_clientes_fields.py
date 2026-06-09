# Generated manually for renaming cli_precs and cli_precv

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('gestion', '0110_alter_articulo_art_pnet'),
    ]

    operations = [
        migrations.RenameField(
            model_name='clientes',
            old_name='cli_precs',
            new_name='cli_precs1',
        ),
        migrations.RenameField(
            model_name='clientes',
            old_name='cli_precv',
            new_name='cli_precs2',
        ),
    ]
