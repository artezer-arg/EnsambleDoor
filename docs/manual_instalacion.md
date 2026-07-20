# Manual de Instalación y Operación - Puesto DL01

Este manual describe los pasos necesarios para instalar, configurar y ejecutar el sistema de control del puesto **DL01** en una PC industrial con Windows.

---

## 1. Requisitos de Entorno
* **Sistema Operativo**: Windows 10/11 Pro, Windows IoT Enterprise, o Windows Server.
* **Base de Datos**: SQL Server 2012 o superior (Express, Standard o Enterprise).
* **Entornos de Desarrollo/Ejecución**:
  * [.NET SDK 8.0](https://dotnet.microsoft.com/en-us/download/dotnet/8.0)
  * [Node.js (v18 o superior)](https://nodejs.org/) y npm

---

## 2. Configuración de Base de Datos (SQL Server)
El sistema utiliza una base de datos local o remota en SQL Server denominada `TB-L`.

### Instalación de Tablas y Datos:
1. Abra SQL Server Management Studio (SSMS) o la consola `sqlcmd`.
2. Conéctese a la instancia de SQL Server.
3. Ejecute el script de creación de esquemas:
   ```powershell
   sqlcmd -E -i database\schema.sql
   ```
4. Ejecute el script de compilación de procedimientos almacenados:
   ```powershell
   sqlcmd -E -i database\stored_procedures.sql
   ```
5. Ejecute el script de carga de configuraciones y órdenes de prueba:
   ```powershell
   sqlcmd -E -i database\seed_data.sql
   ```

---

## 3. Configuración y Ejecución del Backend (.NET 8 Web API)
El backend actúa como el núcleo de lógica de negocio, realiza validaciones contra SQL Server y coordina el Spooler de impresión de Windows.

### Configurar Conexión:
Abra [backend/appsettings.json](file:///c:/Users/artez/Documents/EmsambleDoor/backend/appsettings.json) y configure la cadena de conexión:
```json
"ConnectionStrings": {
  "DefaultConnection": "Server=localhost;Database=TB-L;Trusted_Connection=True;TrustServerCertificate=True;"
}
```
*Si utiliza una instancia remota o con usuario/contraseña, configure:*
`"Server=IP_SERVIDOR\\INSTANCIA;Database=TB-L;User Id=USUARIO;Password=CONTRASEÑA;TrustServerCertificate=True;"`

### Ejecutar el Servicio:
1. Inicie la consola en la carpeta `backend/`.
2. Ejecute el comando:
   ```powershell
   dotnet run --project backend.csproj
   ```
3. El servicio se iniciará por defecto en `http://localhost:5121`. Puede verificar que responde ingresando a `http://localhost:5121/swagger` desde el navegador.

---

## 4. Configuración y Ejecución del Frontend (React + TS)
La interfaz está optimizada para pantallas táctiles de 1920x1080.

### Preparar y Compilar:
1. Inicie la consola en la carpeta `frontend/`.
2. Instale dependencias (si no lo ha hecho aún):
   ```powershell
   npm install
   ```
3. Compile la versión de distribución optimizada para producción:
   ```powershell
   npm run build
   ```

### Ejecutar en Desarrollo/Planta:
Para iniciar el servidor de desarrollo local:
```powershell
npm run dev
```
La aplicación estará disponible en `http://localhost:5173`.

---

## 5. Configuración de Periféricos de Planta

### A. Lector de Código QR (Pistola USB)
El lector QR debe configurarse en modo **Keyboard Wedge** (Emulación de teclado USB):
1. Escanee el código de barras de configuración del manual físico del lector correspondiente a **"Restore Factory Defaults"**.
2. Escanee el código para **"USB Keyboard Wedge Mode"**.
3. Asegúrese de que el lector tenga configurado el sufijo **ENTER** (Carriage Return `\r` o Line Feed `\n`). Esto es vital para que la aplicación capture el fin de lectura de forma automática.

### B. Impresora de Etiquetas (Kanban)
El sistema se integra directamente con el Spooler de impresión de Windows.
1. Instale los controladores oficiales de la impresora de etiquetas (Zebra, TSC, Honeywell, etc.).
2. En Windows, diríjase a *Configuración de Impresoras y Escáneres* y verifique el nombre exacto de la impresora (ej. `Zebra ZD420`).
3. Acceda a la pantalla de configuración en el HMI (contraseña `1234`) y asigne el nombre de la impresora en el campo **Nombre de Impresora Local**.
4. Si no cuenta con una impresora física, marque la opción **Activar Simulador de Impresión Virtual** en la configuración. El sistema renderizará el Kanban de prueba en formato PNG y lo guardará en `backend/bin/Debug/net8.0/PrintedLabels/`, enviando también una previsualización de alta calidad a la pantalla.

---

## 6. Configuración de Ejecución en Pantalla Completa (Modo Kiosco)
Para asegurar que los operadores de planta no salgan de la interfaz del puesto DL01, se recomienda configurar el modo kiosco en Windows:

### Opción A: Microsoft Edge / Chrome Kiosco (Sencilla)
Cree un acceso directo en el Escritorio con la siguiente línea de ejecución:
```text
"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --kiosk http://localhost:5173 --edge-kiosk-type=fullscreen --no-first-run
```
*(Para Chrome use `--kiosk --user-data-dir="C:\temp" http://localhost:5173`)*

### Opción B: Acceso Asignado de Windows (Segura)
1. En Windows, busque **"Configurar un quiosco (Acceso asignado)"**.
2. Seleccione **Comenzar**.
3. Escriba un nombre para la cuenta de kiosco (ej. `OperadorDL01`).
4. Seleccione **Microsoft Edge** como aplicación del quiosco.
5. Seleccione **Como pantalla digital o quiosco interactivo (pantalla completa)**.
6. Ingrese la URL: `http://localhost:5173`.
7. Configure el reinicio automático tras inactividad si lo desea.
8. Al iniciar sesión en Windows con el usuario `OperadorDL01`, la PC cargará la aplicación directamente a pantalla completa y bloqueará el teclado para impedir el cierre involuntario.
