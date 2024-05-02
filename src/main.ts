import { readContract, reconnect, watchAccount } from "@wagmi/core/actions";
import { createWeb3Modal, defaultWagmiConfig } from "@web3modal/wagmi";

import { arbitrum, mainnet } from "viem/chains";
// 1. Get a project ID at https://cloud.walletconnect.com
const projectId = "DMEO";
const ERC_721S = ["0x00000000000000000000"];

// 2. Create wagmiConfig
const metadata = {
  name: "Project Name",
  description: "",
  url: "https://example.com", // origin must match your domain & subdomain.
  icons: [],
};

const chains = [mainnet, arbitrum] as const;
export const config = defaultWagmiConfig({
  chains,
  projectId,
  metadata,
});
reconnect(config);

createWeb3Modal({
  wagmiConfig: config,
  projectId,
  enableAnalytics: true, // Optional - defaults to your Cloud configuration
  enableOnramp: false, // Optional - false as default
});

let isOwner = false;
let isCheckingOwnership = false;
watchAccount(config, {
  async onChange(account) {
    if (!account.address) return;
    if (isCheckingOwnership) return;
    isCheckingOwnership = true;
    const hasAccess = Boolean(
      window.sessionStorage.getItem(`token-gated-access-${account.address}`)
    );

    for (const ERC_721 of ERC_721S) {
      console.log(`Checking ${ERC_721} for ${account.address}`);

      if (isOwner || hasAccess) continue;
      const value = await readContract(config, {
        // @ts-ignore
        address: ERC_721,
        abi: [
          {
            type: "function",
            name: "balanceOf",
            stateMutability: "view",
            inputs: [{ name: "account", type: "address" }],
            outputs: [{ type: "uint256" }],
          },
        ],
        functionName: "balanceOf",
        args: [account.address],
      });

      const balance = Number(value);
      if (balance > 0) isOwner = true;
    }

    // all element with data-gated-content
    if (isOwner || hasAccess) {
      // @ts-ignore
      let currentUrl = new URL(window.location);
      currentUrl.searchParams.set("wallet", account.address);
      window.history.replaceState({}, "", currentUrl.toString());
      window.sessionStorage.setItem(
        `token-gated-access-${account.address}`,
        "1"
      );

      document.querySelectorAll("[data-gated-content]").forEach((el) => {
        el.removeAttribute("data-gated-content");
      });

      document.querySelectorAll("[data-gated-connect]").forEach((el) => {
        el.setAttribute("data-gated-content", "1");
      });
    } else {
      console.log("Your wallet does not have access to this content.");
    }
  },
});
