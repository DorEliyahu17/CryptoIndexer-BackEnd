from re import X
from sys import argv
import json

# print("argv[1]=" + argv[1])

x = json.loads(argv[1])

# print(x)
# print(x['BTC'])
# print(x['ETH'])
# print(x['SOL'])
# print(type(x))

res = [1.1, 2.5, 3.4, 8]

dic_to_ret = {"success": True, "data": res}


print(json.dumps(dic_to_ret))
