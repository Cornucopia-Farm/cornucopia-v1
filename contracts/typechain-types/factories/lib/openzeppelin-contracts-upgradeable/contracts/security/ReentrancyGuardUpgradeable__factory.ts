/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Signer, utils } from "ethers";
import type { Provider } from "@ethersproject/providers";
import type {
  ReentrancyGuardUpgradeable,
  ReentrancyGuardUpgradeableInterface,
} from "../../../../../lib/openzeppelin-contracts-upgradeable/contracts/security/ReentrancyGuardUpgradeable";

const _abi = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint8",
        name: "version",
        type: "uint8",
      },
    ],
    name: "Initialized",
    type: "event",
  },
] as const;

export class ReentrancyGuardUpgradeable__factory {
  static readonly abi = _abi;
  static createInterface(): ReentrancyGuardUpgradeableInterface {
    return new utils.Interface(_abi) as ReentrancyGuardUpgradeableInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): ReentrancyGuardUpgradeable {
    return new Contract(
      address,
      _abi,
      signerOrProvider
    ) as ReentrancyGuardUpgradeable;
  }
}
