from io import BytesIO
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph

from gestion.models import Comprobante, General, TipoComprobantes
from gestion.services.cuenta_corriente_service import CERO, _fmt, _fecha

GRIS = colors.HexColor('#D4D4D4')

# anchos de columna: Fecha, Comprobante, Cliente, Cond., Gravado, Exento, IVA, Total
ANCHOS = [1.8 * cm, 3.4 * cm, 4.1 * cm, 1.1 * cm, 2.1 * cm, 2.1 * cm, 2.0 * cm, 2.0 * cm]
PADDING = 3


def _cortar(texto, ancho, fuente='Helvetica', tam=8):
    """Recorta el texto para que entre en una línea de la columna (como GeneXus)"""
    texto = texto or ''
    disponible = ancho - 2 * PADDING
    while texto and stringWidth(texto, fuente, tam) > disponible:
        texto = texto[:-1]
    return texto


def _importe(valor):
    """Como _fmt pero sin '-0.00'"""
    return _fmt(valor if valor else CERO)


def _total(valor, ancho, estilo):
    """Importe del renglón Total en una sola línea: si no entra con la letra del
    estilo, la achica (hasta 6 pt) para que no se parta en dos renglones"""
    texto = _importe(valor)
    tam = estilo.fontSize
    while tam > 6 and stringWidth(texto, estilo.fontName, tam) > ancho - 2 * PADDING:
        tam -= 0.5
    if tam != estilo.fontSize:
        estilo = ParagraphStyle(f"{estilo.name}{tam}", parent=estilo, fontSize=tam, leading=tam + 2)
    return Paragraph(texto, estilo)


class VentasService:
    """Listado general de ventas (facturado) de la cartera de un vendedor entre dos
    fechas: todos los comprobantes de venta no anulados (contado y cuenta corriente).
    Los importes van con el signo del tipo de comprobante (com_deha): las N.CR restan."""

    # ------------------------------------------------------------
    # Cálculo
    # ------------------------------------------------------------

    @staticmethod
    def _signo(cpb):
        """+1 / -1 según el tipo de comprobante. vtas_band (vta_tipo 'M') va tal cual,
        igual que en el extracto. Sin tipo de comprobante cargado se toma +1."""
        if cpb.vtas_band:
            return 1
        try:
            return cpb.com_codi.com_deha or 1
        except TipoComprobantes.DoesNotExist:  # incluye RelatedObjectDoesNotExist
            return 1

    @staticmethod
    def armar_listado(clientes, desde, hasta):
        """{'renglones': [...], 'gravado', 'exento', 'iva', 'total', 'cantidad'} de los clientes del queryset"""
        comprobantes = (
            Comprobante.objects
            .filter(cli_codi__in=clientes.values('cli_codi'), cpb_tipo='V', cpb_band=False,
                    cpb_fech__gte=desde, cpb_fech__lte=hasta)
            # MOV = movimientos de cliente (ej. "SALDO INICIAL"): no son ventas facturadas
            .exclude(com_codi_id='MOV')
            # prefetch y no select_related: com_codi / cli_codi no tienen db_constraint
            # y el INNER JOIN ocultaría comprobantes cuyo tipo o cliente no llegó
            .prefetch_related('com_codi', 'cli_codi')
            .order_by('cpb_fech', 'com_codi', 'cpb_pref', 'cpb_nume', 'cpb_codi')
        )

        renglones = []
        gravado_t = exento_t = iva_t = total_t = CERO
        for cpb in comprobantes:
            signo = VentasService._signo(cpb)
            gravado = (cpb.vtas_igra or CERO) * signo
            exento = (cpb.vtas_iexe or CERO) * signo
            iva = (cpb.vtas_iiva or CERO) * signo
            total = (cpb.cpb_tota or CERO) * signo
            try:
                cliente = cpb.cli_codi
            except Exception:
                cliente = None
            renglones.append({
                'fecha': cpb.cpb_fech,
                'comprobante': f"{cpb.com_codi_id} {cpb.cpb_pref or ''} {str(cpb.cpb_nume or 0).zfill(8)}",
                'cli_codi': cpb.cli_codi_id,
                'cli_nomb': cliente.cli_nomb if cliente else '',
                'condicion': cpb.cpb_cvta or '',
                'gravado': gravado,
                'exento': exento,
                'iva': iva,
                'total': total,
            })
            gravado_t += gravado
            exento_t += exento
            iva_t += iva
            total_t += total

        return {'renglones': renglones, 'gravado': gravado_t, 'exento': exento_t, 'iva': iva_t, 'total': total_t,
                'cantidad': len(renglones)}

    # ------------------------------------------------------------
    # PDF
    # ------------------------------------------------------------

    @staticmethod
    def _encabezado(general, desde, hasta, filtros, estilos):
        """Recuadro con la empresa y el título, y abajo el de filtros (mismo formato que Saldos)"""
        p, emp, tit = estilos['n'], estilos['empresa'], estilos['titulo']

        loc = general.loc_codi if general else None
        gen_loca = f"{loc.loc_nomb} - {loc.pci_codi.pci_nomb}" if loc else ''

        def g(campo):
            return escape((getattr(general, campo, '') if general else '') or '')

        empresa = Table([
            [Paragraph(f"<b>{g('gen_nomb')}</b>", emp), ''],
            [Paragraph(f"<font size=7><b>de</b></font> &nbsp;{g('gen_raz')}", p), ''],
            [Paragraph(g('gen_dire'), p), Paragraph(g('gen_civa'), p)],
            [Paragraph(escape(gen_loca), p), Paragraph(f"<b>C.U.I.T.:</b> &nbsp;&nbsp;{g('gen_cuit')}", p)],
            [Paragraph(f"Listado General de Ventas &nbsp;&nbsp;<font size=9>Período: {_fecha(desde)} - {_fecha(hasta)}</font>", tit), ''],
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
            ('LEFTPADDING', (0, 2), (-1, 3), 14),
            ('TOPPADDING', (0, -1), (-1, -1), 6),
            ('BOTTOMPADDING', (0, -1), (-1, -1), 5),
        ]))

        def filtro(etiqueta, valor):
            return [Paragraph(f"<b>{etiqueta}</b>", estilos['r_b']), Paragraph(escape(str(valor)), p)]

        filtros_tabla = Table([
            filtro('Vendedor:', filtros['vendedor']),
            filtro('Zona:', filtros['zona']),
            filtro('Localidad:', filtros['localidad']),
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
            ('BOTTOMPADDING', (0, 1), (-1, 1), 4),
        ]))
        return encabezado

    @staticmethod
    def generar_pdf(clientes, desde, hasta, filtros):
        """PDF del listado. `clientes`: queryset de la cartera ya filtrada;
        `filtros`: {'vendedor', 'zona', 'localidad'} (textos del recuadro). Retorna BytesIO."""
        output = BytesIO()
        doc = SimpleDocTemplate(
            output, pagesize=A4,
            leftMargin=1.2 * cm, rightMargin=1.2 * cm, topMargin=1.2 * cm, bottomMargin=1.2 * cm,
            title='Listado General de Ventas',
        )

        base = getSampleStyleSheet()['Normal']
        estilos = {
            'n': ParagraphStyle('vtN', parent=base, fontSize=8, leading=10),
            'r': ParagraphStyle('vtR', parent=base, fontSize=8, leading=10, alignment=TA_RIGHT),
            'r_b': ParagraphStyle('vtRB', parent=base, fontSize=8, leading=10, alignment=TA_RIGHT, fontName='Helvetica-Bold'),
            'empresa': ParagraphStyle('vtEmp', parent=base, fontSize=9, leading=11),
            'titulo': ParagraphStyle('vtT', parent=base, fontSize=12, leading=15, fontName='Helvetica-Bold'),
            'total': ParagraphStyle('vtTot', parent=base, fontSize=9, leading=11, fontName='Helvetica-Bold'),
            'total_r': ParagraphStyle('vtTotR', parent=base, fontSize=9, leading=11, alignment=TA_RIGHT, fontName='Helvetica-Bold'),
        }
        p, pr, prb = estilos['n'], estilos['r'], estilos['r_b']

        general = General.objects.select_related('loc_codi__pci_codi').first()
        listado = VentasService.armar_listado(clientes, desde, hasta)

        # fila 0: encabezado, fila 1: títulos de columna; las dos se repiten por hoja
        data = [
            [VentasService._encabezado(general, desde, hasta, filtros, estilos), '', '', '', '', '', '', ''],
            [Paragraph('<b>Fecha</b>', p), Paragraph('<b>Comprobante</b>', p), Paragraph('<b>Cliente</b>', p),
             Paragraph('<b>Cond.</b>', p), Paragraph('<b>Gravado</b>', prb), Paragraph('<b>Exento</b>', prb),
             Paragraph('<b>IVA</b>', prb),
             Paragraph('<b>Total</b>', prb)],
        ]
        for r in listado['renglones']:
            data.append([
                Paragraph(_fecha(r['fecha']), p),
                Paragraph(escape(_cortar(r['comprobante'], ANCHOS[1])), p),
                Paragraph(escape(_cortar(f"{r['cli_codi']} - {r['cli_nomb'] or ''}", ANCHOS[2])), p),
                Paragraph(escape(r['condicion']), p),
                Paragraph(_importe(r['gravado']), pr),
                Paragraph(_importe(r['exento']), pr),
                Paragraph(_importe(r['iva']), pr),
                Paragraph(_importe(r['total']), pr),
            ])
        data.append([
            Paragraph(f"Total ({listado['cantidad']} comprobantes)", estilos['total']), '', '', '',
            _total(listado['gravado'], ANCHOS[4], estilos['total_r']),
            _total(listado['exento'], ANCHOS[5], estilos['total_r']),
            _total(listado['iva'], ANCHOS[6], estilos['total_r']),
            _total(listado['total'], ANCHOS[7], estilos['total_r']),
        ])

        n = len(data)
        estilo = [
            ('SPAN', (0, 0), (-1, 0)),
            ('LEFTPADDING', (0, 0), (-1, 0), 0),
            ('RIGHTPADDING', (0, 0), (-1, 0), 0),
            ('TOPPADDING', (0, 0), (-1, 0), 0),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 0),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 1), (-1, -1), PADDING),
            ('RIGHTPADDING', (0, 1), (-1, -1), PADDING),
            ('TOPPADDING', (0, 1), (-1, -1), 1),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 1),
            ('LINEBELOW', (0, 1), (-1, 1), 1, colors.black),
            ('SPAN', (0, -1), (3, -1)),
            ('LINEABOVE', (0, -1), (-1, -1), 2.5, colors.black),
            ('LINEABOVE', (0, -1), (-1, -1), 0.8, colors.white),
            ('LINEBELOW', (0, -1), (-1, -1), 1, colors.black),
            ('TOPPADDING', (0, -1), (-1, -1), 4),
            ('BOTTOMPADDING', (0, -1), (-1, -1), 3),
        ]
        for i in range(2, n - 1, 2):
            estilo.append(('BACKGROUND', (0, i), (-1, i), GRIS))

        tabla = Table(data, colWidths=ANCHOS,
                      repeatRows=2)
        tabla.setStyle(TableStyle(estilo))

        doc.build([tabla])
        output.seek(0)
        return output
