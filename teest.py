from cosmpy.aerial.client import LedgerClient, NetworkConfig

# connect to Fetch.ai network using default parameters
ledger_client = LedgerClient(NetworkConfig.fetch_ai_network_config())

alice: str = 'fetch12q5gw9l9d0yyq2th77x6pjsesczpsly8h5089x'
balances = ledger_client.query_bank_all_balances(alice)

# show all coin balances
for coin in balances:
    print(f'{coin.amount}{coin.denom}')
