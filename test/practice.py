# def decorator(func):
#     def wrapper(*args, **kwargs):
#         print("前処理")
#         result = func(*args, **kwargs)
#         print("後処理")
#         return result
#     return wrapper

# @decorator
# def my_function():
#     print("関数本体の処理")

# my_function()

import datetime

def my_logger(f):
    def _wrapper(*args, **keywords):
        print(f'{f.__name__}の実行')
        print(f'開始: {datetime.datetime.now()}')

        v = f(*args, **keywords)

        print(f'終了: {datetime.datetime.now()}')
        print(f'実行結果: {v}')

        return v
    return _wrapper

@my_logger
def return_one():
    return 1

return_one()