/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type { PromiseOrValue } from "../../../../../../../../../common";
import type {
  OracleInterfaces,
  OracleInterfacesInterface,
} from "../../../../../../../../../lib/protocol/packages/core/contracts/data-verification-mechanism/implementation/Constants.sol/OracleInterfaces";

const _abi = [
  {
    inputs: [],
    name: "Bridge",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "ChildMessenger",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "CollateralWhitelist",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "FinancialContractsAdmin",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "GenericHandler",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "IdentifierWhitelist",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "OptimisticOracle",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "OptimisticOracleV2",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "Oracle",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "OracleHub",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "OracleSpoke",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "Registry",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "SkinnyOptimisticOracle",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "Store",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

const _bytecode =
  "0x61029161003a600b82828239805160001a60731461002d57634e487b7160e01b600052600060045260246000fd5b30600052607381538281f3fe73000000000000000000000000000000000000000030146080604052600436106100f45760003560e01c80634f4a180b116100965780637608ea2f116100705780637608ea2f146102115780637db9743b146102245780638adca47f14610236578063f24a534e1461024b57600080fd5b80634f4a180b146101c7578063598dd097146101e45780635fa2ef101461020157600080fd5b80632a71e5b3116100d25780632a71e5b31461015557806342e90c331461017c5780634596ac9b1461018b578063473e7ccd146101ab57600080fd5b8063079b6c63146100f95780631a0fbfb3146101235780631a4dbd1c1461013b575b600080fd5b6101116d23b2b732b934b1a430b7323632b960911b81565b60405190815260200160405180910390f35b6101116d21b434b63226b2b9b9b2b733b2b960911b81565b6101116f4f7074696d69737469634f7261636c6560801b81565b6101117f46696e616e6369616c436f6e74726163747341646d696e00000000000000000081565b6101116453746f726560d81b81565b61011175536b696e6e794f7074696d69737469634f7261636c6560501b81565b6101117127b83a34b6b4b9ba34b1a7b930b1b632ab1960711b81565b610111721259195b9d1a599a595c95da1a5d195b1a5cdd606a1b81565b6101117210dbdb1b185d195c985b15da1a5d195b1a5cdd606a1b81565b6101116542726964676560d01b81565b6101116827b930b1b632a43ab160b91b81565b61011167526567697374727960c01b81565b6101116a4f7261636c6553706f6b6560a81b81565b610111654f7261636c6560d01b8156fea26469706673582212205375d17d0bdf9819f7a04218d0aafdba494cacd8aa8638fad47a95d88d07e87464736f6c63430008110033";

type OracleInterfacesConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: OracleInterfacesConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class OracleInterfaces__factory extends ContractFactory {
  constructor(...args: OracleInterfacesConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  override deploy(
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<OracleInterfaces> {
    return super.deploy(overrides || {}) as Promise<OracleInterfaces>;
  }
  override getDeployTransaction(
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(overrides || {});
  }
  override attach(address: string): OracleInterfaces {
    return super.attach(address) as OracleInterfaces;
  }
  override connect(signer: Signer): OracleInterfaces__factory {
    return super.connect(signer) as OracleInterfaces__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): OracleInterfacesInterface {
    return new utils.Interface(_abi) as OracleInterfacesInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): OracleInterfaces {
    return new Contract(address, _abi, signerOrProvider) as OracleInterfaces;
  }
}