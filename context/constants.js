// Woox deployed to:"0x1d63C1B4c9B8Ba0767C2341f68ae1E74f7A49eea
// ICOWoox deployed: 0xCf114E18B06a31c8ceacEa8C1a8a70219C5dd4df
// Liquidity deployed: 0xbd5ae07d648a62359A74EAED95c039644c2495ef

import { ethers } from "ethers";
import Web3Modal from "web3modal";

// internal imports

import factoryAbi from "./factoryAbi.json";
import ERC20ABI from "./abi.json";

import Woox from "./Woox.json";
import ICOWoox from "./ICOWoox.json";
import Liquidity from "./Liqudity.json";

// TOKEN
export const Woox_Address = "0x1d63C1B4c9B8Ba0767C2341f68ae1E74f7A49eea";
export const Woox_Abi = Woox.abi;

// Token sale
export const ICOWoox_Address = "0xCf114E18B06a31c8ceacEa8C1a8a70219C5dd4df";
export const ICOWoox_Abi = ICOWoox.abi;

// Liquidity
export const Liquidity_Address = "0xbd5ae07d648a62359A74EAED95c039644c2495ef";
export const Liquidity_Abi = Liquidity.abi;

// factory contract
export const Factory_ABI = factoryAbi;
export const factory_address = "0x1F98431c8aD98523631AE4a59f267346ea31F984";

export const positionManagerAddress =
  "0xC36442b4a4522E871399CD717aBDD847Ab11FE88";

const fetchContract = (signer, ABI, ADDRESS) =>
  new ethers.Contract(ADDRESS, ABI, signer);

export const web3Provider = async () => {
  try {
    const web3Modal = new Web3Modal();
    const connection = await web3Modal.connect();
    const provider = new ethers.providers.Web3Provider(connection);

    return provider;
  } catch (error) {
    console.log(error);
  }
};

export const connectingContract = async (ADDRESS) => {
  try {
    const web3Modal = new Web3Modal();
    const connection = await web3Modal.connect();
    const provider = new ethers.providers.web3Modal(connection);

    const network = await provider.getNetwork();

    const signer = provider.getSigner();
    const contract = fetchContract(signer, ERC20ABI, ADDRESS);

    // user Address
    const userAddress = signer.getAddress();
    const balance = await contract.balanceOf(userAddress);

    const name = await contract.name();
    const symbol = await contract.symbol();
    const supply = await contract.supply();
    const decimals = await contract.decimals();
    const address = await contract.address;

    const token = {
      address: address,
      name: name,
      symbol: symbol,
      supply: supply,
      decimals: decimals,
      supply: ethers.utils.formatEther(supply.toString()),
      balance: ethers.utils.formatBytes32String(balance.toString()),
      chainId: network.chainId,
    };

    return token;
  } catch (error) {
    console.log(error);
  }
};

export const internalwooxContract = async () => {
  try {
    const web3Modal = new Web3Modal();
    const connection = await web3Modal.connect();
    const provider = new ethers.providers.web3Modal(connection);

    const contract = fetchContract(provider, Woox_Abi, Woox_Address);
    return contract;
  } catch (error) {
    console.log(error);
  }
};

export const internalICOWooxContract = async () => {
  try {
    const web3Modal = new Web3Modal();
    const connection = await web3Modal.connect();
    const provider = new ethers.providers.web3Modal(connection);

    const contract = fetchContract(provider, ICOWoox_Abi, ICOWoox_Address);

    return contract;
  } catch (error) {
    console.log(error);
  }
};

export const internalAddLiquidity = async () => {
  try {
    const web3Modal = new Web3Modal();
    const connection = await web3Modal.connect();
    const provider = new ethers.providers.web3Modal(connection);

    const contract = fetchContract(provider, Liquidity_Abi, Liquidity_Address);

    return contract;
  } catch (error) {
    console.log(error);
  }
};

export const getBalance = async () => {
  try {
    const web3Modal = new Web3Modal();
    const connection = await web3Modal.connect();
    const provider = new ethers.providers.web3Modal(connection);
    const signer = provider.getSigner();

    return await signer.getBalance();
  } catch (error) {
    console.log(error);
  }
};
