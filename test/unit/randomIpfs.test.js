// We are going to skimp a bit on these tests...

const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Random IPFS NFT Unit Tests", () => {
          let randomIpfsNft, deployer, vrfCoordinatorV2Mock, chainId, mintFee

          beforeEach(async () => {
              chainId = network.config.chainId
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              await deployments.fixture(["mocks", "randomipfs"])
              randomIpfsNft = await ethers.getContract("RandomIpfsNft")
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
              mintFee = await randomIpfsNft.getMintFee()
          })

          describe("constructor", () => {
              it("initialiazes the contract correctly", async () => {
                  const isInitialized = await randomIpfsNft.getInitialized()
                  assert.equal(isInitialized, true)
              })
              it("sets the mint fee correctly", async () => {
                  const fee = networkConfig[chainId]["mintFee"]
                  assert.equal(mintFee.toString(), fee)
              })
              it("sets the TokensUris correctly", async () => {
                  const pug = await randomIpfsNft.getDogTokenUris(0)
                  const shibaInu = await randomIpfsNft.getDogTokenUris(1)
                  const stBernard = await randomIpfsNft.getDogTokenUris(2)
                  assert.equal(pug, "ipfs://QmaVkBn2tKmjbhphU7eyztbvSQU5EXDdqRyXZtRhSGgJGo")
                  assert.equal(shibaInu, "ipfs://QmYQC5aGZu2PTH8XzbJrbDnvhj3gVs7ya33H9mqUNvST3d")
                  assert.equal(stBernard, "ipfs://QmZYmH5iDbD6v3U2ixoVAjioSzvWJszDzYdbeCLquGSpVm")
              })
              it("sets the owner correctly", async () => {
                  const owner = await randomIpfsNft.owner()
                  assert.equal(owner, deployer.address)
              })
              it("sets the name of the token correctly", async () => {
                  const name = await randomIpfsNft.name()
                  assert.equal(name, "Random IPFS NFT")
              })
              it("sets the symbol of the token correctly", async () => {
                  const symbol = await randomIpfsNft.symbol()
                  assert.equal(symbol, "RIN")
              })
          })

          describe("requestNft", () => {
              it("fails if payment isn't sent with the request", async () => {
                  await expect(randomIpfsNft.requestNft()).to.be.revertedWith(
                      "RandomIpfsNft__NeedMoreETHSent"
                  )
              })
              it("reverts if payment amount is less than the mint fee", async () => {
                  const fee = await randomIpfsNft.getMintFee()
                  await expect(
                      randomIpfsNft.requestNft({
                          value: fee.sub(ethers.utils.parseEther("0.001")),
                      })
                  ).to.be.revertedWith("RandomIpfsNft__NeedMoreETHSent")
              })
              it("emits an event and kicks off a random word request", async () => {
                  const fee = await randomIpfsNft.getMintFee()
                  await expect(randomIpfsNft.requestNft({ value: fee.toString() }))
                      .to.emit(randomIpfsNft, "NftRequested")
                      .withArgs("1", deployer.address)
              })
          })
          describe("fulfillRandomWords", () => {
              it("mints NFT after random number is returned", async () => {
                  await new Promise(async (resolve, reject) => {
                      randomIpfsNft.once("NftMinted", async () => {
                          console.log("NFT minted")
                          try {
                              const tokenUri = await randomIpfsNft.tokenURI("0")
                              const tokenCounter = await randomIpfsNft.getTokenCounter()
                              assert.equal(tokenUri.toString().includes("ipfs://"), true)
                              assert.equal(tokenCounter.toString(), "1")
                              resolve()
                          } catch (e) {
                              console.log(e)
                              reject(e)
                          }
                      })
                      try {
                          console.log("Requesting NFT")
                          const fee = await randomIpfsNft.getMintFee()
                          const requestNftResponse = await randomIpfsNft.requestNft({
                              value: fee.toString(),
                          })
                          const requestNftReceipt = await requestNftResponse.wait(1)
                          console.log(
                              "Payment processed, requesting random word to the VRF Service, please wait..."
                          )
                          await vrfCoordinatorV2Mock.fulfillRandomWords(
                              requestNftReceipt.events[1].args.requestId,
                              randomIpfsNft.address
                          )
                      } catch (e) {
                          console.log(e)
                          reject(e)
                      }
                  })
              })
          })
          describe("getBreedFromModdedRng", () => {
              it("should return pug if moddedRng < 10", async () => {
                  const expectedValue = await randomIpfsNft.getBreedFromModdedRng(7)
                  assert.equal(0, expectedValue)
              })
              it("should return shiba-inu if moddedRng is between 10 - 39", async () => {
                  const expectedValue = await randomIpfsNft.getBreedFromModdedRng(21)
                  assert.equal(1, expectedValue)
              })
              it("should return st. bernard if moddedRng is between 40 - 99", async () => {
                  const expectedValue = await randomIpfsNft.getBreedFromModdedRng(77)
                  assert.equal(2, expectedValue)
              })
              it("should revert if moddedRng > 99", async () => {
                  await expect(randomIpfsNft.getBreedFromModdedRng(100)).to.be.revertedWith(
                      "RandomIpfsNft__RangeOutOfBounds"
                  )
              })
          })

          describe("withdraw", () => {
              let minterConnected
              beforeEach(async () => {
                  const accounts = await ethers.getSigners()
                  const minter = accounts[1]
                  minterConnected = randomIpfsNft.connect(minter)
                  const transactionResponse = await minterConnected.requestNft({
                      value: mintFee.toString(),
                  })
                  await transactionResponse.wait(1)
              })
              it("should allow to withdraw and update the balances of the owner and the contract", async () => {
                  const initialOwnerBalance = await ethers.provider.getBalance(deployer.address)
                  const initialContractBalance = await ethers.provider.getBalance(
                      randomIpfsNft.address
                  )
                  const transactionResponse = await randomIpfsNft.withdraw()
                  const transactionReceipt = await transactionResponse.wait(1)
                  const { effectiveGasPrice, gasUsed } = transactionReceipt
                  const gasCost = gasUsed.mul(effectiveGasPrice)
                  const endingOwnerBalance = await ethers.provider.getBalance(deployer.address)
                  const endingContractBalance = await ethers.provider.getBalance(
                      randomIpfsNft.address
                  )
                  assert.equal(endingContractBalance.toString(), "0")
                  assert.equal(
                      initialOwnerBalance.add(initialContractBalance).toString(),
                      endingOwnerBalance.add(gasCost).toString()
                  )
              })
              it("should revert if the caller is not the owner", async () => {
                  await expect(minterConnected.withdraw()).to.be.revertedWith(
                      "Ownable: caller is not the owner"
                  )
              })
          })
      })
