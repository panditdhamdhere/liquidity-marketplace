import React, { useState, useEffect } from "react";
import { ethers, Contract } from "ethers";
import Web3Modal, { local } from "web3modal";
import axios from "axios";
import UniswapV3Pool from "@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json";
import toast from "react-hot-toast";

import { Token } from "@uniswap/sdk-core";
import {
  FACTORY_ADDRESS,
  Pool,
  Position,
  nearestUsableTick,
} from "@uniswap/v3-sdk";
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
  connectingContract,
} from "./constants";

import { parseErrorMsg } from "../Utils/index";
import { network } from "hardhat";

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

// check if wallet connected

const checkIfWalletConnected = async () => {
  const accounts = await window.ethereum.request({
    method: "eth_accounts",
  });
  return accounts[0];
};

const LOAD_TOKEN = async (token) => {
  try {
    const tokenDetails = await connectingContract(token);
    return tokenDetails;
  } catch (error) {
    console.log(error);
  }
};

//  get pool address

const getPoolAddress = async (token_1, token_2, fee) => {
  try {
    setLoader(true);
    const PROVIDER = await web3Provider();

    const factoryContract = new ethers.Contract(
      FACTORY_ADDRESS,
      Factory_ABI,
      PROVIDER
    );

    const poolAddress = await factoryContract.functions.getPool(
      token_1.address,
      token_2.address,
      Number(fee)
    );

    const poolHistory = {
      token_A: token_1,
      token_B: token_2,
      fee: fee,
      network: token_1.chainId,
      poolAddress: poolAddress,
    };

    const zeroAddress = "0x0000000000000000000000000000000000000000";

    if (poolAddress == zeroAddress) {
      notifyError("Sorry there is no pool");
    } else {
      let poolArray = [];
      const poolLists = localStorage.getItem("poolHistory");
      if (poolLists) {
        poolArray = JSON.parse(localStorage.getItem("poolHistory"));
        poolArray.push(poolHistory);
        localStorage.setItem("poolHistory", JSON.stringify(poolArray));
      } else {
        poolArray.push(poolHistory);
        localStorage.setItem("poolHistory", JSON.stringify(poolArray));
      }
      setLoader(false);
      notifySuccess("Successfully Completed");
    }
    return poolAddress;
  } catch (error) {
    const errorMessage = parseErrorMsg(error);
    setLoader(false);
    notifyError(errorMessage);
  }
};

// create liquidity
async function getPoolData(poolContract) {
  const [tickSpacing, fee, liquidity, slot0] = await Promise.all([
    poolContract.tickSpacing(),
    poolContract.fee(),
    poolContract.liquidity(),
    poolContract.slot0(),
  ]);

  return {
    tickSpacing: tickSpacing,
    fee: fee,
    liquidity: liquidity,
    sqrtPriceX96: slot0[0],
    tick: slot0[1],
  };
}

const createLiquidity = async (pool, liquidityAmount, approveAmount) => {
  try {
    setLoader(true);
    const address = await checkIfWalletConnected();
    const PROVIDER = await web3Provider();
    const signer = PROVIDER.getSigner();

    const TOKEN_1 = new Token(
      pool.token_A.chainId,
      pool.token_A.address,
      pool.token_A.decimals,
      pool.token_A.symbol,
      pool.token_A.name
    );

    const TOKEN_2 = new Token(
      pool.token_B.chainId,
      pool.token_B.address,
      pool.token_B.decimals,
      pool.token_B.symbol,
      pool.token_B.name
    );

    const poolAddress = pool.poolAddress[0];

    const nonFungiblePositionManagerContract = new ethers.Contract(
      positionManagerAddress,
      INonfungiblePositionManagerABI,
      PROVIDER
    );

    const poolContract = new ethers.Contract(
      poolAddress,
      IUniswapV3PoolABI,
      PROVIDER
    );

    const poolData = await getPoolData(poolContract);

    const TOKEN_1_TOKEN_2_POOL = new Pool(
      TOKEN_1,
      TOKEN_1,
      poolData.fee,
      poolData.sqrtPriceX96.toString(),
      poolData.liquidity.toString(),
      poolData.tick
    );

    const position = new Position({
      pool: TOKEN_1_TOKEN_2_POOL,
      liquidity: ethers.utils.parseUnits(liquidityAmount, 18),
      tickLower:
        nearestUsableTick(poolData.tick, poolData.tickSpacing) -
        poolData.tickSpacing * 2,
      tickUpper:
        nearestUsableTick(poolData.tick, poolData.tickSpacing) +
        poolData.tickSpacing * 2,
    });

    const approvalAmount = ethers.utils
      .parseUnits(approveAmount, 18)
      .toString();
    const tokenContract0 = new ethers.Contract(
      pool.token_A.address,
      ERC20ABI,
      PROVIDER
    );

    await tokenContract0
      .connect(signer)
      .approve(positionManagerAddress, approvalAmount);

    const tokenContract1 = new ethers.Contract(
      pool.token_B.address,
      ERC20ABI,
      PROVIDER
    );
    await tokenContract1
      .connect(signer)
      .approve(positionManagerAddress, approvalAmount);

    const { amount0: amount0Desired, amount1: amount1Desired } =
      position.mintAmounts;

    // mintAmountWithSlippage

    const params = {
      token0: pool.token_A.address,
      token1: pool.token_B.address,
      fee: poolData.fee,
      tickLower:
        nearestUsableTick(poolData.tick, poolData.tickSpacing) -
        poolData.tickSpacing * 2,
      tickUpper:
        nearestUsableTick(poolData.tick, poolData.tickSpacing) +
        poolData.tickSpacing * 2,
      amount0Desired: amount0Desired.toString(),
      amount1Desired: amount1Desired.toString(),
      amount0Min: amount0Desired.toString(),
      amount1Min: amount1Desired.toString(),
      recipient: address,
      deadline: Math.floor(Date.now() / 1000),
    };
  } catch (error) {}
};
