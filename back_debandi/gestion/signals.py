import logging

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from .models import Clientes

logger = logging.getLogger(__name__)


@receiver(pre_save, sender=Clientes)
def marcar_activacion_cliente(sender, instance, **kwargs):
    """
    Detecta la transición cli_acti (False o None/desconocido) -> True antes de
    persistir el save(). Se dispara sin importar el origen del cambio (API,
    admin de Django, shell, scripts, sync de SubInfoASR3.py vía
    /api/importar_datos/ con update_or_create), ya que cualquiera de esos
    caminos termina llamando a Model.save().
    """
    instance._cli_acti_recien_activado = False

    if instance._state.adding:
        # Cliente nuevo: no hay estado previo con el que comparar.
        return

    cli_acti_anterior = sender.objects.filter(pk=instance.pk).values_list(
        'cli_acti', flat=True
    ).first()

    if cli_acti_anterior is not True and instance.cli_acti is True:
        instance._cli_acti_recien_activado = True


@receiver(post_save, sender=Clientes)
def enviar_correo_activacion_cliente(sender, instance, created, **kwargs):
    if created or not getattr(instance, '_cli_acti_recien_activado', False):
        return

    logger.info(f"Cliente {instance.cli_codi} activado. Enviando correo de activación...")

    def _enviar():
        try:
            email_body = f"""
Hola {instance.cli_nomb},

¡Excelente! Tu cuenta ha sido activada exitosamente.

Ya puedes acceder desde:
https://ferreteradebandi.online

Email: {instance.cli_emai}

Si tienes inconvenientes, no dudes en contactarnos.

Saludos cordiales,
Ferretería Debandi
            """

            send_mail(
                subject='Tu cuenta ha sido activada',
                message=email_body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[instance.cli_emai],
                fail_silently=False,
            )

            logger.info(
                f"Correo de activación enviado a {instance.cli_emai} (Cliente {instance.cli_codi})"
            )

        except Exception as e:
            # NO romper el flujo que disparó el save() si falla el correo
            logger.error(
                f"Error al enviar correo de activación a {instance.cli_emai} "
                f"(Cliente {instance.cli_codi}): {str(e)}",
                exc_info=True
            )

    # Espera a que la transacción confirme antes de enviar, para no notificar
    # una activación que termina siendo revertida por un rollback.
    transaction.on_commit(_enviar)
