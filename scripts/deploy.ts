import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  if (!deployer) {
    throw new Error("No accounts found. Please make sure you have set PRIVATE_KEY in your .env file.");
  }

  console.log("Deploying Wrapper contracts with the account:", deployer.address);

  const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
  const ERC7984ERC20WrapperExample = await ethers.getContractFactory("ERC7984ERC20WrapperExample");

  // Deploy Public ETH (Mock)
  const pubEth = await ERC20Mock.deploy(
    "Public ETH", 
    "ETH", 
    deployer.address, 
    ethers.parseUnits("1000", 18) // 1000 ETH
  );
  await pubEth.waitForDeployment();
  const pubEthAddress = await pubEth.getAddress();
  console.log("Public ETH deployed to:", pubEthAddress);

  // Deploy Confidential ETH Wrapper
  const cEth = await ERC7984ERC20WrapperExample.deploy(
    pubEthAddress,
    "Confidential ETH",
    "cETH",
    "https://riser.app/ceth"
  );
  await cEth.waitForDeployment();
  const cEthAddress = await cEth.getAddress();
  console.log("cETH Wrapper deployed to:", cEthAddress);

  // Deploy Public USDT (Mock)
  const pubUsdt = await ERC20Mock.deploy(
    "Public USDT", 
    "USDT", 
    deployer.address, 
    ethers.parseUnits("5000", 18) // 5000 USDT
  );
  await pubUsdt.waitForDeployment();
  const pubUsdtAddress = await pubUsdt.getAddress();
  console.log("Public USDT deployed to:", pubUsdtAddress);

  // Deploy Confidential USDT Wrapper
  const cUsdt = await ERC7984ERC20WrapperExample.deploy(
    pubUsdtAddress,
    "Confidential USDT",
    "cUSDT",
    "https://riser.app/cusdt"
  );
  await cUsdt.waitForDeployment();
  const cUsdtAddress = await cUsdt.getAddress();
  console.log("cUSDT Wrapper deployed to:", cUsdtAddress);

  // Update App.tsx with the new addresses
  const fs = require('fs');
  const appTsxPath = __dirname + '/../frontend/src/App.tsx';
  let appTsx = fs.readFileSync(appTsxPath, 'utf8');
  
  // Replace the hardcoded addresses if they exist
  appTsx = appTsx.replace(
    /const ETH_CONTRACT_ADDRESS = '.*';/,
    `const ETH_CONTRACT_ADDRESS = '${cEthAddress}';`
  );
  appTsx = appTsx.replace(
    /const USDT_CONTRACT_ADDRESS = '.*';/,
    `const USDT_CONTRACT_ADDRESS = '${cUsdtAddress}';`
  );

  fs.writeFileSync(appTsxPath, appTsx);
  console.log("Updated App.tsx with new contract addresses!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
