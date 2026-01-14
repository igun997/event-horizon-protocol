import { useState, useCallback } from 'react';
import { usePublicClient, useWalletClient, useChainId, useReadContract } from 'wagmi';
import { encodeFunctionData, keccak256, encodeAbiParameters, parseAbiParameters, type Hex, type Address } from 'viem';
import { useSmartAccount } from './useSmartAccount';
import { useContractAddresses } from './useContractAddresses';
import { TalismanAccountABI, EntryPointABI } from '../constants/abis';

// UserOperation type matching ERC-4337
export interface UserOperation {
  sender: Address;
  nonce: bigint;
  initCode: Hex;
  callData: Hex;
  callGasLimit: bigint;
  verificationGasLimit: bigint;
  preVerificationGas: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  paymasterAndData: Hex;
  signature: Hex;
}

// Pack UserOperation for hashing (excluding signature)
function packUserOp(userOp: UserOperation): Hex {
  return encodeAbiParameters(
    parseAbiParameters('address, uint256, bytes32, bytes32, uint256, uint256, uint256, uint256, uint256, bytes32'),
    [
      userOp.sender,
      userOp.nonce,
      keccak256(userOp.initCode),
      keccak256(userOp.callData),
      userOp.callGasLimit,
      userOp.verificationGasLimit,
      userOp.preVerificationGas,
      userOp.maxFeePerGas,
      userOp.maxPriorityFeePerGas,
      keccak256(userOp.paymasterAndData),
    ]
  );
}

// Calculate UserOperation hash
function getUserOpHash(userOp: UserOperation, entryPointAddress: Address, chainId: number): Hex {
  const packed = packUserOp(userOp);
  const encoded = encodeAbiParameters(
    parseAbiParameters('bytes32, address, uint256'),
    [keccak256(packed), entryPointAddress, BigInt(chainId)]
  );
  return keccak256(encoded);
}

export function useUserOperation() {
  const { accountAddress, hasAccount } = useSmartAccount();
  const { entryPointAddress, paymasterAddress } = useContractAddresses();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();

  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [txHash, setTxHash] = useState<Hex | null>(null);

  // Get nonce from EntryPoint
  const { data: nonce, refetch: refetchNonce } = useReadContract({
    address: entryPointAddress,
    abi: EntryPointABI,
    functionName: 'getNonce',
    args: accountAddress ? [accountAddress, 0n] : undefined,
    query: { enabled: !!accountAddress },
  });

  // Build UserOperation
  const buildUserOp = useCallback(async (
    callData: Hex,
    usePaymaster: boolean = true
  ): Promise<UserOperation> => {
    if (!accountAddress) throw new Error('No smart account');
    if (!publicClient) throw new Error('No public client');

    // Get current gas price
    const gasPrice = await publicClient.getGasPrice();

    // Build the UserOperation
    const userOp: UserOperation = {
      sender: accountAddress,
      nonce: nonce ?? 0n,
      initCode: '0x', // Account already created
      callData,
      callGasLimit: 500000n, // Generous gas limit for game operations
      verificationGasLimit: 150000n,
      preVerificationGas: 50000n,
      maxFeePerGas: gasPrice * 2n, // 2x current gas price for buffer
      maxPriorityFeePerGas: gasPrice / 10n,
      paymasterAndData: usePaymaster ? paymasterAddress : '0x',
      signature: '0x', // Will be filled after signing
    };

    return userOp;
  }, [accountAddress, nonce, publicClient, paymasterAddress]);

  // Sign UserOperation
  const signUserOp = useCallback(async (userOp: UserOperation): Promise<Hex> => {
    if (!walletClient) throw new Error('No wallet client');
    if (!entryPointAddress) throw new Error('No entry point address');

    const userOpHash = getUserOpHash(userOp, entryPointAddress, chainId);

    // Sign with personal_sign (eth_sign style) - this adds the "\x19Ethereum Signed Message:\n32" prefix
    const signature = await walletClient.signMessage({
      message: { raw: userOpHash },
    });

    return signature;
  }, [walletClient, entryPointAddress, chainId]);

  // Submit UserOperation to EntryPoint
  const submitUserOp = useCallback(async (userOp: UserOperation): Promise<Hex> => {
    if (!walletClient) throw new Error('No wallet client');
    if (!entryPointAddress) throw new Error('No entry point address');

    // Self-bundling: submit directly to EntryPoint.handleOps
    const hash = await walletClient.writeContract({
      address: entryPointAddress,
      abi: EntryPointABI,
      functionName: 'handleOps',
      args: [[userOp], walletClient.account.address],
    });

    return hash;
  }, [walletClient, entryPointAddress]);

  // High-level execute function - builds, signs, and submits UserOp
  const executeViaAccount = useCallback(async (
    target: Address,
    value: bigint,
    data: Hex,
    usePaymaster: boolean = true
  ): Promise<Hex> => {
    if (!hasAccount) throw new Error('Smart account not created');

    setIsPending(true);
    setIsSuccess(false);
    setError(null);
    setTxHash(null);

    try {
      // Encode the execute call for the smart account
      const callData = encodeFunctionData({
        abi: TalismanAccountABI,
        functionName: 'execute',
        args: [target, value, data],
      });

      // Build UserOperation
      const userOp = await buildUserOp(callData, usePaymaster);

      // Sign UserOperation
      userOp.signature = await signUserOp(userOp);

      // Submit to EntryPoint
      const hash = await submitUserOp(userOp);

      setTxHash(hash);
      setIsSuccess(true);

      // Refetch nonce for next operation
      await refetchNonce();

      return hash;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    } finally {
      setIsPending(false);
    }
  }, [hasAccount, buildUserOp, signUserOp, submitUserOp, refetchNonce]);

  // Execute batch of operations
  const executeBatchViaAccount = useCallback(async (
    targets: Address[],
    values: bigint[],
    datas: Hex[],
    usePaymaster: boolean = true
  ): Promise<Hex> => {
    if (!hasAccount) throw new Error('Smart account not created');

    setIsPending(true);
    setIsSuccess(false);
    setError(null);
    setTxHash(null);

    try {
      // Encode the executeBatch call for the smart account
      const callData = encodeFunctionData({
        abi: TalismanAccountABI,
        functionName: 'executeBatch',
        args: [targets, values, datas],
      });

      // Build UserOperation
      const userOp = await buildUserOp(callData, usePaymaster);

      // Sign UserOperation
      userOp.signature = await signUserOp(userOp);

      // Submit to EntryPoint
      const hash = await submitUserOp(userOp);

      setTxHash(hash);
      setIsSuccess(true);

      // Refetch nonce for next operation
      await refetchNonce();

      return hash;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    } finally {
      setIsPending(false);
    }
  }, [hasAccount, buildUserOp, signUserOp, submitUserOp, refetchNonce]);

  // Reset state
  const reset = useCallback(() => {
    setIsPending(false);
    setIsSuccess(false);
    setError(null);
    setTxHash(null);
  }, []);

  return {
    // Execute single operation
    executeViaAccount,
    // Execute batch of operations
    executeBatchViaAccount,
    // Low-level functions
    buildUserOp,
    signUserOp,
    submitUserOp,
    // State
    isPending,
    isSuccess,
    error,
    txHash,
    reset,
    // Nonce
    nonce,
    refetchNonce,
  };
}
