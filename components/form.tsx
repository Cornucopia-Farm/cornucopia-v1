/* eslint-disable @next/next/no-img-element */
import * as React from 'react';
import Image from 'next/image';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import axios from 'axios';
import { useContractWrite, usePrepareContractWrite, useWaitForTransaction } from 'wagmi';
import escrowABI from '../cornucopia-contracts/out/Escrow.sol/Escrow.json'; // add in actual path later
import useDebounce from './useDebounce';
import SimpleSnackBar from './simpleSnackBar';
import styles from '../styles/Home.module.css';
import MenuItem from '@mui/material/MenuItem';
import EthTokenList from '../ethTokenList.json';
import ListItemIcon from '@mui/material/ListItemIcon';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { Dayjs } from 'dayjs';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

type Props = {
    creatorAddress: string;
    hunterAddress?: string;
    postId?: string;
    postLinks?: Array<string>;
    startDate?: Dayjs;
    endDate?: Dayjs;
    description?: string;
    amount?: number; 
    title?: string;
    formName: string;
    summary: string;
    formButtons: Array<string>;
    formType: string;
    tags: Array<any>;
    experience?: string;
    contact?: string;
    appLinks?: Array<string>;
    tokenAddress?: string;
    tokenSymbol?: string;
    tokenDecimals?: number;
};

type ArweaveData = {
    creatorAddress: string;
    hunterAddress?: string;
    postId?: string;
    title?: string;
    description?: string; 
    amount?: number; 
    startDate?: Dayjs | null; 
    endDate?: Dayjs | null; 
    postLinks?: Array<string>;
    appLinks?: Array<string>;
    experience?: string;
    contact?: string;
    workLinks?: Array<string>;
    tokenAddress?: string;
    tokenSymbol?: string; 
    tokenDecimals?: number;
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
    startDate: null, 
    endDate: null, 
    postLinks: undefined, // [""],
    appLinks: undefined, //[""],
    experience: "",
    contact: "",
    workLinks: undefined, //[""],
    tokenAddress: "",
    tokenSymbol: "",
    tokenDecimals: undefined
};

const ethTokens = EthTokenList['tokens'];


// Escrow Contract Config
const contractConfig = {
    addressOrName: '0x94B9f298982393673d6041Bc9D419A2e1f7e14b4', // process.env.NEXT_PUBLIC_ESCROW_ADDRESS!, // contract address
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
    };


    const handleInputChange = (e: any) => {
        const { name, value } = e.target;
        
        setFormValues({
          ...formValues,
          [name]: value,
        });
    };

    const handleInputChangeStartDate = (newDate: any) => { 
        setFormValues({
          ...formValues,
          ["startDate"]: newDate,
        });
    };

    const handleInputChangeEndDate = (newDate: any) => {  
        setFormValues({
          ...formValues,
          ["endDate"]: newDate,
        });
    };

    const handleInputChangeToken = (e: any) => {
        const tokenAddress = e.target.value;
        const tokenObj = ethTokens.filter((obj: any) => {
            return obj.address === tokenAddress;
        }); // Returns Array of matches so we take first one as there will only be one match
        setFormValues({
          ...formValues,
          ["tokenAddress"]: tokenAddress,
          ["tokenSymbol"]: tokenObj[0].symbol,
          ["tokenDecimals"]: tokenObj[0].decimals,
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
        if (props.startDate) formValues.startDate = props.startDate;
        if (props.endDate) formValues.endDate = props.endDate;
        if (props.postLinks) formValues.postLinks = props.postLinks;
        if (props.experience) formValues.experience = props.experience;
        if (props.contact) formValues.contact = props.contact;
        if (props.appLinks) formValues.appLinks = props.appLinks;
        if (props.tokenAddress) formValues.tokenAddress = props.tokenAddress;
        if (props.tokenSymbol) formValues.tokenSymbol = props.tokenSymbol;
        if (props.tokenDecimals) formValues.tokenDecimals = props.tokenDecimals;

        setArweaveTrigger(!arweaveTrigger); // Trigger useeffect to call arweave upload api
        setOpen(false);
        setOpenSubmitCheck(false);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
                <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(248, 215, 154)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={handleClickOpen}>
                    Apply
                </Button>
            );
        } else {
            return (
                <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(248, 215, 154)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }}  onClick={handleClickOpen}>
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
                        label= "Title" //"Title (5 words)"
                        value={formValues.title}
                        onChange={handleInputChange}
                        type="text"
                        fullWidth
                        variant="standard"
                        inputProps={{ autoComplete: 'off'}}
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
                        inputProps={{ autoComplete: 'off'}}
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
                        id="token-input"
                        name="tokenAddress"
                        label="Token"
                        value={formValues.tokenAddress}
                        onChange={handleInputChangeToken}
                        select
                        fullWidth
                        variant="standard"
                        inputProps={{ autoComplete: 'off'}}
                        SelectProps={{
                            MenuProps: {
                                sx: { 
                                    maxHeight: '50%', 
                                    '& .MuiMenu-paper': { 
                                        borderBottomLeftRadius: '12px',
                                        borderBottomRightRadius: '12px',
                                    } 
                                },
                                MenuListProps: {
                                    sx: { 
                                        backgroundColor: 'rgb(23, 21, 20)',           
                                    }
                                },
                            },   
                        }}
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
                            '& .MuiSelect-icon': {
                                color: 'rgb(233, 233, 198)'
                            },
                        }}
                    >
                        {ethTokens.map((token) => (
                            <MenuItem key={token.address} value={token.address}>
                                <Box sx={{ display: 'flex', gap: '12px' }}> 
                                    <ListItemIcon sx={{ minWidth: '25px !important'}} >
                                        <img alt="" width="25px" height="25px" src={token.logoURI} />
                                    </ListItemIcon>
                                    <Typography sx={{color: 'rgb(233, 233, 198)', fontFamily: 'Space Grotesk'}}>{token.symbol}</Typography>
                                </Box>
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
                        // type="text" // Need to add ERC20
                        type="number"
                        fullWidth
                        variant="standard"
                        inputProps={{ autoComplete: 'off', inputMode: 'numeric', pattern: '[0-9]*', }}
                        sx={{ 
                            '& .MuiInputBase-input': { 
                                color: 'rgb(248, 215, 154)', 
                                fontFamily: 'Space Grotesk',
                                '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
                                    '-webkit-appearance': 'none',
                                },
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
                                },
                            },
                        }}
                    />
                    <LocalizationProvider dateAdapter={AdapterDayjs}> 
                        <DatePicker
                            PaperProps={{
                                sx: {
                                    backgroundColor: 'rgb(11, 11, 9)',
                                    '& .MuiCalendarPicker-root': {
                                        backgroundColor: 'rgb(11, 11, 9)',
                                        color: 'rgb(248, 215, 154)',
                                        fontFamily: 'Space Grotesk',
                                        borderRadius: '12px',
                                    },
                                    '& .MuiPickersCalendarHeader-switchViewIcon': {
                                        color: 'rgb(248, 215, 154)',
                                        '&:hover': { // DO WE WANT THIS TO GLOW??
                                            backgroundColor: 'rgb(248, 215, 154)',
                                            color: 'rgb(23, 21, 20)',
                                        },
                                        borderRadius: '50%',
                                    },
                                    '& .MuiSvgIcon-root': {
                                        color: 'rgb(248, 215, 154)',
                                        '&:hover': { // DO WE WANT THIS TO GLOW??
                                            backgroundColor: 'rgb(248, 215, 154)',
                                            color: 'rgb(23, 21, 20)',
                                        },
                                        borderRadius: '50%',   
                                    },
                                    '& .MuiDayPicker-weekDayLabel': {
                                        color: 'rgb(248, 215, 154)',
                                        fontFamily: 'Space Grotesk',
                                    },
                                    
                                    '& .MuiPickersDay-root': {
                                        backgroundColor: 'rgb(23, 21, 20)',
                                        color: 'rgb(248, 215, 154)',
                                        fontFamily: 'Space Grotesk',
                                        '&:hover': {
                                            backgroundColor: 'rgb(248, 215, 154)',
                                            color: 'rgb(23, 21, 20)',
                                        },
                                        '&.Mui-selected': {
                                            backgroundColor: 'rgb(233, 233, 198)',
                                            color: 'rgb(23, 21, 20)',
                                        },
                                    },
                                    '& .MuiPickersDay-today:not(.Mui-selected)': {
                                        border: '1px solid rgb(248, 215, 154)',
                                    },
                                },
                            }}
                            label="Start Date"
                            disablePast={true}
                            value={formValues.startDate}
                            onChange={handleInputChangeStartDate}
                            renderInput={(params) => 
                                <TextField
                                    {...params}
                                    autoFocus
                                    margin="dense"
                                    fullWidth
                                    variant="standard"
                                    inputProps={{ autoComplete: 'off'}}
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
                                        input: { color: 'rgb(248, 215, 154)' },
                                        svg: { color: 'rgb(248, 215, 154)', fontSize: '24px' },
                                    }}
                                />
                            }
                        />
                    </LocalizationProvider>
                    {/* <TextField
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
                        inputProps={{ autoComplete: 'off'}}
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
                    /> */}
                    <LocalizationProvider dateAdapter={AdapterDayjs}> 
                        <DatePicker
                            PaperProps={{
                                sx: {
                                    backgroundColor: 'rgb(11, 11, 9)',
                                    '& .MuiCalendarPicker-root': {
                                        backgroundColor: 'rgb(11, 11, 9)',
                                        color: 'rgb(248, 215, 154)',
                                        fontFamily: 'Space Grotesk',
                                        borderRadius: '12px',
                                    },
                                    '& .MuiPickersCalendarHeader-switchViewIcon': {
                                        color: 'rgb(248, 215, 154)',
                                        '&:hover': { // DO WE WANT THIS TO GLOW??
                                            backgroundColor: 'rgb(248, 215, 154)',
                                            color: 'rgb(23, 21, 20)',
                                        },
                                        borderRadius: '50%',
                                    },
                                    '& .MuiSvgIcon-root': {
                                        color: 'rgb(248, 215, 154)',
                                        '&:hover': { // DO WE WANT THIS TO GLOW??
                                            backgroundColor: 'rgb(248, 215, 154)',
                                            color: 'rgb(23, 21, 20)',
                                        },
                                        borderRadius: '50%',   
                                    },
                                    '& .MuiDayPicker-weekDayLabel': {
                                        color: 'rgb(248, 215, 154)',
                                        fontFamily: 'Space Grotesk',
                                    },
                                    
                                    '& .MuiPickersDay-root': {
                                        backgroundColor: 'rgb(23, 21, 20)',
                                        color: 'rgb(248, 215, 154)',
                                        fontFamily: 'Space Grotesk',
                                        '&:hover': {
                                            backgroundColor: 'rgb(248, 215, 154)',
                                            color: 'rgb(23, 21, 20)',
                                        },
                                        '&.Mui-selected': {
                                            backgroundColor: 'rgb(233, 233, 198)',
                                            color: 'rgb(23, 21, 20)',
                                        },
                                    },
                                    '& .MuiPickersDay-today:not(.Mui-selected)': {
                                        border: '1px solid rgb(248, 215, 154)',
                                    },
                                },
                            }}
                            label="End Date"
                            disablePast={true}
                            value={formValues.endDate}
                            onChange={handleInputChangeEndDate}
                            renderInput={(params) => 
                                <TextField
                                    {...params}
                                    autoFocus
                                    margin="dense"
                                    fullWidth
                                    variant="standard"
                                    inputProps={{ autoComplete: 'off'}}
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
                                        input: { color: 'rgb(248, 215, 154)' },
                                        svg: { color: 'rgb(248, 215, 154)', fontSize: '24px' },
                                    }}
                                />
                            }
                        />
                    </LocalizationProvider>
                    {/* <TextField
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
                        inputProps={{ autoComplete: 'off'}}
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
                    /> */}
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
                        inputProps={{ autoComplete: 'off'}}
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
                        inputProps={{ autoComplete: 'off'}}
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
                        inputProps={{ autoComplete: 'off'}}
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
                        inputProps={{ autoComplete: 'off'}}
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
                        inputProps={{ autoComplete: 'off'}}
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
            {(isSubmitTxLoading || (isSubmitTxSuccess && submitTxData?.status === 1)) && 
                <SimpleSnackBar severity={'success'} msg={isSubmitTxLoading ? 'Submitting work...' : 'Submitted work!'}/>
            }
            {(isSubmitTxSuccess && submitTxData?.status === 0) && 
                <SimpleSnackBar severity={'error'} msg={'Submit transaction failed!'}/>
            }
            <ButtonType />
            <Dialog open={open} onClose={handleClose} PaperProps={{ style: { backgroundColor: "transparent", boxShadow: "none" }, }}>
                <DialogTitle className={styles.formHeader}>{props.formName}</DialogTitle>
                <DialogContent className={styles.cardBackground}>
                    <DialogContentText className={styles.h2}>
                    {props.summary}
                    </DialogContentText>
                    {dialogBoxes(props.formType)}
                </DialogContent>
                <DialogActions className={styles.formFooter}>
                    <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(233, 233, 198)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={handleClose}>{props.formButtons[0]}</Button>
                    {props.formName !== "Submit" && 
                        <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(248, 215, 154)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={handleCloseSubmit}>{props.formButtons[1]}</Button>
                    }
                    {props.formName === "Submit" &&
                        <div>
                            <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(248, 215, 154)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px', marginLeft: '8px'}} onClick={() => {handleOpenSubmitCheck(); handleCloseSubmitTrue(props.postId!, props.creatorAddress);}}>{props.formButtons[1]}</Button>
                            <Dialog
                                open={openSubmitCheck}
                                onClose={handleClose}
                                aria-labelledby="alert-dialog-title"
                                aria-describedby="alert-dialog-description"
                                PaperProps={{ style: { backgroundColor: "transparent", boxShadow: "none" }, }}
                            >
                                <DialogTitle className={styles.formHeader} id="alert-dialog-title">
                                    {"Are you sure you want to submit your work?"}
                                </DialogTitle>
                                <DialogContent className={styles.cardBackground}>
                                    <DialogContentText className={styles.h2} id="alert-dialog-description">
                                        Once you submit your work, the bounty creator will have 2 weeks to either payout or dispute your work.
                                    </DialogContentText>
                                </DialogContent>
                                <DialogActions className={styles.formFooter}>
                                    <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(233, 233, 198)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={handleClose}>No I don&apos;t</Button>
                                    <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(248, 215, 154)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={() => {submit?.(); handleCloseSubmit();}} autoFocus disabled={!submit || isSubmitTxLoading}>{isSubmitTxLoading ? 'Submitting work...' : 'Yes I want to'}</Button>
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
