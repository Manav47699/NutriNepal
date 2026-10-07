from rest_framework import serializers
from .models import CustomUser


class UserSerializer(serializers.ModelSerializer):
    """
    It is read only serializer for CustomUser model.
    It is used to serialize the user data when we want to send it in response.
    """

    class Meta:
        model = CustomUser
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "is_staff",
            "is_active",
            "date_joined",
            "created_at",
            "updated_at",
        ]


class UserRegisterSerializer(serializers.ModelSerializer):
    """
    It is write only serializer for CustomUser model.
    It is used to deserialize the user data when we want to create a new user.
    """

    class Meta:
        model = CustomUser
        fields = [
            "username",
            "email",
            "first_name",
            "last_name",
            "password",
        ]
        extra_kwargs = {
            "password": {"write_only": True},
        }

    def create(self, validated_data):
        """
        Create and return a new `CustomUser` instance, given the validated data without the password.
        """
        password = validated_data.pop("password", None)
        # user = CustomUser(**validated_data)
        # if password is not None:
        #     user.set_password(password)
        # user.save()

        user = CustomUser.objects.create_user(**validated_data, password=password)
        return user


class LoginSerializer(serializers.ModelSerializer):
    email = serializers.EmailField()
    password = serializers.CharField(max_length=68, min_length=5, write_only=True)

    class Meta:
        model = CustomUser
        fields = ["email", "password"]

    def validate(self, validated_data):
        email = validated_data.get("email")
        password = validated_data.get("password")

        try:
            user = CustomUser.objects.get(email__iexact=email)
        except CustomUser.DoesNotExist:
            raise serializers.ValidationError("Invalid email or password")

        if not user.is_active:
            raise serializers.ValidationError("User account is disabled")

        if not user.check_password(password):
            raise serializers.ValidationError("Invalid email or password")

        validated_data["user"] = user
        return validated_data
