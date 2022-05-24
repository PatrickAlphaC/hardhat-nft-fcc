// We are going to skimp a bit on these tests...

import { assert, expect } from "chai"
import { network, deployments, ethers }from "hardhat"
import { developmentChains, networkConfig} from "../../helper-hardhat-config"
import {BasicNft} from "../../typechain-types"

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Basic NFT Unit Tests", function () {
          let basicNft: BasicNft
          let deployer

          beforeEach(async () => {
              const accounts = await ethers.getSigners()
              deployer = accounts[0]
              await deployments.fixture(["mocks", "basicnft"])
              basicNft = await ethers.getContract("BasicNft")
          })

          it("Allows users to mint an NFT, and updates appropriately", async function () {
              const txResponse = await basicNft.mintNft()
              await txResponse.wait(1)
              const tokenURI = await basicNft.tokenURI(0)
              const tokenCounter = await basicNft.getTokenCounter()

              assert.equal(tokenCounter.toString(), "1")
              assert.equal(tokenURI, await basicNft.TOKEN_URI())
          })
      })
