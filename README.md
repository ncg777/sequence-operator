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

# ax²+bx+c
node dist-tools/cli.js polynomial -s "0 1 2 3 4 5 6 7" -a 1 -b 1 -c 0
# → 0 2 6 4 4 6 2 0

# Permute blocks
node dist-tools/cli.js permute-blocks -s "1 2 3 4 5 6" -p "2 0 1"
# → 5 6 1 2 3 4

# Unary tritwise
node dist-tools/cli.js unary-tritwise -s "1 -1 0 2 -2" -o Not
# → -1 1 0 -2 2

# Hierarchical permute (CDBHP)
node dist-tools/cli.js hierarchical-permute -s "0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15" -c "1 2 1" -p "2 0 1"
# → 0 2 4 6 8 10 12 14 1 3 5 7 9 11 13 15

# Permutation orbit
node dist-tools/cli.js permutation-orbit -s "1 2 0"
# → 3 4 -5
```

Run `node dist-tools/cli.js --help` or `node dist-tools/cli.js <command> --help` for the full list of options.

