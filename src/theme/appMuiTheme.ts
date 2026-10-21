import { alpha, createTheme } from '@mui/material/styles'

const ACCENT = '#ffffff'
const SURFACE = '#111319'

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
      default: '#080a0f',
      paper: SURFACE,
    },
    text: {
      primary: '#f8fafc',
      secondary: '#94a3b8',
    },
    divider: 'rgba(255, 255, 255, 0.08)',
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
          '@media (min-width:600px)': { paddingTop: '8vh' },
        },
        paper: {
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'calc(100vh - 32px)',
          margin: 8,
          overflow: 'hidden',
          backgroundColor: 'rgba(15, 17, 23, 0.94)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255, 255, 255, 0.09)',
          backgroundImage: 'none',
          boxShadow: '0 32px 80px -12px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          '@media (min-width:600px)': { maxHeight: 'min(82vh, 780px)' },
        },
      },
    },
    MuiBackdrop: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(4, 5, 8, 0.75)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          flex: '0 0 auto',
          padding: '16px 22px 14px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          fontSize: '1.05rem',
          fontWeight: 650,
          letterSpacing: '-0.01em',
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
          minHeight: 58,
          padding: '12px 20px',
          gap: 8,
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: 'rgba(12, 14, 19, 0.65)',
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          minHeight: 34,
          borderRadius: 7,
          paddingInline: 14,
          transition: 'all 75ms ease',
        },
        containedPrimary: {
          backgroundColor: '#ffffff',
          color: '#080a0f',
          fontWeight: 600,
          '&:hover': {
            backgroundColor: '#f1f5f9',
            boxShadow: '0 0 16px rgba(255, 255, 255, 0.15)',
          },
        },
        outlined: {
          borderColor: 'rgba(255, 255, 255, 0.12)',
          color: '#f8fafc',
          '&:hover': {
            borderColor: 'rgba(255, 255, 255, 0.28)',
            backgroundColor: 'rgba(255, 255, 255, 0.06)',
          },
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(10, 12, 16, 0.6)',
          borderColor: 'rgba(255, 255, 255, 0.08)',
          borderRadius: 6,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        outlined: { borderColor: 'rgba(255, 255, 255, 0.08)' },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: { color: '#f1f5f9', fontWeight: 650, backgroundColor: 'rgba(18, 21, 28, 0.85)' },
        root: { borderColor: 'rgba(255, 255, 255, 0.08)' },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          border: '1px solid rgba(255, 255, 255, 0.08)',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: { root: { height: 4, borderRadius: 999 } },
    },
  },
})
