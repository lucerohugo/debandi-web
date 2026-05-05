# Generated migration to rename dpe_ped to ped_codi

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('gestion', '0077_remove_pedidos_bco_codi_and_more'),
    ]

    operations = [
        migrations.RenameField(
            model_name='detallepedido',
            old_name='dpe_ped',
            new_name='ped_codi',
        ),
    ]
