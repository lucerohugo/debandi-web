# Remove fields that are no longer in DetallePedido model

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('gestion', '0078_rename_dpe_ped_detallepedido_ped_codi'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='detallepedido',
            name='dpe_cant',
        ),
        migrations.RemoveField(
            model_name='detallepedido',
            name='dpe_des',
        ),
        migrations.RemoveField(
            model_name='detallepedido',
            name='dpe_prec',
        ),
        migrations.RemoveField(
            model_name='detallepedido',
            name='dpe_subt',
        ),
    ]
