type Provider = "draftkings" | "fanduel";
type Tool = { name: string; status: string; help: string; url: string };

// Stable sample statuses for the demo, not values read from sportsbook accounts.
const tools: Record<Provider, { name: string; items: Tool[] }> = {
  draftkings: {
    name: "DraftKings",
    items: [
      { name: "Cool-off", status: "Not active", help: "Take a temporary break. Open the Responsible Gaming Center to review available periods and set one up.", url: "https://help.draftkings.com/hc/en-us/articles/4406388173971-How-do-I-temporarily-limit-my-access-to-DraftKings-with-a-cool-off-period-US" },
      { name: "Self-exclusion", status: "Not active", help: "Explore a longer restriction. Review the scope, duration, and return conditions before confirming with DraftKings.", url: "https://help.draftkings.com/hc/en-us/articles/4405232298003-DraftKings-Self-Exclusion-Overview-US" },
      { name: "Player limits", status: "Set", help: "Review deposit, wager, and time-limit options, and manage the limits available for your account.", url: "https://help.draftkings.com/hc/en-us/articles/4406237505939-DraftKings-Player-Limits-Overview-US" }
    ]
  },
  fanduel: {
    name: "FanDuel",
    items: [
      { name: "Timeout", status: "Active", help: "Explore a temporary break through FanDuel’s Responsible Gaming settings. Check the terms and available periods in your account.", url: "https://www.fanduel.com/responsible" },
      { name: "Self-exclusion", status: "Not active", help: "Review FanDuel’s self-exclusion guidance, then follow the account or state-specific setup process.", url: "https://www.fanduel.com/about/news/problem-gambling-support-and-resources" },
      { name: "Player limits", status: "Not set", help: "Learn about deposit, wager, maximum wager size, and loss limits. Open your account’s Responsible Gaming settings to manage them.", url: "https://www.fanduel.com/about/customer-commitment/player-empowerment" }
    ]
  }
};

export function TakeABreak({ providers }: { providers: Provider[] }) {
  return <details className="panel take-a-break" open>
    <summary>Take a break</summary>
    <p>Tools and setup help for your connected demo accounts.</p>
    <p className="break-demo-note"><strong>Sample statuses only.</strong> These examples are not read from your accounts and do not confirm any real restriction. Links open official guidance; changes must be completed with the provider. Options depend on your product and location.</p>
    {!providers.length && <p>Connect a demo account to see its tools.</p>}
    <div className="break-provider-grid">{providers.map(provider => <article className="break-provider" key={provider}>
      <h3>{tools[provider].name}</h3>
      {tools[provider].items.map(tool => <div className="break-tool" key={tool.name}>
        <div className="break-tool-heading"><h4>{tool.name}</h4><span className="break-status">Demo: {tool.status}</span></div>
        <p>{tool.help}</p><a href={tool.url} target="_blank" rel="noopener noreferrer">View {tools[provider].name} setup help ↗</a>
      </div>)}
    </article>)}</div>
    <article className="break-device"><div className="break-tool-heading"><h3>BetBlocker · Device blocking</h3><span className="break-status">Demo: Not set up</span></div><p>A separate device tool for blocking gambling sites and apps. It is not an account setting in DraftKings or FanDuel. Install and configure it on the devices you use; Jelly cannot read its status. Opening this link does not activate blocking.</p><a href="https://betblocker.org/" target="_blank" rel="noopener noreferrer">View BetBlocker setup and help ↗</a></article>
  </details>;
}
