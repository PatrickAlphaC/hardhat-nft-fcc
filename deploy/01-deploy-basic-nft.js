const { network } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")
const { verify } = require("../helper-functions")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    log("----------------------------------------------------")
    arguments = []
    const basicNft = await deploy("BasicNft", {
        from: deployer,
        args: arguments,
        log: true,
        waitConfirmations: network.config.waitConfirmations || 1,
    })

    // Verify the deployment
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...")
        await verify(basicNft.address, arguments)
    }
}

module.exports.tags = ["all", "basicnft", "main"]
