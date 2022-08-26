// We are going to skimp a bit on these tests...

const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Random IPFS NFT Unit Tests", function () {
          let randomIpfsNft, deployer, vrfCoordinatorV2Mock, fee

          beforeEach(async () => {
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              await deployments.fixture(["mocks", "randomipfs"])
              randomIpfsNft = await ethers.getContract("RandomIpfsNft")
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
              fee = await randomIpfsNft.getMintFee()
          })

          describe("constructor", () => {
              it("sets starting values correctly", async function () {
                  const dogTokenUriZero = await randomIpfsNft.getDogTokenUris(0)
                  const isInitialized = await randomIpfsNft.getInitialized()
                  assert(dogTokenUriZero.includes("ipfs://"))
                  assert.equal(isInitialized, true)
              })
          })

          describe("requestNft", () => {
              it("fails if payment isn't sent with the request", async function () {
                  await expect(randomIpfsNft.requestNft()).to.be.revertedWith("NeedMoreETHSent")
              })
              it("emits an event and kicks off a random word request", async function () {
                  await expect(randomIpfsNft.requestNft({ value: fee })).to.emit(
                      randomIpfsNft,
                      "NftRequested"
                  )
              })
          })
          describe("fulfillRandomWords", () => {
              it("mints NFT after random number is returned", async function () {
                  await new Promise(async (resolve, reject) => {
                      randomIpfsNft.once("NftMinted", async () => {
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
                          const fee = await randomIpfsNft.getMintFee()
                          const requestNftResponse = await randomIpfsNft.requestNft({
                              value: fee.toString(),
                          })
                          const requestNftReceipt = await requestNftResponse.wait(1)
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

          describe("withdraw", () => {
              it("allows to withdraw money", async () => {
                  await randomIpfsNft.requestNft({ value: fee })
                  await randomIpfsNft.withdraw()
                  const balanceAfter = await randomIpfsNft.getBalance()

                  assert.equal(balanceAfter.toString(), "0")
              })
          })

          describe("getBreedFromModdedRng", () => {
              it("returns correct breed", async () => {
                  const breed = await randomIpfsNft.getBreedFromModdedRng(
                      ethers.BigNumber.from("7")
                  )
                  assert.equal(breed, 0)
              })

              it("reverts when failed", async () => {
                  await expect(
                      randomIpfsNft.getBreedFromModdedRng(ethers.BigNumber.from("1077777777777"))
                  ).to.be.revertedWith("RangeOutOfBounds")
              })
          })
      })
