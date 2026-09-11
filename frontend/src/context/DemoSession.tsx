import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createWalletClient, custom, getAddress, http, isAddress, zeroAddress, type EIP1193Provider } from 'viem'
import { auctionAbi, gateAbi, tokenAbi } from '../lib/abi'
import { requiredOrderFunds, sameAddress } from '../lib/amounts'
import { readSnapshot, readToken, type ChainSnapshot } from '../lib/chain'
import { chainFor, isLocalDeployment, loadDeployment, localAccountsFor, publicClientFor, type AuctionPublicClient } from '../lib/config'
import { readableError } from '../lib/errors'
import type { Address, DemoOrder, DeploymentConfig, Hash, Notice, OpenRoundInput, PendingTransaction } from '../types'
import { DemoSessionContext, type DemoSessionValue } from './DemoSessionContext'

const emptyOrder: DemoOrder = { side: 'BUY', price: '', quantity: '' }
type WalletConnection = { account: Address; chainId: number; mode: 'local' | 'injected' }

function injectedProvider(): EIP1193Provider | undefined {
  return (window as unknown as { ethereum?: EIP1193Provider }).ethereum
}

function makeWallet(config: DeploymentConfig, connection: WalletConnection) {
  const provider = injectedProvider()
  if (connection.mode === 'injected' && !provider) throw new Error('No browser wallet was found. Install an EVM-compatible wallet and retry.')
  if (connection.mode === 'local' && !isLocalDeployment(config)) throw new Error('Unlocked accounts are available only for a local development chain.')
  return createWalletClient({
    account: connection.account, chain: chainFor(config),
    transport: connection.mode === 'injected' ? custom(provider!) : http(config.rpcUrl, { retryCount: 0, timeout: 12_000 }),
  })
}

type AuctionWallet = ReturnType<typeof makeWallet>

export function DemoSessionProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<DeploymentConfig | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [snapshot, setSnapshot] = useState<ChainSnapshot | null>(null)
  const [connection, setConnection] = useState<WalletConnection | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [order, setOrder] = useState<DemoOrder>(emptyOrder)
  const [identityDialogOpen, setIdentityDialogOpen] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)
  const [pendingTx, setPendingTx] = useState<PendingTransaction | null>(null)
  const [lastTxHash, setLastTxHash] = useState<Hash | null>(null)
  const transactionLock = useRef(false)
  const connectedAddress = useRef<Address | null>(null)
  const selectedRoundId = useRef<string | null>(null)
  const refreshSequence = useRef(0)
  const receiptTimer = useRef<number | undefined>(undefined)
  const client = useMemo(() => config ? publicClientFor(config) : null, [config])
  const account = connection?.account ?? null

  const refresh = useCallback(async () => {
    if ((account?.toLowerCase() ?? null) !== (connectedAddress.current?.toLowerCase() ?? null) || selectedId !== selectedRoundId.current) return
    const sequence = ++refreshSequence.current
    setRefreshing(true)
    try {
      if (!config || !client) {
        const deployment = await loadDeployment()
        if (sequence === refreshSequence.current) setConfig(deployment)
        return
      }
      const next = await readSnapshot(client, config, account, selectedId)
      if (sequence !== refreshSequence.current) return
      setSnapshot(next)
      setError(null)
      setConnectionStatus('ready')
    } catch (cause) {
      if (sequence !== refreshSequence.current) return
      setError(readableError(cause))
      setConnectionStatus('error')
    } finally {
      if (sequence === refreshSequence.current) setRefreshing(false)
    }
  }, [config, client, account, selectedId])

  useEffect(() => {
    const first = window.setTimeout(() => void refresh(), 0)
    const polling = window.setInterval(() => { if (!document.hidden) void refresh() }, 15_000)
    const invalidate = () => { refreshSequence.current++ }
    return () => { window.clearTimeout(first); window.clearInterval(polling); invalidate() }
  }, [refresh, refreshVersion])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 7500)
    return () => window.clearTimeout(timer)
  }, [notice])

  useEffect(() => () => window.clearTimeout(receiptTimer.current), [])

  const invalidateAccount = useCallback((next: WalletConnection | null) => {
    refreshSequence.current++
    connectedAddress.current = next?.account ?? null
    setSnapshot(null)
    setConnectionStatus('loading')
    setConnection(next)
    setRefreshVersion((version) => version + 1)
    setIdentityDialogOpen(false)
  }, [])

  useEffect(() => {
    if (connection?.mode !== 'injected') return
    const provider = injectedProvider()
    if (!provider) return
    const changedAccounts = (accounts: string[]) => {
      invalidateAccount(accounts[0] && isAddress(accounts[0]) ? { ...connection, account: getAddress(accounts[0]) } : null)
    }
    const changedChain = (chain: string) => {
      const chainId = Number.parseInt(chain, 16)
      invalidateAccount({ ...connection, chainId })
      if (config && chainId !== config.chainId) setNotice({ title: 'Wallet network changed', body: `Select ${config.network} (chain ${config.chainId}) in your wallet to submit transactions.`, tone: 'danger' })
    }
    const disconnected = () => invalidateAccount(null)
    provider.on?.('accountsChanged', changedAccounts)
    provider.on?.('chainChanged', changedChain)
    provider.on?.('disconnect', disconnected)
    return () => {
      provider.removeListener?.('accountsChanged', changedAccounts)
      provider.removeListener?.('chainChanged', changedChain)
      provider.removeListener?.('disconnect', disconnected)
    }
  }, [connection, config, invalidateAccount])

  const connectWallet = async () => {
    try {
      if (!config) throw new Error('Wait for deployment configuration before connecting your wallet.')
      const provider = injectedProvider()
      if (!provider) throw new Error('No browser wallet was found. Open this app in an EVM-compatible wallet browser or install a browser wallet.')
      const accounts = await provider.request({ method: 'eth_requestAccounts' })
      if (!accounts[0]) throw new Error('No wallet account was selected.')
      const chainId = Number.parseInt(await provider.request({ method: 'eth_chainId' }), 16)
      invalidateAccount({ account: getAddress(accounts[0]), chainId, mode: 'injected' })
      if (chainId !== config.chainId) setNotice({ title: 'Switch wallet network', body: `Your wallet is on chain ${chainId}. Select ${config.network} (chain ${config.chainId}) before signing a transaction.`, tone: 'danger' })
    } catch (cause) { setNotice({ title: 'Wallet connection failed', body: readableError(cause), tone: 'danger' }) }
  }

  const connectLocalAccount = async (requested?: Address) => {
    try {
      if (!config || !client || !isLocalDeployment(config)) throw new Error('Local accounts require the development server and a loopback Anvil chain (31337).')
      if (await client.getChainId() !== 31337) throw new Error('The local RPC is not running chain 31337.')
      const available = await localAccountsFor(config)
      const selected = requested || available[0]
      if (!selected || !available.some((item) => sameAddress(item, selected))) throw new Error('This address is not an unlocked local account.')
      invalidateAccount({ account: getAddress(selected), chainId: 31337, mode: 'local' })
    } catch (cause) { setNotice({ title: 'Local connection failed', body: readableError(cause), tone: 'danger' }) }
  }

  const switchNetwork = async () => {
    try {
      const provider = injectedProvider()
      if (!config || !provider) throw new Error('Connect a browser wallet to switch its network.')
      const chainId = `0x${config.chainId.toString(16)}` as const
      try {
        await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId }] })
      } catch (cause) {
        if ((cause as { code?: number }).code !== 4902) throw cause
        const chain = chainFor(config)
        await provider.request({ method: 'wallet_addEthereumChain', params: [{ chainId, chainName: chain.name, nativeCurrency: chain.nativeCurrency, rpcUrls: [config.rpcUrl], ...(config.explorerUrl ? { blockExplorerUrls: [config.explorerUrl] } : {}) }] })
        await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId }] })
      }
      await connectWallet()
    } catch (cause) { setNotice({ title: 'Network switch failed', body: readableError(cause), tone: 'danger' }) }
  }

  const signer = async () => {
    if (!config || !client || connectionStatus !== 'ready') throw new Error('The blockchain connection is unavailable. Refresh before submitting a transaction.')
    if (!connection) { setIdentityDialogOpen(true); throw new Error('Connect a wallet before continuing.') }
    const wallet = makeWallet(config, connection)
    const [chainId, accounts] = await Promise.all([wallet.getChainId(), wallet.getAddresses()])
    if (chainId !== config.chainId) throw new Error(`Your wallet is on chain ${chainId}. Switch to ${config.network} (chain ${config.chainId}).`)
    if (!accounts.some((item) => sameAddress(item, connection.account))) throw new Error('The connected account is no longer available in your wallet. Reconnect and retry.')
    return { client, wallet, account: connection.account, config }
  }

  const runTransaction = async (label: string, action: (client: AuctionPublicClient, wallet: AuctionWallet, account: Address, config: DeploymentConfig) => Promise<Hash>): Promise<boolean> => {
    if (transactionLock.current) return false
    transactionLock.current = true
    setPendingTx({ label, stage: 'signature' })
    let submittedHash: Hash | null = null
    try {
      const session = await signer()
      submittedHash = await action(session.client, session.wallet, session.account, session.config)
      setLastTxHash(submittedHash)
      setPendingTx({ label, stage: 'confirming', hash: submittedHash })
      const receipt = await session.client.waitForTransactionReceipt({ hash: submittedHash, timeout: 90_000, retryCount: 1 })
      if (receipt.status !== 'success') throw new Error('The transaction reverted on-chain. No changes from that transaction were applied.')
      setNotice({ title: `${label} confirmed`, body: `Confirmed in block ${receipt.blockNumber}.`, tone: 'success' })
      await refresh()
      return true
    } catch (cause) {
      const message = readableError(cause)
      // A receipt timeout is not a failed transaction. Keep the action locked and
      // check the original hash instead of offering a second broadcast.
      if (submittedHash && /timed out|timeout|Cannot reach|not found/i.test(message) && client) {
        const hash = submittedHash
        const receiptClient = client
        setNotice({ title: 'Transaction submitted; confirmation pending', body: 'The network has not returned a receipt yet. The original transaction is still being checked.', tone: 'neutral' })
        const checkReceipt = async () => {
          try {
            const receipt = await receiptClient.getTransactionReceipt({ hash })
            if (receipt.status === 'success') setNotice({ title: `${label} confirmed`, body: `Confirmed in block ${receipt.blockNumber}.`, tone: 'success' })
            else setNotice({ title: `${label} reverted`, body: 'The transaction was included but reverted. No changes were applied.', tone: 'danger' })
            transactionLock.current = false
            receiptTimer.current = undefined
            setPendingTx(null)
            await refresh()
          } catch { receiptTimer.current = window.setTimeout(() => void checkReceipt(), 10_000) }
        }
        receiptTimer.current = window.setTimeout(() => void checkReceipt(), 10_000)
        return false
      }
      setNotice({ title: `${label} failed`, body: message, tone: 'danger' })
      return false
    } finally {
      if (!receiptTimer.current) {
        transactionLock.current = false
        setPendingTx(null)
      }
    }
  }

  const preflightOrder = async (rpc: AuctionPublicClient, address: Address, deployment: DeploymentConfig) => {
    const fresh = await readSnapshot(rpc, deployment, address, selectedId || snapshot?.selectedRound?.id || null)
    const round = fresh.selectedRound
    if (!round) throw new Error('No auction round is selected.')
    if (fresh.paused) throw new Error('The issuer has paused the auction engine.')
    if (round.phase !== 'open') throw new Error('This auction round is already closed.')
    if (fresh.chainTimestamp > round.deadline) throw new Error('The order deadline has passed.')
    if (fresh.eligibility !== true) throw new Error(fresh.eligibilityError || 'This wallet is not approved to trade this bond. Contact the issuer for registry access.')
    if (fresh.roundsTruncated) throw new Error('This wallet has a large auction history. Full outstanding-order coverage must be loaded before another order can be submitted.')
    const funds = requiredOrderFunds(order, round, fresh.rounds, address)
    const holding = fresh.tokens.find((token) => sameAddress(token.address, funds.token.address))
    if (!holding || holding.balanceRaw < funds.required) throw new Error(`Insufficient ${funds.token.symbol}. This order and your open orders require ${funds.requiredFormatted} ${funds.token.symbol}.`)
    return { round, funds, holding }
  }

  const approveOrder = async () => runTransaction('Token approval', async (rpc, wallet, address, deployment) => {
    const { funds, holding } = await preflightOrder(rpc, address, deployment)
    if (holding.allowanceRaw >= funds.required) throw new Error('Your existing approval already covers this order. Submit the order to continue.')
    const { request } = await rpc.simulateContract({ address: funds.token.address, abi: tokenAbi, functionName: 'approve', args: [deployment.contracts.auctionEngine, funds.required], account: address })
    return wallet.writeContract(request)
  })

  const submitOrder = async () => {
    const success = await runTransaction('Order submission', async (rpc, wallet, address, deployment) => {
      const { round, funds, holding } = await preflightOrder(rpc, address, deployment)
      if (holding.allowanceRaw < funds.required) throw new Error(`Approve at least ${funds.requiredFormatted} ${funds.token.symbol} before submitting this order.`)
      const { request } = await rpc.simulateContract({ address: deployment.contracts.auctionEngine, abi: auctionAbi, functionName: 'submitBid', args: [BigInt(round.id), funds.price, funds.quantity, funds.isBuy], account: address })
      return wallet.writeContract(request)
    })
    if (success && sameAddress(account, connectedAddress.current)) setOrder((current) => ({ ...current, quantity: '' }))
    return success
  }

  const closeRound = async (id?: string) => runTransaction('Round clearing', async (rpc, wallet, address, deployment) => {
    const roundId = id || snapshot?.selectedRound?.id
    if (!roundId || !/^\d+$/.test(roundId)) throw new Error('Choose an auction round to clear.')
    const { request } = await rpc.simulateContract({ address: deployment.contracts.auctionEngine, abi: auctionAbi, functionName: 'closeAndClear', args: [BigInt(roundId)], account: address })
    return wallet.writeContract(request)
  })

  const openRound = async (input: OpenRoundInput) => {
    const success = await runTransaction('New auction', async (rpc, wallet, address, deployment) => {
      if (!isAddress(input.bondToken) || !isAddress(input.settlementToken) || input.bondToken === zeroAddress || input.settlementToken === zeroAddress) throw new Error('Enter valid non-zero bond and settlement token addresses.')
      if (sameAddress(input.bondToken, input.settlementToken)) throw new Error('Bond and settlement token addresses must be different.')
      if (!Number.isSafeInteger(input.bidWindowSeconds) || input.bidWindowSeconds < 60 || input.bidWindowSeconds > 31_536_000) throw new Error('The auction window must be between 60 seconds and one year.')
      const [bond, gate] = await Promise.all([
        readToken(rpc, input.bondToken),
        rpc.readContract({ address: deployment.contracts.auctionEngine, abi: auctionAbi, functionName: 'complianceGate' }),
        readToken(rpc, input.settlementToken),
      ])
      if (bond.decimals !== 18) throw new Error('The auction engine requires an 18-decimal bond token.')
      const registry = await rpc.readContract({ address: gate, abi: gateAbi, functionName: 'identityRegistry', args: [input.bondToken] })
      if (registry === zeroAddress) throw new Error('Register an identity registry for this bond before opening its auction.')
      const { request } = await rpc.simulateContract({ address: deployment.contracts.auctionEngine, abi: auctionAbi, functionName: 'openRound', args: [input.bondToken, input.settlementToken, BigInt(input.bidWindowSeconds)], account: address })
      return wallet.writeContract(request)
    })
    if (success) { selectedRoundId.current = null; setSelectedId(null) }
    return success
  }

  const setPaused = async (value: boolean) => runTransaction(value ? 'Pause auctions' : 'Resume auctions', async (rpc, wallet, address, deployment) => {
    const { request } = await rpc.simulateContract({ address: deployment.contracts.auctionEngine, abi: auctionAbi, functionName: value ? 'pause' : 'unpause', account: address })
    return wallet.writeContract(request)
  })

  const selectedRound = snapshot?.selectedRound ?? null
  const bondHolding = snapshot?.tokens.find((token) => sameAddress(token.address, selectedRound?.bondToken))
  const settlementHolding = snapshot?.tokens.find((token) => sameAddress(token.address, selectedRound?.settlementToken))
  const value: DemoSessionValue = {
    config, connectionStatus, error, refreshing, account, walletChainId: connection?.chainId ?? null, walletMode: connection?.mode ?? null,
    localAccounts: snapshot?.localAccounts ?? [], rounds: snapshot?.rounds ?? [], selectedRound, bids: selectedRound?.bids ?? [],
    tokens: snapshot?.tokens ?? [], settlements: snapshot?.settlements ?? [], issuer: snapshot?.issuer ?? null,
    isIssuer: sameAddress(account, snapshot?.issuer), paused: snapshot?.paused ?? false, eligibility: snapshot?.eligibility ?? null,
    eligibilityError: snapshot?.eligibilityError ?? null,
    balances: account && bondHolding && settlementHolding ? { bond: bondHolding.balance, settlement: settlementHolding.balance, bondAllowance: bondHolding.allowance, settlementAllowance: settlementHolding.allowance } : null,
    pendingTx, lastTxHash, historyError: snapshot?.historyError ?? null, historyFromBlock: snapshot?.historyFromBlock ?? null,
    roundsTruncated: snapshot?.roundsTruncated ?? false, blockNumber: snapshot?.blockNumber ?? null, chainTimestamp: snapshot?.chainTimestamp ?? null,
    identity: account ? snapshot?.eligibility === true ? 'verified' : 'restricted' : 'guest', identityDialogOpen, notice,
    order,
    connectWallet, switchNetwork, connectLocalAccount, disconnect: () => invalidateAccount(null),
    selectRound: (id) => { if (!/^\d+$/.test(id)) return; refreshSequence.current++; selectedRoundId.current = id; setSelectedId(id); setSnapshot(null); setConnectionStatus('loading'); setRefreshVersion((version) => version + 1); setOrder(emptyOrder) },
    refresh, approveOrder, submitOrder, closeRound, openRound, setPaused,
    openIdentityDialog: () => setIdentityDialogOpen(true), closeIdentityDialog: () => setIdentityDialogOpen(false),
    updateOrder: (patch) => setOrder((current) => ({ ...current, ...patch })), setOrderSide: (side) => setOrder((current) => ({ ...current, side })),
    showNotice: setNotice, dismissNotice: () => setNotice(null),
  }

  return <DemoSessionContext.Provider value={value}>{children}</DemoSessionContext.Provider>
}
