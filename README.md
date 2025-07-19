# APT Casino - Fully On-Chain Casino on Aptos Blockchain

A fully on-chain casino replica of stake.com built on the Aptos blockchain, featuring three popular casino games: Roulette, Mines, and Spin Wheel. All games use on-chain randomness and are played exclusively with APT tokens.

## 🎮 Features

### Games
- **Roulette**: Classic roulette with multiple bet types (numbers, colors, odds/evens, etc.)
- **Mines**: Reveal tiles to find gems while avoiding mines
- **Spin Wheel**: Risk-based wheel spinning with different multiplier segments

### Blockchain Features
- **Aptos Integration**: Full Aptos blockchain integration
- **On-Chain Randomness**: All games use provably fair on-chain randomness
- **APT Token Support**: All games played exclusively with APT tokens
- **Multiple Wallet Support**: Petra, Martian, and other Aptos wallets
- **Mobile Friendly**: Responsive design for mobile and desktop

### Technical Features
- **Move Contracts**: Smart contracts written in Move language
- **Real-Time Updates**: Live game state and balance updates
- **Event System**: Comprehensive event tracking for all game actions
- **Security**: Provably fair gaming with on-chain verification

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Aptos CLI (for contract deployment)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd APT-Casino-Move
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_APTOS_NETWORK=testnet
NEXT_PUBLIC_CASINO_MODULE_ADDRESS=your_deployed_module_address
DEPLOYER_PRIVATE_KEY=your_deployer_private_key
```

4. **Deploy Move contracts**

First, compile the Move contracts:
```bash
cd move-contracts
aptos move compile
```

Deploy to testnet:
```bash
node scripts/deploy.js testnet
```

Deploy to mainnet:
```bash
node scripts/deploy.js mainnet
```

5. **Start the development server**
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## 🏗️ Architecture

### Frontend (Next.js)
- **Framework**: Next.js 15 with React 18
- **Styling**: Tailwind CSS with custom gradients
- **State Management**: React hooks and context
- **Wallet Integration**: Aptos wallet adapter
- **UI Components**: Custom casino-themed components

### Smart Contracts (Move)
- **Language**: Move
- **Framework**: Aptos Framework
- **Games**: Roulette, Mines, Wheel
- **Randomness**: On-chain SHA3-256 hashing
- **Events**: Comprehensive event system

### Key Components

```
src/
├── app/                    # Next.js app directory
│   ├── game/              # Game pages
│   │   ├── roulette/      # Roulette game
│   │   ├── mines/         # Mines game
│   │   └── wheel/         # Wheel game
│   └── providers.js       # App providers
├── components/            # React components
├── hooks/                # Custom hooks
├── lib/                  # Utilities and configurations
└── styles/               # Global styles

move-contracts/
├── sources/              # Move source files
│   ├── roulette.move     # Roulette game contract
│   ├── mines.move        # Mines game contract
│   └── wheel.move        # Wheel game contract
├── scripts/              # Deployment scripts
└── Move.toml            # Move package configuration
```

## 🎯 Game Mechanics

### Roulette
- **Bet Types**: Numbers (0-36), Colors (Red/Black), Odds/Evens, High/Low, Dozens, Columns, Split, Street, Corner, Line
- **Payouts**: 1:1 to 35:1 depending on bet type
- **Randomness**: On-chain SHA3-256 with timestamp and transaction data

### Mines
- **Grid**: 5x5 grid (25 tiles)
- **Mines**: 1-24 mines per game
- **Reveal**: Click tiles to reveal gems or mines
- **Multiplier**: Increases as you reveal more tiles safely
- **Cashout**: Collect winnings at any time

### Spin Wheel
- **Risk Levels**: Low, Medium, High
- **Segments**: 6-10 segments based on risk
- **Multipliers**: 1.2x to 10x depending on risk level
- **Instant Results**: Immediate win/loss determination

## 🔧 Development

### Frontend Development
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

### Contract Development
```bash
cd move-contracts

# Compile contracts
aptos move compile

# Run tests
aptos move test

# Deploy to testnet
node scripts/deploy.js testnet
```

### Environment Variables
```env
# Aptos Configuration
NEXT_PUBLIC_APTOS_NETWORK=testnet|mainnet
NEXT_PUBLIC_CASINO_MODULE_ADDRESS=your_module_address

# Deployment
DEPLOYER_PRIVATE_KEY=your_private_key

# Wallet Connect
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id
```

## 🚀 Deployment

### Vercel Deployment

1. **Connect to Vercel**
```bash
npm install -g vercel
vercel login
```

2. **Deploy**
```bash
vercel --prod
```

3. **Set Environment Variables**
In Vercel dashboard, set:
- `NEXT_PUBLIC_APTOS_NETWORK`
- `NEXT_PUBLIC_CASINO_MODULE_ADDRESS`

### Manual Deployment

1. **Build the application**
```bash
npm run build
```

2. **Deploy to your hosting provider**
Upload the `.next` folder and `public` folder to your hosting provider.

## 🔐 Security

### On-Chain Randomness
All games use on-chain randomness generated from:
- Block timestamp
- Transaction hash
- Player address
- Nonce values

### Provably Fair
- All game logic is on-chain
- Randomness is verifiable
- No server-side manipulation possible

### Smart Contract Security
- Reentrancy protection
- Input validation
- Proper error handling
- Event logging for transparency

## 📱 Mobile Support

The application is fully responsive and optimized for:
- **iOS Safari**: Full support
- **Android Chrome**: Full support
- **Mobile wallets**: Petra, Martian, etc.
- **Touch interactions**: Optimized for touch devices

## 🎨 Customization

### Styling
- **Theme**: Dark casino theme with purple/blue gradients
- **Colors**: Customizable in `src/styles/colors.css`
- **Components**: Modular component system

### Games
- **Adding Games**: Create new Move contracts and frontend components
- **Modifying Games**: Update contract logic and UI components
- **Configuration**: Game parameters in contract constants

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Documentation**: [Link to docs]
- **Issues**: [GitHub Issues]
- **Discord**: [Discord Server]
- **Telegram**: [Telegram Group]

## 🏆 Roadmap

- [ ] Additional games (Blackjack, Poker)
- [ ] Tournament system
- [ ] NFT integration
- [ ] Advanced betting features
- [ ] Mobile app
- [ ] Multi-language support

---

**Built with ❤️ on Aptos Blockchain**
