import { NextRequest, NextResponse } from 'next/server';
import { Aptos, AptosConfig, Network, Ed25519PrivateKey, Account } from '@aptos-labs/ts-sdk';

const config = new AptosConfig({ network: Network.TESTNET });
const aptos = new Aptos(config);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userAddress, amount, transactionHash } = body;

    // Validate input
    if (!userAddress || !amount || !transactionHash) {
      return NextResponse.json(
        { error: 'Missing required fields: userAddress, amount, transactionHash' },
        { status: 400 }
      );
    }

    // Validate amount
    const depositAmount = parseFloat(amount);
    if (depositAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid deposit amount' },
        { status: 400 }
      );
    }

    console.log('💰 PROCESSING DEPOSIT:');
    console.log('├── User Address:', userAddress);
    console.log('├── Amount:', depositAmount, 'APT');
    console.log('├── Transaction Hash:', transactionHash);
    console.log('└── Processing...');

    // Verify the transaction exists and is successful
    try {
      const transaction = await aptos.getTransactionByHash({
        transactionHash: transactionHash,
      });

      if (!transaction.success) {
        return NextResponse.json(
          { error: 'Transaction failed or not found' },
          { status: 400 }
        );
      }

      // Verify transaction is a transfer to treasury
      const treasuryAddress = process.env.NEXT_PUBLIC_CASINO_MODULE_ADDRESS!;
      
      // Check if transaction involves treasury address
      let isValidTransfer = false;
      if (transaction.payload && transaction.payload.type === 'entry_function_payload') {
        const payload = transaction.payload as any;
        if (payload.function === '0x1::aptos_account::transfer' || 
            payload.function === '0x1::coin::transfer') {
          // Check if recipient is treasury
          const recipient = payload.arguments?.[0];
          if (recipient === treasuryAddress) {
            isValidTransfer = true;
          }
        }
      }

      if (!isValidTransfer) {
        return NextResponse.json(
          { error: 'Invalid transaction: not a transfer to treasury' },
          { status: 400 }
        );
      }

    } catch (error) {
      console.error('Transaction verification failed:', error);
      return NextResponse.json(
        { error: 'Failed to verify transaction' },
        { status: 400 }
      );
    }

    // Create treasury account from private key
    const privateKey = new Ed25519PrivateKey(process.env.TREASURY_PRIVATE_KEY!);
    const treasuryAccount = Account.fromPrivateKey({ privateKey });

    // Convert amount to octas (APT uses 8 decimal places)
    const amountOctas = Math.floor(depositAmount * 100000000);

    // Update user balance in contract
    const transaction = await aptos.transaction.build.simple({
      sender: treasuryAccount.accountAddress,
      data: {
        function: `${process.env.NEXT_PUBLIC_CASINO_MODULE_ADDRESS}::user_balance::admin_deposit`,
        functionArguments: [
          userAddress, // user_address
          amountOctas, // amount in octas
        ],
      },
      options: {
        maxGasAmount: 10000,
        gasUnitPrice: 100,
      },
    });

    const committedTxn = await aptos.signAndSubmitTransaction({
      signer: treasuryAccount,
      transaction,
    });

    // Wait for transaction confirmation
    const executedTransaction = await aptos.waitForTransaction({
      transactionHash: committedTxn.hash,
    });

    console.log('✅ DEPOSIT PROCESSED:');
    console.log('├── User:', userAddress);
    console.log('├── Amount:', depositAmount, 'APT');
    console.log('├── Balance Update TX:', committedTxn.hash);
    console.log('├── Gas Used:', executedTransaction.gas_used);
    console.log('└── Success!');

    return NextResponse.json({
      success: true,
      message: 'Deposit processed successfully',
      userAddress,
      amount: depositAmount,
      transactionHash: committedTxn.hash,
      explorerUrl: `https://explorer.aptoslabs.com/txn/${committedTxn.hash}?network=testnet`,
    });

  } catch (error) {
    console.error('❌ DEPOSIT FAILED:', error);
    return NextResponse.json(
      { error: 'Failed to process deposit' },
      { status: 500 }
    );
  }
}