<div id="readme-top" align="center">
  <div id="readme-top" align="center">
    <img src="./frontend/public/fav.png" alt="Gorillionaire Logo" height="55">
    <h1>Gorillionaire</h1>
  </div>

  <p align="center" style="font-size: 24px">
    <strong>AI Crypto Signals & Gamified Trading platform</strong>
    <br />
    <a href="https://gorillionai.re/" style="font-size: 16px"><strong>Visit the website »</strong></a>
    <br />
    <div>
    <div style="display: flex; flex-direction: row; justify-content: center; align-items: center">
    <p>
    Powered by
    </p>
        <a href="https://www.gorilli.io/en">
            <img src="./docs/img/gorilli-logo.svg" alt="Gorilli Logo" width="100" height="30">
        </a>
        </div>
    </div>
  </p>
</div>

# Table of contents

<!-- TOC -->

- [1. Overview](#1-overview)
- [2. Target audience](#2-target-audience)
- [3. Long-term sustainability](#3-long-term-sustainability)
- [4. Submission details](#4-submission-details)
- [5. Project Components](#5-project-components)
- [6. Technologies used](#6-technologies-used)
- [7. Sponsors](#7-sponsors)
- [8. Security considerations](#8-security-considerations)
- [9. Implementation](#9-implementation)
  - [9.1 Token tracking](#91-token-tracking)
  - [9.2 Data polling](#92-data-polling)
  - [9.3 Signal generation](#93-signal-generation)
  - [9.4 Nillion's Secret Vault](#94-nillions-secret-vault)
  - [9.5 AccessNFT smart contract](#95-accessnft-smart-contract)
- [10. Project Description and Impact](#10-project-description-and-impact)
- [11. User Experience](#11-user-experience)
- [12. License](#12-license)

## 1. Overview

Gorillionaire is an AI-powered crypto trading platform that delivers real-time BUY/SELL signals by analyzing on-chain data, whale activity, token listings, and price feeds from sources like Envio, Codex, Pyth, and Blockvision. Users connected using Privy can act on signals seamlessly using 0x Swap API and earn points in a gamified leaderboard. Built on Monad for speed and efficiency, Gorillionaire also provides AI-driven token analytics and access to private signals via the Nillion Secret Vault, empowering traders and AI agents with actionable insights.

## 2. Target audience

Gorillionaire is designed for crypto traders, AI-powered trading agents, and data-driven investors looking for a competitive edge in the fast-moving crypto market.

1. Active Crypto Traders
   Traders seeking real-time, AI-enhanced trade signals to identify high-potential opportunities.
   Users who want to execute trades seamlessly without manually researching multiple data sources.
   Those who enjoy a gamified trading experience, earning points and climbing the leaderboard through active participation.
2. AI-Powered Trading Agents & Developers
   Algorithmic traders and developers building AI-driven trading strategies that require structured, high-quality data.
   AI agents that need machine-readable, real-time event signals to automate and optimize trading decisions.
   Developers looking for secure access to signals via the Nillion Secret Vault for deeper AI integration.
3. On-Chain Analysts & Data Enthusiasts
   Users interested in analyzing token trends, whale movements, and social sentiment before making investment decisions.
   Analysts leveraging Gorillionaire’s multi-source aggregated data to stay ahead of market shifts.
4. Gamified Traders & Community Members
   Users who want to engage with trading in a more interactive way, earning points and rewards for active participation.
   Those looking to compete on leaderboards and showcase their trading expertise.
   How Users Benefit
   Access to AI-optimized trading signals that simplify decision-making.
   Seamless trade execution directly within the platform, eliminating manual effort.
   Gamification features that make trading engaging and competitive.
   Exclusive access for AI agents to structured, high-frequency event signals for automation.
   Deep token analytics to gain an edge in emerging markets, especially on Monad.
   Gorillionaire is built for both individual traders and AI-driven strategies, making it a key intelligence source for navigating crypto markets efficiently.

## 3. Long-term sustainability

Subscription model for real-time insights, automation, and premium signals.

B2B2C approach: onboarding agent developers to scale AI-driven strategies.

Potential transaction-based fees for execution and premium features.

## 4. Submission details

- GitHub Repository: https://github.com/gorilli-team/gorillionaire
- Link to the project: https://gorillionai.re/

## 5. Project components

| Folder          | Description                                                                                                                                                                                                                                                                             | How to Start                                                     | Environment Variables                                                                                                                                                                                                        | More Details                        |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `access-nft`    | The Gorillionaire Access NFT can be purchased by the user at a fixed price set at 1 MON. After obtaining the NFT, the user will be able to unlock the encrypted signals stored on Nillion. The AccessNFT smart contract has been deployed on the Monad Testnet at the following address | `cd access-nft && forge install && forge build`                  | N/A                                                                                                                                                                                                                          | [README](./access-nft/README.md)    |
| `app/backend`   | The Gorillionaire backend manages real-time signals, authentication, activity tracking, and WebSocket updates, ensuring seamless trading signal distribution.                                                                                                                           | `cd app/backend && yarn install && yarn dev`                     | `PORT`, `DATABASE_URL`, `JWT_SECRET`, `CODEX_API_KEY`, `ZERO_X_API_KEY`, `INDEXER_API_KEY`, `BLOCKVISION_API_URL`, `BLOCKVISION_API_KEY`, `ORG_DID`, `ORG_SECRET_KEY`, `SCHEMA_ID`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | [README](./app/backend/README.md)   |
| `envio-indexer` | The Envio Indexer tracks Monad token swaps and listings, alerting the backend and Telegram subscribers to volume spikes or whale transfers for trading insights                                                                                                                         | `cd envio-indexer && pnpm install && pnpm codegen && pnpm start` | `ENVIO_API_TOKEN`, `ENVIO_TELEGRAM_BOT_TOKEN`, `ENVIO_TELEGRAM_CHAT_ID`, `ENVIO_API_BASE_URL`, `ENVIO_BACKEND_API_KEY`                                                                                                       | [README](./envio-indexer/README.md) |
| `frontend`      | Main web application interface, built with Next.js, uses Privy for secure wallet authentication, supporting multiple logins and embedded wallets, with Monad testnet, adding for Mainnet MoonPay integration.                                                                           | `cd frontend && yarn install && yarn dev`                        | `NEXT_PUBLIC_PRIVY_APP_ID`, `NEXT_PUBLIC_NILLION_SCHEMA_ID`, `NEXT_PUBLIC_API_URL`                                                                                                                                           | [README](./frontend/README.md)      |
| `langchain`     | The signal agent, built with Langchain, generates trading signals by creating a coherent chain of prompts, providing useful insights for the user.                                                                                                                                      | `cd langchain && npm install && node src/index.js`               | `MONGODB_CONNECTION_STRING`, `SUPABASE_API_KEY`, `SUPABASE_URL_GORILLIONAIRE`, `OPENAI_API_KEY`                                                                                                                              | [README](./langchain/README.md)     |
| `nillion`       | Nillion's Secret Vault securely stores sensitive data in an encrypted, distributed database. We used it to store Langchain signals, encrypting signal text and events, excluding "created_at to showcase hints of the signals generated."                                               | `cd nillion && npm install && node index.js`                     | `NILLION_ORG_DID`, `NILLION_ORG_SECRET_KEY`, `COLLECTION_SCHEMA_ID` `MONGODB_CONNECTION_STRING`                                                                                                                              | [README](./nillion/README.md)       |

Each folder contains its own README with detailed setup instructions and environment variable requirements.

## 6. Technologies used

<a href="https://nextjs.org/"><img src="./docs/img/nextjs-logo.png" alt="NextJS Logo" width="50" height="50"></a>
<a href="https://www.mongodb.com/"><img src="./docs/img/mongodb-logo.svg" alt="MongoDB Logo" width="50" height="50"></a>
<a href="https://supabase.com/"><img src="./docs/img/supabase-logo.svg" alt="Supabase Logo" width="50" height="50"></a>
<a href="https://testnet.monad.xyz/"><img src="./docs/img/monad-logo.webp" alt="Monad Logo" width="50" height="50"></a>
<a href="https://www.pyth.network/"><img src="./docs/img/pyth-logo.svg" alt="Langchain Logo" width="50" height="50"></a>
<a href="https://blockvision.org/"><img src="./docs/img/blockvision-logo.svg" alt="Blockvision Logo" width="50" height="50"></a>
<a href="https://www.codex.io/"><img src="./docs/img/codex-logo.png" alt="Codex Logo" width="50" height="50"></a>
<a href="https://www.langchain.com/"><img src="./docs/img/langchain-logo.png" alt="Langchain Logo" width="70" height="50"></a>

## 7. Sponsors

<a href="https://www.privy.io/"><img src="./docs/img/privy-logo.jpg" alt="Privy Logo" width="50" height="50"></a>
<a href="https://0x.org/products/swap"><img src="./docs/img/0x-logo.png" alt="0x Logo" width="50" height="50"></a>
<a href="https://nillion.com/"><img src="./docs/img/nillion-logo.jpg" alt="Nillion Logo" width="50" height="50"></a>
<a href="https://envio.dev/"><img src="./docs/img/envio-logo.png" alt="Envio Logo" width="120" height="50"></a>

| Sponsor     | Integration method    | Description                                                                                                                                                         | How we used it                                                                                                                                        |
| ----------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Privy       | Wallet authentication | Users can easily access the platform with their wallet thanks to Privy, which smoothens the onboarding process with crypto/fiat onramping.                          | [Link](#privy)                                                                                                                                           |
| 0x Swap API | Swap tokens           | Users can execute their trade according to the signal generated thanks to 0x Swap API, which allows them to find the best swap opportunity available on the market. | [Link](#0x)    |
| Nillion     | Encrypted storage     | Generated signals are stored securely on a decentralized database provided by Nillion.                                                                              | [Link](#nillion) |
| Envio       | Token tracking        | Transfers and listings events are tracked with Envio, these will serve as the context for the signal generation process.                                            | [Link](#envio)   |

## 8. Security considerations

| Category           | Security measures                                | Description                                                                                                                       |
| ------------------ | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Smart contracts    | Followed CEI pattern                             | The mint function in AccessNFT updates the token counter before minting the NFT, preventing re-entrancy attacks.                  |
|                    | Inherited from standard contracts (OpenZeppelin) | AccessNFT inherits from ERC721 and Ownable standard contracts from the OpenZeppelin library, ensuring adherence to best practices |
| API Calls          | Privy token authorization                        | Only users with an authorized Privy token can access to API calls to the backend                                                  |
| Nillion            | NFT based authorization                          | Encrypted signals are accessible only to users that successfully purchased the AccessNFT                                          |
| Leaderboard scores | Backup transactions on DB                        | Transaction intents are stored on DB to verify the assignment of trading points when the transaction is executed                  |

## 9. Implementation

### Technical Architecture

Data Collection Layer:

- Integrates with multiple blockchain data providers (ENVIO, CODEX, BlockVision, PYTH)
- Collects comprehensive on-chain data including:
- Token transfers
- Price spikes and volatility
- New token listings
- Token holder distribution
- Real-time price feeds
- Market-on-open price data

Data Processing Layer:

- Implements a robust data polling mechanism
- Leverages MongoDB for flexible schema data storage
- Utilizes Supabase for real-time database functionality
- Processes raw blockchain events into numerical vector representations
- Performs data normalization and transformation for downstream analysis

Signal Generation Layer:

- Powered by LangChain for context-aware processing
- Implements a sophisticated retrieval-augmented generation system
- Processes standalone questions with relevant context
- Generates precise trading signals with specific actions and confidence scores
- Includes decision parameters (buy/sell actions, percentage allocations)
- Integrates with Privy for secure wallet authentication
- Connects to 0x Protocol for decentralized trade execution

Security Storage Layer:

- Implements Nillion's technology for secure, encrypted storage
- Utilizes a decentralized database architecture for fault tolerance
- Distributes sensitive trading signals across multiple nodes
- Ensures data integrity and confidentiality through encryption
- Maintains a tamper-proof record of all generated signals

### Key Technical Features

- Decentralized architecture for enhanced security and reliability
- Vector-based data representation for advanced pattern recognition
- Context-aware signal generation with confidence scoring
- Secure multi-party computation for sensitive data handling
- End-to-end pipeline from data collection to trade execution
- Authenticated wallet integration for secure transactions

### Integration Points

- Blockchain data providers for real-time information
- NoSQL and relational databases for efficient data storage
- AI/ML frameworks for signal generation
- Decentralized trading protocols for execution
- Wallet authentication services for security

<div style="display: flex; justify-content:center">
<img src="./docs/img/Final diagram (minimal).png" alt="Implementation Diagram" width="800" height="650"></img>
</div>

### 9.1 Token tracking

The best trading signals are generated with the most accurate events and information about the tokens available. We decided to track the 3 most traded tokens in the Monad Testnet, which are Molandak (DAK), Moyaki (YAKI), and Chog (CHOG).<br>
We acquire information regarding transfers, spikes, new listings, token holders, tokens price evolution, and the native token MON price. These information are fetched via 4 different services:

- **Envio**: transfers, spikes, listings
- **Codex**: tokens price
- **Blockvision**: token holders
- **Pyth**: MON price

All the data are then stored on MongoDB (except for the MON price which is rendered on the frontend).

More details here: 
- https://github.com/gorilli-team/gorillionaire/blob/main/app/backend
- https://github.com/gorilli-team/gorillionaire/tree/main/envio-indexer

### 9.2 Data polling

The raw data stored on MongoDB are then fetched every 30 minutes by the Signal Agent, which will query each collections and will fetch only the newly added events. Langchain's text splitter has been used for converting those events into machine readable vectors via the OpenAI Embeddings. Those embeddings are then stored in a Supabase database for the next step.

More details [here](./langchain/README.md).

### 9.3 Signal generation

The signal generation process has been created with Langchain. This tool helped us to structure a chain of prompts that translates an input prompt into an actionable and coherent trading signal. Thanks to the `match_documents` function on Supabase database, we are able to find the best events for the input prompt given. These events will then serve as the context for the generated signal.

More details [here](./langchain/README.md).

### 9.4 Nillion's Secret Vault

All the signals are stored in a decentralized database provided by Nillion. Thanks to Nillion, we are able to guarantee the encryption of both the trading signal text and the events that generated it, granting exclusive access only to those users that purchased the Gorillionaire Access NFT.

More details [here](./nillion/README.md).

### 9.5 AccessNFT smart contract

The smart contract for minting the Gorillionare Access NFT has been deployed on the Monad Testnet at the following address:

- [0x12bF70e3325104ed2D7fefbB8f3e88cE2Dd66A30](https://testnet.monadexplorer.com/address/0x12bF70e3325104ed2D7fefbB8f3e88cE2Dd66A30)

AccessNFT is a standard ERC721 contract that allows users to mint their NFT, with a minimum value sent of 1 MON. This NFT will serve as the access key to the exclusive signals generated by the agent.

More details [here](./access-nft/README.md).

## 10. Project Description and Impact

### Problem

The crypto market moves at lightning speed, with massive daily on-chain transactions across multiple blockchains. Traders and AI-driven strategies struggle to extract real-time actionable insights from fragmented data sources like price feeds, whale transactions, new token listings, and social sentiment. Despite the $130+ billion in daily crypto trading volume, existing signal platforms process only a fraction of this data and lack deep automation, leaving traders to manually interpret signals and execute trades. Additionally, AI trading agents require high-quality, structured data to make informed decisions, yet most rely on incomplete or delayed sources, leading to inefficiencies and missed opportunities.

### Solution

Gorillionaire solves these inefficiencies by providing a real-time, AI-powered signal platform designed for both human traders and AI agents. The platform processes vast amounts of on-chain data from multiple sources (Envio, Codex, Pyth, BlockVision) to generate structured, actionable trade signals that can be instantly executed.

Key features include:

- Multi-source data aggregation tracking token transfers, spikes, new listings, whale activity, and price feeds
- AI-powered trade signals using LangChain-based processing to generate high-confidence BUY/SELL recommendations
- Seamless trade execution through 0x Swap API integration
- Gamified trading experience with points and leaderboards
- AI agent compatibility with Nillion Secret Vault for secure processing of trading insights
- Advanced token analytics for deeper market understanding

### Technical Architecture

Gorillionaire's architecture consists of four interconnected layers:

1. **Data Collection Layer**

   - Integrates with Envio, Codex, BlockVision, and PYTH APIs
   - Collects comprehensive blockchain data including transfers, spikes, listings, holder information
   - Optimized for Monad's high-throughput environment to process data at unprecedented speeds

2. **Data Processing Layer**

   - Utilizes MongoDB and Supabase for efficient data storage and retrieval
   - Implements a sophisticated data polling mechanism to fetch recent blockchain events
   - Transforms raw blockchain data into numerical vector representations
   - Leverages Monad's accelerated EVM for high-speed data processing and transformation

3. **Signal Generation Layer**

   - Powered by LangChain for context-aware processing
   - Implements a retrieval-augmented generation system to process blockchain events
   - Generates precise BUY/SELL signals with confidence scores
   - Takes advantage of Monad's low-latency capabilities to deliver real-time signals

4. **Security Storage Layer**
   - Implements Nillion's Secret Vault technology for secure, encrypted storage
   - Utilizes decentralized database architecture for fault tolerance
   - Ensures data integrity and confidentiality through encryption
   - Maintains tamper-proof records compatible with Monad's security model

The frontend provides an intuitive dashboard for signal visualization, trade execution, and leaderboard tracking. Smart contracts handle the points system, leaderboard mechanics, and integration with 0x for trading execution—all optimized for Monad's accelerated EVM to ensure fast transaction processing and minimal gas costs.

### Target Users

Gorillionaire targets two primary user groups:

1. **Active Crypto Traders**

   - Day traders and swing traders looking for real-time market insights
   - Benefit from actionable signals, instant trade execution, and reduced research time
   - Gain competitive advantage through early access to market-moving information
   - Enjoy gamified trading experience with points and leaderboards

2. **AI Trading Agents & Developers**
   - Algorithm developers creating automated trading strategies
   - Quant traders deploying AI-powered solutions
   - Benefit from structured, machine-readable signals for algorithmic consumption
   - Leverage Nillion Secret Vault for secure processing of proprietary trading strategies
   - Build next-generation trading applications on top of Gorillionaire's signal infrastructure

### Uniqueness and Innovation

Gorillionaire stands out from existing solutions in several ways:

1. **Dual-Audience Approach**: Unlike platforms that target either human traders or bots, Gorillionaire serves both with structured, actionable signals.

2. **Real-Time, Actionable Intelligence**: Instead of delayed reports or vague sentiment analysis, Gorillionaire provides high-confidence, executable trade signals with specific parameters.

3. **Complete Trading Ecosystem**: Combining signal generation, trade execution, and competitive gamification creates a comprehensive trading platform rather than just an alert system.

4. **AI-Native Design**: Built from the ground up to be compatible with AI agents, enabling the next generation of automated trading strategies.

5. **Signal Infrastructure Focus**: Emphasis on building the backbone for AI-powered trading strategies rather than just another trading tool.

6. **Secure Signal Vault**: Nillion integration provides a unique approach to handling sensitive trading signals through encrypted, decentralized storage.

### Monad Alignment

Gorillionaire aligns with and contributes to the Monad ecosystem in multiple ways:

1. **Showcasing Monad's Speed**: Demonstrates the power of Monad's accelerated EVM through high-frequency data processing and real-time signal generation.

2. **Expanding Monad's Trading Ecosystem**: Provides essential infrastructure for traders and developers to build and execute sophisticated strategies on Monad.

3. **Driving Transaction Volume**: Encourages active trading through signal-based execution, potentially increasing transaction volume on Monad.

4. **Attracting Developer Talent**: By focusing on a developer-first approach, Gorillionaire helps bring technical talent to the Monad ecosystem.

5. **Creating Network Effects**: As more traders and AI agents use Gorillionaire on Monad, the platform becomes more valuable, creating a positive feedback loop for the ecosystem.

6. **Leveraging Monad's Unique Capabilities**: Specifically designed to take advantage of Monad's low-latency, high-throughput environment—capabilities that would be difficult to achieve on other chains.

## 11. Team

## Team Information & Contributions

### Team Members & Roles

- **Riccardo** - Security & Backend Lead

  - Implemented secure data architecture
  - Developed backend infrastructure
  - Created blockchain event tracking systems
  - Integrated 0x Swap API for trade execution

- **Samuele** - Frontend & Authentication Lead

  - Built responsive user interface
  - Implemented Privy integration for secure wallet authentication
  - Designed user experience flows
  - Created interactive dashboard components

- **Marco** - AI & Secure Storage Lead

  - Developed LangChain implementation for signal generation
  - Created AI models for data analysis
  - Integrated Nillion Secret Vault for secure signal storage
  - Designed AI agent interfaces

- **Christian** - Data Visualization & Price Feed Lead

  - Implemented price feed integrations
  - Created interactive price visualization components
  - Developed real-time data displays
  - Built market trend analysis tools

- **Paolo** - Project Lead
  - Designed the product with the team
  - Did market analysis
  - Coded along with the team to provide support where needed

### Team Reflection

Our team's experience during the hackathon was transformative. While in Denver, we made a significant pivot from our original concept after receiving valuable feedback from the Monad foundation, partners, and investors. Being physically present in Denver proved crucial for our project's evolution, as it allowed us to rapidly iterate based on direct stakeholder input.

One of our biggest challenges was scope management. Initially, we were ambitious with our feature set, but through mentorship and testing, we learned to prioritize a focused, testable MVP. This shift in approach allowed us to deliver a more refined product that could be easily validated by users.

The diverse technical backgrounds of our team members enabled us to tackle complex challenges across multiple domains—from AI implementation to blockchain integration and frontend development. This cross-functional collaboration was essential for creating a cohesive product that addresses real user needs.

Key takeaways from our hackathon experience include:

- The importance of in-person collaboration for rapid iteration
- The value of direct feedback from ecosystem stakeholders
- The necessity of reducing scope to focus on core value propositions
- The power of bringing together diverse technical expertise

We leave this hackathon with not just a product, but with stronger technical skills, deeper ecosystem connections, and a clearer vision for how Gorillionaire can contribute to the Monad ecosystem.

## 11. User Experience

We put strong emphasis on delivering an intuitive and accessible user experience with **Gorillionaire**, ensuring users of all backgrounds — from DeFi veterans to first-time traders — can navigate and use the platform effortlessly. The interface is fully responsive and adheres to accessibility standards to accommodate users with diverse needs.
To discover more check: [frontend README](./frontend/README.md)

## 12. Bounties Extra Info

### 0x

Full Integration with 0x Swap API
Our application integrates the 0x Swap API for both pricing and transaction submission. The backend uses the 0x API to fetch the best swap price for a given token pair and trade type (buy/sell). Once a quote is obtained via the https://api.0x.org/swap/permit2/quote endpoint, it contains a fully-built transaction payload, including calldata to execute the swap on-chain. This transaction object is saved to the database, allowing us to track intents and execute/cross-check trades.

Demonstrated Transaction Submission (not just pricing)
We go beyond simple pricing: each quote obtained includes a valid transaction object (res.transaction) which users can submit directly to the blockchain. The full quote and transaction intent are stored and linked to a specific user, forming the core of our points-based reward system.

How It Works
A user selects a trade signal (buy/sell a token). Our backend fetches a quote via the 0x API, builds the transaction using the quote endpoint. The transaction data is returned and also saved with intent metadata. Users can sign and submit this transaction via the frontend.

Code Reference
Relevant code can be found here: https://github.com/gorilli-team/gorillionaire/blob/main/app/backend/src/routes/trade/0x.js

Key functions:
getQuote() → integrates with 0x.org/swap/permit2/quote, builds the transaction.
getPrice() → uses 0x.org/swap/permit2/price for comparison only.
Intent model → stores each transaction intent including calldata, token details, price, and user address.

Tx sent using 0x intent: https://testnet.monadexplorer.com/tx/0x4b35bf8365453ec11865bb29822e9478b3fc25161bfffa7a7a737cc3634d2a56?tab=Overview

Requirements Checklist

- Uses 0x Swap API ✅ Yes
- Uses actual transaction (not only pricing) ✅ Yes
- Transaction data saved & linked to user ✅ Yes
- Project is technically sound & production-ready ✅ Yes

#### Additional Notes

The integration leverages the Permit2 flow on Monad using 0x's latest endpoint. We use real-time price oracles and slippage-aware quoting to ensure accuracy. The backend is easily extendable to include trade execution or signature relays if needed.

<br>

### Envio

HyperIndex Usage:
The Gorillionaire Indexer leverages Envio HyperIndex to track on-chain events on the Monad Testnet blockchain. The indexing system tracks event processing, token transfer analysis, and triggers notifications to users.

Monad On-Chain Data Focus
Our system is entirely focused on Monad on-chain data, monitoring token transfers and listings specifically from the Monad blockchain. The indexer handles custom types such as Chog_Transfer, Molandak_Transfer, Moyaki_Transfer, and TokenListed on Uniswap.

This indexer is integrated with a live backend and deployed dashboard, delivering trading insights via a Telegram alert system and API endpoint.

Additional Notes:
Real-time notifications via Telegram bot integration.
Spike detection algorithm identifies sudden increases in transfer activity.
Whale transfers are highlighted and posted both to our backend and Telegram in real time to users.
To check how we integrated it, refer to:

- https://github.com/gorilli-team/gorillionaire/blob/main/envio-indexer/src/EventHandlers.ts
- https://github.com/gorilli-team/gorillionaire/blob/main/envio-indexer/src/FactoryHandlers.ts

Config file:

- https://github.com/gorilli-team/gorillionaire/blob/main/envio-indexer/config.yaml

Check README:

- https://github.com/gorilli-team/gorillionaire/blob/main/envio-indexer/README.md

<br>

### Nillion

We integrated SecretVault in our Monad AI agent system to store encrypted signals. (Schema Id: e6864651-902e-4fdc-98e5-50149fcec5a4). The integration ensures that sensitive data, such as the signal text and events are securely encrypted and distributed across multiple nilDB nodes. The only field left unencrypted is created_at, as it does not contain private information.

- Privacy Preservation:
  Our approach guarantees thoughtful privacy preservation. All user-generated signal data is encrypted before being stored. Furthermore, NFT-based access control ensures that only authorized users (NFT holders) can retrieve and decrypt this information. This mechanism creates a secure and decentralized permission layer over the encrypted data.

- SecretVault Collection Created with Encrypted Fields:
  We successfully created a SecretVault collection based on the "Gorillionaire - Generated Signals" schema, where both signal_text and events fields are encrypted using SecretVault's %share format.

- Secure Storage Implementation:
  Data is encrypted and stored across three separate nilDB nodes, ensuring distribution and confidentiality by design.

- Automatic Polling and Updates:
  Our system fetches new signals from MongoDB every 30 minutes, encrypts them, and updates the SecretVault collection automatically, ensuring real-time data protection.

<br>

### Privy

- Wallet-based authentication: Users can easily access the platform via Privy's onboarding flow, with support for Web3 wallets, email, Google, Apple, Discord, and Twitter.
- Embedded wallets: For users without a wallet, Privy allows for embedded wallet generation, lowering the entry barrier.
- Custom authentication flow: Auth setup is handled via the Privy Dashboard, where login preferences and wallet behavior were configured.
- Backend authentication: All authenticated user actions to our backend API are protected using Privy-issued tokens (used as Bearer tokens in API calls).
- User management & persistence: The backend securely stores and updates the Privy authentication tokens, ensuring secure and persistent access handling.

Check FRONTEND README:
- https://github.com/gorilli-team/gorillionaire/blob/main/frontend/README.md

<br>

## 12. License

The project has been developed for the Monad EVM/ACCATHON. All the files are licensed under the [MIT License](./LICENSE). We reserve the rights to change the license for further production deployment of the entire project.
