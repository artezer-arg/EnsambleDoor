USE [TB-L];
GO

SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET NUMERIC_ROUNDABORT OFF;
SET QUOTED_IDENTIFIER ON;
GO

-- 1. Table for Panel - Ornament Equivalences
IF OBJECT_ID('dbo.Equivalencia_Panel_Ornamento', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Equivalencia_Panel_Ornamento (
        ID_Equivalencia INT IDENTITY(1,1) PRIMARY KEY,
        CodigoPanel VARCHAR(50) NOT NULL,
        CodigoOrnamento VARCHAR(50) NULL,
        RequiereOrnamento BIT NOT NULL DEFAULT 1,
        Activo BIT NOT NULL DEFAULT 1,
        FechaDesde DATETIME NOT NULL DEFAULT GETDATE(),
        FechaHasta DATETIME NULL,
        FechaModificacion DATETIME NOT NULL DEFAULT GETDATE(),
        UsuarioModificacion VARCHAR(50) NOT NULL DEFAULT 'SYSTEM'
    );
    
    -- Unique index on active code panel to prevent overlap
    CREATE UNIQUE NONCLUSTERED INDEX UIX_Equivalencia_Panel_Activo 
    ON dbo.Equivalencia_Panel_Ornamento(CodigoPanel) 
    WHERE Activo = 1;
END;
GO

-- 2. Table for Config settings
IF OBJECT_ID('dbo.Configuracion_Sistema', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Configuracion_Sistema (
        Clave VARCHAR(50) PRIMARY KEY,
        Valor NVARCHAR(MAX) NOT NULL,
        Descripcion NVARCHAR(200) NULL,
        FechaModificacion DATETIME NOT NULL DEFAULT GETDATE(),
        UsuarioModificacion VARCHAR(50) NOT NULL DEFAULT 'SYSTEM'
    );
END;
GO

-- 3. Table for Configuration Audits
IF OBJECT_ID('dbo.Auditoria_Configuracion', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Auditoria_Configuracion (
        ID_Auditoria INT IDENTITY(1,1) PRIMARY KEY,
        Clave VARCHAR(50) NOT NULL,
        ValorAnterior NVARCHAR(MAX) NULL,
        ValorNuevo NVARCHAR(MAX) NOT NULL,
        FechaModificacion DATETIME NOT NULL DEFAULT GETDATE(),
        UsuarioModificacion VARCHAR(50) NOT NULL,
        Motivo NVARCHAR(200) NULL
    );
END;
GO

-- 4. Table for Ornament Validation Logs
IF OBJECT_ID('dbo.Validacion_Ornamento', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Validacion_Ornamento (
        ID_Validacion INT IDENTITY(1,1) PRIMARY KEY,
        ID_Operacion UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        ID_OrdenProduccion INT NOT NULL,
        ID_OrdenCliente INT NOT NULL,
        Orden INT NOT NULL,
        Secuencia INT NULL,
        SD VARCHAR(10) NULL,
        Referencia VARCHAR(50) NOT NULL,
        CodigoOrnamentoEsperado VARCHAR(50) NULL,
        CodigoOrnamentoLeido VARCHAR(100) NULL,
        QrCompleto VARCHAR(500) NOT NULL,
        NumeroSerie VARCHAR(100) NULL,
        Lote VARCHAR(100) NULL,
        InicioCurado DATETIME NULL,
        FechaActualServidor DATETIME NOT NULL DEFAULT GETDATE(),
        MinutosCurado INT NULL,
        TiempoMinimoRequerido INT NULL,
        ResultadoCurado VARCHAR(50) NULL,
        ResultadoCorrespondencia VARCHAR(50) NULL,
        ResultadoGeneral VARCHAR(50) NOT NULL, -- 'APROBADO', 'RECHAZADO'
        MotivoRechazo NVARCHAR(200) NULL,
        Puesto VARCHAR(20) NOT NULL,
        Operador VARCHAR(50) NOT NULL DEFAULT 'OPERADOR',
        FechaLectura DATETIME NOT NULL DEFAULT GETDATE(),
        FechaImpresion DATETIME NULL,
        Impresora VARCHAR(100) NULL,
        EstadoImpresion VARCHAR(50) NULL, -- 'COMPLETO', 'FALLIDO', 'PENDIENTE'
        FechaAvancePuntero DATETIME NULL,
        MensajeErrorTecnico NVARCHAR(MAX) NULL
    );

    -- Unique index on QR code for successfully processed/approved ornaments
    -- to prevent duplicate usage of the same ornament.
    CREATE UNIQUE NONCLUSTERED INDEX UIX_Validacion_Ornamento_Qr_Aprobado
    ON dbo.Validacion_Ornamento(QrCompleto)
    WHERE ResultadoGeneral = 'APROBADO';
    
    -- Index on serial number to search for reuse of specific serial numbers if present
    CREATE NONCLUSTERED INDEX IX_Validacion_Ornamento_NumeroSerie
    ON dbo.Validacion_Ornamento(NumeroSerie)
    WHERE NumeroSerie IS NOT NULL;
END;
GO
