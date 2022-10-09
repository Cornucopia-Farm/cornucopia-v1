import Bundlr from "@bundlr-network/client";
import privateKey from './arweave-key-UxP5TeAmfwJXIbZY9rJE1uw4z1FHs-QuV-UlfC28cOI.json';

async function main() {
    const bundlr = new Bundlr("https://node1.bundlr.network", "arweave", privateKey);
    const address = bundlr.address;

    const data = "Hello, Bundlr!";

    const tx = bundlr.createTransaction(data);

    await tx.sign()
    
    const id = tx.id;
    
    const result = await tx.upload();

}

main()


