// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import Bundlr from "@bundlr-network/client";

const uploadToArweave = async (bountyData: Object, tags: Array<any>) => {  
  const privateKey = {
    "kty": process.env.KTY,
    "n": process.env.N,
    "e": process.env.E,
    "d": process.env.D,
    "p": process.env.P,
    "q": process.env.Q,
    "dp": process.env.DP,
    "dq": process.env.DQ,
    "qi": process.env.QI
  }

  const bundlr = new Bundlr("https://node1.bundlr.network", "arweave", privateKey);

  const address = bundlr.address;

  const data = JSON.stringify(bountyData);

  const tx = bundlr.createTransaction(data, { tags: tags });

  await tx.sign();
  
  const id = tx.id;
  
  const result = await tx.upload();

  console.log("Tx id",id);
  return id;
};

export default async function handler(req: any, res: any) { // Making this a type causes prod issues
  if (req.method === 'POST') {
    try {
      const id = await uploadToArweave(req.body.bountyData, req.body.tags);
      res.status(200).json({id});
    } catch (error) {
      res.status(500).send(error);
    }
  }
};
