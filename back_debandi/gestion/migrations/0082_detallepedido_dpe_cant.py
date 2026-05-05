# Generated migration to add dpe_cant field to DetallePedido

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('gestion', '0081_convert_pedido_estados'),
    ]

    operations = [
        migrations.AddField(
            model_name='detallepedido',
            name='dpe_cant',
            field=models.PositiveIntegerField(default=1, help_text='Cantidad pedida'),
        ),
    ]
