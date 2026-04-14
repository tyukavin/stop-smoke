from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    bot_token: str = ""
    database_path: str = "data/quitbot.db"
    daily_checkin_hour: int = 9
    daily_checkin_minute: int = 0

    model_config = {"env_prefix": "QUIT_BOT_", "env_file": ".env"}


settings = Settings()
