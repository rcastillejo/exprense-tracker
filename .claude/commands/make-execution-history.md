Show recent execution history for a Make (Integromat) scenario.

If a scenario name or ID is provided in $ARGUMENTS, fetch history for that scenario.
Otherwise list the last 10 executions across all scenarios.

Use the `make` MCP server to retrieve executions and display:
- Execution ID
- Scenario name
- Start time
- Duration
- Status (success / error / warning)
- Error message if failed
