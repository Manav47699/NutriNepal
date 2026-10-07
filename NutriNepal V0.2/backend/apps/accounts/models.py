from django.db import models
from django.contrib.auth.models import AbstractBaseUser, AbstractUser, PermissionsMixin
from .managers import CustomUserManager

# Create your models here.
class CustomUser(AbstractBaseUser, PermissionsMixin):
    username = models.CharField(max_length=255, unique=True, null=True, blank=True)
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=255, null=True, blank=True)
    last_name = models.CharField(max_length=255, null=True, blank=True)
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = (
        CustomUserManager()
    )  # to use methods like create_user and create_superuser from CustomUserManager

    USERNAME_FIELD = "email"  # to login with email instead of username as django use username by default.
    REQUIRED_FIELDS = [
        "username",
        "first_name",
        "last_name",
    ]  # to make these fields required when creating superuser using createsuperuser command.

    def __str__(self):
        return self.username

    def save(self, *args, **kwargs): # to save it in db. 
        if not self.username:
            self.username = self.email.split("@")[0]
        super().save(*args, **kwargs)
        return self
