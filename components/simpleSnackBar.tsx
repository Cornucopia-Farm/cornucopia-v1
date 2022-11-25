import * as React from 'react';
import Snackbar, { SnackbarOrigin } from '@mui/material/Snackbar';
import MuiAlert, { AlertColor, AlertProps } from '@mui/material/Alert';

type Props = {
    msg: string;
    severity: AlertColor;
};

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
        <Snackbar
            anchorOrigin={{vertical: 'top', horizontal: 'center'}}
            open={open}
            onClose={handleClose}
            message={props.msg}
            // ContentProps={{
            //     sx: {
            //         borderRadius: '12px',
            //     }
            // }}
        >
            <Alert onClose={handleClose} severity={props.severity} sx={{ width: '100%', backgroundColor: 'rgb(23, 21, 20)', color: 'rgb(233, 233, 198)' }}>
                {props.msg}
            </Alert>
        </Snackbar>
    );
};

export default SimpleSnackBar;

