const fcl = require('@onflow/fcl');
const fetch = require('node-fetch');
const t = require('@onflow/types');
const config = require('./config.json');

async function getSwapPairInfo(pairAddr) {
  fcl
    .config()
    .put("accessNode.api", config.accessNode)

  const fclArgs = fcl.args([
    fcl.arg(pairAddr, t.Address)
  ]);
  const response = await fcl.send([
    fcl.script`
      import SwapInterfaces from 0xb78ef7afa52ff906
      import SwapConfig from 0xb78ef7afa52ff906

      pub fun main(pairAddr: Address): [AnyStruct] {
        let pairPublicRef = getAccount(pairAddr)
          .getCapability<&{SwapInterfaces.PairPublic}>(SwapConfig.PairPublicPath)
          .borrow()
          ?? panic("cannot borrow reference to PairPublic resource")

        return pairPublicRef.getPairInfo()
      }
    `,
    fclArgs
  ]);
  return await fcl.decode(response);
}

async function getQuoteToFlowPriceFromDex(pairAddr) {
  let info = await getSwapPairInfo(pairAddr)
  let numFlow = 0.0
  let numQuote = 0.0
  if (info[0].includes('Flow')) {
    numFlow = parseFloat(info[2])
    numQuote = parseFloat(info[3])
  } else if (info[1].includes('Flow')) {
    numFlow = parseFloat(info[3])
    numQuote = parseFloat(info[2])
  } else {
    throw(`not pair with flow`)
  }
  // 1 quote token = xx flow
  return numFlow / numQuote
}

async function main() {
  // 1 quote = ?? flow
  let priceQuote2Flow = await getQuoteToFlowPriceFromDex(config.quotePairAddr)
  // 1 usdc = ?? flow
  let priceUsdc2Flow = await getQuoteToFlowPriceFromDex(config.pairs.flowUsdcPairAddr)
  // 1 quote token = ?? usd, precise to 6 decimals.
  let quote2Usd = (priceQuote2Flow / priceUsdc2Flow).toFixed(6)

  console.log(`Quoted SwapPair: https://app.increment.fi/info/${config.quotePairAddr}, 1 quoted token = $ ${quote2Usd}`)
}

main()
