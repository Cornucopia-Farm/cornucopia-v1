/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type { PromiseOrValue } from "../../../../../../../../common";
import type {
  Timer,
  TimerInterface,
} from "../../../../../../../../lib/protocol/packages/core/contracts/common/implementation/Timer";

const _abi = [
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [],
    name: "getCurrentTime",
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
  {
    inputs: [
      {
        internalType: "uint256",
        name: "time",
        type: "uint256",
      },
    ],
    name: "setCurrentTime",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const _bytecode =
  "0x608060405234801561001057600080fd5b504260005560ac806100236000396000f3fe6080604052348015600f57600080fd5b506004361060325760003560e01c806322f8e56614603757806329cb924d146049575b600080fd5b60476042366004605e565b600055565b005b60005460405190815260200160405180910390f35b600060208284031215606f57600080fd5b503591905056fea264697066735822122074bacabd0aca77fdaab47c4734aa54979d1aebac080c4a9161bacac82b5aa88a64736f6c63430008110033";

type TimerConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: TimerConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class Timer__factory extends ContractFactory {
  constructor(...args: TimerConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  override deploy(
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<Timer> {
    return super.deploy(overrides || {}) as Promise<Timer>;
  }
  override getDeployTransaction(
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(overrides || {});
  }
  override attach(address: string): Timer {
    return super.attach(address) as Timer;
  }
  override connect(signer: Signer): Timer__factory {
    return super.connect(signer) as Timer__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): TimerInterface {
    return new utils.Interface(_abi) as TimerInterface;
  }
  static connect(address: string, signerOrProvider: Signer | Provider): Timer {
    return new Contract(address, _abi, signerOrProvider) as Timer;
  }
}
