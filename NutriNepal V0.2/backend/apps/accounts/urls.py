from django.urls import re_path
from .views import CustomUserRegisterView, CustomUserLoginView


urlpatterns = [
    re_path(r"^register/$", CustomUserRegisterView.as_view(), name="register"),
    re_path(r"^login/$", CustomUserLoginView.as_view(), name="login"),
]
