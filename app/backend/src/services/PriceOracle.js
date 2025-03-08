const { ethers } = require('ethers');
const PriceData = require('../models/PriceData');
import { UniswapV2FactoryAbi } from "./abi/uniswapV2FactoryAbi";

const UNISWAP_V2_FACTORY_ABI = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "token0",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "token1",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "pair",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "PairCreated",
    "type": "event"
  },
  {
    "constant": true,
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "allPairs",
    "outputs": [
      {
        "internalType": "address",
        "name": "pair",
        "type": "address"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "allPairsLength",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "internalType": "address",
        "name": "tokenA",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "tokenB",
        "type": "address"
      }
    ],
    "name": "createPair",
    "outputs": [
      {
        "internalType": "address",
        "name": "pair",
        "type": "address"
      }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "feeTo",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "feeToSetter",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "internalType": "address",
        "name": "tokenA",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "tokenB",
        "type": "address"
      }
    ],
    "name": "getPair",
    "outputs": [
      {
        "internalType": "address",
        "name": "pair",
        "type": "address"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  }
];

const UNISWAP_V2_PAIR_ABI = [
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'function price0CumulativeLast() external view returns (uint)',
  'function price1CumulativeLast() external view returns (uint)'
];

// Monad testnet addresses (with correct checksums)
const UNISWAP_V2_FACTORY = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f';  // UniswapV2Factory
const USDC = '0xf817257fed379853cDe0fa4F97AB987181B1E5Ea';  // USDC
const CHOG = '0xE0590015A873bF326bd645c3E1266d4db41C4E6B';  // CHOG

const TOKENS = [
  {
    symbol: 'CHOG',
    tokenAddress: CHOG,
    isToken0: true
  },
  // {
  //   symbol: 'MOLANDAK',
  //   pairAddress: '0xf4d2888d29D722226FafA5d9B24F9164c092421E',  // MOLANDAK-USDC pair on Monad testnet
  //   isToken0: true
  // }
];

class PriceOracle {
  constructor(rpcUrl, timeWindow = 3600) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.timeWindow = timeWindow;
    this.factory = new ethers.Contract(UNISWAP_V2_FACTORY, UNISWAP_V2_FACTORY_ABI, this.provider);
  }

  async getPairAddress(tokenA, tokenB) {
    console.log(`Getting pair address for tokens ${tokenA} and ${tokenB}`);
    try {
      // First check if factory contract is accessible
      const pairsLength = await this.factory.allPairsLength();
      console.log(`Total pairs in factory: ${pairsLength}`);

      const pairAddress = await this.factory.getPair(tokenA, tokenB);
      console.log(`Found pair address: ${pairAddress}`);
      return pairAddress;
    } catch (error) {
      console.error('Error in getPairAddress:', error);
      throw error;
    }
  }

  async getTWAP(pairAddress, isToken0) {
    console.log(`\nGetting TWAP for pair ${pairAddress} (isToken0: ${isToken0})`);
    
    // Check if there's a contract at this address
    const code = await this.provider.getCode(pairAddress);
    if (code === '0x') {
      throw new Error('No contract deployed at this address');
    }
    console.log(`Contract code length: ${code.length} bytes`);
    
    const pair = new ethers.Contract(pairAddress, UNISWAP_V2_PAIR_ABI, this.provider);
    console.log('Contract instance created');

    // Validate that this is a valid pair contract
    try {
      // First try to get token addresses to verify it's a pair
      try {
        const token0 = await pair.token0();
        const token1 = await pair.token1();
        console.log(`Pair tokens: ${token0} (token0), ${token1} (token1)`);
      } catch (error) {
        console.error('Failed to get token addresses:', error);
        throw new Error('Contract does not implement token0/token1 - not a Uniswap V2 pair');
      }

      // Then try to get reserves
      const [reserve0, reserve1, timestamp] = await pair.getReserves();
      console.log(`Pair reserves: ${reserve0}, ${reserve1} (Last updated: ${new Date(timestamp * 1000).toISOString()})`);
      
      if (reserve0.toString() === '0' && reserve1.toString() === '0') {
        throw new Error('Pair has no liquidity');
      }

    } catch (error) {
      console.error('Failed to validate pair contract:', error);
      throw new Error(`Invalid or uninitialized pair contract: ${error.message}`);
    }
    
    const currentBlock = await this.provider.getBlockNumber();
    console.log(`Current block number: ${currentBlock}`);
    
    const currentCumulative = isToken0 
      ? await pair.price0CumulativeLast()
      : await pair.price1CumulativeLast();
    console.log(`Current cumulative price: ${currentCumulative}`);
    
    const pastBlock = await this.findBlockFromTime(currentBlock, this.timeWindow);
    console.log(`Past block number (${this.timeWindow} seconds ago): ${pastBlock}`);
    
    const pastCumulative = isToken0
      ? await pair.price0CumulativeLast({ blockTag: pastBlock })
      : await pair.price1CumulativeLast({ blockTag: pastBlock });
    console.log(`Past cumulative price: ${pastCumulative}`);
    
    const priceDiff = currentCumulative - pastCumulative;
    console.log(`Price difference: ${priceDiff}`);
    
    const timeElapsed = this.timeWindow;
    console.log(`Time elapsed: ${timeElapsed} seconds`);
    
    const price = priceDiff / timeElapsed / (10 ** 18);
    console.log(`Calculated TWAP price: ${price}`);

    return { price, blockNumber: currentBlock };
  }

  async findBlockFromTime(currentBlock, secondsAgo) {
    const currentBlockData = await this.provider.getBlock(currentBlock);
    if (!currentBlockData) throw new Error('Could not get current block');
    
    const targetTimestamp = currentBlockData.timestamp - secondsAgo;
    
    let left = 0;
    let right = currentBlock;
    
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      const midBlock = await this.provider.getBlock(mid);
      if (!midBlock) continue;
      
      if (midBlock.timestamp < targetTimestamp) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }
    
    return left;
  }

  async updatePrices() {
    for (const token of TOKENS) {
      try {
        // Get the correct pair address from the factory
        const pairAddress = await this.getPairAddress(token.tokenAddress, USDC);
        if (pairAddress === '0x0000000000000000000000000000000000000000') {
          throw new Error('Pair does not exist');
        }
        
        const { price, blockNumber } = await this.getTWAP(pairAddress, token.isToken0);
        console.log(price, blockNumber);
        
        await PriceData.create({
          tokenSymbol: token.symbol,
          price,
          blockNumber,
          pairAddress,
          timeWindowSeconds: this.timeWindow
        });
        
        console.log(`Updated price for ${token.symbol}: $${price}`);
      } catch (error) {
        console.error(`Error updating price for ${token.symbol}:`, error);
      }
    }
  }
}

module.exports = PriceOracle; 