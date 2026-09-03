from django.db import migrations


def backfill_art_visw_true(apps, schema_editor):
    Articulo = apps.get_model('gestion', 'Articulo')
    Articulo.objects.all().update(art_visw=True)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('gestion', '0131_vendedor_ven_gere'),
    ]

    operations = [
        migrations.RunPython(backfill_art_visw_true, noop_reverse),
    ]
