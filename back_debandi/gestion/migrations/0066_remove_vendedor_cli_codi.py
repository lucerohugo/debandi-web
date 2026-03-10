# Migration to remove redundant cli_codi from Vendedor

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('gestion', '0065_rename_fields_vendedor'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='vendedor',
            name='cli_codi',
        ),
    ]
