import { alpha, createTheme } from '@mui/material/styles'

const ACCENT = '#2dd4bf'
const SURFACE = '#1d2129'

const restoreDialogFocus = (dialog: HTMLElement): void => {
  const targetDialog =
    dialog.getAttribute('role') === 'dialog' ? dialog : dialog.querySelector<HTMLElement>('[role="dialog"]') || dialog

  if (targetDialog.contains(document.activeElement)) return

  const target = targetDialog.querySelector<HTMLElement>(
    '[autofocus], button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
  )
  ;(target || targetDialog).focus({ preventScroll: true })
}

export const appMuiTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: ACCENT },
    background: {
      default: '#111318',
      paper: SURFACE,
    },
    text: {
      primary: '#f1f5f9',
      secondary: '#94a3b8',
    },
    divider: alpha('#94a3b8', 0.18),
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif",
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiDialog: {
      defaultProps: {
        scroll: 'paper',
        TransitionProps: { onEntered: restoreDialogFocus },
      },
      styleOverrides: {
        container: {
          alignItems: 'flex-start',
          paddingTop: 8,
          paddingBottom: 8,
          '@media (min-width:600px)': { paddingTop: '10vh' },
        },
        paper: {
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'calc(100vh - 32px)',
          margin: 8,
          overflow: 'hidden',
          border: `1px solid ${alpha('#94a3b8', 0.16)}`,
          backgroundImage: 'none',
          boxShadow: '0 24px 72px rgba(0, 0, 0, 0.48)',
          '@media (min-width:600px)': { maxHeight: 'min(80vh, 760px)' },
        },
      },
    },
    MuiBackdrop: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(8, 10, 14, 0.72)',
          backdropFilter: 'blur(3px)',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          flex: '0 0 auto',
          padding: '18px 22px 14px',
          borderBottom: `1px solid ${alpha('#94a3b8', 0.14)}`,
          fontSize: '1.05rem',
          fontWeight: 650,
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          minHeight: 0,
          flex: '1 1 auto',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          padding: '20px 24px',
          scrollbarGutter: 'stable',
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          flex: '0 0 auto',
          minHeight: 64,
          padding: '12px 20px',
          gap: 8,
          borderTop: `1px solid ${alpha('#94a3b8', 0.14)}`,
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { minHeight: 36, borderRadius: 8, paddingInline: 14 },
        containedPrimary: {
          color: '#071b18',
          '&:hover': { backgroundColor: '#5eead4' },
        },
      },
    },
    MuiInputBase: {
      styleOverrides: { root: { backgroundColor: alpha('#0f1115', 0.48) } },
    },
    MuiPaper: {
      styleOverrides: { outlined: { borderColor: alpha('#94a3b8', 0.2) } },
    },
    MuiTableCell: {
      styleOverrides: {
        head: { color: '#cbd5e1', fontWeight: 650, backgroundColor: '#242830' },
        root: { borderColor: alpha('#94a3b8', 0.14) },
      },
    },
    MuiAlert: {
      styleOverrides: { root: { borderRadius: 8 } },
    },
    MuiLinearProgress: {
      styleOverrides: { root: { height: 6, borderRadius: 999 } },
    },
  },
})
