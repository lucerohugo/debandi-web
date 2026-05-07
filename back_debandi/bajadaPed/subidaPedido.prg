* =========================================================

PARAMETERS DATO1

SET DATE TO FRENCH
SET CENTURY ON
SET TALK OFF
SET SAFETY OFF
SET DELETED ON

* =========================================================
* ABRIR TABLA
* =========================================================
IF USED('pedi')
    USE IN pedi
ENDIF

USE pedi EXCL

* =========================================================
* ABRIR ARCHIVO TMP
* =========================================================
ARCHI = FOPEN(DATO1,0)

IF ARCHI < 0
    WAIT WINDOW "No se pudo abrir archivo"
    RETURN
ENDIF

* =========================================================
* BUSCAR PRIMER "
* =========================================================
REG = FREAD(ARCHI,1)

DO WHILE REG <> CHR(34) AND !FEOF(ARCHI)
    REG = FREAD(ARCHI,1)
ENDDO

* =========================================================
* LECTURA PRINCIPAL
* =========================================================
DO WHILE !FEOF(ARCHI)

    IF REG <> CHR(34)
        REG = FREAD(ARCHI,1)
        LOOP
    ENDIF

    DIMENSION aCampos[1]

    nCampo = 0

    * =====================================================
    * LEER CAMPOS ENTRE COMILLAS
    * =====================================================
    DO WHILE .T.

        cValor = ""

        REG = FREAD(ARCHI,1)

        DO WHILE REG <> CHR(34) AND !FEOF(ARCHI)

            cValor = cValor + REG

            REG = FREAD(ARCHI,1)

        ENDDO

        nCampo = nCampo + 1

        DIMENSION aCampos[nCampo]

        aCampos[nCampo] = ALLTRIM(cValor)

        REG = FREAD(ARCHI,1)

        IF REG <> ","
            EXIT
        ENDIF

        REG = FREAD(ARCHI,1)

    ENDDO

    IF nCampo = 0
        LOOP
    ENDIF

    * =====================================================
    * VALIDAR TIPO
    * =====================================================
    cTipo = LOWER(aCampos[2])

    IF cTipo = "pedi"

        SELECT pedi

        APPEND BLANK

        * =================================================
        * CABECERA
        * =================================================

        * Pedido
        IF nCampo >= 3
            REPLACE ped_codi WITH VAL(aCampos[3])
        ENDIF

        * Fecha
        IF nCampo >= 4 AND !EMPTY(aCampos[4])

            NEWFech = SUBSTR(aCampos[4],9,2) + '/' + SUBSTR(aCampos[4],6,2) + '/' + SUBSTR(aCampos[4],1,4)
            REPLACE ped_fech WITH CTOD(NEWFech)

        ENDIF

        * Cliente
        IF nCampo >= 5
            REPLACE cli_codi WITH VAL(aCampos[5])
        ENDIF

        * Total
        IF nCampo >= 6
            REPLACE ped_tota WITH VAL(aCampos[6])
        ENDIF

        * Forma pago
        IF nCampo >= 7
            REPLACE ped_fpag WITH aCampos[7]
        ENDIF

        * =================================================
        * DETALLE
        * =================================================

        * Código detalle
        IF nCampo >= 8
            REPLACE dpe_codi WITH VAL(aCampos[8])
        ENDIF

        * Artículo
        IF nCampo >= 9
            REPLACE art_codi WITH VAL(aCampos[9])
        ENDIF

        * Nombre artículo
        IF nCampo >= 10
            REPLACE art_nomb WITH aCampos[10]
        ENDIF

        * Cantidad
        IF nCampo >= 11
            REPLACE dpe_cant WITH VAL(aCampos[11])
        ENDIF

        * Precio final
        IF nCampo >= 12
            REPLACE art_pfin WITH VAL(aCampos[12])
        ENDIF

        * Descuento
        IF nCampo >= 13
            REPLACE art_descu WITH VAL(aCampos[13])
        ENDIF

        * Stock
        IF nCampo >= 14
            REPLACE art_stk WITH VAL(aCampos[14])
        ENDIF

    ENDIF

    * =====================================================
    * SALTAR CR/LF
    * =====================================================
    DO WHILE REG = CHR(13) OR REG = CHR(10)

        REG = FREAD(ARCHI,1)

    ENDDO

ENDDO

* =========================
* CIERRE
* =========================
FCLOSE(ARCHI)
CLOSE ALL
