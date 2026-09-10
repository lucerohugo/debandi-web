import logging

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from .models import Clientes, Localidad, Registro

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

Tu cuenta ha sido activada exitosamente.

Ya puedes acceder desde:
https://ferreteradebandi.online

Email: {instance.cli_emai}

Si tienes inconvenientes, no dudes en contactarnos.

Saludos cordiales,
Ferretera Debandi
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


@receiver(pre_save, sender=Registro)
def marcar_aprobacion_registro(sender, instance, **kwargs):
    """
    Detecta la transición reg_clie (False o None/desconocido) -> True antes de
    persistir el save(). Se dispara sin importar el origen del cambio (API,
    admin de Django, shell, scripts), ya que cualquiera de esos caminos
    termina llamando a Model.save().
    """
    instance._reg_clie_recien_aprobado = False

    if instance._state.adding:
        # Registro nuevo: no hay estado previo con el que comparar.
        return

    reg_clie_anterior = sender.objects.filter(pk=instance.pk).values_list(
        'reg_clie', flat=True
    ).first()

    if reg_clie_anterior is not True and instance.reg_clie is True:
        instance._reg_clie_recien_aprobado = True


@receiver(post_save, sender=Registro)
def aprobar_registro_y_crear_cliente(sender, instance, created, **kwargs):
    """
    Al aprobar un Registro (reg_clie False -> True) crea automáticamente el
    Cliente correspondiente, envía el correo de aprobación y elimina el
    Registro. Centralizado aquí para que se dispare sin importar el origen
    del cambio (API o admin de Django).
    """
    if created or not getattr(instance, '_reg_clie_recien_aprobado', False):
        return

    logger.info(f"Registro {instance.reg_codi} aprobado. Procesando creación de Cliente...")

    try:
        default_localidad = Localidad.objects.first()
        if not default_localidad:
            logger.error(
                f"No hay localidades configuradas. No se puede crear Cliente para registro {instance.reg_codi}"
            )
            return
    except Exception as e:
        logger.error(
            f"Error al obtener localidad por defecto para registro {instance.reg_codi}: {str(e)}",
            exc_info=True
        )
        return

    existing_cliente = Clientes.objects.filter(cli_emai=instance.reg_emai).first()
    if existing_cliente:
        logger.warning(
            f"No se puede crear Cliente duplicado: Email {instance.reg_emai} ya existe en "
            f"Cliente {existing_cliente.cli_codi} ({existing_cliente.cli_nomb}). "
            f"Registro {instance.reg_codi} aprobado pero sin crear duplicado."
        )
        return

    try:
        last_cliente = Clientes.objects.all().order_by('-cli_codi').first()
        next_cli_codi = (last_cliente.cli_codi + 1) if last_cliente else 1
    except Exception as e:
        logger.error(
            f"Error al generar cli_codi para registro {instance.reg_codi}: {str(e)}",
            exc_info=True
        )
        return

    try:
        cliente = Clientes.objects.create(
            cli_codi=next_cli_codi,
            cli_nomb=instance.reg_nomb,
            cli_ndoc=instance.reg_doc,
            cli_cuit=instance.reg_cuit,
            cli_emai=instance.reg_emai,
            cli_celu=instance.reg_celu,
            cli_clav=instance.reg_clav,  # Copiar hash directamente, NO re-hashear
            loc_codi=default_localidad,
            cli_acti=False  # Crear inactivo, se activa cuando admin cambia cli_acti a True
        )
        logger.info(
            f"Cliente {cliente.cli_codi} creado automáticamente para registro {instance.reg_codi}"
        )
    except Exception as e:
        logger.error(
            f"Error al crear Cliente para registro {instance.reg_codi}: {str(e)}",
            exc_info=True
        )
        return

    reg_nomb = instance.reg_nomb
    reg_emai = instance.reg_emai
    reg_codi = instance.reg_codi

    def _enviar():
        try:
            email_body = f"""
Hola {reg_nomb},

Le informamos que su solicitud de registro ha sido aprobada.

Su cuenta será activada pronto por nuestro equipo. Una vez que sea activada, recibirá un correo de confirmación.

Email:
{reg_emai}

Si tiene inconvenientes, comuníquese con nuestro equipo.

Saludos cordiales,
Ferretera Debandi
            """

            send_mail(
                subject='Solicitud de registro aprobada',
                message=email_body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[reg_emai],
                fail_silently=False,
            )

            logger.info(f"Correo de aprobación enviado a {reg_emai} (Registro {reg_codi})")

        except Exception as e:
            # NO romper el flujo que disparó el save() si falla el correo
            logger.error(
                f"Error al enviar correo de aprobación a {reg_emai} (Registro {reg_codi}): {str(e)}",
                exc_info=True
            )

    # Espera a que la transacción confirme antes de enviar, para no notificar
    # una aprobación que termina siendo revertida por un rollback.
    transaction.on_commit(_enviar)

    try:
        instance.delete()
        logger.info(
            f"Registro {instance.reg_codi} eliminado (cliente {cliente.cli_codi} creado exitosamente)"
        )
    except Exception as e:
        logger.error(
            f"Error al eliminar registro {instance.reg_codi} después de aprobar: {str(e)}",
            exc_info=True
        )
