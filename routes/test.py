from re import X
from sys import argv
import json

x = json.loads(argv[1])

print(x)
print(x['BTC'])
print(x['ETH'])
print(x['SOL'])
print(type(x))