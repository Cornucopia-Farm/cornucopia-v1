import * as React from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import BountyCard from './bountyCard';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import { useEnsName, useNetwork } from 'wagmi';
import { Dayjs } from 'dayjs';
import styles from '../styles/Home.module.css';
import { BountyOutcome } from '../getEscrowEventData';
import { useMediaQuery } from '@mui/material';

type Props = { // need to change bounty card to specify which component it is for!
  company: string;
  bountyName: string;
  description: string;
  startDate: Dayjs;
  endDate: Dayjs;
  postLinks: string;
  amount: number;
  arweaveHash: string;
  workLinks?: string;
  disputes: boolean;
  children?: React.ReactNode;
  tokenSymbol: string;
  finishedStatus?: BountyOutcome;
};

const BasicAccordion: React.FC<Props> = props => {

  const { data: ensName } = useEnsName({ address: props.company });
  const { chain } = useNetwork();

  const dispute = () => {
    if (props.disputes) {
      return props.children;
    };
  };

  const button = () => {
    if (!props.disputes) {
      return props.children;
    };
  };

  const blockExplorer = (network: any) => {
    if (network === 'polygon') {
      return 'https://polygonscan.com/address/'
    } else if (network === 'goerli') {
      return 'https://goerli.etherscan.io/address/'
    } else if (network === 'arbitrum') {
      return 'https://arbiscan.io/address/'
    } else if (network === 'optimism') {
      return 'https://optimistic.etherscan.io/address/'
    } else if (network === 'aurora') {
      return 'https://aurorascan.dev/address/'
    }
    return 'https://etherscan.io/address/'
  };

  const blockExplorerURL = blockExplorer(chain?.network);
  // 733
  const smallScreen = useMediaQuery('(max-width: 760px)');
  const mediumScreen = useMediaQuery('(min-width: 761px) and (max-width: 900px)');
  const largeScreen = useMediaQuery('(min-width: 761px)');


  return (
    <div>
      <Accordion className={styles.accordionBackground} square={true} sx={{ borderRadius: '12px', backgroundColor: 'rgba(6, 72, 41, 0.05)' }} >
        <AccordionSummary 
          expandIcon={<ExpandMoreIcon sx={{ color: 'rgb(233, 233, 198)', }}/>}
          aria-controls="panel1a-content"
          id="panel1a-header"
        >
          {largeScreen && 
            <> 
              <Box sx={{ borderRadius: '12px', width: '43%', flexShrink: 0 }}> 
                <Typography className={styles.h2} sx={{ color: '#064829', }}><Link sx= {{ color: 'rgb(233, 233, 198)', }} target="_blank" rel="noopener" href={blockExplorerURL + (ensName ? ensName : props.company)}>{ensName ? ensName : (props.company.slice(0,4) + '...' + props.company.slice(-4))}</Link></Typography>
              </Box>
              <Typography className={styles.h2} sx={{  color: '#064829', ...(mediumScreen ? { width: '36%', } : { width: '40%', }), flexShrink: 0, maxHeight: '50px', marginRight: '40px', overflow: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none', }, }}>{props.bountyName}</Typography> 
              <Typography className={styles.h2} sx={{ color: '#064829', marginTop: 'auto', marginBottom: 'auto', }}>{props.amount} {props.tokenSymbol}</Typography> 
            </>
          } 
          {smallScreen && 
            <> 
              <Box sx={{ borderRadius: '12px', width: '53%', flexShrink: 0, }}> 
                <Typography className={styles.h2} sx={{ color: '#064829', }}><Link sx= {{ color: 'rgb(233, 233, 198)', }} target="_blank" rel="noopener" href={blockExplorerURL + (ensName ? ensName : props.company)}>{ensName ? ensName : (props.company.slice(0,4) + '...' + props.company.slice(-4))}</Link></Typography>
                <Typography className={styles.h2} sx={{ color: '#064829', paddingTop: '5px' }}>{props.amount} {props.tokenSymbol}</Typography> 
              </Box>
              <Typography className={styles.h2} sx={{ marginLeft: '2vw !important', marginRight: '4vw !important', color: '#064829', width: '45%', flexShrink: 0, maxHeight: '50px', overflow: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none', }, }}>{props.bountyName}</Typography> 
            </>
          } 
        </AccordionSummary>
        <AccordionDetails >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <BountyCard  
              description={props.description}
              startDate={props.startDate}
              endDate={props.endDate} 
              arweaveHash={props.arweaveHash}
              links={props.postLinks}
              workLinks={props.workLinks}
              finishedStatus={props.finishedStatus}
            >
            {button()}
            </BountyCard>
            {dispute()}
          </Box>
        </AccordionDetails>
      </Accordion>
    </div>
  );
};

export default BasicAccordion;