from django.db import migrations, models


def null_art_visw_to_false(apps, schema_editor):
    Articulo = apps.get_model('gestion', 'Articulo')
    Articulo.objects.filter(art_visw__isnull=True).update(art_visw=False)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('gestion', '0132_backfill_art_visw_true'),
    ]

    operations = [
        migrations.RunPython(null_art_visw_to_false, noop_reverse),
        migrations.AlterField(
            model_name='articulo',
            name='art_visw',
            field=models.BooleanField(default=True, help_text='Visible en web'),
        ),
    ]
