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
import { useAccount, useContractWrite, useNetwork, usePrepareContractWrite, useProvider, useWaitForTransaction } from 'wagmi';
import escrowABI from '../contracts/out/Escrow.sol/Escrow.json'; 
import erc20ABI from '../contracts/out/ERC20.sol/ERC20.json';
import useDebounce from './useDebounce';
import SimpleSnackBar from './simpleSnackBar';
import styles from '../styles/Home.module.css';
import MenuItem from '@mui/material/MenuItem';
import EthTokenList from '../ethTokenList.json';
import GoerliTokenList from '../goerliTokenList.json';
import PolygonTokenList from '../polygonTokenList.json';
import AuroraTokenList from '../auroraTokenList.json';
import ListItemIcon from '@mui/material/ListItemIcon';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { Dayjs } from 'dayjs';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { BigNumber, ethers } from 'ethers';
import contractAddresses from '../contractAddresses.json';
import Autocomplete from '@mui/material/Autocomplete';
import Paper from '@mui/material/Paper';
import { createTheme, ThemeProvider } from '@mui/material/styles';

type Props = {
    creatorAddress: string;
    hunterAddress?: string;
    postId?: string;
    postLinks?: string;
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
    appLinks?: string;
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
    postLinks?: string;
    appLinks?: string;
    experience?: string;
    contact?: string;
    workLinks?: string;
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

const Form: React.FC<Props> = props => {
    const { address, isConnected } = useAccount();
    const provider = useProvider();
    const { chain } = useNetwork();
    const network = chain?.network! ? chain?.network! : 'goerli';
    let addresses = contractAddresses.mainnet;
    if (network === 'goerli') {
        addresses = contractAddresses.goerli;
    } 
    // Escrow Contract Config
    const contractConfig = {
        addressOrName: addresses.escrow,  
        contractInterface: escrowABI['abi'], 
    };

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

    const zeroAddress = '0x0000000000000000000000000000000000000000';
    let tokenList = EthTokenList['tokens']; // Ethereum Default
    if (chain?.network === 'goerli') {
        tokenList = GoerliTokenList['tokens'];
    }
    // } else if (chain?.network === 'arbitrum') {
    //     tokenList = GoerliTokenList['tokens']
    // } else if (chain?.network === 'polygon') {

    const theme = createTheme({
        components: {
            MuiAutocomplete: {
                styleOverrides: {
                option: {
                    '&[data-focus="true"]': {
                        backgroundColor: 'transparent !important',
                    },
                    '&[aria-selected="true"]': {
                        backgroundColor: 'transparent !important',
                    },
                },
                },
            },
        },
    });

    const [notEnoughError, setNotEnoughError] = React.useState("");
    const [endDateBeforeError, setEndDateBeforeError] = React.useState("");

    const enoughTokens = React.useCallback(async (amount?: number, tokenAddress?: string, tokenDecimals?: number) => {
        let balance;

        if (!tokenAddress || !amount) {
            setNotEnoughError("");
        } else {
            const amountBN = ethers.utils.parseUnits(amount.toString(), tokenDecimals);

            if (tokenAddress !== zeroAddress) {
                const erc20Contract = new ethers.Contract(tokenAddress, erc20ABI['abi'], provider!);
                try { 
                    balance = await erc20Contract.balanceOf(address); 
                } catch (e) {
                    console.log('Form balance fetch error', e);
                }   
            } else if (tokenAddress === zeroAddress) {
                balance = await provider.getBalance(address!);
            } else {
                balance = 0;
            }

            if (balance?.lt(amountBN)) {
                setNotEnoughError("Insufficient balance to pay this bounty");
            } else {
                setNotEnoughError("");
            }
        }    
    }, [address, provider]);

    const dateCheck = React.useCallback( (startDate?: Dayjs | null, endDate?: Dayjs) => {
        if (startDate && endDate) {
            const diff = endDate.diff(startDate);
            if (diff < 0) {
                setEndDateBeforeError("End date before start date");
            } else {
                setEndDateBeforeError("");
            }
        } else {
            setEndDateBeforeError("");
        }
    }, []);

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

    const handleInputChangeToken = (val: any) => {
        const tokenAddress = val;
        const tokenObj = tokenList.filter((obj: any) => {
            return obj.address === tokenAddress;
        }); // Returns Array of matches so we take first one as there will only be one match
        setFormValues({
          ...formValues,
          ["tokenAddress"]: tokenAddress,
          ["tokenSymbol"]: tokenObj[0]?.symbol,
          ["tokenDecimals"]: tokenObj[0]?.decimals,
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

    const [arweaveId, setArweaveId] = React.useState('');
    const [arweaveLoading, setArweaveLoading] = React.useState(false);

    React.useEffect(() => {
        const uploadToArweave = async (formValues: ArweaveData, tags: Array<Tags>) => {
            setArweaveLoading(true);
            const response: any = await axios.post('api/arweave', {bountyData: formValues, tags: tags });
            if (response.status === 200) {
                setArweaveLoading(false);
                console.log('Uploaded to arweave');
                const txHash = response.data;
                console.log('Upload Tx result', txHash.id);
                setArweaveId(txHash.id);
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
        if (props.formType == "createBounty") { 
            return (
                <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(248, 215, 154)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={handleClickOpen}>
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
                        label= "Title" 
                        value={formValues.title}
                        onChange={handleInputChange}
                        type="text"
                        fullWidth
                        variant="standard"
                        InputLabelProps={{ required: true }}
                        inputProps={{ autoComplete: 'off', maxLength: 30, }}
                        helperText={formValues.title ? `${formValues.title.length}/30` : ''}
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
                            '& .MuiFormHelperText-root': {
                                color: 'rgb(233, 233, 198)',
                                fontFamily: 'Space Grotesk',
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
                        InputLabelProps={{ required: true }}
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
                    <Autocomplete
                        options={tokenList}
                        disableClearable
                        onChange={(e, value) => typeof value === 'string' ? handleInputChangeToken(value) : handleInputChangeToken(value.address)}
                        getOptionLabel={(option) => typeof option === 'string' ? option : option.symbol}
                        renderOption={(props, option) => (                    
                                <Box component="li" sx={{ display: 'flex', gap: '12px', }} {...props}> 
                                    <ListItemIcon sx={{ minWidth: '25px !important'}} >
                                        <img alt="" width="25px" height="25px" src={option.logoURI} />
                                    </ListItemIcon>
                                    <Typography sx={{color: 'rgb(233, 233, 198)', fontFamily: 'Space Grotesk'}}>{option.symbol}</Typography>
                                </Box>
                        )}
                        sx={{
                            '& .MuiAutocomplete-endAdornment': {
                                '& .MuiSvgIcon-root': {
                                    color: 'rgb(233, 233, 198)', 
                                    fontSize: '16',
                                },
                            },
                        }}
                        
                        PaperComponent={({ children }) => (
                            <Paper
                                sx={{ 
                                    backgroundColor: 'rgb(23, 21, 20)',
                                    
                                    borderBottomLeftRadius: '12px',
                                    borderBottomRightRadius: '12px',
                                    boxShadow: 'none',
                                    scrollbarWidth: 'none',
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
                                    }
                                }}
                            >
                                {children}
                            </Paper>
                        )}
                        renderInput={(params) => (
                            <TextField
                            {...params}
                            value={formValues.tokenSymbol}
                            onChange={(e) => handleInputChangeToken(e.target.value)}
                            autoFocus
                            margin="dense"
                            id="token-input"
                            name="tokenAddress"
                            label="Token"
                            InputLabelProps={{ required: true }}
                            inputProps={{
                                ...params.inputProps,
                                autoComplete: 'off', // disable autocomplete and autofill
                            }}
                            fullWidth
                            variant="standard"
                            sx={{ 
                                '& .MuiSelect-icon': {
                                    color: 'rgb(233, 233, 198)'
                                },
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
                        )}
                    />
                    <TextField
                        autoFocus
                        margin="dense"
                        id="amount-input"
                        name="amount"
                        label="Amount"
                        value={formValues.amount}
                        onChange={ (e: any) => { handleInputChange(e); enoughTokens(e.target.value, formValues.tokenAddress, formValues.tokenDecimals); }}
                        error={Boolean(notEnoughError)}
                        helperText={notEnoughError}
                        type="number"
                        fullWidth
                        variant="standard"
                        InputLabelProps={{ required: true }}
                        inputProps={{ autoComplete: 'off', inputMode: 'decimal', pattern: '[0-9]*', }} 
                        sx={{ 
                            '& .MuiInputBase-input': { 
                                color: 'rgb(248, 215, 154)', 
                                fontFamily: 'Space Grotesk',
                                '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
                                    '-webkit-appearance': 'none',
                                },
                            }, 
                            '& .MuiFormHelperText-root.Mui-error': {
                                color: 'rgb(255, 69, 0)',
                                fontFamily: 'Space Grotesk',
                            },
                            '& .MuiInputLabel-root': { 
                                color: 'rgb(233, 233, 198)', 
                                fontFamily: 'Space Grotesk',
                            }, 
                            '& .MuiInputLabel-root.Mui-error': { 
                                color: 'rgb(255, 69, 0)', 
                                fontFamily: 'Space Grotesk',
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
                            desktopModeMediaQuery="@media (min-width: 1px)"
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
                                    InputLabelProps={{ required: true }}
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
                                    '&::--webkit-autofill:focus': {     
                                        '-webkit-background-color': 'transparent',
                                    },
                                    'input:-internal-autofill-selected': {
                                        backgroundColor: 'transparent',
                                    },
                                    
                                },
                            }}
                            label="End Date"
                            desktopModeMediaQuery="@media (min-width: 1px)"
                            disablePast={true}
                            value={formValues.endDate}
                            onChange={ (newDate: any) => { handleInputChangeEndDate(newDate); dateCheck(formValues.startDate, newDate); }}
                            renderInput={(params) => 
                                <TextField
                                    {...params}
                                    autoFocus
                                    margin="dense"
                                    fullWidth
                                    variant="standard"
                                    error={Boolean(endDateBeforeError)}
                                    helperText={endDateBeforeError}
                                    InputLabelProps={{ required: true }}
                                    sx={{ 
                                        '& .MuiInputBase-input': { 
                                            color: 'rgb(248, 215, 154)', 
                                            fontFamily: 'Space Grotesk'
                                        }, 
                                        '& .MuiFormHelperText-root.Mui-error': {
                                            color: 'rgb(255, 69, 0)',
                                            fontFamily: 'Space Grotesk',
                                        },
                                        '& .MuiInputLabel-root': { 
                                            color: 'rgb(233, 233, 198)', 
                                            fontFamily: 'Space Grotesk'
                                        }, 
                                        '& .MuiInputLabel-root.Mui-error': { 
                                            color: 'rgb(255, 69, 0)', 
                                            fontFamily: 'Space Grotesk',
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
                        InputLabelProps={{ required: true }}
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
                        InputLabelProps={{ required: true }}
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
                        InputLabelProps={{ required: true }}
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
                        InputLabelProps={{ required: true }}
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
                        InputLabelProps={{ required: true }}
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
        <ThemeProvider theme={theme}> 
        <div>
            {(isSubmitTxSuccess && submitTxData?.status === 0) && 
                <SimpleSnackBar severity={'error'} msg={'Submit transaction failed!'}/>
            }
            {isSubmitTxLoading && 
                <SimpleSnackBar severity={'success'} msg={'Submitting work...'}/>
            }
            {(isSubmitTxSuccess && submitTxData?.status === 1) && arweaveId && 
                <SimpleSnackBar severity={'success'} msg={'Submitted work!'} arweave={true} arweaveHash={arweaveId} arweavePostType={'submission'} arweaveAndOnchain={true}/>
            }
            {arweaveId && (props.formType == "createBounty" || props.formType == "applyBounty") &&
                <SimpleSnackBar severity={'success'} msg={''} arweave={true} arweaveHash={arweaveId} arweavePostType={props.formType == "createBounty" ? 'post' : 'application'}/>
            }
            {arweaveLoading && !arweaveId && (props.formType == "createBounty" || props.formType == "applyBounty") &&
                <SimpleSnackBar severity={'success'} msg={'Uploading to Arweave...'}/>
            }
            {!arweaveLoading && arweaveId && (props.formType == "createBounty" || props.formType == "applyBounty") &&
                <SimpleSnackBar severity={'success'} msg={'Uploaded to Arweave!'}/>
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
                                PaperProps={{ style: { backgroundColor: "transparent", boxShadow: "none", }, }}
                                
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
                                    <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(248, 215, 154)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px', '&:disabled': { backgroundColor: 'grey', }, }} onClick={() => {submit?.(); handleCloseSubmit();}} autoFocus disabled={!submit || isSubmitTxLoading}>{isSubmitTxLoading ? 'Submitting work...' : 'Yes I want to'}</Button>
                                </DialogActions>
                            </Dialog>
                        </div>
                    }
                </DialogActions>
            </Dialog>
        </div>
        </ThemeProvider>
    );
};

export default Form;
