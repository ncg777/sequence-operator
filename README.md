[https://ncg777.github.io/sequence-operator/](https://ncg777.github.io/sequence-operator/)

## CLI

Build the tools first:

```sh
yarn build-tools
```

Then use the `sequence-operator` command:

```sh
# Combine two sequences
node dist-tools/cli.js combine -x "1 2 3" -y "4 5 6" -c Product -o Add
# → 5 6 7 6 7 8 7 8 9

# Reverse a sequence
node dist-tools/cli.js reverse -s "1 2 3 4 5"
# → 5 4 3 2 1

# Rotate a sequence
node dist-tools/cli.js rotate -s "1 2 3 4 5" -n 2
# → 4 5 1 2 3

# Cyclical difference
node dist-tools/cli.js cyclical-difference -s "0 1 3 6 10"
# → 1 2 3 4 -10

# Cyclical antidifference
node dist-tools/cli.js cyclical-antidifference -s "1 2 3 4" -k 0
# → 0 1 3 6

# Difference
node dist-tools/cli.js difference -s "0 1 3 6 10"
# → 1 2 3 4

# Antidifference
node dist-tools/cli.js antidifference -s "1 2 3 4" -k 0
# → 0 1 3 6 10

# Signs
node dist-tools/cli.js signs -s "-3 0 5 -1 2"
# → -1 0 1 -1 1

# Times N
node dist-tools/cli.js times-n -s "0 1 2 3 4 5 6 7" -n 3
# → 0 3 6 1 4 7 2 5

# Permute blocks
node dist-tools/cli.js permute-blocks -s "1 2 3 4 5 6" -p "2 0 1"
# → 5 6 1 2 3 4

# Unary tritwise
node dist-tools/cli.js unary-tritwise -s "1 -1 0 2 -2" -o Not
# → -1 1 0 -2 2

# Hierarchical permute (CDBHP)
node dist-tools/cli.js hierarchical-permute -s "0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15" -c "1 2 1" -p "2 0 1"
# → 0 2 4 6 8 10 12 14 1 3 5 7 9 11 13 15
```

Run `node dist-tools/cli.js --help` or `node dist-tools/cli.js <command> --help` for the full list of options.

## MCP Server (for LLM agents)

The MCP server exposes all sequence operations as tools for use in LLM agent hosts such as VS Code (GitHub Copilot), Claude Desktop, and other MCP-compatible clients.

### VS Code / GitHub Copilot

Add the following to your VS Code `settings.json` (or workspace `.vscode/mcp.json`):

```json
{
  "mcp": {
    "servers": {
      "sequence-operator": {
        "type": "stdio",
        "command": "node",
        "args": ["${workspaceFolder}/dist-tools/mcp-server.js"]
      }
    }
  }
}
```

### Claude Desktop

Add the following to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "sequence-operator": {
      "command": "node",
      "args": ["/path/to/sequence-operator/dist-tools/mcp-server.js"]
    }
  }
}
```

### Available MCP tools

| Tool | Description |
|------|-------------|
| `combine` | Combine two sequences using a combiner and an operation |
| `rotate` | Rotate a sequence by n steps |
| `reverse` | Reverse a sequence |
| `cyclical_difference` | Compute the cyclical difference |
| `cyclical_antidifference` | Compute the cyclical antidifference |
| `difference` | Compute the difference |
| `antidifference` | Compute the antidifference (cumulative sum) |
| `signs` | Return the sign of each element |
| `times_n` | Sample every n-th element cyclically |
| `permute_blocks` | Reorder equally-sized blocks of a sequence |
| `hierarchical_permute` | Apply a composition-driven binary hierarchical permutation (CDBHP) |
| `unary_tritwise` | Apply a unary balanced-ternary operation element-wise |
| `list_combiners` | List all available combiners |
| `list_operations` | List all available operations |

