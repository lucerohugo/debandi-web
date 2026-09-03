from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('gestion', '0134_pedidos_origen_creacion_edicion'),
    ]

    operations = [
        migrations.RenameField(
            model_name='general',
            old_name='gen_coti',
            new_name='gen_dola',
        ),
    ]
