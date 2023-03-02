import * as React from 'react';
import Snackbar, { SnackbarOrigin } from '@mui/material/Snackbar';
import MuiAlert, { AlertColor, AlertProps } from '@mui/material/Alert';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import styles from '../styles/Home.module.css';

type Props = {
    msg: string;
    severity: AlertColor;
};

const theme = createTheme({
    palette: {
      primary: {
        // main: 'rgb(248, 215, 154)',
        main: 'rgb(23, 21, 20)',
        // main: 'rgb(248, 215, 154)',
      },
      secondary: {
        // main: 'rgb(255, 69, 0)',
        // main: '#F04B03',
        main: 'rgb(255, 255, 255)'
      },
    },
});

const SimpleSnackBar: React.FC<Props> = (props) => {

    const [open, setOpen] = React.useState(true);

    const handleClose = () => {
        setOpen(false);
    };

    const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(
        props,
        ref,
      ) {
        return <MuiAlert elevation={6} ref={ref} {...props} />;
    });

    // what color to make the alerts?? do we like the icons? do we want it filled or something else?
    // website: https://mui.com/material-ui/react-alert/#main-content

    return(
        <ThemeProvider theme={theme}> 
        <Snackbar
            anchorOrigin={{vertical: 'top', horizontal: 'center'}}
            open={open}
            onClose={handleClose}
            message={props.msg}
        > 
            <Alert className={styles.alertFont} onClose={handleClose} severity={props.severity} color={props.severity === 'success' ? 'primary' as 'success' : 'secondary' as 'error'} variant="outlined" sx={{ width: '100%', ...(props.severity === 'success' ? { backgroundColor: 'rgb(233, 233, 198)', color: 'rgb(23, 21, 20)', } : { backgroundColor: 'rgb(240, 75, 3)', color: 'rgb(255, 255, 255)', }), borderRadius: '12px', fontSize: 14 }}>
                {props.msg}
            </Alert>
        </Snackbar>
        </ThemeProvider>
    );
};

export default SimpleSnackBar;

