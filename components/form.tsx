import * as React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Fab from '@mui/material/Fab';
import AddIcon from '@mui/icons-material/Add';
import axios from 'axios';
import ClientOnly from '../components/clientOnly';
import Bundlr from "@bundlr-network/client";
import privateKey from '../arweave-key-UxP5TeAmfwJXIbZY9rJE1uw4z1FHs-QuV-UlfC28cOI.json';
import { NextApiResponse } from 'next';
import { useContractWrite, usePrepareContractWrite, useWaitForTransaction } from 'wagmi';
import escrowABI from '../cornucopia-contracts/out/Escrow.sol/Escrow.json'; // add in actual path later
import useDebounce from './useDebounce';
import SimpleSnackBar from './simpleSnackBar';
import styles from '../styles/Home.module.css';
import MenuItem from '@mui/material/MenuItem';

type Props = {
    creatorAddress: string;
    hunterAddress?: string;
    postId?: string;
    postLinks?: Array<string>;
    date?: string;
    time?: string;
    description?: string;
    amount?: number; 
    title?: string;
    formName: string;
    summary: string;
    formButtons: Array<string>;
    formType: string;
    // handleCloseSubmitTrue?: (bountyAppId: string, creatorAddress: string) => void;
    tags: Array<any>;
    experience?: string;
    contact?: string;
    appLinks?: Array<string>;
    tokenAddress?: string;
    tokenSymbol?: string;
    // refetch?: () => any;
};

type ArweaveData = {
    creatorAddress: string;
    hunterAddress?: string;
    postId?: string;
    title?: string;
    description?: string; 
    amount?: number; 
    date?: string; 
    time?: string; 
    postLinks?: Array<string>;
    appLinks?: Array<string>;
    experience?: string;
    contact?: string;
    workLinks?: Array<string>;
    tokenAddress?: string;
    tokenSymbol?: string; 
};

type Tags = {
    name: string;
    value: string;
};

const defaultValues: ArweaveData = {
    creatorAddress: "",
    hunterAddress: "",
    postId: "",
    title: "", 
    description: "", 
    amount: undefined,
    date: "", 
    time: "", 
    postLinks: [""],
    appLinks: [""],
    experience: "",
    contact: "",
    workLinks: [""],
    tokenAddress: "",
    tokenSymbol: ""
};

const tokens = [
    {
      value: '0x0000000000000000000000000000000000000000', // Set Address for ETH to zero address b/c if zero address then frontend knows you're sending ETH
      label: 'ETH',
    },
    {
      value: 'EUR',
      label: '€',
    },
    {
      value: 'BTC',
      label: '฿',
    },
    {
      value: 'JPY',
      label: '¥',
    },
];

// Escrow Contract Config
const contractConfig = {
    addressOrName: process.env.NEXT_PUBLIC_ESCROW_ADDRESS!, // contract address
    contractInterface: escrowABI['abi'], // contract abi in json or JS format
};

const Form: React.FC<Props> = props => {
    
    const [open, setOpen] = React.useState(false);
    const [openSubmitCheck, setOpenSubmitCheck] = React.useState(false);
    const [formValues, setFormValues] = React.useState(defaultValues);
    const [arweaveTrigger, setArweaveTrigger] = React.useState(false); // Use changing of this value to trigger api call to upload to arweave

    // Submit state variables
    const [bountyAppId, setBountyAppId] = React.useState('');
    const debouncedBountyAppId = useDebounce(bountyAppId, 10);
    const [creatorAddress, setCreatorAddress] = React.useState('');
    const debouncedCreatorAddress = useDebounce(creatorAddress, 10);

    // Submit Contract call
    const { config: submitConfig } = usePrepareContractWrite({...contractConfig, functionName: 'submit', args: [debouncedBountyAppId, debouncedCreatorAddress], enabled: Boolean(debouncedBountyAppId) && Boolean(debouncedCreatorAddress),});
    const { data: submitData, error: submitError, isLoading: isSubmitLoading, isSuccess: isSubmitSuccess, write: submit } = useContractWrite(submitConfig);
    const { data: submitTxData, isLoading: isSubmitTxLoading, isSuccess: isSubmitTxSuccess, error: submitTxError } = useWaitForTransaction({ hash: submitData?.hash, enabled: true, });

    const handleCloseSubmitTrue = (bountyAppId: string, creatorAddress: string) => {
        setBountyAppId(bountyAppId);
        setCreatorAddress(creatorAddress);
        // submit?.();
        // handleCloseSubmit();
    };


    const handleInputChange = (e: any) => {
        const { name, value } = e.target;
        setFormValues({
          ...formValues,
          [name]: value,
        });
    };

    const handleInputChangeToken = (e: any) => {
        // const { name, value } = e.target;
        const tokenAddress = e.target.value;
        const tokenSymbol = e.target.label;
        setFormValues({
          ...formValues,
          [tokenAddress]: tokenAddress,
          [tokenSymbol]: tokenSymbol,
        });
    };

    const handleClickOpen = () => {
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setOpenSubmitCheck(false);
    };

    const handleOpenSubmitCheck = () => {
        setOpenSubmitCheck(true);
    };

    const handleCloseSubmit = () => {
        if (props.creatorAddress) formValues.creatorAddress = props.creatorAddress;
        if (props.hunterAddress) formValues.hunterAddress = props.hunterAddress;
        if (props.postId) formValues.postId = props.postId;
        if (props.title) formValues.title = props.title;
        if (props.description) formValues.description = props.description;
        if (props.amount) formValues.amount = props.amount;
        if (props.date) formValues.date = props.date;
        if (props.time) formValues.time = props.time;
        if (props.postLinks) formValues.postLinks = props.postLinks;
        if (props.experience) formValues.experience = props.experience;
        if (props.contact) formValues.contact = props.contact;
        if (props.appLinks) formValues.appLinks = props.appLinks;
        if (props.tokenAddress) formValues.tokenAddress = props.tokenAddress;
        if (props.tokenSymbol) formValues.tokenSymbol = props.tokenSymbol;

        setArweaveTrigger(!arweaveTrigger); // Trigger useeffect to call arweave upload api
        setOpen(false);
        setOpenSubmitCheck(false);
        // props.refetch?.(); // Refetch data in createBounties after posting a bounty to show new bounty immediately
    };

    React.useEffect(() => {
        const uploadToArweave = async (formValues: ArweaveData, tags: Array<Tags>) => {
            const response: any = await axios.post('api/arweave', {bountyData: formValues, tags: tags });
            if (response.status === 200) {
                console.log("Uploaded to arweave");
                const txHash = response.data;
                console.log("Upload Tx result", txHash);
            } else if (response.status === 500) {
                console.log("Error", await response);
            }
        };
    
        if (arweaveTrigger === true) { // Need this condition b/c otherwise blank data will be uploaded on page load
            console.log(props.formType? props.formType : "Submit");
            console.log("Form Values", formValues);
            uploadToArweave(formValues, props.tags);
        }
    }, [arweaveTrigger]);

    const ButtonType = () => {
        if (props.formType == "createBounty") { // TODO: Change color of create new bounty icon
            return (
                // <Fab sx={{ backgroundColor: 'rgba(6, 72, 41, 0.85)', color: '#FFFFFF' }} aria-label="add" onClick={handleClickOpen}> 
                //     <AddIcon />
                // </Fab>
                <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(233, 233, 198)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={handleClickOpen}>
                    Create Bounty
                </Button>
            );
        } else if (props.formType == "applyBounty") {
            return (
                <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(233, 233, 198)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={handleClickOpen}>
                    Apply
                </Button>
            );
        } else {
            return (
                <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(233, 233, 198)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }}  onClick={handleClickOpen}>
                    Submit
                </Button>
            );
        }
    };

    const dialogBoxes = (formType: string) => {
        if (formType == "createBounty") { // Creator Creates Bounty
            return (
                <div> 
                    <TextField
                        autoFocus
                        margin="dense"
                        id="title-input"
                        name="title"
                        label="Title (5 words)"
                        value={formValues.title}
                        onChange={handleInputChange}
                        type="text"
                        fullWidth
                        variant="standard"
                        sx={{ 
                            '& .MuiInputBase-input': { 
                                color: 'rgb(248, 215, 154)', 
                                fontFamily: 'Space Grotesk'
                            }, 
                            '& .MuiInputLabel-root': { 
                                color: 'rgb(233, 233, 198)',
                                fontFamily: 'Space Grotesk'
                            }, 
                            '& label.Mui-focused': {
                                color: 'rgb(248, 215, 154)',
                            }, 
                            '& .MuiInput-underline:after': {
                                borderBottomColor: 'rgb(248, 215, 154)',
                            }, 
                            '& .MuiInput-underline:before': {
                                borderBottomColor: 'rgb(233, 233, 198)',
                            }, 
                            '& .MuiInput-underline': {
                                '&:hover:before': {
                                    borderBottomColor: 'rgb(248, 215, 154) !important',
                                }
                            },
                        }} 
                    />
                    <TextField
                        autoFocus
                        margin="dense"
                        id="description-input"
                        name="description"
                        label="Description"
                        value={formValues.description}
                        onChange={handleInputChange}
                        type="text"
                        fullWidth
                        variant="standard"
                        sx={{ 
                            '& .MuiInputBase-input': { 
                                color: 'rgb(248, 215, 154)', 
                                fontFamily: 'Space Grotesk'
                            }, 
                            '& .MuiInputLabel-root': { 
                                color: 'rgb(233, 233, 198)', 
                                fontFamily: 'Space Grotesk'
                            }, 
                            '& label.Mui-focused': {
                                color: 'rgb(248, 215, 154)',
                            }, 
                            '& .MuiInput-underline:after': {
                                borderBottomColor: 'rgb(248, 215, 154)',
                            }, 
                            '& .MuiInput-underline:before': {
                                borderBottomColor: 'rgb(233, 233, 198)',
                            }, 
                            '& .MuiInput-underline': {
                                '&:hover:before': {
                                    borderBottomColor: 'rgb(248, 215, 154) !important',
                                }
                            },
                        }} 
                    />
                    <TextField // Fix Dropdown Menu Formatting!!
                        autoFocus
                        margin="dense"
                        id="token-input"
                        name="token"
                        label="Token"
                        value={formValues.tokenAddress}
                        onChange={handleInputChangeToken}
                        select
                        fullWidth
                        variant="standard"
                        sx={{ 
                            '& .MuiInputBase-input': { 
                                color: 'rgb(248, 215, 154)', 
                                fontFamily: 'Space Grotesk'
                            }, 
                            '& .MuiInputLabel-root': { 
                                color: 'rgb(233, 233, 198)', 
                                fontFamily: 'Space Grotesk'
                            }, 
                            '& label.Mui-focused': {
                                color: 'rgb(248, 215, 154)',
                            }, 
                            '& .MuiInput-underline:after': {
                                borderBottomColor: 'rgb(248, 215, 154)',
                            }, 
                            '& .MuiInput-underline:before': {
                                borderBottomColor: 'rgb(233, 233, 198)',
                            }, 
                            '& .MuiInput-underline': {
                                '&:hover:before': {
                                    borderBottomColor: 'rgb(248, 215, 154) !important',
                                }
                            },
                        }}
                    >
                        {tokens.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                                {option.label}
                            </MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        autoFocus
                        margin="dense"
                        id="amount-input"
                        name="amount"
                        label="Amount"
                        value={formValues.amount}
                        onChange={handleInputChange}
                        type="text" // Need to add ERC20
                        fullWidth
                        variant="standard"
                        sx={{ 
                            '& .MuiInputBase-input': { 
                                color: 'rgb(248, 215, 154)', 
                                fontFamily: 'Space Grotesk'
                            }, 
                            '& .MuiInputLabel-root': { 
                                color: 'rgb(233, 233, 198)', 
                                fontFamily: 'Space Grotesk'
                            }, 
                            '& label.Mui-focused': {
                                color: 'rgb(248, 215, 154)',
                            }, 
                            '& .MuiInput-underline:after': {
                                borderBottomColor: 'rgb(248, 215, 154)',
                            }, 
                            '& .MuiInput-underline:before': {
                                borderBottomColor: 'rgb(233, 233, 198)',
                            }, 
                            '& .MuiInput-underline': {
                                '&:hover:before': {
                                    borderBottomColor: 'rgb(248, 215, 154) !important',
                                }
                            },
                        }}
                    />
                    <TextField
                        autoFocus
                        margin="dense"
                        id="date-input"
                        name="date"
                        label="Date"
                        value={formValues.date}
                        onChange={handleInputChange}
                        type="text"
                        fullWidth
                        variant="standard"
                        sx={{ 
                            '& .MuiInputBase-input': { 
                                color: 'rgb(248, 215, 154)', 
                                fontFamily: 'Space Grotesk'
                            }, 
                            '& .MuiInputLabel-root': { 
                                color: 'rgb(233, 233, 198)', 
                                fontFamily: 'Space Grotesk'
                            }, 
                            '& label.Mui-focused': {
                                color: 'rgb(248, 215, 154)',
                            }, 
                            '& .MuiInput-underline:after': {
                                borderBottomColor: 'rgb(248, 215, 154)',
                            }, 
                            '& .MuiInput-underline:before': {
                                borderBottomColor: 'rgb(233, 233, 198)',
                            }, 
                            '& .MuiInput-underline': {
                                '&:hover:before': {
                                    borderBottomColor: 'rgb(248, 215, 154) !important',
                                }
                            },
                        }}
                    />
                    <TextField
                        autoFocus
                        margin="dense"
                        id="time-input"
                        name="time"
                        label="Expected Time"
                        value={formValues.time}
                        onChange={handleInputChange}
                        type="text"
                        fullWidth
                        variant="standard"
                        sx={{ 
                            '& .MuiInputBase-input': { 
                                color: 'rgb(248, 215, 154)', 
                                fontFamily: 'Space Grotesk'
                            }, 
                            '& .MuiInputLabel-root': { 
                                color: 'rgb(233, 233, 198)', 
                                fontFamily: 'Space Grotesk'
                            }, 
                            '& label.Mui-focused': {
                                color: 'rgb(248, 215, 154)',
                            }, 
                            '& .MuiInput-underline:after': {
                                borderBottomColor: 'rgb(248, 215, 154)',
                            }, 
                            '& .MuiInput-underline:before': {
                                borderBottomColor: 'rgb(233, 233, 198)',
                            }, 
                            '& .MuiInput-underline': {
                                '&:hover:before': {
                                    borderBottomColor: 'rgb(248, 215, 154) !important',
                                }
                            },
                        }}
                    />
                    <TextField
                        autoFocus
                        margin="dense"
                        id="links-input"
                        name="postLinks"
                        label="Links"
                        value={formValues.postLinks}
                        onChange={handleInputChange}
                        type="text"
                        fullWidth
                        variant="standard"
                        sx={{ 
                            '& .MuiInputBase-input': { 
                                color: 'rgb(248, 215, 154)', 
                                fontFamily: 'Space Grotesk'
                            }, 
                            '& .MuiInputLabel-root': { 
                                color: 'rgb(233, 233, 198)', 
                                fontFamily: 'Space Grotesk'
                            }, 
                            '& label.Mui-focused': {
                                color: 'rgb(248, 215, 154)',
                            }, 
                            '& .MuiInput-underline:after': {
                                borderBottomColor: 'rgb(248, 215, 154)',
                            }, 
                            '& .MuiInput-underline:before': {
                                borderBottomColor: 'rgb(233, 233, 198)',
                            }, 
                            '& .MuiInput-underline': {
                                '&:hover:before': {
                                    borderBottomColor: 'rgb(248, 215, 154) !important',
                                }
                            },
                        }} 
                    />
                </div>
            );
        } else if (formType == "applyBounty") { // Hunter Applies for Bounty
            return (
                <div> 
                    <TextField
                        autoFocus
                        margin="dense"
                        id="experience-input"
                        name="experience"
                        label="Experience"
                        value={formValues.experience}
                        onChange={handleInputChange}
                        type="text"
                        fullWidth
                        variant="standard"
                        sx={{ 
                            '& .MuiInputBase-input': { 
                                color: 'rgb(248, 215, 154)', 
                                fontFamily: 'Space Grotesk'
                            }, 
                            '& .MuiInputLabel-root': { 
                                color: 'rgb(233, 233, 198)', 
                                fontFamily: 'Space Grotesk'
                            }, 
                            '& label.Mui-focused': {
                                color: 'rgb(248, 215, 154)',
                            }, 
                            '& .MuiInput-underline:after': {
                                borderBottomColor: 'rgb(248, 215, 154)',
                            }, 
                            '& .MuiInput-underline:before': {
                                borderBottomColor: 'rgb(233, 233, 198)',
                            }, 
                            '& .MuiInput-underline': {
                                '&:hover:before': {
                                    borderBottomColor: 'rgb(248, 215, 154) !important',
                                }
                            },
                        }}
                    />
                    <TextField
                        autoFocus
                        margin="dense"
                        id="links-input"
                        name="appLinks"
                        label="Links"
                        value={formValues.appLinks}
                        onChange={handleInputChange}
                        type="text"
                        fullWidth
                        variant="standard"
                        sx={{ 
                            '& .MuiInputBase-input': { 
                                color: 'rgb(248, 215, 154)', 
                                fontFamily: 'Space Grotesk'
                            }, 
                            '& .MuiInputLabel-root': { 
                                color: 'rgb(233, 233, 198)', 
                                fontFamily: 'Space Grotesk'
                            }, 
                            '& label.Mui-focused': {
                                color: 'rgb(248, 215, 154)',
                            }, 
                            '& .MuiInput-underline:after': {
                                borderBottomColor: 'rgb(248, 215, 154)',
                            }, 
                            '& .MuiInput-underline:before': {
                                borderBottomColor: 'rgb(233, 233, 198)',
                            }, 
                            '& .MuiInput-underline': {
                                '&:hover:before': {
                                    borderBottomColor: 'rgb(248, 215, 154) !important',
                                }
                            },
                        }}
                    />
                    <TextField
                        autoFocus
                        margin="dense"
                        id="contact-input"
                        name="contact"
                        label="Contact Info"
                        value={formValues.contact}
                        onChange={handleInputChange}
                        type="text"
                        fullWidth
                        variant="standard"
                        sx={{ 
                            '& .MuiInputBase-input': { 
                                color: 'rgb(248, 215, 154)', 
                                fontFamily: 'Space Grotesk'
                            }, 
                            '& .MuiInputLabel-root': { 
                                color: 'rgb(233, 233, 198)', 
                                fontFamily: 'Space Grotesk'
                            }, 
                            '& label.Mui-focused': {
                                color: 'rgb(248, 215, 154)',
                            }, 
                            '& .MuiInput-underline:after': {
                                borderBottomColor: 'rgb(248, 215, 154)',
                            }, 
                            '& .MuiInput-underline:before': {
                                borderBottomColor: 'rgb(233, 233, 198)',
                            }, 
                            '& .MuiInput-underline': {
                                '&:hover:before': {
                                    borderBottomColor: 'rgb(248, 215, 154) !important',
                                }
                            },
                        }} 
                    />
                </div>
            );
        } else { // Hunter Submits Work
            return (
                <div> 
                    <TextField
                        autoFocus
                        margin="dense"
                        id="link-input"
                        name="workLinks"
                        label="Link to Work"
                        value={formValues.workLinks}
                        onChange={handleInputChange}
                        type="text"
                        fullWidth
                        variant="standard"
                        sx={{ 
                            '& .MuiInputBase-input': { 
                                color: 'rgb(248, 215, 154)', 
                                fontFamily: 'Space Grotesk'
                            }, 
                            '& .MuiInputLabel-root': { 
                                color: 'rgb(233, 233, 198)', 
                                fontFamily: 'Space Grotesk'
                            }, 
                            '& label.Mui-focused': {
                                color: 'rgb(248, 215, 154)',
                            }, 
                            '& .MuiInput-underline:after': {
                                borderBottomColor: 'rgb(248, 215, 154)',
                            }, 
                            '& .MuiInput-underline:before': {
                                borderBottomColor: 'rgb(233, 233, 198)',
                            }, 
                            '& .MuiInput-underline': {
                                '&:hover:before': {
                                    borderBottomColor: 'rgb(248, 215, 154) !important',
                                }
                            },
                        }} 
                    />
                </div>
            );
        }
    };

    return (
        <div>
            {(isSubmitTxLoading || isSubmitTxSuccess) && 
                <SimpleSnackBar msg={isSubmitTxLoading ? 'Submitting work...' : 'Submitted work!'}/>
            }
            <ButtonType />
            <Dialog open={open} onClose={handleClose}>
                <DialogTitle className={styles.formHeader}>{props.formName}</DialogTitle>
                <DialogContent className={styles.cardBackground}>
                    <DialogContentText className={styles.h2}>
                    {props.summary}
                    </DialogContentText>
                    {dialogBoxes(props.formType)}
                </DialogContent>
                <DialogActions className={styles.formHeader}>
                    <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(233, 233, 198)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={handleClose}>{props.formButtons[0]}</Button>
                    {props.formName !== "Submit" && 
                        <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(248, 215, 154)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={handleCloseSubmit}>{props.formButtons[1]}</Button>
                    }
                    {props.formName === "Submit" &&
                        <div>
                            <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(233, 233, 198)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={() => {handleOpenSubmitCheck(); handleCloseSubmitTrue(props.postId!, props.creatorAddress);}}>{props.formButtons[1]}</Button>
                            <Dialog
                                open={openSubmitCheck}
                                onClose={handleClose}
                                aria-labelledby="alert-dialog-title"
                                aria-describedby="alert-dialog-description"
                            >
                                <DialogTitle id="alert-dialog-title">
                                    {"Are you sure you want to submit your work?"}
                                </DialogTitle>
                                <DialogContent>
                                    <DialogContentText id="alert-dialog-description">
                                        Once you submit your work, the bounty creator will have 2 weeks to either payout or dispute your work.
                                    </DialogContentText>
                                </DialogContent>
                                <DialogActions>
                                    <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(245, 223, 183)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={handleClose}>No I don't</Button>
                                    {/* <Button onClick={() => handleCloseSubmitTrue(props.postId!, props.creatorAddress)} autoFocus>Yes I want to</Button> */}
                                    <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(233, 233, 198)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={() => {submit?.(); handleCloseSubmit();}} autoFocus disabled={!submit || isSubmitTxLoading}>{isSubmitTxLoading ? 'Submitting work...' : 'Yes I want to'}</Button>
                                </DialogActions>
                            </Dialog>
                        </div>
                    }
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default Form;
