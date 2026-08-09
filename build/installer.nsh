; ============================================================
; 太玄问道 · NSIS 自定义脚本
; 在安装目录选择页之后追加「附加任务」页：
; 由用户自行勾选是否在桌面放置快捷方式（默认勾选）。
; package.json 中 createDesktopShortcut=false 已关闭内置创建逻辑，
; 桌面快捷方式完全由本脚本接管。
; ============================================================

; 本文件先于 MUI2.nsh 被包含，需自行引入（MUI2 自带重复包含保护，后续主脚本的再次 include 为空操作）
!include "MUI2.nsh"

!macro customInit
  ; 默认勾选「创建桌面快捷方式」
  StrCpy $WantDesktopShortcut "1"
!macroend

; 变量声明与页面函数仅在安装器构建中编译（卸载器构建无 MUI_PAGE 环境，且未引用变量会产生告警即错误）
!ifndef BUILD_UNINSTALLER

Var /GLOBAL WantDesktopShortcut
Var /GLOBAL DscCheckbox

!macro customPageAfterChangeDir
  Page custom TaixuanShortcutPage TaixuanShortcutPageLeave
!macroend

Function TaixuanShortcutPage
  !insertmacro MUI_HEADER_TEXT "附加任务" "选择是否创建桌面快捷方式"

  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 24u "安装位置已就绪。请选择需要执行的附加任务，然后点击「安装」开始安装太玄问道。"
  Pop $0

  ${NSD_CreateCheckbox} 0 34u 100% 14u "在桌面创建快捷方式(&D)"
  Pop $DscCheckbox
  ${If} $WantDesktopShortcut == "1"
    ${NSD_Check} $DscCheckbox
  ${EndIf}

  nsDialogs::Show
FunctionEnd

Function TaixuanShortcutPageLeave
  ${NSD_GetState} $DscCheckbox $WantDesktopShortcut
FunctionEnd

!endif ; BUILD_UNINSTALLER

; 文件安装完成后调用：按用户选择创建桌面快捷方式
!macro customInstall
  ${If} $WantDesktopShortcut == "1"
    CreateShortcut "$DESKTOP\${SHORTCUT_NAME}.lnk" "$appExe" "" "$appExe" 0 "" "" "${APP_DESCRIPTION}"
    ClearErrors
    WinShell::SetLnkAUMI "$DESKTOP\${SHORTCUT_NAME}.lnk" "${APP_ID}"
    System::Call 'Shell32::SHChangeNotify(i 0x8000000, i 0, i 0, i 0)'
  ${EndIf}
!macroend

; 卸载时清理桌面快捷方式（存在则删）
!macro customUnInstall
  Delete "$DESKTOP\${SHORTCUT_NAME}.lnk"
!macroend
