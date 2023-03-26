const createImageUri = (svg) => {
    const baseImageUri = "data:image/svg+xml;base64,"
    // equivalent to `bytes(string(abi.encodePack(svg)))`
    const solidityEncodePacked = ethers.utils.solidityPack(["string"], [svg])
    // equivalent to `Base64.encode(bytes(string(abi.encodePacked(svg))))`
    const base64Encode = ethers.utils.base64.encode(solidityEncodePacked)
    // equivalente to `string(abi.encodePacked(baseURL, svgBase64Encoded))`
    const bytesImageUri = ethers.utils.solidityPack(
        ["string", "string"],
        [baseImageUri, base64Encode]
    )
    // equivalent to typecasting the result to string as shown in the contract:
    // `string(abi.encodePacked(baseURL, svgBase64Encoded))`
    const stringImageUri = ethers.utils.toUtf8String(bytesImageUri)
    return stringImageUri
}

const createTokenUri = (name, imageUri) => {
    const baseTokenUri = "data:application/json;base64,"
    const solidityEncodePacked = ethers.utils.solidityPack(
        ["string", "string", "string", "string", "string", "string"],
        [
            '{"name":"',
            name,
            '", "description":"An NFT that changes based on the Chainlink Feed", ',
            '"attributes": [{"trait_type": "coolness", "value": 100}], "image":"',
            imageUri,
            '"}',
        ]
    )
    const base64Encode = ethers.utils.base64.encode(solidityEncodePacked)
    const bytesTokenUri = ethers.utils.solidityPack(
        ["string", "string"],
        [baseTokenUri, base64Encode]
    )
    const stringTokenUri = ethers.utils.toUtf8String(bytesTokenUri)
    return stringTokenUri
}

module.exports = {
    createImageUri,
    createTokenUri,
}
