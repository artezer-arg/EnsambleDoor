USE [TB-L];
GO

-- 1. Stored Procedure to Get Next Panel for a Workstation
IF OBJECT_ID('dbo.SP_ObtenerSiguientePanel', 'P') IS NOT NULL
    DROP PROCEDURE dbo.SP_ObtenerSiguientePanel;
GO

CREATE PROCEDURE dbo.SP_ObtenerSiguientePanel
    @Puesto VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    WITH Consulta_Principal AS
    (
        SELECT TOP (1)
            OP.Lector,
            P.Puntero_ID_OrdenProduccion,
            OP.ID_OrdenProduccion,
            OP.ID_OrdenCliente,
            OP.Secuencia,
            OP.Fecha_Secuencia,
            OP.Suffix,
            OP.Fecha_Proceso,
            OP.SD,
            OP.Referencia,
            OP.Puesto,
            OP.Orden,
            OP.Estado,
            OP.Posicion + OP.Mano AS Expr1,
            OP.Mano,
            OP.Posicion
        FROM dbo.Orden_Produccion AS OP
        INNER JOIN dbo.Puesto AS P
            ON OP.Lector = P.Lector
            AND OP.Puesto = P.Puesto
            AND OP.ID_OrdenProduccion > P.Puntero_ID_OrdenProduccion
        WHERE OP.Puesto LIKE '%' + @Puesto + '%'
        ORDER BY
            OP.ID_OrdenProduccion,
            OP.Orden
    )
    SELECT
        Referencia,
        ID_OrdenProduccion,
        ID_OrdenCliente,
        Orden,
        Secuencia,
        SD,
        Expr1,
        Puesto,
        Fecha_Secuencia AS FechaSecuencia,
        Mano,
        Posicion
    FROM Consulta_Principal;
END;
GO

-- 2. Stored Procedure to Finalize the Process (Insert Sequence and Advance Pointer in a Transaction)
IF OBJECT_ID('dbo.SP_FinalizarProcesoPanel', 'P') IS NOT NULL
    DROP PROCEDURE dbo.SP_FinalizarProcesoPanel;
GO

CREATE PROCEDURE dbo.SP_FinalizarProcesoPanel
    @ID_OrdenProduccion INT,
    @ID_OrdenCliente INT,
    @Puesto VARCHAR(20),
    @Orden INT
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Concurrency lock hint - verify duplicate check in database
        IF EXISTS
        (
            SELECT 1
            FROM dbo.Produccion_Secuencia WITH (UPDLOCK, HOLDLOCK)
            WHERE ID_OrdenProduccion = @ID_OrdenProduccion
              AND Puesto = @Puesto
        )
        BEGIN
            THROW 50001, 'La orden ya fue procesada en este puesto.', 1;
        END;

        -- Insert sequence log
        INSERT INTO dbo.Produccion_Secuencia
        (
            ID_OrdenProduccion,
            ID_OrdenCliente,
            Puesto,
            Fecha,
            Orden
        )
        VALUES
        (
            @ID_OrdenProduccion,
            @ID_OrdenCliente,
            @Puesto,
            GETDATE(),
            @Orden
        );

        -- Update workstation pointer
        UPDATE dbo.Puesto WITH (ROWLOCK)
        SET Puntero_ID_OrdenProduccion = @ID_OrdenProduccion
        WHERE Puesto = @Puesto
          AND Puntero_ID_OrdenProduccion < @ID_OrdenProduccion;

        IF @@ROWCOUNT = 0
        BEGIN
            THROW 50002, 'No se pudo avanzar el puntero del puesto.', 1;
        END;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        -- Re-throw the error for the caller to handle
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        
        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO
