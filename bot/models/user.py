from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone


@dataclass
class UserProfile:
    user_id: int
    username: str | None
    first_name: str | None
    quit_date: datetime | None
    cigarettes_per_day: int
    price_per_pack: float
    cigarettes_in_pack: int
    years_smoking: int
    timezone_offset: int
    motivation: str
    created_at: datetime
    onboarding_complete: bool

    @property
    def tz(self) -> timezone:
        return timezone(timedelta(hours=self.timezone_offset))

    @property
    def smoke_free_delta(self) -> timedelta | None:
        if self.quit_date is None:
            return None
        now = datetime.now(tz=self.tz)
        quit_aware = self.quit_date.replace(tzinfo=self.tz)
        delta = now - quit_aware
        return delta if delta.total_seconds() > 0 else timedelta(0)

    @property
    def smoke_free_days(self) -> int:
        delta = self.smoke_free_delta
        return delta.days if delta else 0

    @property
    def money_saved(self) -> float:
        delta = self.smoke_free_delta
        if delta is None:
            return 0.0
        price_per_cig = self.price_per_pack / self.cigarettes_in_pack
        hours = delta.total_seconds() / 3600
        cigs_not_smoked = (hours / 24) * self.cigarettes_per_day
        return round(cigs_not_smoked * price_per_cig, 2)

    @property
    def cigarettes_avoided(self) -> int:
        delta = self.smoke_free_delta
        if delta is None:
            return 0
        hours = delta.total_seconds() / 3600
        return int((hours / 24) * self.cigarettes_per_day)

    @property
    def life_regained_minutes(self) -> int:
        """Each cigarette not smoked adds ~11 minutes of life."""
        return self.cigarettes_avoided * 11
