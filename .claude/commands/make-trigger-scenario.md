Trigger a Make (Integromat) scenario by name or ID.

Ask the user which scenario to run if not specified in $ARGUMENTS. Use the `make` MCP server to:
1. Look up the scenario by name or ID
2. Trigger/run it
3. Report back the execution ID and status

If $ARGUMENTS is provided, treat it as the scenario name or ID to trigger directly.
