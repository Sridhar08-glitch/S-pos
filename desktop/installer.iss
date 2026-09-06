; ============================================================
;  S POS - Windows Installer (Inno Setup script)
;  Developed by Sridhar Mahalingam
;
;  How to build a one-click "S-POS-Setup.exe":
;    1) Build the app folder first:  double-click build-exe.bat  (creates dist\SPOS)
;    2) Install Inno Setup (free): https://jrsoftware.org/isdl.php
;    3) Open this file in Inno Setup Compiler and press "Compile".
;    4) Output:  Output\S-POS-Setup.exe   -> that's the single installer you distribute.
; ============================================================
#define AppName    "S POS"
#define AppVersion "1.0.0"
#define Publisher  "Sridhar Mahalingam"
#define ExeName    "SPOS.exe"

[Setup]
AppId={{9F1C4B7A-2E55-4C0E-9E2B-5P0S1A2B3C4D}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#Publisher}
DefaultDirName={autopf}\S POS
DefaultGroupName=S POS
DisableProgramGroupPage=yes
OutputBaseFilename=S-POS-Setup
OutputDir=Output
Compression=lzma2
SolidCompression=yes
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
WizardStyle=modern
UninstallDisplayName=S POS
UninstallDisplayIcon={app}\{#ExeName}
; Add a branded icon later and uncomment:
; SetupIconFile=spos.ico

[Languages]
Name: "en"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a &desktop shortcut"; GroupDescription: "Additional icons:"

[Files]
; Package the entire self-contained app folder produced by build-exe.bat
Source: "dist\SPOS\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs ignoreversion

[Icons]
Name: "{group}\S POS"; Filename: "{app}\{#ExeName}"
Name: "{group}\Uninstall S POS"; Filename: "{uninstallexe}"
Name: "{autodesktop}\S POS"; Filename: "{app}\{#ExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#ExeName}"; Description: "Launch S POS now"; Flags: nowait postinstall skipifsilent

; Note: the app stores its data in %LOCALAPPDATA%\SPOS (kept on uninstall).
; To also let other devices connect, allow S POS through Windows Firewall on Private networks.
