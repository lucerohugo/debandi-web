# Generated migration to rename fields from per_* to ven_* in Vendedor model

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('gestion', '0064_vendedor_delete_legajopersonal'),
    ]

    operations = [
        migrations.RenameField(
            model_name='vendedor',
            old_name='per_codi',
            new_name='ven_codi',
        ),
        migrations.RenameField(
            model_name='vendedor',
            old_name='per_nomb',
            new_name='ven_nomb',
        ),
        migrations.RenameField(
            model_name='vendedor',
            old_name='per_doc',
            new_name='ven_doc',
        ),
        migrations.RenameField(
            model_name='vendedor',
            old_name='per_fnac',
            new_name='ven_fnac',
        ),
        migrations.RenameField(
            model_name='vendedor',
            old_name='per_emai',
            new_name='ven_emai',
        ),
        migrations.RenameField(
            model_name='vendedor',
            old_name='per_tele',
            new_name='ven_tele',
        ),
        migrations.RenameField(
            model_name='vendedor',
            old_name='per_dom',
            new_name='ven_dom',
        ),
        migrations.RenameField(
            model_name='vendedor',
            old_name='per_bar',
            new_name='ven_bar',
        ),
        migrations.RenameField(
            model_name='vendedor',
            old_name='per_cuit',
            new_name='ven_cuit',
        ),
        migrations.RenameField(
            model_name='vendedor',
            old_name='per_fchc',
            new_name='ven_fchc',
        ),
        migrations.RenameField(
            model_name='vendedor',
            old_name='per_fmod',
            new_name='ven_fmod',
        ),
    ]
