from decimal import Decimal
from io import BytesIO
from xml.sax.saxutils import escape

from django.db.models import Q
from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph

from gestion.models import Comprobante, General
from gestion.services.cuenta_corriente_service import CuentaCorrienteService, CERO, _fmt, _fecha

CENTAVO = Decimal('0.01')
GRIS = colors.HexColor('#D4D4D4')


class SaldosService:
    """Listado de saldos de clientes a una fecha (fecha de factura). Replica el SaldCFF
    de GeneXus: por cliente, el saldo de la cuenta corriente al día pedido (el mismo
    'SALDO AL' del extracto, sin el detalle). Solo lista los clientes con saldo > 0."""

    # ------------------------------------------------------------
    # Cálculo
    # ------------------------------------------------------------

    @staticmethod
    def saldos_al(clientes, fecha):
        """{cli_codi: saldo} al día `fecha` (inclusive) para los clientes del queryset.
        Una sola consulta para todos; los renglones se calculan igual que en el extracto
        (CuentaCorrienteService._movimientos) así el saldo coincide siempre."""
        comprobantes = (
            Comprobante.objects
            .filter(cli_codi__in=clientes.values('cli_codi'), cpb_band=False,
                    cpb_fech__isnull=False, cpb_fech__lte=fecha)
            .filter(Q(cpb_tipo='C') | Q(cpb_cvta='CTC'))
            .prefetch_related('com_codi', 'detalles')
        )
        saldos = {}
        for cpb in comprobantes.iterator(chunk_size=2000):
            total = sum((importe for _, importe, _ in CuentaCorrienteService._movimientos(cpb)), CERO)
            saldos[cpb.cli_codi_id] = saldos.get(cpb.cli_codi_id, CERO) + total
        return saldos

    @staticmethod
    def armar_listado(clientes, fecha):
        """Renglones [{cliente, saldo}] ordenados por nombre (for each cli_nomb),
        solo los de saldo > 0 (if &sal_ante > 0), y el total."""
        saldos = SaldosService.saldos_al(clientes, fecha)
        renglones = []
        for cliente in clientes.order_by('cli_nomb', 'cli_codi'):
            saldo = saldos.get(cliente.cli_codi, CERO).quantize(CENTAVO)
            if saldo > 0:
                renglones.append({'cliente': cliente, 'saldo': saldo})
        total = sum((r['saldo'] for r in renglones), CERO)
        return {'renglones': renglones, 'total': total}

    # ------------------------------------------------------------
    # PDF
    # ------------------------------------------------------------

    @staticmethod
    def _encabezado(general, fecha, filtros, estilos):
        """Recuadro con la empresa y el título, y abajo el recuadro de filtros (como SaldCFF)"""
        p, pb, emp, tit = estilos['n'], estilos['n_b'], estilos['empresa'], estilos['titulo']

        loc = general.loc_codi if general else None
        gen_loca = f"{loc.loc_nomb} - {loc.pci_codi.pci_nomb}" if loc else ''
        cpos = str(loc.loc_cpos or '').strip() if loc else ''
        gen_cpos = f"CP: {cpos}" if cpos not in ('', '0') else ''

        def g(campo):
            return escape((getattr(general, campo, '') if general else '') or '')

        empresa = Table([
            [Paragraph(f"<b>{g('gen_nomb')}</b>", emp), ''],
            [Paragraph(f"<font size=7><b>de</b></font> &nbsp;{g('gen_raz')}", p), ''],
            [Paragraph(g('gen_dire'), p), Paragraph(g('gen_civa'), p)],
            [Paragraph(escape(gen_loca), p), Paragraph(f"<b>C.U.I.T.:</b> &nbsp;&nbsp;{g('gen_cuit')}", p)],
            [Paragraph(escape(gen_cpos), p), Paragraph(f"<b>Ing.Brutos:</b> &nbsp;{g('gen_ingB')}", p)],
            [Paragraph(f"Listado de Saldos de Clientes al Dia: &nbsp;&nbsp;&nbsp;{_fecha(fecha)}", tit), ''],
        ], colWidths=[9.5 * cm, 9.1 * cm])
        empresa.setStyle(TableStyle([
            ('BOX', (0, 0), (-1, -1), 1, colors.black),
            ('SPAN', (0, 0), (-1, 0)),
            ('SPAN', (0, 1), (-1, 1)),
            ('SPAN', (0, -1), (-1, -1)),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 1),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
            ('TOPPADDING', (0, 0), (-1, 0), 4),
            ('LEFTPADDING', (0, 2), (-1, 4), 14),
            ('TOPPADDING', (0, -1), (-1, -1), 6),
            ('BOTTOMPADDING', (0, -1), (-1, -1), 5),
            ('LEFTPADDING', (0, -1), (-1, -1), 60),
        ]))

        def filtro(etiqueta, valor):
            return [Paragraph(f"<b>{etiqueta}</b>", estilos['r_b']), Paragraph(escape(valor), p)]

        # solo el vendedor (sin Gr. Clientes / Provincia / Localidad / Cond. Iva / Canal / Zona)
        filtros_tabla = Table([
            filtro('Vendedor:', filtros['vendedor']),
        ], colWidths=[2.4 * cm, 16.2 * cm])
        filtros_tabla.setStyle(TableStyle([
            ('BOX', (0, 0), (-1, -1), 1, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('RIGHTPADDING', (0, 0), (-1, -1), 3),
            ('TOPPADDING', (0, 0), (-1, -1), 1),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
            ('TOPPADDING', (0, 0), (-1, 0), 4),
            ('BOTTOMPADDING', (0, -1), (-1, -1), 4),
        ]))

        encabezado = Table([[empresa], [filtros_tabla]], colWidths=[18.6 * cm])
        encabezado.setStyle(TableStyle([
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 1), (-1, 1), 2),
        ]))
        return encabezado

    @staticmethod
    def generar_pdf(clientes, fecha, filtros):
        """PDF del listado. `clientes`: queryset de la cartera ya filtrada;
        `filtros`: {'localidad', 'zona', 'vendedor'} (textos del recuadro de filtros).
        El encabezado se repite en cada hoja (Header de GeneXus). Retorna BytesIO."""
        output = BytesIO()
        doc = SimpleDocTemplate(
            output, pagesize=A4,
            leftMargin=1.2 * cm, rightMargin=1.2 * cm, topMargin=1.2 * cm, bottomMargin=1.2 * cm,
            title='Listado de Saldos de Clientes',
        )

        base = getSampleStyleSheet()['Normal']
        estilos = {
            'n': ParagraphStyle('sdN', parent=base, fontSize=8, leading=10),
            'n_b': ParagraphStyle('sdNB', parent=base, fontSize=8, leading=10, fontName='Helvetica-Bold'),
            'r': ParagraphStyle('sdR', parent=base, fontSize=8, leading=10, alignment=TA_RIGHT),
            'r_b': ParagraphStyle('sdRB', parent=base, fontSize=8, leading=10, alignment=TA_RIGHT, fontName='Helvetica-Bold'),
            'empresa': ParagraphStyle('sdEmp', parent=base, fontSize=9, leading=11),
            'titulo': ParagraphStyle('sdT', parent=base, fontSize=12, leading=15, fontName='Helvetica-Bold'),
            'total': ParagraphStyle('sdTot', parent=base, fontSize=9, leading=11, fontName='Helvetica-Bold'),
            'total_r': ParagraphStyle('sdTotR', parent=base, fontSize=9, leading=11, alignment=TA_RIGHT, fontName='Helvetica-Bold'),
        }
        p, pb, pr, prb = estilos['n'], estilos['n_b'], estilos['r'], estilos['r_b']

        general = General.objects.select_related('loc_codi__pci_codi').first()
        listado = SaldosService.armar_listado(clientes, fecha)

        # fila 0: encabezado (empresa + filtros), fila 1: títulos de columna; las dos se repiten por hoja
        data = [
            [SaldosService._encabezado(general, fecha, filtros, estilos), '', '', ''],
            [Paragraph('<b>Cód.</b>', p), Paragraph('<b>Nombre</b>', p),
             Paragraph('<b>Nº de CUIT</b>', pb), Paragraph('<b>Saldo</b>', prb)],
        ]
        for r in listado['renglones']:
            c = r['cliente']
            data.append([
                Paragraph(str(c.cli_codi), pr),
                Paragraph(escape(c.cli_nomb or ''), p),
                Paragraph(escape(c.cli_cuit or ''), p),
                Paragraph(_fmt(r['saldo']), pr),
            ])
        data.append(['', Paragraph('Total', estilos['total']), '', Paragraph(_fmt(listado['total']), estilos['total_r'])])

        n = len(data)
        estilo = [
            ('SPAN', (0, 0), (-1, 0)),
            ('LEFTPADDING', (0, 0), (-1, 0), 0),
            ('RIGHTPADDING', (0, 0), (-1, 0), 0),
            ('TOPPADDING', (0, 0), (-1, 0), 0),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 0),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 1), (-1, -1), 3),
            ('RIGHTPADDING', (0, 1), (-1, -1), 3),
            ('TOPPADDING', (0, 1), (-1, -1), 1),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 1),
            # total entre doble línea arriba y una abajo
            ('LINEABOVE', (0, -1), (-1, -1), 2.5, colors.black),
            ('LINEABOVE', (0, -1), (-1, -1), 0.8, colors.white),
            ('LINEBELOW', (0, -1), (-1, -1), 1, colors.black),
            ('TOPPADDING', (0, -1), (-1, -1), 4),
            ('BOTTOMPADDING', (0, -1), (-1, -1), 3),
        ]
        # renglones alternados gris / blanco, el primero gris (&lin par / impar)
        for i in range(2, n - 1, 2):
            estilo.append(('BACKGROUND', (0, i), (-1, i), GRIS))

        tabla = Table(data, colWidths=[1.2 * cm, 9.2 * cm, 4.6 * cm, 3.6 * cm], repeatRows=2)
        tabla.setStyle(TableStyle(estilo))

        doc.build([tabla])
        output.seek(0)
        return output
