import * as React from 'react';

import ListItemIcon from '@mui/material/ListItemIcon';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import EthTokenList from '../ethTokenListDispute.json';
import GoerliTokenList from '../goerliTokenListDispute.json';

type Props = {
    tokenList: Array<any>;
    chain
}

const DisputeForm: React.FC<Props> = props => {

    const [tokenAddress, setTokenAddress] = React.useState('');
    const [bondAmt, setBondAmt] = React.useState('');

    let tokenList = EthTokenList['tokens']; // Ethereum Default
    if (chain?.network === 'goerli') {
        tokenList = GoerliTokenList['tokens'];
    }

    const dialogBoxes = () => {
        return (
            <div>
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
            </div>
        );
    };

};

export default DisputeForm; 