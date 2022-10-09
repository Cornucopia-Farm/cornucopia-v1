import * as React from 'react';
import Snackbar, { SnackbarOrigin } from '@mui/material/Snackbar';

type Props = {
    msg: string;
};

const SimpleSnackBar: React.FC<Props> = (props) => {

    const [open, setOpen] = React.useState(true);

    const handleClose = () => {
        setOpen(false);
    };

    return(
        <Snackbar
            anchorOrigin={{vertical: 'top', horizontal: 'center'}}
            open={open}
            onClose={handleClose}
            message={props.msg}
        />
    );
};

export default SimpleSnackBar;

