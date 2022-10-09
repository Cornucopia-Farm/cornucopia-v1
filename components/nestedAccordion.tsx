import * as React from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Box from '@mui/material/Box';
import BountyCard from './bountyCard';
import AppCard from './appCard';


type Props = {
  // person: string;
  // experience: string;
  // contactInfo: string;
  postLinks: Array<string>;
  // appLinks: Array<string>;
  description: string;
  date: string;
  time: string;
  bountyName: string;
  amount: number;
  arweaveHash: string;
  workLinks?: Array<string>;
  // children?: React.ReactNode;
  applications?: Array<JSX.Element>;
};
const NestedAccordion: React.FC<Props> = props => {

  // const Application = () => {
  //   if (props.person) {
  //     return(
  //       <Accordion square={true} sx={{ borderRadius: '12px', backgroundColor: 'rgba(6, 72, 41, 0.05)' }}>
  //         <AccordionSummary
  //           expandIcon={<ExpandMoreIcon />}
  //           aria-controls="panel1a-content"
  //           id="panel1a-header"
  //         >
  //           <Typography sx={{ width: '90%', flexShrink: 0, color: '#064829' }}>{props.person}</Typography>
  //         </AccordionSummary>
  //         <AccordionDetails>
  //           <AppCard  
  //             experience={props.experience} 
  //             contactInfo={props.contactInfo} 
  //             links={props.appLinks} 
  //           >
  //             {props.children}
  //           </AppCard>
  //         </AccordionDetails>
  //       </Accordion>
  //     );
  //   } else {
  //     return <> </>
  //   }   
  // };

  return (
    <div>
      <Accordion square={true} sx={{ borderRadius: '12px', backgroundColor: 'rgba(6, 72, 41, 0.05)' }}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel1a-content"
          id="panel1a-header"
        >
            <Typography sx={{ width: '90%', flexShrink: 0, color: '#064829' }}>{props.bountyName}</Typography>
            <Typography sx={{ color: '#064829' }}>{props.amount} ETH</Typography>     
        </AccordionSummary>
        <AccordionDetails>
          <BountyCard 
            description={props.description}
            date={props.date}
            time={props.time} 
            links={props.postLinks}
            workLinks={props.workLinks}
            arweaveHash={props.arweaveHash}
          />
        {props.applications} 
        </AccordionDetails>
      </Accordion>
    </div>
  );
};

export default NestedAccordion;