# Generated migration file to add art_prodr field to Articulo model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('gestion', '0115_remove_novedades_art_carru_novedades_art_carru'),
    ]

    operations = [
        migrations.AddField(
            model_name='articulo',
            name='art_prodr',
            field=models.BooleanField(default=False, help_text='Marcar como producto recomendado', null=True),
        ),
    ]
