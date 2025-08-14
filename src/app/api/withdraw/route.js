import { NextResponse } from 'next/server';
import { AptosAccount, AptosClient, CoinClient } from 'aptos';

// Kasa cüzdan private key'i - environment variable'dan al
const TREASURY_PRIVATE_KEY = process.env.TREASURY_PRIVATE_KEY || "0x0e5070144da800e1528a09e39ee0f589a4feafb880968de6f0d5479f7258bd82";
const APTOS_NODE_URL = process.env.NEXT_PUBLIC_APTOS_NETWORK === 'mainnet' 
  ? 'https://fullnode.mainnet.aptoslabs.com/v1'
  : 'https://fullnode.testnet.aptoslabs.com/v1';

const client = new AptosClient(APTOS_NODE_URL);

export async function POST(request) {
  try {
    const { userAddress, amount } = await request.json();
    
    console.log('📥 Received withdrawal request:', { userAddress, amount, type: typeof userAddress });
    
    // Validate input
    if (!userAddress || !amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid parameters' },
        { status: 400 }
      );
    }

    if (!TREASURY_PRIVATE_KEY) {
      return NextResponse.json(
        { error: 'Treasury not configured' },
        { status: 500 }
      );
    }

    // Create treasury account from private key
    const treasuryAccount = new AptosAccount(
      new Uint8Array(Buffer.from(TREASURY_PRIVATE_KEY.slice(2), 'hex'))
    );
    
    const coinClient = new CoinClient(client);
    
    // Convert amount to octas (APT has 8 decimal places)
    const amountOctas = Math.floor(amount * 100000000);
    
    console.log(`🏦 Processing withdrawal: ${amount} APT to ${userAddress}`);
    console.log(`📍 Treasury: ${treasuryAccount.address().hex()}`);
    
    // Check treasury balance
    let treasuryBalance = 0;
    try {
      treasuryBalance = await coinClient.checkBalance(treasuryAccount);
      console.log(`💰 Treasury balance: ${treasuryBalance / 100000000} APT`);
    } catch (balanceError) {
      console.log('⚠️ Could not check treasury balance, proceeding with transfer attempt...');
      console.log('Balance error:', balanceError.message);
    }
    
    if (treasuryBalance > 0 && treasuryBalance < amountOctas) {
      return NextResponse.json(
        { error: `Insufficient treasury funds. Available: ${treasuryBalance / 100000000} APT, Requested: ${amount} APT` },
        { status: 400 }
      );
    }
    
    // Transfer APT from treasury to user
    // Convert userAddress to hex string if it's an object
    let formattedUserAddress;
    if (typeof userAddress === 'object' && userAddress.data) {
      // Convert Uint8Array-like object to hex string
      const bytes = Object.values(userAddress.data);
      formattedUserAddress = '0x' + bytes.map(b => b.toString(16).padStart(2, '0')).join('');
    } else if (typeof userAddress === 'string') {
      formattedUserAddress = userAddress.startsWith('0x') ? userAddress : `0x${userAddress}`;
    } else {
      throw new Error(`Invalid userAddress format: ${typeof userAddress}`);
    }
    
    console.log('🔧 Formatted user address:', formattedUserAddress);
    console.log('🔧 Treasury account:', treasuryAccount.address().hex());
    console.log('🔧 Amount in octas:', amountOctas);
    
    const txnHash = await coinClient.transfer(
      treasuryAccount,
      formattedUserAddress,
      amountOctas
    );
    
    // Wait for transaction confirmation
    await client.waitForTransaction(txnHash);
    
    console.log(`✅ Withdrawal successful: ${amount} APT to ${userAddress}, TX: ${txnHash}`);
    
    return NextResponse.json({
      success: true,
      transactionHash: txnHash,
      amount: amount,
      userAddress: userAddress,
      treasuryAddress: treasuryAccount.address().hex()
    });
    
  } catch (error) {
    console.error('Withdraw API error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return NextResponse.json(
      { error: 'Withdrawal failed: ' + error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to check treasury balance
export async function GET() {
  try {
    if (!TREASURY_PRIVATE_KEY) {
      return NextResponse.json(
        { error: 'Treasury not configured' },
        { status: 500 }
      );
    }

    const treasuryAccount = new AptosAccount(
      new Uint8Array(Buffer.from(TREASURY_PRIVATE_KEY.slice(2), 'hex'))
    );
    
    const coinClient = new CoinClient(client);
    
    try {
      const balance = await coinClient.checkBalance(treasuryAccount);
      
      return NextResponse.json({
        treasuryAddress: treasuryAccount.address().hex(),
        balance: balance / 100000000, // Convert to APT
        balanceOctas: balance.toString(),
        status: 'active'
      });
    } catch (balanceError) {
      return NextResponse.json({
        treasuryAddress: treasuryAccount.address().hex(),
        balance: 0,
        balanceOctas: '0',
        status: 'initializing',
        note: 'Treasury wallet is being initialized. Please wait a few minutes.'
      });
    }
    
  } catch (error) {
    console.error('Treasury balance check error:', error);
    return NextResponse.json(
      { error: 'Failed to check treasury balance: ' + error.message },
      { status: 500 }
    );
  }
}