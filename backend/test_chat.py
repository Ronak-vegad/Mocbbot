import asyncio
import agent
import traceback

async def run():
    try:
        gen = await agent.run_chat("give me details", "conv_123", "gpt-oss:20b", ["file_123"])
        async for chunk in gen:
            pass
    except Exception as e:
        with open("error_log.txt", "w") as f:
            traceback.print_exc(file=f)

if __name__ == "__main__":
    asyncio.run(run())
