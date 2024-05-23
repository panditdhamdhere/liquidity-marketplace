import React, { useState, useEffect } from "react";
import { ethers, Contract } from "ethers";
import Web3Modal from "web3modal";
import axios from "axios";
import UniswapV3Pool from "@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json";
import toast from "react-hot-toast";

import { Token } from "@uniswap/sdk-core";
import { Pool, Position, nearestUsableTick } from "@uniswap/v3-sdk";
import { abi as IUniswapV3PoolABI } from "@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json";
import { abi as INonfungiblePositionManagerABI } from "@uniswap/v3-periphery/artifacts/contracts/interfaces/INonfungiblePositionManager.sol/INonfungiblePositionManager.json";
import ERC20ABI from "./abi.json";

// internal imports

import {
  ERC20_ABI,
  TOKEN_ABI,
  V3_SWAP_ROUTER_ADDRESS,
  CONNECTING_CONTRACT,
  Factory_ABI,
  factory_address,
  web3Provider,
  positionManagerAddress,
  internalWooxContract,
  internalICOWooxContract,
  internalAddLiquidity,
  getBalance,
} from "./constants";

import { parseErrorMsg } from "../Utils/index";

export const CONTEXT = React.createContext();

export const ContextProvider = ({ children }) => {
  const DAPP_NAME = "Liquidity Dapp";
  //state variable
  const [loader, setLoader] = useState(false);
  const [address, setAddress] = useState("");
  const [chainId, setChainId] = useState();

  // token
  const [balance, setBalance] = useState();
  const [nativeToken, setNativeToken] = useState();
  const [tokenHolders, setTokenHolders] = useState([]);
  const [tokenSale, setTokenSale] = useState();
  const [currentHolder, setCurrentHolder] = useState();

  // notification
  const notifyError = (msg) => toast.error(msg, { duration: 4000 });
  const notifySuccess = (msg) => toast.success(msg, { duration: 4000 });

  // connectWallet
  const connect = async () => {
    try {
      if (!window.ethereum) return notifyError("Install Metamask");

      const account = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (account.length) {
        setAddress(account[0]);
      } else {
        notifyError("No account found");
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const network = await provider.getNetwork();
      setChainId(network.chainId);
    } catch (error) {
      const errorMsg = parseErrorMsg(error);
      notifyError(errorMsg);
      console.log(error);
    }
  };
};
