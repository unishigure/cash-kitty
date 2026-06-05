import subprocess
import sys


def main() -> None:
    try:
        subprocess.run(
            [
                sys.executable,
                "-m",
                "uvicorn",
                "app.main:app",
                "--host",
                "0.0.0.0",
                "--port",
                "8000",
                "--reload",
            ],
            check=True,
        )
    except KeyboardInterrupt:
        # Ctrl+C on the wrapper process should stop quietly.
        return


if __name__ == "__main__":
    main()
