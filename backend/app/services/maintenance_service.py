import os
from app.core.config import settings


def is_maintenance_on() -> bool:
    return os.path.exists(settings.MAINTENANCE_FLAG_PATH)


def enable_maintenance() -> None:
    flag_dir = os.path.dirname(settings.MAINTENANCE_FLAG_PATH)
    if flag_dir:
        os.makedirs(flag_dir, exist_ok=True)
    with open(settings.MAINTENANCE_FLAG_PATH, "w") as f:
        f.write("on")


def disable_maintenance() -> None:
    if os.path.exists(settings.MAINTENANCE_FLAG_PATH):
        os.remove(settings.MAINTENANCE_FLAG_PATH)
