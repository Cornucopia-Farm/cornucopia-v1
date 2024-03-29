/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import type {
  BaseContract,
  BigNumber,
  BigNumberish,
  BytesLike,
  CallOverrides,
  ContractTransaction,
  Overrides,
  PopulatedTransaction,
  Signer,
  utils,
} from "ethers";
import type { FunctionFragment, Result } from "@ethersproject/abi";
import type { Listener, Provider } from "@ethersproject/providers";
import type {
  TypedEventFilter,
  TypedEvent,
  TypedListener,
  OnEvent,
  PromiseOrValue,
} from "../../../../../../../common";

export interface TestableInterface extends utils.Interface {
  functions: {
    "getCurrentTime()": FunctionFragment;
    "setCurrentTime(uint256)": FunctionFragment;
    "timerAddress()": FunctionFragment;
  };

  getFunction(
    nameOrSignatureOrTopic: "getCurrentTime" | "setCurrentTime" | "timerAddress"
  ): FunctionFragment;

  encodeFunctionData(
    functionFragment: "getCurrentTime",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "setCurrentTime",
    values: [PromiseOrValue<BigNumberish>]
  ): string;
  encodeFunctionData(
    functionFragment: "timerAddress",
    values?: undefined
  ): string;

  decodeFunctionResult(
    functionFragment: "getCurrentTime",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "setCurrentTime",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "timerAddress",
    data: BytesLike
  ): Result;

  events: {};
}

export interface Testable extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: TestableInterface;

  queryFilter<TEvent extends TypedEvent>(
    event: TypedEventFilter<TEvent>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TEvent>>;

  listeners<TEvent extends TypedEvent>(
    eventFilter?: TypedEventFilter<TEvent>
  ): Array<TypedListener<TEvent>>;
  listeners(eventName?: string): Array<Listener>;
  removeAllListeners<TEvent extends TypedEvent>(
    eventFilter: TypedEventFilter<TEvent>
  ): this;
  removeAllListeners(eventName?: string): this;
  off: OnEvent<this>;
  on: OnEvent<this>;
  once: OnEvent<this>;
  removeListener: OnEvent<this>;

  functions: {
    getCurrentTime(overrides?: CallOverrides): Promise<[BigNumber]>;

    setCurrentTime(
      time: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    timerAddress(overrides?: CallOverrides): Promise<[string]>;
  };

  getCurrentTime(overrides?: CallOverrides): Promise<BigNumber>;

  setCurrentTime(
    time: PromiseOrValue<BigNumberish>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  timerAddress(overrides?: CallOverrides): Promise<string>;

  callStatic: {
    getCurrentTime(overrides?: CallOverrides): Promise<BigNumber>;

    setCurrentTime(
      time: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<void>;

    timerAddress(overrides?: CallOverrides): Promise<string>;
  };

  filters: {};

  estimateGas: {
    getCurrentTime(overrides?: CallOverrides): Promise<BigNumber>;

    setCurrentTime(
      time: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    timerAddress(overrides?: CallOverrides): Promise<BigNumber>;
  };

  populateTransaction: {
    getCurrentTime(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    setCurrentTime(
      time: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    timerAddress(overrides?: CallOverrides): Promise<PopulatedTransaction>;
  };
}
