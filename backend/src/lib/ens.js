import { ethers } from 'ethers';

// Multiple Sepolia RPCs with fallback
const SEPOLIA_RPCS = [
  'https://ethereum-sepolia-rpc.publicnode.com',
  'https://sepolia.drpc.org',
  'https://rpc2.sepolia.org',
  'https://sepolia.gateway.tenderly.co',
];

async function getProvider() {
  for (const rpc of SEPOLIA_RPCS) {
    try {
      const provider = new ethers.JsonRpcProvider(rpc);
      // Test it with a quick call
      await Promise.race([
        provider.getBlockNumber(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
      ]);
      console.log(`[ENS] Using RPC: ${rpc}`);
      return provider;
    } catch {
      console.log(`[ENS] RPC failed, trying next: ${rpc}`);
    }
  }
  throw new Error('All Sepolia RPCs unavailable. Try again in a moment.');
}

export async function resolveENS(ensName) {
  try {
    const provider = await getProvider();
    const address = await provider.resolveName(ensName);
    console.log(`[ENS] ${ensName} → ${address}`);
    return address;
  } catch (err) {
    console.error(`[ENS] Failed to resolve ${ensName}:`, err.message);
    throw err;
  }
}

export async function resolveMultipleENS(names) {
  const provider = await getProvider();
  const results = await Promise.all(
    names.map(async (name) => {
      try {
        const address = await provider.resolveName(name);
        return [name, address];
      } catch {
        return [name, null];
      }
    })
  );
  return Object.fromEntries(results);
}

export async function lookupENS(address) {
  try {
    const provider = await getProvider();
    return await provider.lookupAddress(address);
  } catch {
    return null;
  }
}