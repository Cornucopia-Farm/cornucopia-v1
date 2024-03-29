/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type { PromiseOrValue } from "../../../../../../../../../common";
import type {
  OptimisticOracleConstraints,
  OptimisticOracleConstraintsInterface,
} from "../../../../../../../../../lib/protocol/packages/core/contracts/data-verification-mechanism/implementation/Constants.sol/OptimisticOracleConstraints";

const _abi = [
  {
    inputs: [],
    name: "ancillaryBytesLimit",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

const _bytecode =
  "0x6088610038600b82828239805160001a607314602b57634e487b7160e01b600052600060045260246000fd5b30600052607381538281f3fe730000000000000000000000000000000000000000301460806040526004361060335760003560e01c8063c371dda7146038575b600080fd5b604061200081565b60405190815260200160405180910390f3fea264697066735822122018659c93f6a2a0102be03c22c1faef980a90fac9cde9078b89333e8ddebef65164736f6c63430008110033";

type OptimisticOracleConstraintsConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: OptimisticOracleConstraintsConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class OptimisticOracleConstraints__factory extends ContractFactory {
  constructor(...args: OptimisticOracleConstraintsConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  override deploy(
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<OptimisticOracleConstraints> {
    return super.deploy(
      overrides || {}
    ) as Promise<OptimisticOracleConstraints>;
  }
  override getDeployTransaction(
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(overrides || {});
  }
  override attach(address: string): OptimisticOracleConstraints {
    return super.attach(address) as OptimisticOracleConstraints;
  }
  override connect(signer: Signer): OptimisticOracleConstraints__factory {
    return super.connect(signer) as OptimisticOracleConstraints__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): OptimisticOracleConstraintsInterface {
    return new utils.Interface(_abi) as OptimisticOracleConstraintsInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): OptimisticOracleConstraints {
    return new Contract(
      address,
      _abi,
      signerOrProvider
    ) as OptimisticOracleConstraints;
  }
}
