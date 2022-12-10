import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';
import styles from '../styles/Home.module.css';
import erc20ABI from '../cornucopia-contracts/out/ERC20.sol/ERC20.json';
import { useContract, usePrepareContractWrite, useContractWrite, useWaitForTransaction, useContractRead } from 'wagmi';
import { BigNumber, BigNumberish, ethers } from 'ethers';
import useDebounce from './useDebounce';

type Props = {
    erc20Address: string;
    ownerAddress: string;
    amount: BigNumber;
    bountyStage: string;
    // handleClickOpen: () => void;
    handleIncreasedAllowance: () => void;
};

const IncreaseAllowance: React.FC<Props> = props => {
    const [open, setOpen] = React.useState(false);
    const [allowanceAmt, setAllowanceAmt] = React.useState('' as unknown as BigNumberish);
    const debouncedAllowanceAmt = useDebounce(allowanceAmt, 10);

    // ERC20 Contract Config
    const erc20ContractConfig = {
        addressOrName: props.erc20Address, // contract address
        contractInterface: erc20ABI['abi'], // contract abi in json or JS format
    };

    const escrowAddress = process.env.NEXT_PUBLIC_ESCROW_ADDRESS!;
    const hexAlwaysApprove = '0x8000000000000000000000000000000000000000000000000000000000000000';

    const { config: increaseAllowanceConfig } = usePrepareContractWrite({...erc20ContractConfig, functionName: 'increaseAllowance', args: [escrowAddress, debouncedAllowanceAmt], enabled: Boolean(debouncedAllowanceAmt), });
    const { data: increaseAllowanceData, error: increaseAllowanceError, isLoading: isIncreaseAllowanceLoading, isSuccess: isIncreaseAllowanceSuccess, write: increaseAllowance } = useContractWrite(increaseAllowanceConfig);
    const { data: increaseAllowanceTxData, isLoading: isIncreaseAllowanceTxLoading, isSuccess: isIncreaseAllowanceTxSuccess, error: increaseAllowanceTxError } = useWaitForTransaction({ hash: increaseAllowanceData?.hash, enabled: true,});

    const { data: allowance, error: isAllowanceError, isLoading: isAllowanceLoading } = useContractRead({...erc20ContractConfig, functionName: 'allowance', args: [props.ownerAddress, escrowAddress],});

    const handleCloseIncreaseAllowanceTrue = (allowance: BigNumberish) => {
        setAllowanceAmt(allowance);
        setOpen(true);
    };

    // const checkAllowance = async (ownerAddress: string, spenderAddress: string) => {
    //     const allowance = await erc20Contract.allowance(ownerAddress, spenderAddress);

    //     if (props.amount.gt(0) && props.amount.gt(allowance)) {
    //         setOpen(true);
    //         console.log('set true')
    //     }
    // };

    React.useEffect(() => {
        if (allowance && props.amount.gt(allowance)) {
            handleCloseIncreaseAllowanceTrue(allowance!);
        }
    }, []);
    
    if (debouncedAllowanceAmt) {
        return (
            <Dialog open={open} onClose={() => setOpen(false)}>
                <DialogTitle className={styles.formHeader}>Increase Allowance</DialogTitle>
                <DialogContent className={styles.cardBackground}>
                    {props.bountyStage === 'escrow' &&
                        <DialogContentText className={styles.dialogBody}>
                        To use an ERC-20 token with Cornucopia, you must first allow Cornucopia to transfer tokens from your wallet to the
                        protocol contract to escrow the funds for the bounty. 
                        <br />
                        <br />
                        You can choose either to allow Cornucopia to spend an unlimited amount of funds so you won't have to approve Cornucopia 
                        everytime you create a bounty or you can choose to just allow Cornucopia to spend the funds you want to esrow. While the 
                        former is potentially more cost effective, the latter protects you incase of any future smart contract vulnerabilities.   
                        </DialogContentText>
                    }
                    {props.bountyStage === 'dispute' &&
                        <DialogContentText className={styles.dialogBody}>
                        To initiate a dispute as a creator or respond to a dispute as a hunter, you must first allow Cornucopia to transfer tokens from your wallet to the
                        protocol contract to then send these funds to the UMA contract for your dispute bond.  
                        <br />
                        <br />
                        You can choose either to allow Cornucopia to spend an unlimited amount of funds so you won't have to approve Cornucopia 
                        everytime you dispute a bounty or you can choose to just allow Cornucopia to spend the dispute bond amount. While the 
                        former is potentially more cost effective, the latter protects you incase of any future smart contract vulnerabilities.   
                        </DialogContentText>
                    }
                </DialogContent>
                <DialogActions className={styles.formHeader}>
                    <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(245, 223, 183)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px', marginRight: '8px' }} onClick={() => {handleCloseIncreaseAllowanceTrue(BigNumber.from(hexAlwaysApprove)); increaseAllowance?.(); setOpen(false); props.handleIncreasedAllowance(); }} autoFocus disabled={!increaseAllowance || isIncreaseAllowanceTxLoading}>{isIncreaseAllowanceTxLoading ? 'Increasing Allowance...' : 'Allow Always'}</Button>
                    <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(233, 233, 198)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={() => {handleCloseIncreaseAllowanceTrue(props.amount); increaseAllowance?.(); setOpen(false); props.handleIncreasedAllowance(); }} autoFocus disabled={!increaseAllowance || isIncreaseAllowanceTxLoading}>{isIncreaseAllowanceTxLoading ? 'Increasing Allowance...' : 'Allow Once'}</Button>
                </DialogActions>
            </Dialog>
        );
    }

    return <></>;
};

export default IncreaseAllowance;