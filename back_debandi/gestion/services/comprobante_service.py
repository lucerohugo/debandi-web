import base64
import json
import re
from decimal import Decimal
from io import BytesIO
from xml.sax.saxutils import escape

from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image

from gestion.models import Clientes, Comprobante, General, TipoComprobantes

CERO = Decimal('0')
ANCHO = 18.6 * cm

# Valores del combo vta_cvta de GeneXus
CONDICIONES_VENTA = {
    'CDO': 'Contado',
    'CTC': 'Cuenta Corriente',
    'CHQ': 'Cheques',
    'CRA': 'Crédito Anticipado',
}

# Pie fijo del comprobante de GeneXus
PIE = (
    "Este comprobante está expresado en: PESOS ARGENTINOS",
    "Importante: Cheques a la orden de Carlos Dante Debandi",
    "EL RECLAMO POR MERCADERÍA DETERIORADA O EN MAL ESTADO SE PODRÁ EFECTUAR DENTRO DE LAS 48 HS DE RECIBIDA LA MISMA",
)


def _fmt(valor):
    """1234567.5 -> '1.234.567,50' (formato argentino, como el boceto de la factura)"""
    texto = f"{(valor or CERO):,.2f}"
    return texto.replace(',', '#').replace('.', ',').replace('#', '.')


def _fecha(valor):
    return valor.strftime('%d/%m/%Y') if valor else ''


# ------------------------------------------------------------
# Importe en letras ("Son pesos ...")
# ------------------------------------------------------------

_UNIDADES = ('', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
             'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE',
             'DIECIOCHO', 'DIECINUEVE', 'VEINTE', 'VEINTIUN', 'VEINTIDOS', 'VEINTITRES',
             'VEINTICUATRO', 'VEINTICINCO', 'VEINTISEIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE')
_DECENAS = ('', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA')
_CENTENAS = ('', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS',
             'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS')


def _menor_mil(n):
    if n == 100:
        return 'CIEN'
    c, resto = divmod(n, 100)
    partes = [_CENTENAS[c]] if c else []
    if resto < 30:
        partes.append(_UNIDADES[resto])
    else:
        d, u = divmod(resto, 10)
        partes.append(_DECENAS[d] + (f' Y {_UNIDADES[u]}' if u else ''))
    return ' '.join(p for p in partes if p)


def _entero_en_letras(n):
    if n == 0:
        return 'CERO'
    partes = []
    millones, resto = divmod(n, 1_000_000)
    miles, unidades = divmod(resto, 1000)
    if millones:
        partes.append('UN MILLON' if millones == 1 else f'{_entero_en_letras(millones)} MILLONES')
    if miles:
        partes.append('MIL' if miles == 1 else f'{_menor_mil(miles)} MIL')
    if unidades:
        partes.append(_menor_mil(unidades))
    return ' '.join(partes)


def importe_en_letras(valor):
    """56706.5 -> 'CINCUENTA Y SEIS MIL SETECIENTOS SEIS CON 50/100'"""
    valor = abs(valor or CERO).quantize(Decimal('0.01'))
    entero = int(valor)
    centavos = int((valor - entero) * 100)
    return f"{_entero_en_letras(entero)} CON {centavos:02d}/100"


class ComprobanteService:
    """Impresión de un comprobante de venta (factura, remito, nota de crédito/débito).
    Sigue el boceto factura_detallado_v3: cabecera, renglones, totales según la letra y pie."""

    @staticmethod
    def _tipo(cpb):
        try:
            return cpb.com_codi
        except TipoComprobantes.DoesNotExist:
            return None

    @staticmethod
    def _cliente(cpb):
        try:
            return cpb.cli_codi
        except Clientes.DoesNotExist:
            return None

    # ------------------------------------------------------------
    # Bloques
    # ------------------------------------------------------------

    @staticmethod
    def _cabecera(cpb, tipo, general, cliente, e):
        p, pc = e['n'], e['c']
        letra = (tipo.com_letr if tipo else '') or ''
        cod_afip = f"Cod. {tipo.com_afip:02d}" if tipo and tipo.com_afip else ''
        nombre = (tipo.com_nomb if tipo else cpb.com_codi_id) or ''
        g = general

        # logo o nombre de la empresa
        logo = None
        if g and g.gen_logo:
            try:
                logo = Image(g.gen_logo.path, width=5 * cm, height=2.2 * cm, kind='proportional')
            except Exception:
                logo = None
        if logo is None:
            logo = Paragraph(f"<b>{escape(g.gen_nomb if g else '')}</b>", e['empresa'])

        caja_letra = Table([[Paragraph(f"<b>{escape(letra)}</b>", e['letra'])],
                            [Paragraph(cod_afip, pc)]], colWidths=[2.2 * cm], rowHeights=[1.4 * cm, 0.5 * cm])
        caja_letra.setStyle(TableStyle([
            ('BOX', (0, 0), (-1, -1), 1.2, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))

        datos_comp = [
            Paragraph(f"<b>{escape(nombre)}</b>", e['titulo']),
            Spacer(1, 2),
            Paragraph(f"<b>N°: {escape(cpb.cpb_pref or '')} - {str(cpb.cpb_nume or 0).zfill(8)}</b>", e['numero']),
            Paragraph(f"<b>Fecha:</b> {_fecha(cpb.cpb_fech)}", pc),
        ]
        fila_titulo = Table([[logo, caja_letra, datos_comp]], colWidths=[7.6 * cm, 3 * cm, 7.6 * cm])
        fila_titulo.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ALIGN', (1, 0), (1, 0), 'CENTER'),
        ]))

        loc = g.loc_codi if g else None
        # gen_raz no se usa: el nombre de la empresa es gen_nomb (ya está arriba)
        empresa = Table([
            [Paragraph(f"{escape(g.gen_dire if g else '')} &nbsp; {escape(loc.loc_nomb if loc else '')}", p),
             Paragraph(f"<b>CUIT:</b> {escape(g.gen_cuit if g else '')}", p)],
            [Paragraph(f"<b>Tel.</b> {escape(g.gen_tele if g else '')}", p),
             Paragraph(f"<b>Ing. Brutos:</b> {escape((g.gen_ingB if g else '') or '')}", p)],
            [Paragraph(f"<b>Email:</b> {escape(g.gen_emai if g else '')}", p),
             Paragraph(f"<b>Inicio de Actividad:</b> {_fecha(g.gen_inia if g else None)}", p)],
            ['', Paragraph(f"<b>I.V.A.</b> {escape((g.gen_civa if g else '') or '')}", p)],
        ], colWidths=[9.3 * cm, 9.3 * cm])

        if cliente:
            localidad = cliente.loc_codi.loc_nomb if cliente.loc_codi_id else ''
            zona = (cliente.zon_codi.zon_nomb or '') if cliente.zon_codi_id else ''
            datos_cliente = Table([
                [Paragraph(f"<b>Razón Social:</b> {cliente.cli_codi} {escape(cliente.cli_nomb or '')}", p),
                 Paragraph(f"<b>I.V.A.:</b> {escape(cpb.cpb_civN or '')}", p)],
                [Paragraph(f"<b>Domicilio:</b> {escape(cliente.cli_dire or '')}", p),
                 Paragraph(f"<b>Tel:</b> {escape(cliente.cli_tele or '')}", p)],
                [Paragraph(f"<b>Localidad:</b> {escape(localidad)} &nbsp; <b>- Zona:</b> {escape(zona)}", p),
                 Paragraph(f"<b>CUIT:</b> {escape(cliente.cli_cuit or '')}", p)],
            ], colWidths=[9.3 * cm, 9.3 * cm])
        else:
            datos_cliente = Paragraph(f"<b>Cliente:</b> {cpb.cli_codi_id} (no encontrado)", p)

        condicion = CONDICIONES_VENTA.get(cpb.cpb_cvta, cpb.cpb_cvta or '')
        venta = Table([
            [Paragraph(f"{escape(condicion)} &nbsp; <b>- Vendedor:</b> {escape(cpb.vtas_pers or '')}", p),
             Paragraph(f"<b>Pedido Nro:</b> {cpb.vtas_nped or ''} &nbsp; <b>- Vto:</b> {_fecha(cpb.vtas_fven)}", p)],
        ], colWidths=[9.3 * cm, 9.3 * cm])

        for t in (empresa, venta) + ((datos_cliente,) if cliente else ()):
            t.setStyle(TableStyle([
                ('LEFTPADDING', (0, 0), (-1, -1), 2),
                ('TOPPADDING', (0, 0), (-1, -1), 1),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
            ]))

        caja = Table([[fila_titulo], [empresa], [datos_cliente], [venta]], colWidths=[ANCHO])
        caja.setStyle(TableStyle([
            ('BOX', (0, 0), (-1, -1), 1.5, colors.black),
            ('LINEBELOW', (0, 1), (-1, 1), 0.8, colors.black),
            ('LINEBELOW', (0, 2), (-1, 2), 0.8, colors.black),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        return caja

    @staticmethod
    def _renglones(detalles, e):
        p, pr = e['n'], e['r']
        data = [[Paragraph(f'<b>{t}</b>', pr if i in (1, 3, 4, 5, 6) else p) for i, t in enumerate(
            ('Código', 'Cantidad', 'Descripción', '% Iva', 'P. Unit.', '% Bonif', 'Total'))]]
        for d in detalles:
            data.append([
                Paragraph(str(d.art_codi or ''), p),
                Paragraph(_fmt(d.dcp_cant), pr),
                Paragraph(escape(d.dcp_nomb or ''), p),
                Paragraph(_fmt(d.dcp_tiva), pr),
                Paragraph(_fmt(d.dcp_precU), pr),
                Paragraph(_fmt(d.dcp_boni), pr),
                Paragraph(_fmt(d.dcp_tota), pr),
            ])
        if not detalles:
            data.append(['', '', Paragraph('<i>Sin renglones</i>', p), '', '', '', ''])

        tabla = Table(data, colWidths=[1.8 * cm, 2 * cm, 6.9 * cm, 1.4 * cm, 2.4 * cm, 1.7 * cm, 2.4 * cm], repeatRows=1)
        tabla.setStyle(TableStyle([
            ('LINEABOVE', (0, 0), (-1, 0), 1.2, colors.black),
            ('LINEBELOW', (0, 0), (-1, 0), 1.2, colors.black),
            ('LINEBELOW', (0, 1), (-1, -1), 0.3, colors.lightgrey),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ]))
        return tabla

    @staticmethod
    def _totales(cpb, letra, e):
        p, pc, pr = e['n'], e['c'], e['r']
        total = cpb.cpb_tota or CERO
        son = Paragraph(f"<b>Son pesos</b> {importe_en_letras(total)}", p)

        if letra == 'A':
            # Factura A: discrimina IVA
            titulos = ('SUB. S/IVA', 'EXENTO', 'SUB. C/IVA', 'NETO', 'IVA 10.5', 'IVA 21',
                       'IVA RNI', 'IMP. INT.', 'PERC. IIBB', 'TOTAL')
            valores = (cpb.vtas_igra, cpb.vtas_iexe, total, cpb.vtas_igra, cpb.vtas_iv105, cpb.vtas_iv21,
                       cpb.vtas_iRNI, cpb.vtas_iiin, cpb.vtas_ibts)
            fila = [Paragraph(_fmt(v), e['valor_a']) for v in valores]
            fila.append(Paragraph(f"<b>{_fmt(total)}</b>", e['total_a']))
            ancho = (ANCHO - 0.4 * cm) / 11
            cuadro = Table([[Paragraph(f'<b>{t}</b>', e['chico']) for t in titulos], fila],
                           colWidths=[ancho] * 9 + [ancho * 2])
            cuadro.setStyle(TableStyle([
                ('GRID', (0, 0), (-1, 0), 0.6, colors.black),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('LEFTPADDING', (0, 0), (-1, -1), 1),
                ('RIGHTPADDING', (0, 0), (-1, -1), 1),
            ]))
        elif letra in ('B', 'C'):
            # Régimen de Transparencia Fiscal al Consumidor (Ley 27.743)
            cuadro = Table([
                [Paragraph('<b>Régimen de Transparencia Fiscal al Consumidor (Ley 27.743)</b>', p),
                 Paragraph('<b>TOTAL</b>', pr)],
                [Paragraph(f"<b>IVA Contenido: $</b> {_fmt(cpb.vtas_iiva)}<br/>"
                           f"<b>Otros Impuestos Nacionales Indirectos: $</b> {_fmt(cpb.vtas_iiin)}", p),
                 Paragraph(f"<b>{_fmt(total)}</b>", e['total'])],
            ], colWidths=[13.4 * cm, 4.8 * cm])
        else:
            # X / R: sin discriminar impuestos
            cuadro = Table([[Paragraph('<b>TOTAL</b>', pr),
                             Paragraph(f"<b>{_fmt(total)}</b>", e['total'])]],
                           colWidths=[13.4 * cm, 4.8 * cm])
            cuadro.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'MIDDLE')]))

        caja = Table([[son], [cuadro]], colWidths=[ANCHO])
        caja.setStyle(TableStyle([('BOX', (0, 0), (-1, -1), 1.5, colors.black)]))
        return caja

    @staticmethod
    def _qr_arca(cpb, tipo, general, cliente):
        """QR de ARCA (RG 4892): https://www.afip.gob.ar/fe/qr/?p=<json en base64>"""
        cuit_emisor = re.sub(r'\D', '', general.gen_cuit if general else '')
        cuit_cliente = re.sub(r'\D', '', (cliente.cli_cuit if cliente else '') or '')
        datos = {
            'ver': 1,
            'fecha': cpb.cpb_fech.strftime('%Y-%m-%d') if cpb.cpb_fech else '',
            'cuit': int(cuit_emisor or 0),
            'ptoVta': int(re.sub(r'\D', '', cpb.cpb_pref or '') or 0),
            'tipoCmp': tipo.com_afip if tipo else 0,
            'nroCmp': cpb.cpb_nume or 0,
            'importe': float(cpb.cpb_tota or 0),
            'moneda': 'PES',
            'ctz': 1,
            'tipoDocRec': 80 if cuit_cliente else 99,
            'nroDocRec': int(cuit_cliente or 0),
            'tipoCodAut': 'E',
            'codAut': int(re.sub(r'\D', '', cpb.vtas_ncae or '') or 0),
        }
        url = 'https://www.afip.gob.ar/fe/qr/?p=' + base64.b64encode(json.dumps(datos).encode()).decode()
        widget = QrCodeWidget(url)
        x1, y1, x2, y2 = widget.getBounds()
        lado = 2.8 * cm
        dibujo = Drawing(lado, lado, transform=[lado / (x2 - x1), 0, 0, lado / (y2 - y1), 0, 0])
        dibujo.add(widget)
        return dibujo

    @staticmethod
    def _pie(cpb, tipo, general, cliente, e):
        p, pc = e['n'], e['c']
        leyendas = [escape(l) for l in ((general.gen_leye, general.gen_leye2, general.gen_leye3) if general else ()) if l]
        bloque_leyes = Paragraph('<br/>'.join(f'<b>{l}</b>' for l in leyendas), p)

        elementos = []
        if cpb.vtas_ncae:
            arca = Table([[
                ComprobanteService._qr_arca(cpb, tipo, general, cliente),
                Paragraph(f"<b>ARCA</b><br/>Comprobante Autorizado<br/><br/>"
                          f"<b>C.A.E. Nº:</b> {escape(cpb.vtas_ncae)}<br/>"
                          f"<b>Vto. C.A.E.:</b> {_fecha(cpb.vtas_CVto)}", p),
                bloque_leyes,
            ]], colWidths=[3.2 * cm, 6 * cm, 9.4 * cm])
        else:
            aviso = 'DOCUMENTO NO VÁLIDO COMO FACTURA' if (tipo and tipo.com_letr in ('X', 'R')) else ''
            arca = Table([[Paragraph(f"<font size=10><b>{aviso}</b></font>", p), bloque_leyes]],
                         colWidths=[9.2 * cm, 9.4 * cm])
        arca.setStyle(TableStyle([
            ('BOX', (0, 0), (-1, -1), 1.5, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        elementos.append(arca)
        elementos.append(Spacer(1, 6))

        pie = Table([[Paragraph(f"{PIE[0]}<br/><font size=10><b>{PIE[1]}</b></font><br/>{PIE[2]}", pc)]],
                    colWidths=[ANCHO])
        pie.setStyle(TableStyle([('BOX', (0, 0), (-1, -1), 1.5, colors.black)]))
        elementos.append(pie)
        return elementos

    # ------------------------------------------------------------
    # PDF
    # ------------------------------------------------------------

    @staticmethod
    def generar_pdf(cpb, detalles=None, general=None):
        """PDF de un comprobante de venta. Retorna BytesIO.
        detalles/general se pueden pasar ya armados (si no, se leen de la base)."""
        if cpb.cpb_tipo != 'V':
            raise ValueError('Por ahora solo se imprimen comprobantes de venta')

        if detalles is None:
            detalles = list(cpb.detalles.all().order_by('dcp_codi'))
        if general is None:
            general = General.objects.select_related('loc_codi').first()
        tipo = ComprobanteService._tipo(cpb)
        cliente = ComprobanteService._cliente(cpb)
        letra = (tipo.com_letr if tipo else '') or ''

        base = getSampleStyleSheet()['Normal']
        e = {
            'n': ParagraphStyle('cpN', parent=base, fontSize=8, leading=10),
            'c': ParagraphStyle('cpC', parent=base, fontSize=8, leading=10, alignment=TA_CENTER),
            'r': ParagraphStyle('cpR', parent=base, fontSize=8, leading=10, alignment=TA_RIGHT),
            'chico': ParagraphStyle('cpCh', parent=base, fontSize=6.5, leading=8, alignment=TA_CENTER),
            'empresa': ParagraphStyle('cpEmp', parent=base, fontSize=15, leading=18),
            'letra': ParagraphStyle('cpLet', parent=base, fontSize=32, leading=34, alignment=TA_CENTER),
            'titulo': ParagraphStyle('cpTit', parent=base, fontSize=16, leading=19, alignment=TA_CENTER),
            'numero': ParagraphStyle('cpNum', parent=base, fontSize=12, leading=15, alignment=TA_CENTER),
            'total': ParagraphStyle('cpTot', parent=base, fontSize=14, leading=17, alignment=TA_RIGHT),
            'valor_a': ParagraphStyle('cpValA', parent=base, fontSize=7.5, leading=9, alignment=TA_CENTER),
            'total_a': ParagraphStyle('cpTotA', parent=base, fontSize=11, leading=13, alignment=TA_CENTER),
        }

        def marca_anulado(canvas, doc):
            if cpb.cpb_band:
                canvas.saveState()
                canvas.setFont('Helvetica-Bold', 90)
                canvas.setFillColor(colors.Color(1, 0, 0, alpha=0.18))
                canvas.translate(A4[0] / 2, A4[1] / 2)
                canvas.rotate(40)
                canvas.drawCentredString(0, 0, 'ANULADO')
                canvas.restoreState()

        output = BytesIO()
        doc = SimpleDocTemplate(
            output, pagesize=A4,
            leftMargin=1.2 * cm, rightMargin=1.2 * cm, topMargin=1.2 * cm, bottomMargin=1.2 * cm,
            title=f"{cpb.com_codi_id} {cpb.cpb_pref or ''}-{str(cpb.cpb_nume or 0).zfill(8)}",
        )
        elementos = [
            ComprobanteService._cabecera(cpb, tipo, general, cliente, e),
            Spacer(1, 6),
            ComprobanteService._renglones(detalles, e),
            Spacer(1, 8),
            ComprobanteService._totales(cpb, letra, e),
            Spacer(1, 6),
            *ComprobanteService._pie(cpb, tipo, general, cliente, e),
        ]
        doc.build(elementos, onFirstPage=marca_anulado, onLaterPages=marca_anulado)
        output.seek(0)
        return output
