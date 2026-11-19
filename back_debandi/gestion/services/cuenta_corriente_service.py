from datetime import date
from decimal import Decimal
from io import BytesIO
from xml.sax.saxutils import escape

from django.db.models import Q
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, KeepTogether

from gestion.models import Comprobante, General, TipoComprobantes

CERO = Decimal('0')


def _fmt(valor):
    """1234567.5 -> '1234567.50' (igual que el extracto de GeneXus: sin separador de miles, punto decimal)"""
    return f"{valor:.2f}"


def _fecha(valor):
    return valor.strftime('%d/%m/%Y') if valor else ''


class CuentaCorrienteService:
    """Extracto de cuenta corriente del cliente. Replica el Clieext de GeneXus
    (ver 'Reglas del extracto' en estructuraV3.md)"""

    # ------------------------------------------------------------
    # Cálculo
    # ------------------------------------------------------------

    @staticmethod
    def _comprobantes(cliente):
        """Comprobantes que entran en la cuenta corriente: no anulados (cpb_band) y,
        de las ventas, solo las CTC. Orden: fecha, ventas antes que cobros, prefijo + numero"""
        return (
            Comprobante.objects
            .filter(cli_codi=cliente, cpb_band=False, cpb_fech__isnull=False)
            .filter(Q(cpb_tipo='C') | Q(cpb_cvta='CTC'))
            # prefetch y no select_related: com_codi no tiene db_constraint y el
            # INNER JOIN ocultaría (sin avisar) los comprobantes con tipo inexistente
            .prefetch_related('com_codi', 'detalles')
            # mismo dia: ventas antes que cobros ('V' > 'C') y, como en Clieext, por orden de
            # carga en GeneXus (vta_codi / cob_codi), que sigue a prefijo + numero. No se usa
            # cpb_codi: depende de cuando llego cada comprobante a la web.
            .order_by('cpb_fech', '-cpb_tipo', 'cpb_pref', 'cpb_nume', 'cpb_codi')
        )

    @staticmethod
    def _movimientos(cpb):
        """Renglones de un comprobante como (concepto, importe, es_detalle).
        importe > 0 va a Débito, < 0 a Crédito. Se usa igual para el saldo
        inicial y para los renglones del período, así nunca difieren."""
        tota = cpb.cpb_tota or CERO

        if cpb.cpb_tipo == 'V':
            # vta_toDH: vta_tipo 'M' (vtas_band) suma el total tal cual
            if cpb.vtas_band:
                to_dh = tota
            else:
                try:
                    deha = cpb.com_codi.com_deha
                except TipoComprobantes.DoesNotExist:  # incluye RelatedObjectDoesNotExist
                    if cpb.com_codi_id == 'MOV':
                        # movimiento de cliente sin tipo de comprobante: en GeneXus
                        # com_deha queda nulo y vta_toDH da 0 (solo cuenta si es vta_tipo 'M')
                        return [(cpb.cpb_conc or 'Movimiento', CERO, False)]
                    raise ValueError(f"Tipo de comprobante '{cpb.com_codi_id}' inexistente (cpb_codi {cpb.cpb_codi})")
                to_dh = tota * deha
            # cpb_conc = vta_concR; si llegó vacío se arma igual que GeneXus ("REMI X Nº 0001 00000441")
            concepto = cpb.cpb_conc or f"{cpb.com_codi_id} Nº {cpb.cpb_pref or ''} {str(cpb.cpb_nume or 0).zfill(8)}"
            return [(concepto, to_dh, False)]

        movs = []
        if tota:
            movs.append((f'Recibo n° {cpb.cpb_nume}', -tota, False))

        # Renglones del recibo: los de cob_FacD / cob_RemD vienen con dcp_band y restan
        # (Pbusdto: "└ N.CR A 0005 00005775" por su vta_itoR). Los conceptos cancelados
        # (dcp_band False) son solo para imprimir el recibo: no tocan el saldo.
        # Igual que Clieext, todo esto pasa solo si cob_iint <> 0:
        #   sin cob_FacD / cob_RemD suma el descuento; con ellos resta esos comprobantes.
        facd_remd = [d for d in cpb.detalles.all() if d.dcp_band]
        iint = cpb.cob_iint or CERO
        if iint:
            if not facd_remd and not cpb.cob_band:
                movs.append((f'Descuentos Recibo N° {cpb.cpb_nume}', iint, False))
            for d in facd_remd:
                if d.dcp_tota:
                    movs.append((d.dcp_nomb or '', -d.dcp_tota, True))

        iade = cpb.cob_iade or CERO  # variable tomada del campo (en GeneXus &cob_iade no se cargaba)
        if iade < 0:
            movs.append((f'Adelantos Recibo N° {cpb.cpb_nume}', iade, False))
        return movs

    @staticmethod
    def armar_extracto(cliente, desde, hasta):
        """Devuelve {'saldo_inicial', 'renglones', 'saldo_final'} del cliente entre desde y hasta (inclusive)"""
        comprobantes = CuentaCorrienteService._comprobantes(cliente)

        saldo = CERO
        for cpb in comprobantes.filter(cpb_fech__lt=desde):
            for _, importe, _ in CuentaCorrienteService._movimientos(cpb):
                saldo += importe
        saldo_inicial = saldo

        renglones = []
        for cpb in comprobantes.filter(cpb_fech__gte=desde, cpb_fech__lte=hasta):
            for concepto, importe, es_detalle in CuentaCorrienteService._movimientos(cpb):
                saldo += importe
                renglones.append({
                    'cpb_codi': cpb.cpb_codi,  # para el detalle de operación en el panel web
                    'fecha': None if es_detalle else cpb.cpb_fech,
                    'concepto': concepto,
                    'debito': importe if importe >= 0 else None,  # GeneXus imprime 0.00 en Débito
                    # GeneXus imprime la venta negativa (N.CR) con signo en Crédito: "-44814.78"
                    'credito': (importe if cpb.cpb_tipo == 'V' else -importe) if importe < 0 else None,
                    'saldo': saldo,
                    'es_detalle': es_detalle,
                })

        return {'saldo_inicial': saldo_inicial, 'renglones': renglones, 'saldo_final': saldo}

    @staticmethod
    def condicion_iva(cliente):
        """civ_nomb del cliente: cpb_civN de su último comprobante"""
        return (
            Comprobante.objects
            .filter(cli_codi=cliente)
            .exclude(cpb_civN__isnull=True).exclude(cpb_civN='')
            .order_by('-cpb_fech', '-cpb_codi')
            .values_list('cpb_civN', flat=True)
            .first()
        ) or ''

    # ------------------------------------------------------------
    # PDF
    # ------------------------------------------------------------

    @staticmethod
    def _encabezado(general, cliente, desde, hasta, estilos):
        """Encabezado de Clieext: recuadro con la empresa, datos del cliente sin recuadro
        y el título entre dos líneas (la de abajo la pone el encabezado de la tabla)"""
        p, pr, pc = estilos['n'], estilos['r'], estilos['titulo']
        pb8, emp = estilos['n_b'], estilos['empresa']

        loc = general.loc_codi if general else None
        gen_loca = f"{loc.loc_nomb} - {loc.pci_codi.pci_nomb}" if loc else ''
        cpos = str(loc.loc_cpos or '').strip() if loc else ''
        gen_cpos = f"CP: {cpos}" if cpos not in ('', '0') else ''
        gen_civa = (general.gen_civa if general else '') or ''
        gen_ingb = (general.gen_ingB if general else '') or ''

        # el nombre + razón social ocupan todo el ancho menos la Fecha, así gen_raz no se corta
        nombre = Table([[
            Paragraph(f"<b>{escape(general.gen_nomb if general else '')}</b>"
                      f"<font size=8> &nbsp;&nbsp;de&nbsp; {escape(general.gen_raz if general else '')}</font>", emp),
            Paragraph(f"<b>Fecha:</b> &nbsp;{date.today():%d/%m/%y}", pr),
        ]], colWidths=[14.8 * cm, 3.8 * cm - 12])
        nombre.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ]))

        empresa = Table([
            [nombre, ''],
            [Paragraph(escape(general.gen_dire if general else ''), pb8), Paragraph(escape(gen_civa), pb8)],
            [Paragraph(f"{escape(gen_loca)} &nbsp; {escape(gen_cpos)}", pb8),
             Paragraph(f"<b>C.U.I.T.:</b> {escape(general.gen_cuit if general else '')} &nbsp;&nbsp; "
                       f"<b>Ing.Brutos:</b> {escape(gen_ingb)}", p)],
        ], colWidths=[11 * cm, 7.6 * cm])
        empresa.setStyle(TableStyle([
            ('BOX', (0, 0), (-1, -1), 1.2, colors.black),
            ('SPAN', (0, 0), (-1, 0)),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 1),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
            ('TOPPADDING', (0, 0), (-1, 0), 4),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 6),  # aire entre el nombre y la dirección
            ('BOTTOMPADDING', (0, -1), (-1, -1), 4),
        ]))

        localidad = cliente.loc_codi.loc_nomb if cliente.loc_codi_id else ''
        zona = f"{escape(cliente.zon_codi.zon_nomb or '')} &nbsp;&nbsp; {cliente.zon_codi_id}" if cliente.zon_codi_id else ''
        datos_cliente = Table([
            [Paragraph(f"<b>Cliente:</b> &nbsp;{cliente.cli_codi} &nbsp; {escape(cliente.cli_nomb or '')}", p), '', ''],
            [Paragraph(f"<b>Domicilio:</b> {escape(cliente.cli_dire or '')}", p),
             Paragraph(f"<b>Localidad:</b> {escape(localidad)}", p),
             Paragraph(f"<b>Teléfono:</b> {escape(cliente.cli_tele or '')}", p)],
            [Paragraph(f"<b>Condición de Iva:</b> {escape(CuentaCorrienteService.condicion_iva(cliente))}", p),
             Paragraph(f"<b>N° de CUIT:</b> {escape(cliente.cli_cuit or '')}", p),
             Paragraph(f"<b>Zona:</b> {zona}", p)],
        ], colWidths=[8 * cm, 6 * cm, 4.6 * cm])
        datos_cliente.setStyle(TableStyle([
            ('SPAN', (0, 0), (-1, 0)),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 1),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
        ]))

        titulo = Paragraph(
            f"Extracto de Cuenta Corriente <font size=9>&nbsp;&nbsp; Período: &nbsp;{_fecha(desde)} &nbsp;- &nbsp;{_fecha(hasta)}</font>", pc
        )

        encabezado = Table([[empresa], [datos_cliente], [titulo]], colWidths=[18.6 * cm])
        encabezado.setStyle(TableStyle([
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 1), (-1, 1), 5),
            ('BOTTOMPADDING', (0, 1), (-1, 1), 4),
            ('LINEABOVE', (0, 2), (-1, 2), 0.8, colors.black),
            ('TOPPADDING', (0, 2), (-1, 2), 4),
            ('BOTTOMPADDING', (0, 2), (-1, 2), 3),
        ]))
        return encabezado

    @staticmethod
    def _tabla_movimientos(extracto, desde, hasta, estilos):
        p, pb, pr, prb = estilos['n'], estilos['b'], estilos['r'], estilos['rb']
        detalle = estilos['detalle']

        data = [[Paragraph('<b>Fecha</b>', p), Paragraph('<b>Concepto</b>', p),
                 Paragraph('<b>Importe Débito</b>', pr), Paragraph('<b>Importe Crédito</b>', pr),
                 Paragraph('<b>Saldo</b>', pr)]]

        # Saldo inicial: GeneXus lo imprime en la columna Débito y en Saldo
        si = extracto['saldo_inicial']
        data.append([Paragraph(f"<i>{_fecha(desde)}</i>", p), Paragraph('<i>Saldo Inicial</i>', p),
                     Paragraph(f"<i>{_fmt(si)}</i>", pr), '', Paragraph(f"<i>{_fmt(si)}</i>", pr)])

        for r in extracto['renglones']:
            data.append([
                Paragraph(_fecha(r['fecha']), p),
                Paragraph(('» ' if r['es_detalle'] else '') + escape(r['concepto']), detalle if r['es_detalle'] else p),
                Paragraph(_fmt(r['debito']) if r['debito'] is not None else '', pr),
                Paragraph(_fmt(r['credito']) if r['credito'] is not None else '', pr),
                Paragraph(_fmt(r['saldo']), pr),
            ])

        data.append([Paragraph(f"<b>SALDO AL {_fecha(hasta)}</b>", pb), '', '', '',
                     Paragraph(_fmt(extracto['saldo_final']), prb)])

        tabla = Table(data, colWidths=[2.2 * cm, 7.6 * cm, 2.9 * cm, 2.9 * cm, 3 * cm], repeatRows=1)
        tabla.setStyle(TableStyle([
            ('LINEABOVE', (0, 0), (-1, 0), 1.2, colors.black),
            ('LINEBELOW', (0, 0), (-1, 0), 1.2, colors.black),
            ('LINEABOVE', (0, -1), (-1, -1), 1.2, colors.black),
            ('SPAN', (0, -1), (3, -1)),
            # separadores de columna en los renglones, como en Clieext
            ('LINEAFTER', (0, 1), (3, -2), 0.6, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('TOPPADDING', (0, -1), (-1, -1), 6),
        ]))
        return tabla

    @staticmethod
    def generar_pdf(clientes, desde, hasta):
        """PDF con el extracto de cada cliente, en el orden recibido. Retorna BytesIO.
        Como en Clieext, varios clientes comparten hoja: si el extracto de un cliente no entra
        en lo que queda de la hoja, arranca en una nueva (si es más largo que una hoja, sigue en la próxima)."""
        output = BytesIO()
        doc = SimpleDocTemplate(
            output, pagesize=A4,
            leftMargin=1.2 * cm, rightMargin=1.2 * cm, topMargin=1.2 * cm, bottomMargin=1.2 * cm,
            title='Extracto de Cuenta Corriente',
        )

        base = getSampleStyleSheet()['Normal']
        estilos = {
            'n': ParagraphStyle('ccN', parent=base, fontSize=8, leading=10),
            'n_b': ParagraphStyle('ccNB', parent=base, fontSize=8, leading=10, fontName='Helvetica-Bold'),
            'empresa': ParagraphStyle('ccEmp', parent=base, fontSize=14, leading=17),
            'b': ParagraphStyle('ccB', parent=base, fontSize=9, leading=11, fontName='Helvetica-Bold'),
            'r': ParagraphStyle('ccR', parent=base, fontSize=8, leading=10, alignment=TA_RIGHT),
            'rb': ParagraphStyle('ccRB', parent=base, fontSize=9, leading=11, alignment=TA_RIGHT, fontName='Helvetica-Bold'),
            'detalle': ParagraphStyle('ccDet', parent=base, fontSize=8, leading=10, leftIndent=14),
            'titulo': ParagraphStyle('ccT', parent=base, fontSize=13, leading=16, alignment=TA_CENTER, fontName='Helvetica-Bold'),
        }

        general = General.objects.select_related('loc_codi__pci_codi').first()

        elements = []
        for cliente in clientes:
            extracto = CuentaCorrienteService.armar_extracto(cliente, desde, hasta)
            elements.append(KeepTogether([
                CuentaCorrienteService._encabezado(general, cliente, desde, hasta, estilos),
                CuentaCorrienteService._tabla_movimientos(extracto, desde, hasta, estilos),
            ]))
            elements.append(Spacer(1, 18))

        doc.build(elements)
        output.seek(0)
        return output
