import React, { useState, useEffect } from "react";
import { ethers, Contract } from "ethers";
import Web3Modal, { local, setLocal } from "web3modal";
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
  Woox_Address,
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
      deadline: Math.floor(Date.now() / 1000) + 60 * 10,
    };

    const transactionHash = await nonFungiblePositionManagerContract
      .connect(signer)
      .mint(params, { gasLimit: ethers.utils.hexlify(1000000) })
      .then((res) => {
        return res.hash;
      });

    if (transactionHash) {
      const liquidityContract = await internalAddLiquidity();
      const addLiquidityData = await liquidityContract
        .connect(signer)
        .addLiquidity(
          pool.token_A.name,
          pool.token_B.name,
          pool.token_A.address,
          pool.token_B.address,
          poolAddress,
          pool.token_B.chainId.toString(),
          transactionHash
        );
      await addLiquidityData.wait();
      setLoader(false);
      notifySuccess("Liquidity added successfully");
      window.location.reload();
    }
  } catch (error) {
    const errorMessage = parseErrorMsg(error);
    setLoader(false);
    notifyError(errorMessage);
  }
};

// Native token
const fetchInitialData = async () => {
  try {
    // get user account
    const account = await checkIfWalletConnected();
    // get user balance
    const balance = await getBalance();
    setBalance(ethers.utils.formatEther(balance.toString()));
    setAddress(account);

    // woox token contract
    const WOOX_TOKEN_CONTRACT = await internalWooxContract();

    let tokenBalance;
    if (account) {
      tokenBalance = await WOOX_TOKEN_CONTRACT.balanceOf(account);
    } else {
      tokenBalance = 0;
    }

    const tokenName = await WOOX_TOKEN_CONTRACT.name();
    const tokenSymbol = await WOOX_TOKEN_CONTRACT.symbol();
    const tokenTotalSupply = await WOOX_TOKEN_CONTRACT.totalSupply();
    const tokenStandard = await WOOX_TOKEN_CONTRACT.standard();
    const tokenHolders = await WOOX_TOKEN_CONTRACT._userId();
    const tokenOwnerOfContract = await WOOX_TOKEN_CONTRACT.ownerOfContract();
    const tokenAddress = await WOOX_TOKEN_CONTRACT.address();

    const nativeToken = {
      tokenAddress: tokenAddress,
      tokenName: tokenName,
      tokenSymbol: tokenSymbol,
      tokenOwnerOfContract: tokenOwnerOfContract,
      tokenStandard: tokenStandard,
      tokenTotalSupply: ethers.utils.formatEther(tokenTotalSupply.toString()),
      tokenBalance: ethers.utils.formatEther(tokenBalance.toString()),
      tokenHolders: tokenHolders.toNumber(),
    };
    setNativeToken(nativeToken);

    // getting Token Holders
    const getTokenHolders = await WOOX_TOKEN_CONTRACT.getTokenHolder();
    setTokenHolders(getTokenHolders);

    // fetting token holders data
    if (account) {
      const getTokenHolderData = await WOOX_TOKEN_CONTRACT.getTokenHolderData(
        account
      );

      const currentHolder = {
        tokenId: getTokenHolderData[0].toNumber(),
        from: getTokenHolderData[1],
        to: getTokenHolderData[2],
        totalToken: ethers.utils.formatEther(getTokenHolderData[3].toString()),
        tokenHolder: getTokenHolderData[4],
      };
      setCurrentHolder(currentHolder);
    }

    // token sale contract
    const ICO_WOOX_CONTRACT = await internalICOWooxContract();
    const tokenPrice = await ICO_WOOX_CONTRACT.tokenPrice();
    const tokenSold = await ICO_WOOX_CONTRACT.tokenSold();
    const tokenSaleBalance = await WOOX_TOKEN_CONTRACT.balanceOf(
      "0x1d63C1B4c9B8Ba0767C2341f68ae1E74f7A49eea" // address to be added
    );

    const tokenSale = {
      tokenPrice: ethers.utils.formatEther(tokenPrice.toString()),
      tokenSold: tokenSold.toNumber(),
      tokenSaleBalance: ethers.utils.formatEther(tokenSaleBalance.toString()),
    };
    setTokenSale(tokenSale);
    console.log(tokenSale);
    console.log(nativeToken);
  } catch (error) {
    console.log(error);
  }
};

useEffect(() => {
  fetchInitialData();
}, []);

const buyToken = async (nToken) => {
  try {
    setLoader(true);
    const PROVIDER = await web3Provider();
    const signer = PROVIDER.getSigner();

    const contract = internalICOWooxContract();
    console.log(contract);

    const price = 0.0001 * nToken;
    const amount = ethers.utils.parseUnits(price.toString(), "ether");

    const buying = await contract.connect(signer).buyTokens(nToken, {
      value: amount.toString(),
      gasLimit: ethers.utils.hexlify(1000000),
    });

    await buying.wait();
    window.location.reload();
  } catch (error) {
    const errorMsg = parseErrorMsg(error);
    console.log(error);
    setLoader(false);
    notifyError(errorMsg);
  }
};

// native token transfer
const transferNativeToken = async () => {
  try {
    setLoader(true);
    const PROVIDER = await web3Provider();
    const signer = PROVIDER.getSigner();

    const TOKEN_SALE_ADDRESS = "0x58Db7D49D1D619860fc7AF5DCB9ce5CC75c96872";
    const TOKEN_AMOUNT = 2000;
    const tokens = TOKEN_AMOUNT.toString();
    const transferAmount = ethers.utils.parseEther(tokens);

    const contract = await internalWooxContract();
    const transaction = await contract
      .connect(signer)
      .tranfer(TOKEN_SALE_ADDRESS, transferAmount);

    await transaction.wait();
    window.location.reload();
  } catch (error) {
    const errorMsg = parseErrorMsg(error);
    setLoader(false);
    notifyError(errorMsg);
    // console.log(error);
  }
};

// liquidity history
const GET_ALL_LIQUIDITY = async () => {
  try {
    // get user account
    const account = await checkIfWalletConnected();

    const contract = await internalAddLiquidity();
    const liquidityHistory = await contract.getAllLiquidity(account);

    const AllLiquidity = liquidityHistory.map((liquidity) => {
      const liquidityArray = {
        id: liquidity.id.toNumber(),
        network: liquidity.network,
        owner: liquidity.owner,
        poolAddress: liquidity.poolAddress,
        tokenA: liquidity.tokenA,
        tokenB: liquidity.tokenB,
        tokenA_Address: liquidity.tokenA_Address,
        tokenB_Address: liquidity.tokenB_Address,
        timeCreated: liquidity.timeCreated.toNumber(),
        transactionHash: liquidity.transactionHash,
      };
      return liquidityArray;
    });
    return AllLiquidity;
  } catch (error) {
    console.log(error);
  }
};

return (
  <CONTEXT.Provider
    value={{
      connect,
      getPoolAddress,
      LOAD_TOKEN,
      notifyError,
      notifySuccess,
      createLiquidity,
      GET_ALL_LIQUIDITY,
      transferNativeToken,
      buyToken,
      tokenSale,
      nativeToken,
      address,
      loader,
      DAPP_NAME,
    }}
  >
    {children}
  </CONTEXT.Provider>
);
